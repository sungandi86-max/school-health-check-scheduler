import { Printer, RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getOperationLogs } from '../../lib/logs';
import { getHealthCheckLabel } from '../../lib/healthCheck';
import { healthCheckOperationLogRepository } from '../../lib/repositories/HealthCheckOperationLogRepository';
import { healthCheckOperationStateRepository } from '../../lib/repositories/HealthCheckOperationStateRepository';
import { healthCheckStudentRepository } from '../../lib/repositories/HealthCheckStudentRepository';
import { getOperationState } from '../../lib/operation';
import { getStudentsBySession } from '../../lib/roster';
import { getActiveSession } from '../../lib/sessions';
import { loadSchoolSettings } from '../../lib/settings';
import {
  buildAdminReportText,
  buildOperationReportSummary,
  copyTextToClipboard,
  getReportNotes,
  saveReportNotes,
} from '../../lib/report';
import { ReportClassSummary } from './ReportClassSummary';
import { ReportCopyBox } from './ReportCopyBox';
import { ReportImprovementNotes } from './ReportImprovementNotes';
import { ReportLogSummary } from './ReportLogSummary';
import { ReportSessionInfo } from './ReportSessionInfo';
import { ReportStudentSummary } from './ReportStudentSummary';
import { ShareSecurityNotice } from '../share/ShareLinkPanel';
import { useHealthCheckRealtime } from '../../hooks/useHealthCheckRealtime';
import { AccessNotice } from '../common/AccessNotice';
import { RoleBadge } from '../common/RoleBadge';

export function OperationReport() {
  const [snapshot, setSnapshot] = useState(() => loadReportSnapshot());
  const [snapshotError, setSnapshotError] = useState('');
  const refresh = () => {
    setSnapshotError('');
    void loadReportSnapshotAsync()
      .then(setSnapshot)
      .catch((error) => {
        console.warn('[OperationReport] Failed to refresh remote snapshot.', error);
        setSnapshot(loadReportSnapshot());
        setSnapshotError('운영 보고서 데이터를 불러오지 못해 브라우저 저장 데이터를 표시합니다.');
      });
  };

  const realtimeSessionId = snapshot.session?.id ?? 'report-local-session';
  useHealthCheckRealtime(realtimeSessionId, refresh);

  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('schoolHealthHub.')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const summary = useMemo(
    () =>
      buildOperationReportSummary({
        session: snapshot.session,
        state: snapshot.state,
        students: snapshot.students,
        logs: snapshot.logs,
        notes: snapshot.notes,
      }),
    [snapshot],
  );
  const reportText = useMemo(() => buildAdminReportText(summary), [summary]);
  const schoolSettings = useMemo(() => loadSchoolSettings(), []);
  const recommendedPdfFileName = useMemo(() => buildRecommendedPdfFileName(summary), [summary]);
  const reportWrittenAt = useMemo(() => formatReportDate(new Date().toISOString()), []);

  const saveNotes = (notes: string) => {
    saveReportNotes(snapshot.sessionId, notes);
    setSnapshot(loadReportSnapshot());
  };

  const copyReport = async () => {
    await copyTextToClipboard(reportText);
    alert('관리자 보고서 문구를 복사했습니다.');
  };

  const printReport = () => window.print();

  const showPdfGuide = () => {
    alert(`인쇄 창에서 대상을 PDF 저장으로 선택한 뒤 파일명을 ${recommendedPdfFileName} 으로 저장해 주세요.`);
  };

  return (
    <section className="operation-report-page">
      <header className="operation-report-header">
        <div>
          <div className="role-header-line"><RoleBadge role="viewer" /></div>
          <p className="eyebrow">운영 보고서</p>
          <h1>학생건강검진 운영 보고서 요약</h1>
        </div>
        <div className="report-actions no-print">
          <button type="button" onClick={refresh}>
            <RefreshCcw size={16} />
            새로고침
          </button>
          <button type="button" className="primary" onClick={printReport}>
            <Printer size={16} />
            인쇄하기
          </button>
          <button type="button" onClick={showPdfGuide}>PDF 저장 안내</button>
        </div>
      </header>

      {snapshotError && <p className="table-description">{snapshotError}</p>}
      <AccessNotice role="viewer" />
      <section className="report-print-cover">
        <p className="eyebrow">{schoolSettings.schoolName}</p>
        <h2>학생건강검진 운영 보고서</h2>
        <dl>
          <div><dt>검진명</dt><dd>{summary.session?.title || '선택된 검진'}</dd></div>
          <div><dt>검진일</dt><dd>{summary.session?.date || '-'}</dd></div>
          <div><dt>검사 종류</dt><dd>{summary.session ? getHealthCheckLabel(summary.session.checkType) : '-'}</dd></div>
          <div><dt>대상 학년</dt><dd>{summary.session?.targetGrades.length ? `${summary.session.targetGrades.join(', ')}학년` : '-'}</dd></div>
          <div><dt>검진 장소</dt><dd>{summary.session?.location || schoolSettings.defaultLocation || '-'}</dd></div>
          <div><dt>작성일</dt><dd>{reportWrittenAt}</dd></div>
        </dl>
        <p className="report-file-name no-print">추천 PDF 파일명: <strong>{recommendedPdfFileName}</strong></p>
      </section>
      <ReportSessionInfo session={summary.session} />
      <div className="report-two-column">
        <ReportStudentSummary summary={summary.student} />
        <ReportClassSummary summary={summary.class} />
      </div>
      <ReportLogSummary logs={summary.logs} />
      <ReportImprovementNotes value={snapshot.notes} onSave={saveNotes} />
      <section className="report-card report-future-suggestions">
        <p className="eyebrow">향후 개선 제안</p>
        <h2>다음 운영 개선 검토</h2>
        <ul>
          <li>미도착 학급이 반복된 시간대와 이동 안내 방식을 확인합니다.</li>
          <li>검진 장소 혼잡, 지연 시간, 교사 공유 링크 확인 여부를 다음 검진 계획에 반영합니다.</li>
          <li>운영 로그와 특이사항을 바탕으로 방송 안내와 리로스쿨 안내 문구를 조정합니다.</li>
        </ul>
      </section>
      <ReportCopyBox text={reportText} onCopy={copyReport} />
      <section className="report-card report-submit-note">
        <p>본 보고서는 School Health Hub에 기록된 검진 운영 데이터를 바탕으로 작성되었습니다.</p>
        <ShareSecurityNotice />
      </section>
    </section>
  );
}

function loadReportSnapshot() {
  const session = getActiveSession();
  const sessionId = session?.id ?? 'report-local-session';
  const state = getOperationState(sessionId);
  const students = session ? getStudentsBySession(session.id, session.checkType) : [];
  const logs = getOperationLogs(sessionId);
  const notes = getReportNotes(sessionId);
  return { session, sessionId, state, students, logs, notes };
}

async function loadReportSnapshotAsync() {
  const session = getActiveSession();
  const sessionId = session?.id ?? 'report-local-session';
  const [state, students, logs] = await Promise.all([
    healthCheckOperationStateRepository.get(sessionId),
    session ? healthCheckStudentRepository.listBySession(session.id, session.checkType) : Promise.resolve([]),
    healthCheckOperationLogRepository.listBySession(sessionId),
  ]);
  const notes = getReportNotes(sessionId);
  return { session, sessionId, state, students, logs, notes };
}

function buildRecommendedPdfFileName(summary: ReturnType<typeof buildOperationReportSummary>) {
  const date = summary.session?.date || new Date().toISOString().slice(0, 10);
  const type = summary.session ? getHealthCheckLabel(summary.session.checkType) : '건강검진';
  return `${date}_${sanitizeFileName(type)}_운영보고서.pdf`;
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_') || '건강검진';
}

function formatReportDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

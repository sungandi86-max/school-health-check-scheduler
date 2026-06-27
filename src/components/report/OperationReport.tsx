import { RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getOperationLogs } from '../../lib/logs';
import { healthCheckOperationLogRepository } from '../../lib/repositories/HealthCheckOperationLogRepository';
import { healthCheckOperationStateRepository } from '../../lib/repositories/HealthCheckOperationStateRepository';
import { healthCheckStudentRepository } from '../../lib/repositories/HealthCheckStudentRepository';
import { getOperationState } from '../../lib/operation';
import { getStudentsBySession } from '../../lib/roster';
import { getActiveSession } from '../../lib/sessions';
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
        setSnapshotError('운영 로그를 불러오지 못해 브라우저 저장 데이터를 표시합니다.');
      });
  };

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

  const saveNotes = (notes: string) => {
    saveReportNotes(snapshot.sessionId, notes);
    setSnapshot(loadReportSnapshot());
  };

  const copyReport = async () => {
    await copyTextToClipboard(reportText);
    alert('관리자 보고용 문구를 복사했습니다.');
  };

  return (
    <section className="operation-report-page">
      <header className="operation-report-header">
        <div>
          <p className="eyebrow">운영 보고서</p>
          <h1>학생건강검진 운영 보고서 요약</h1>
        </div>
        <button type="button" onClick={refresh}>
          <RefreshCcw size={16} />
          새로고침
        </button>
      </header>

      {snapshotError && <p className="table-description">{snapshotError}</p>}
      <ReportSessionInfo session={summary.session} />
      <div className="report-two-column">
        <ReportStudentSummary summary={summary.student} />
        <ReportClassSummary summary={summary.class} />
      </div>
      <ReportLogSummary logs={summary.logs} />
      <ReportImprovementNotes value={snapshot.notes} onSave={saveNotes} />
      <ReportCopyBox text={reportText} onCopy={copyReport} />
      <section className="report-card">
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

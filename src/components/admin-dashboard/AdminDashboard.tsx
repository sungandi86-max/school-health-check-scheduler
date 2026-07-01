import { RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { generateNoticeMessage, normalizeOperationClassId } from '../../lib/operation';
import { getStudentSummary } from '../../lib/roster';
import { healthCheckDataService } from '../../lib/services/healthCheckDataService';
import type { HealthCheckOperationLog, HealthCheckOperationState, HealthCheckSession, HealthCheckStudent } from '../../types/healthCheck';
import { AdminClassStatusSummary, type AdminClassStatusRow } from './AdminClassStatusSummary';
import { AdminCurrentFlow } from './AdminCurrentFlow';
import { AdminProgressCards } from './AdminProgressCards';
import { AdminRecentLogs } from './AdminRecentLogs';
import { AdminSessionInfo } from './AdminSessionInfo';
import { AdminStudentStatusSummary } from './AdminStudentStatusSummary';
import { ShareSecurityNotice } from '../share/ShareLinkPanel';
import { useHealthCheckRealtime } from '../../hooks/useHealthCheckRealtime';
import { AccessNotice } from '../common/AccessNotice';
import { RoleBadge } from '../common/RoleBadge';

export function AdminDashboard() {
  const [snapshot, setSnapshot] = useState(() => createEmptyAdminSnapshot());
  const [snapshotError, setSnapshotError] = useState('');
  const refresh = () => {
    setSnapshotError('');
    void loadAdminSnapshotAsync()
      .then(setSnapshot)
      .catch((error) => {
        console.warn('[AdminDashboard] Failed to refresh remote snapshot.', error);
        setSnapshotError('운영상태를 불러오지 못해 브라우저 저장 데이터를 표시합니다.');
      });
  };

  const realtimeSessionId = snapshot.session?.id ?? 'admin-dashboard-local-session';
  useHealthCheckRealtime(realtimeSessionId, refresh);

  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('schoolHealthHub.')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const studentSummary = useMemo(() => getStudentSummary(snapshot.students), [snapshot.students]);
  const classRows = useMemo(() => createClassRows(snapshot.state, snapshot.students), [snapshot.state, snapshot.students]);
  const completedClassCount = classRows.filter((row) => row.status === 'completed').length;
  const notice = useMemo(
    () =>
      snapshot.state.noticeMessage ||
      generateNoticeMessage(snapshot.state, {
        checkType: snapshot.session?.checkType,
        location: snapshot.session?.location,
      }),
    [snapshot],
  );

  return (
    <section className="admin-dashboard-page">
      <header className="admin-dashboard-header">
        <div>
          <div className="role-header-line"><RoleBadge role="admin" /></div>
          <p className="eyebrow">관리자 확인 전용 현황판</p>
          <h1>검진 진행 상황 한눈에 보기</h1>
          <p className="admin-dashboard-lead">현재 검진이 정상 진행 중인지, 어디까지 진행됐는지, 지연·미도착 학급이 있는지 학급 단위와 통계로 확인합니다.</p>
        </div>
        <button type="button" className="admin-refresh-button" aria-label="관리자 현황 새로고침" onClick={refresh}>
          <RefreshCcw size={16} />
          현황 새로고침
        </button>
      </header>

      {snapshotError && <p className="table-description">{snapshotError}</p>}
      <AdminSessionInfo session={snapshot.session} />
      <section className="admin-readonly-notice">
        <strong>확인 전용</strong>
        <span>관리자 현황판은 입력 화면이 아닙니다. 학생 개인정보 없이 학급 단위 진행 상황과 통계만 표시합니다.</span>
      </section>
      <AdminProgressCards
        studentTotal={studentSummary.total}
        completedStudents={studentSummary.completed}
        incompleteStudents={studentSummary.incomplete}
        classTotal={classRows.length}
        completedClasses={completedClassCount}
        missingClasses={snapshot.state.missingClassIds.length}
        delayedMinutes={snapshot.state.delayedMinutes}
      />
      <AdminCurrentFlow
        currentClassId={snapshot.state.currentClassId}
        nextClassId={snapshot.state.nextClassId}
        missingClassIds={snapshot.state.missingClassIds}
        delayedMinutes={snapshot.state.delayedMinutes}
      />
      <AccessNotice role="admin" />

      <div className="admin-dashboard-detail-grid">
        <AdminClassStatusSummary rows={classRows} />
        <AdminStudentStatusSummary byStatus={studentSummary.byStatus} />
      </div>

      <section className="admin-notice-panel">
        <div>
          <p className="eyebrow">보건실 안내문구</p>
          <h2>교무실 공유 안내</h2>
        </div>
        <p>{notice || '운영센터에서 현재 검사 학급을 지정하면 안내문구가 표시됩니다.'}</p>
      </section>

      <AdminRecentLogs logs={snapshot.logs} />

      <footer className="admin-dashboard-footer">
        <p>최근 업데이트: {formatDateTime(snapshot.state.updatedAt)}</p>
        <p>이 화면은 보건실 운영센터 입력 내용을 기준으로 표시되는 확인 전용 화면입니다.</p>
        <ShareSecurityNotice />
      </footer>
    </section>
  );
}

function createEmptyAdminSnapshot(): {
  session?: HealthCheckSession;
  state: HealthCheckOperationState;
  students: HealthCheckStudent[];
  logs: HealthCheckOperationLog[];
} {
  return {
    state: createInitialOperationState('admin-dashboard-local-session'),
    students: [],
    logs: [],
  };
}

function createClassRows(state: HealthCheckOperationState, students: HealthCheckStudent[]): AdminClassStatusRow[] {
  const classIds = [
    ...students.map((student) => student.className),
    state.currentClassId,
    state.nextClassId,
    ...state.completedClassIds,
    ...state.missingClassIds,
  ]
    .map(normalizeOperationClassId)
    .filter(Boolean);
  const uniqueClassIds = [...new Set(classIds)].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));

  return uniqueClassIds.map((classId) => {
    const classStudents = students.filter((student) => normalizeOperationClassId(student.className) === classId);
    const completedStudents = classStudents.filter((student) => student.status === 'completed').length;
    const status: AdminClassStatusRow['status'] = state.missingClassIds.includes(classId)
      ? 'missing'
      : state.currentClassId === classId
        ? 'inProgress'
        : state.completedClassIds.includes(classId)
          ? 'completed'
          : 'waiting';

    return {
      classId,
      status,
      totalStudents: classStudents.length,
      completedStudents,
      incompleteStudents: classStudents.length - completedStudents,
    };
  });
}

function formatDateTime(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}


async function loadAdminSnapshotAsync(): Promise<{
  session?: HealthCheckSession;
  state: HealthCheckOperationState;
  students: HealthCheckStudent[];
  logs: HealthCheckOperationLog[];
}> {
  const session = await getActiveSessionFromService();
  const sessionId = session?.id ?? 'admin-dashboard-local-session';
  const [state, students, logs] = await Promise.all([
    healthCheckDataService.getOperationState(sessionId),
    session ? healthCheckDataService.listStudents(session.id, session.checkType) : Promise.resolve([]),
    healthCheckDataService.listRecentLogs(sessionId, 80),
  ]);
  return { session, state, students, logs };
}

async function getActiveSessionFromService() {
  const [sessions, activeSessionId] = await Promise.all([
    healthCheckDataService.listSessions(),
    healthCheckDataService.getActiveSessionId(),
  ]);
  return sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
}

function createInitialOperationState(sessionId: string): HealthCheckOperationState {
  return {
    sessionId,
    currentClassId: '',
    nextClassId: '',
    completedClassIds: [],
    missingClassIds: [],
    delayedMinutes: 0,
    noticeMessage: '',
    operationMemo: '',
    updatedAt: new Date().toISOString(),
  };
}


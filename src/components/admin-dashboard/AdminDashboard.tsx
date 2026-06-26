import { RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getOperationLogs } from '../../lib/logs';
import { generateNoticeMessage, getOperationState, normalizeOperationClassId } from '../../lib/operation';
import { getStudentsBySession, getStudentSummary } from '../../lib/roster';
import { getActiveSession } from '../../lib/sessions';
import type { HealthCheckOperationLog, HealthCheckOperationState, HealthCheckSession, HealthCheckStudent } from '../../types/healthCheck';
import { AdminClassStatusSummary, type AdminClassStatusRow } from './AdminClassStatusSummary';
import { AdminCurrentFlow } from './AdminCurrentFlow';
import { AdminProgressCards } from './AdminProgressCards';
import { AdminRecentLogs } from './AdminRecentLogs';
import { AdminSessionInfo } from './AdminSessionInfo';
import { AdminStudentStatusSummary } from './AdminStudentStatusSummary';

export function AdminDashboard() {
  const [snapshot, setSnapshot] = useState(() => loadAdminSnapshot());
  const refresh = () => setSnapshot(loadAdminSnapshot());

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('schoolHealthHub.')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const studentSummary = useMemo(() => getStudentSummary(snapshot.students), [snapshot.students]);
  const classRows = useMemo(() => createClassRows(snapshot.state, snapshot.students), [snapshot.state, snapshot.students]);
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
          <p className="eyebrow">School Health Hub</p>
          <h1>학생건강검진 전체 현황</h1>
        </div>
        <button type="button" onClick={refresh}>
          <RefreshCcw size={16} />
          새로고침
        </button>
      </header>

      <AdminSessionInfo session={snapshot.session} />
      <AdminProgressCards
        studentTotal={studentSummary.total}
        completedStudents={studentSummary.completed}
        incompleteStudents={studentSummary.incomplete}
        classTotal={classRows.length}
        completedClasses={classRows.filter((row) => row.status === 'completed').length}
        missingClasses={snapshot.state.missingClassIds.length}
        delayedMinutes={snapshot.state.delayedMinutes}
      />
      <AdminCurrentFlow
        currentClassId={snapshot.state.currentClassId}
        nextClassId={snapshot.state.nextClassId}
        missingClassIds={snapshot.state.missingClassIds}
        delayedMinutes={snapshot.state.delayedMinutes}
      />

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
        <p>이 화면은 보건실 운영센터 입력 내용을 기준으로 표시됩니다.</p>
      </footer>
    </section>
  );
}

function loadAdminSnapshot(): {
  session?: HealthCheckSession;
  state: HealthCheckOperationState;
  students: HealthCheckStudent[];
  logs: HealthCheckOperationLog[];
} {
  const session = getActiveSession();
  const sessionId = session?.id ?? 'admin-dashboard-local-session';
  const state = getOperationState(sessionId);
  const students = session ? getStudentsBySession(session.id, session.checkType) : [];
  const logs = getOperationLogs(sessionId);
  return { session, state, students, logs };
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

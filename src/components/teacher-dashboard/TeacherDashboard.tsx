import { RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useHealthCheckRealtime } from '../../hooks/useHealthCheckRealtime';
import { generateNoticeMessage } from '../../lib/operation';
import { canUseSupabaseRealtime } from '../../lib/realtime/realtime';
import { healthCheckDataService } from '../../lib/services/healthCheckDataService';
import { getStorageMode } from '../../lib/storage/storageProvider';
import type { HealthCheckOperationState, HealthCheckSession, HealthCheckStudent } from '../../types/healthCheck';
import { ShareSecurityNotice } from '../share/ShareLinkPanel';
import { AccessNotice } from '../common/AccessNotice';
import { RoleBadge } from '../common/RoleBadge';
import { TeacherCurrentStatusCard } from './TeacherCurrentStatusCard';
import { TeacherMissingClassAlert } from './TeacherMissingClassAlert';
import { TeacherNoticeMessage } from './TeacherNoticeMessage';
import { TeacherSessionInfo } from './TeacherSessionInfo';

export function TeacherDashboard() {
  const [snapshot, setSnapshot] = useState(() => createEmptyTeacherSnapshot());
  const [snapshotError, setSnapshotError] = useState('');
  const refresh = () => {
    setSnapshotError('');
    void loadTeacherSnapshotAsync()
      .then(setSnapshot)
      .catch((error) => {
        console.warn('[TeacherDashboard] Failed to refresh remote snapshot.', error);
        setSnapshotError('운영상태를 불러오지 못해 브라우저 저장 데이터를 표시합니다.');
      });
  };

  const realtimeSessionId = snapshot.session?.id ?? 'teacher-dashboard-local-session';
  useHealthCheckRealtime(realtimeSessionId, refresh);

  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('schoolHealthHub.')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const notice = useMemo(
    () =>
      snapshot.state.noticeMessage ||
      generateNoticeMessage(snapshot.state, {
        checkType: snapshot.session?.checkType,
        location: snapshot.session?.location,
      }),
    [snapshot],
  );

  const classStats = useMemo(() => createClassStats(snapshot.students), [snapshot.students]);

  return (
    <section className="teacher-dashboard-page">
      <header className="teacher-dashboard-header">
        <div>
          <div className="role-header-line"><RoleBadge role="teacher" /></div>
          <p className="eyebrow">교사용 확인 전용 현황판</p>
          <h1>우리 반 검진 이동 확인</h1>
          <p className="teacher-dashboard-lead">보건실에서 입력한 현재 검진 상황을 학급 단위로 확인하는 화면입니다.</p>
        </div>
        <button type="button" className="teacher-refresh-button" aria-label="교사용 현황 새로고침" onClick={refresh}>
          <RefreshCcw size={16} />
          현황 새로고침
        </button>
      </header>

      {snapshotError && <p className="table-description">{snapshotError}</p>}
      <TeacherSessionInfo session={snapshot.session} />
      <section className="teacher-readonly-notice">
        <strong>확인 전용</strong>
        <span>이 화면에서는 입력하거나 상태를 변경하지 않습니다. 이동 안내와 현재 검사 학급만 빠르게 확인해 주세요.</span>
      </section>
      <TeacherCurrentStatusCard state={snapshot.state} />
      <TeacherMissingClassAlert state={snapshot.state} />
      <TeacherRealtimeStatus updatedAt={snapshot.state.updatedAt} />
      <AccessNotice role="teacher" />
      <TeacherNoticeMessage message={notice} />

      {classStats.length > 0 && (
        <section className="teacher-class-summary">
          <p className="eyebrow">학급 단위 처리 현황</p>
          <h2>학생 이름은 표시하지 않습니다</h2>
          <div>
            {classStats.map((item) => (
              <span key={item.className}>{item.className} 완료 {item.completed}명 / 미검 {item.incomplete}명</span>
            ))}
          </div>
        </section>
      )}

      <footer className="teacher-dashboard-footer">
        <p>이 화면은 보건실에서 입력한 현황을 기준으로 표시됩니다.</p>
        <p>링크는 교직원 내부 안내용입니다.</p>
        <p>학생 개인정보 보호를 위해 외부 공유를 금지합니다.</p>
        <ShareSecurityNotice />
      </footer>
    </section>
  );
}

function TeacherRealtimeStatus({ updatedAt }: { updatedAt: string }) {
  const isSupabaseMode = getStorageMode() === 'supabase';
  const realtimeReady = canUseSupabaseRealtime();
  return (
    <section className={`teacher-realtime-status ${realtimeReady ? 'connected' : 'local'}`}>
      <strong>{realtimeReady ? '실시간 연결됨' : '이 기기 기준 데이터'}</strong>
      <span>{isSupabaseMode ? `마지막 업데이트: ${formatTime(updatedAt)}` : `마지막 업데이트: ${formatTime(updatedAt)} · 학교 서버 연결 시 여러 기기에서 함께 확인할 수 있습니다.`}</span>
    </section>
  );
}

function createEmptyTeacherSnapshot(): {
  session?: HealthCheckSession;
  state: HealthCheckOperationState;
  students: HealthCheckStudent[];
} {
  return {
    state: createInitialOperationState('teacher-dashboard-local-session'),
    students: [],
  };
}

function createClassStats(students: HealthCheckStudent[]) {
  const classes = [...new Set(students.map((student) => student.className).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
  return classes.map((className) => {
    const rows = students.filter((student) => student.className === className);
    const completed = rows.filter((student) => student.status === 'completed').length;
    return {
      className,
      completed,
      incomplete: rows.length - completed,
    };
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

async function loadTeacherSnapshotAsync(): Promise<{
  session?: HealthCheckSession;
  state: HealthCheckOperationState;
  students: HealthCheckStudent[];
}> {
  const session = await getActiveSessionFromService();
  const sessionId = session?.id ?? 'teacher-dashboard-local-session';
  const [state, students] = await Promise.all([
    healthCheckDataService.getOperationState(sessionId),
    session ? healthCheckDataService.listStudents(session.id, session.checkType) : Promise.resolve([]),
  ]);
  return { session, state, students };
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


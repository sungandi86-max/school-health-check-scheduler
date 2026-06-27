import { RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useHealthCheckRealtime } from '../../hooks/useHealthCheckRealtime';
import { generateNoticeMessage, getOperationState } from '../../lib/operation';
import { canUseSupabaseRealtime } from '../../lib/realtime/realtime';
import { healthCheckOperationStateRepository } from '../../lib/repositories/HealthCheckOperationStateRepository';
import { healthCheckStudentRepository } from '../../lib/repositories/HealthCheckStudentRepository';
import { getStudentsBySession } from '../../lib/roster';
import { getActiveSession } from '../../lib/sessions';
import { getStorageMode } from '../../lib/storage/storageProvider';
import type { HealthCheckOperationState, HealthCheckSession, HealthCheckStudent } from '../../types/healthCheck';
import { ShareSecurityNotice } from '../share/ShareLinkPanel';
import { TeacherCurrentStatusCard } from './TeacherCurrentStatusCard';
import { TeacherMissingClassAlert } from './TeacherMissingClassAlert';
import { TeacherNoticeMessage } from './TeacherNoticeMessage';
import { TeacherSessionInfo } from './TeacherSessionInfo';

export function TeacherDashboard() {
  const [snapshot, setSnapshot] = useState(() => loadTeacherSnapshot());
  const [snapshotError, setSnapshotError] = useState('');
  const refresh = () => {
    setSnapshotError('');
    void loadTeacherSnapshotAsync()
      .then(setSnapshot)
      .catch((error) => {
        console.warn('[TeacherDashboard] Failed to refresh remote snapshot.', error);
        setSnapshot(loadTeacherSnapshot());
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
          <p className="eyebrow">교사용 실시간 현황</p>
          <h1>학생건강검진 안내 화면</h1>
        </div>
        <button type="button" onClick={refresh}>
          <RefreshCcw size={16} />
          새로고침
        </button>
      </header>

      {snapshotError && <p className="table-description">{snapshotError}</p>}
      <TeacherRealtimeStatus updatedAt={snapshot.state.updatedAt} />
      <TeacherCurrentStatusCard state={snapshot.state} />
      <TeacherMissingClassAlert state={snapshot.state} />
      <TeacherSessionInfo session={snapshot.session} />
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
      <span>{isSupabaseMode ? `마지막 업데이트: ${formatTime(updatedAt)}` : '다른 기기와 실시간 공유하려면 Supabase 설정이 필요합니다.'}</span>
    </section>
  );
}

function loadTeacherSnapshot(): {
  session?: HealthCheckSession;
  state: HealthCheckOperationState;
  students: HealthCheckStudent[];
} {
  const session = getActiveSession();
  const sessionId = session?.id ?? 'teacher-dashboard-local-session';
  const state = getOperationState(sessionId);
  const students = session ? getStudentsBySession(session.id, session.checkType) : [];
  return { session, state, students };
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
  const session = getActiveSession();
  const sessionId = session?.id ?? 'teacher-dashboard-local-session';
  const [state, students] = await Promise.all([
    healthCheckOperationStateRepository.get(sessionId),
    session ? healthCheckStudentRepository.listBySession(session.id, session.checkType) : Promise.resolve([]),
  ]);
  return { session, state, students };
}

import { RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getActiveSession } from '../../lib/sessions';
import { generateNoticeMessage, getOperationState } from '../../lib/operation';
import { getStudentsBySession } from '../../lib/roster';
import type { HealthCheckOperationState, HealthCheckSession, HealthCheckStudent } from '../../types/healthCheck';
import { TeacherCurrentStatusCard } from './TeacherCurrentStatusCard';
import { TeacherMissingClassAlert } from './TeacherMissingClassAlert';
import { TeacherNoticeMessage } from './TeacherNoticeMessage';
import { TeacherSessionInfo } from './TeacherSessionInfo';
import { ShareSecurityNotice } from '../share/ShareLinkPanel';

export function TeacherDashboard() {
  const [snapshot, setSnapshot] = useState(() => loadTeacherSnapshot());

  const refresh = () => setSnapshot(loadTeacherSnapshot());

  useEffect(() => {
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
          <p className="eyebrow">교사용 현황판</p>
          <h1>학교 건강검진 실시간 현황</h1>
        </div>
        <button type="button" onClick={refresh}>
          <RefreshCcw size={16} />
          새로고침
        </button>
      </header>

      <TeacherSessionInfo session={snapshot.session} />
      <TeacherCurrentStatusCard state={snapshot.state} />
      <TeacherMissingClassAlert state={snapshot.state} />
      <TeacherNoticeMessage message={notice} />

      {classStats.length > 0 && (
        <section className="teacher-class-summary">
          <p className="eyebrow">명렬표 기준</p>
          <h2>학급별 학생 처리 현황</h2>
          <div>
            {classStats.map((item) => (
              <span key={item.className}>{item.className} 완료 {item.completed}명 / 미검 {item.incomplete}명</span>
            ))}
          </div>
        </section>
      )}

      <footer className="teacher-dashboard-footer">
        <p>이 화면은 보건실에서 입력한 현황을 기준으로 표시됩니다.</p>
        <p>방송 안내를 최소화하기 위한 교사용 확인 화면입니다.</p>
        <ShareSecurityNotice />
      </footer>
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

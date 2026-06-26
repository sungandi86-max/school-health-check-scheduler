import { getHealthCheckLabel } from '../../lib/healthCheck';
import type { HealthCheckSession } from '../../types/healthCheck';

export function TeacherSessionInfo({ session }: { session?: HealthCheckSession }) {
  return (
    <section className="teacher-session-info">
      <p className="eyebrow">현재 세션</p>
      <h2>{session?.title || '선택된 검진 세션이 없습니다'}</h2>
      <div>
        <span>검사 종류: {session ? getHealthCheckLabel(session.checkType) : '-'}</span>
        <span>날짜: {session?.date || '-'}</span>
        <span>장소: {session?.location || '-'}</span>
      </div>
    </section>
  );
}

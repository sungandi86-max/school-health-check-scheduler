import type { HealthCheckOperationState } from '../../types/healthCheck';

export function TeacherCurrentStatusCard({ state }: { state: HealthCheckOperationState }) {
  const sendNow = state.currentClassId || state.missingClassIds[0] || '-';

  return (
    <section className="teacher-priority-grid">
      <article className="teacher-status-card highlight">
        <span>지금 보내야 할 학급</span>
        <strong>{sendNow}</strong>
        <small>{state.missingClassIds.length ? '미도착 학급 우선 확인' : '현재 검사 학급 기준'}</small>
      </article>
      <article className="teacher-status-card">
        <span>현재 검사 학급</span>
        <strong>{state.currentClassId || '-'}</strong>
        <small>검진 진행 중</small>
      </article>
      <article className="teacher-status-card">
        <span>다음 검사 학급</span>
        <strong>{state.nextClassId || '-'}</strong>
        <small>대기 안내</small>
      </article>
      <article className={`teacher-status-card ${state.delayedMinutes > 0 ? 'warn' : ''}`}>
        <span>지연 시간</span>
        <strong>{state.delayedMinutes}분</strong>
        <small>마지막 업데이트 {formatUpdatedAt(state.updatedAt)}</small>
      </article>
    </section>
  );
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

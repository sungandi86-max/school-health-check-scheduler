import type { HealthCheckOperationState } from '../../types/healthCheck';

export function OperationStatusCard({ state }: { state: HealthCheckOperationState }) {
  return (
    <section className="operation-status-grid">
      <article className="metric-card operation-status-card">
        <span>현재 검사 학급</span>
        <strong>{state.currentClassId || '-'}</strong>
        <small>진행 중인 학급</small>
      </article>
      <article className="metric-card operation-status-card">
        <span>다음 검사 학급</span>
        <strong>{state.nextClassId || '-'}</strong>
        <small>대기 안내 대상</small>
      </article>
      <article className="metric-card operation-status-card">
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

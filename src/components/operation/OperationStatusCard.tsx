import type { HealthCheckOperationState } from '../../types/healthCheck';
import { getOperationSummary } from '../../lib/operation';

export function OperationStatusCard({ state, classIds }: { state: HealthCheckOperationState; classIds: string[] }) {
  const summary = getOperationSummary(state, classIds);
  const incompleteClasses = Math.max(summary.totalClasses - summary.completedClasses, 0);
  const currentState = getCurrentStateLabel(state);
  const missingLabel = state.missingClassIds.length ? state.missingClassIds.join(', ') : '없음';

  return (
    <section className="operation-status-grid">
      <article className={`metric-card operation-status-card status-${currentState.tone}`}>
        <span>현재 상태</span>
        <strong>{currentState.label}</strong>
        <small>마지막 업데이트 {formatUpdatedAt(state.updatedAt)}</small>
      </article>
      <article className="metric-card operation-status-card">
        <span>현재 검사반</span>
        <strong>{state.currentClassId || '-'}</strong>
        <small>진행 중인 학급</small>
      </article>
      <article className="metric-card operation-status-card">
        <span>다음 검사반</span>
        <strong>{state.nextClassId || '-'}</strong>
        <small>대기 안내 대상</small>
      </article>
      <article className={`metric-card operation-status-card ${state.missingClassIds.length ? 'status-warn' : ''}`}>
        <span>미도착</span>
        <strong>{state.missingClassIds.length}</strong>
        <small>{missingLabel}</small>
      </article>
      <article className={`metric-card operation-status-card ${incompleteClasses ? 'status-warn' : 'status-done'}`}>
        <span>전체 미완료</span>
        <strong>{incompleteClasses}</strong>
        <small>전체 {summary.totalClasses}학급 중 완료 {summary.completedClasses}학급</small>
      </article>
    </section>
  );
}

function getCurrentStateLabel(state: HealthCheckOperationState) {
  if (state.delayedMinutes > 0) return { label: `${state.delayedMinutes}분 지연`, tone: 'warn' };
  if (state.currentClassId) return { label: '검사 중', tone: 'active' };
  return { label: '대기 중', tone: 'idle' };
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

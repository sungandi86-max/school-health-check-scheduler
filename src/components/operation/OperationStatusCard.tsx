import type { HealthCheckOperationState } from '../../types/healthCheck';
import { getOperationSummary } from '../../lib/operation';

export function OperationStatusCard({ state, classIds, expectedEndTime }: { state: HealthCheckOperationState; classIds: string[]; expectedEndTime?: string }) {
  const summary = getOperationSummary(state, classIds);
  const remainingClasses = Math.max(summary.totalClasses - summary.completedClasses, 0);
  const currentState = getCurrentStateLabel(state);
  const nextAfterClassId = getNextAfterClassId(state.nextClassId, classIds);
  const missingLabel = state.missingClassIds.length ? state.missingClassIds.join(', ') : '없음';
  const expectedEndLabel = expectedEndTime || (summary.totalClasses ? '진행 기준 확인' : '학급 목록 없음');

  return (
    <section className="operation-status-grid">
      <article className="metric-card operation-status-card">
        <span>현재 학급</span>
        <strong>{state.currentClassId || '-'}</strong>
        <small>{currentState.label} · 마지막 업데이트 {formatUpdatedAt(state.updatedAt)}</small>
      </article>
      <article className="metric-card operation-status-card">
        <span>다음 학급</span>
        <strong>{state.nextClassId || '-'}</strong>
        <small>다다음 {nextAfterClassId || '-'}</small>
      </article>
      <article className="metric-card operation-status-card status-done">
        <span>진행률</span>
        <strong>{summary.progressPercent}%</strong>
        <small>완료 {summary.completedClasses} / 전체 {summary.totalClasses}학급</small>
      </article>
      <article className={`metric-card operation-status-card ${remainingClasses ? 'status-idle' : 'status-done'}`}>
        <span>남은 학급</span>
        <strong>{remainingClasses}</strong>
        <small>완료되지 않은 학급 수</small>
      </article>
      <article className={`metric-card operation-status-card ${state.delayedMinutes > 0 ? 'status-danger' : ''}`}>
        <span>예상 종료</span>
        <strong>{state.delayedMinutes > 0 ? `${state.delayedMinutes}분 지연` : expectedEndLabel}</strong>
        <small>{state.delayedMinutes > 0 ? '현재 학급 지연 상태' : '운영센터 진행 기준'}</small>
      </article>
      <article className={`metric-card operation-status-card exception ${state.missingClassIds.length ? 'status-warn' : ''}`}>
        <span>미도착 학급</span>
        <strong>{state.missingClassIds.length}</strong>
        <small>{missingLabel}</small>
      </article>
    </section>
  );
}

function getCurrentStateLabel(state: HealthCheckOperationState) {
  if (state.delayedMinutes > 0) return { label: `${state.delayedMinutes}분 지연`, tone: 'warn' };
  if (state.currentClassId) return { label: '검사 중', tone: 'active' };
  return { label: '대기 중', tone: 'idle' };
}

function getNextAfterClassId(nextClassId: string, classIds: string[]) {
  if (!nextClassId) return '';
  const index = classIds.indexOf(nextClassId);
  return index >= 0 ? classIds[index + 1] || '' : '';
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

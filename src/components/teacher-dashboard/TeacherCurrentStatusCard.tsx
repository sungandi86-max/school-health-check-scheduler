import type { HealthCheckOperationState } from '../../types/healthCheck';

export function TeacherCurrentStatusCard({ state }: { state: HealthCheckOperationState }) {
  const urgentClass = state.missingClassIds[0] || state.currentClassId || state.nextClassId || '-';
  const urgentLabel = state.missingClassIds.length ? '미도착 학급 먼저 확인' : state.currentClassId ? '현재 검사 진행 학급' : '다음 검사 예정 학급';

  return (
    <section className="teacher-priority-grid">
      <article className="teacher-status-card highlight teacher-status-card-primary">
        <span>지금 이동 필요한 학급</span>
        <strong>{urgentClass}</strong>
        <small>{urgentLabel}</small>
      </article>
      <article className="teacher-status-card">
        <span>현재 검사 학급</span>
        <strong>{state.currentClassId || '-'}</strong>
        <small>검진 장소에서 진행 중</small>
      </article>
      <article className="teacher-status-card">
        <span>다음 검사 학급</span>
        <strong>{state.nextClassId || '-'}</strong>
        <small>수업 중 해당 학생 이동 준비</small>
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

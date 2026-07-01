import type { HealthCheckOperationState } from '../../types/healthCheck';

export function TeacherCurrentStatusCard({ state }: { state: HealthCheckOperationState }) {
  const urgentClass = state.missingClassIds[0] || state.currentClassId || state.nextClassId || '-';
  const urgentLabel = state.missingClassIds.length
    ? '미도착 학급은 먼저 이동 여부를 확인해 주세요'
    : state.currentClassId
      ? '현재 검진 장소에서 검사 중입니다'
      : state.nextClassId
        ? '다음 순서입니다. 보건실 안내를 기다려 주세요'
        : '보건실 안내 대기 중입니다';

  return (
    <section className="teacher-priority-grid">
      <article className="teacher-status-card highlight teacher-status-card-primary">
        <span>지금 보내도 되나요?</span>
        <strong>{urgentClass}</strong>
        <small>{urgentLabel}</small>
      </article>
      <article className="teacher-status-card">
        <span>현재 어떤 학급이 검사 중인가요?</span>
        <strong>{state.currentClassId || '-'}</strong>
        <small>현재 이동/검사 학급</small>
      </article>
      <article className="teacher-status-card">
        <span>다음 검사 예정 학급</span>
        <strong>{state.nextClassId || '-'}</strong>
        <small>우리 반이 다음 순서인지 확인해 주세요</small>
      </article>
      <article className={`teacher-status-card ${state.delayedMinutes > 0 ? 'warn' : ''}`}>
        <span>예정 대비 지연</span>
        <strong>{state.delayedMinutes}분</strong>
        <small>마지막 업데이트 {formatUpdatedAt(state.updatedAt)}</small>
      </article>
      <article className={`teacher-status-card teacher-missing-status ${state.missingClassIds.length > 0 ? 'warn' : ''}`}>
        <span>미도착 학급</span>
        <strong>{state.missingClassIds.length ? state.missingClassIds.join(', ') : '없음'}</strong>
        <small>이동 안내가 필요한 학급</small>
      </article>
    </section>
  );
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

import type { HealthCheckOperationState } from '../../types/healthCheck';

export function TeacherMissingClassAlert({ state }: { state: HealthCheckOperationState }) {
  const hasMissing = state.missingClassIds.length > 0;

  return (
    <section className={`teacher-missing-alert ${hasMissing ? 'active' : ''}`}>
      <div>
        <p className="eyebrow">미도착 학급</p>
        <h2>{hasMissing ? state.missingClassIds.join(', ') : '현재 미도착 학급 없음'}</h2>
      </div>
      <p>
        {hasMissing
          ? `${state.missingClassIds.join(', ')} 학급은 보건실 안내에 따라 검진 장소 이동 여부를 확인해 주세요.`
          : '현재 별도로 이동 안내가 필요한 미도착 학급은 없습니다.'}
      </p>
    </section>
  );
}

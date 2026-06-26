import type { HealthCheckOperationState } from '../../types/healthCheck';

export function TeacherMissingClassAlert({ state }: { state: HealthCheckOperationState }) {
  return (
    <section className={`teacher-missing-alert ${state.missingClassIds.length ? 'active' : ''}`}>
      <div>
        <p className="eyebrow">미도착 안내</p>
        <h2>{state.missingClassIds.length ? state.missingClassIds.join(', ') : '미도착 학급 없음'}</h2>
      </div>
      <p>
        {state.missingClassIds.length
          ? `${state.missingClassIds.join(', ')} 학생이 수업 중인 경우 검진 장소로 이동할 수 있도록 안내 부탁드립니다.`
          : '현재 별도로 이동 안내가 필요한 미도착 학급이 없습니다.'}
      </p>
    </section>
  );
}

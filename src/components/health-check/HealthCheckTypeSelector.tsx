import type { HealthCheckType } from '../../types/healthCheck';
import { HEALTH_CHECK_TYPES } from '../../lib/healthCheck';

export function HealthCheckTypeSelector({ onSelect }: { onSelect: (checkType: HealthCheckType) => void }) {
  return (
    <section className="type-card-grid">
      {HEALTH_CHECK_TYPES.filter((item) => item.isEnabled).map((item) => (
        <div className="type-card" key={item.id}>
          <span className="mode-pill">{item.operationMode === 'move' ? '이동형 검사' : '방문형 검사'}</span>
          <h2>{item.label} 시간표 만들기</h2>
          <p>{item.description}</p>
          <button className="primary" onClick={() => onSelect(item.id)}>
            {item.shortLabel} 시작
          </button>
        </div>
      ))}
    </section>
  );
}

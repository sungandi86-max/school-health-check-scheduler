import type { HealthCheckType } from '../../types/healthCheck';
import { getHealthCheckDefinition } from '../../lib/healthCheck';

export function HealthCheckSummary({
  checkType,
  examDate,
}: {
  checkType: HealthCheckType;
  examDate: string;
}) {
  const definition = getHealthCheckDefinition(checkType);

  return (
    <div className="health-check-summary">
      <span>{definition.label}</span>
      <strong>{examDate || '-'}</strong>
      <small>{definition.operationMode === 'move' ? '이동형 운영' : '방문형 운영'}</small>
    </div>
  );
}

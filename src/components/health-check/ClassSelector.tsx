import { useId } from 'react';
import { getClassesFromStudents } from '../../lib/roster';
import type { HealthCheckStudent } from '../../types/healthCheck';

export function ClassSelector({
  students,
  value,
  onChange,
}: {
  students: HealthCheckStudent[];
  value: string;
  onChange: (className: string) => void;
}) {
  const classes = getClassesFromStudents(students);
  const selectId = useId();

  return (
    <label className="field" htmlFor={selectId}>
      <span>학년/반 선택</span>
      <select id={selectId} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">학급 선택</option>
        {classes.map((className) => (
          <option key={className} value={className}>
            {className}
          </option>
        ))}
      </select>
    </label>
  );
}

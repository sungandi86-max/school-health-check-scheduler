import { STUDENT_STATUS_LABELS, STUDENT_STATUS_OPTIONS } from '../../lib/roster';
import type { HealthCheckStudent, HealthCheckStudentStatus } from '../../types/healthCheck';
import { StudentStatusBadge } from './StudentStatusBadge';

export function StudentChecklist({
  students,
  selectedClass,
  onStatusChange,
  onMemoChange,
}: {
  students: HealthCheckStudent[];
  selectedClass: string;
  onStatusChange: (studentId: string, status: HealthCheckStudentStatus) => void;
  onMemoChange: (studentId: string, memo: string) => void;
}) {
  const visibleStudents = selectedClass ? students.filter((student) => student.className === selectedClass) : [];

  return (
    <section className="card student-checklist-card" aria-labelledby="student-checklist-title">
      <div>
        <p className="eyebrow">학생 체크</p>
        <h2 id="student-checklist-title">학생 검진 상태 관리</h2>
        <p className="table-description">학생별 검진 상태를 변경하고 필요한 메모를 남길 수 있습니다.</p>
      </div>

      <div className="student-checklist" role="list" aria-label="선택 학급 학생 검진 상태">
        {!students.length && <p className="empty">명렬표가 업로드되지 않았습니다. 먼저 현재 세션에 명렬표를 업로드해 주세요.</p>}
        {students.length > 0 && !selectedClass && <p className="empty">학년/반을 선택해 주세요.</p>}
        {selectedClass && visibleStudents.length === 0 && <p className="empty">선택한 학급의 학생이 없습니다. 명렬표의 학급 표기를 확인해 주세요.</p>}
        {visibleStudents.map((student) => {
          const memoId = `student-memo-${student.id}`;
          return (
            <article className="student-check-row" key={student.id} role="listitem">
              <div className="student-check-identity">
                <strong>{student.number}</strong>
                <span>{student.name}</span>
                <StudentStatusBadge status={student.status} />
              </div>
              <div className="student-status-actions" aria-label={`${student.name} 검진 상태 변경`}>
                {STUDENT_STATUS_OPTIONS.map((status) => (
                  <button
                    type="button"
                    key={status}
                    className={student.status === status ? 'primary' : ''}
                    aria-label={`${student.name} 상태를 ${STUDENT_STATUS_LABELS[status]}로 변경`}
                    aria-pressed={student.status === status}
                    onClick={() => onStatusChange(student.id, status)}
                  >
                    {STUDENT_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
              <label className="sr-only" htmlFor={memoId}>{student.name} 메모</label>
              <input id={memoId} value={student.memo} placeholder="메모" onChange={(event) => onMemoChange(student.id, event.target.value)} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

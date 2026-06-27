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
    <section className="card student-checklist-card">
      <div>
        <p className="eyebrow">학생 체크</p>
        <h2>학생 검진 상태 관리</h2>
        <p className="table-description">학생별 검진 상태를 변경하고 필요한 메모를 남길 수 있습니다.</p>
      </div>

      <div className="student-checklist">
        {!students.length && <p className="empty">명렬표가 업로드되지 않았습니다. 먼저 현재 세션에 명렬표를 업로드해 주세요.</p>}
        {students.length > 0 && !selectedClass && <p className="empty">학년/반을 선택해 주세요.</p>}
        {selectedClass && visibleStudents.length === 0 && <p className="empty">선택한 학급의 학생이 없습니다. 명렬표의 학급 표기를 확인해 주세요.</p>}
        {visibleStudents.map((student) => (
          <article className="student-check-row" key={student.id}>
            <div className="student-check-identity">
              <strong>{student.number}</strong>
              <span>{student.name}</span>
              <StudentStatusBadge status={student.status} />
            </div>
            <div className="student-status-actions">
              {STUDENT_STATUS_OPTIONS.map((status) => (
                <button
                  type="button"
                  key={status}
                  className={student.status === status ? 'primary' : ''}
                  onClick={() => onStatusChange(student.id, status)}
                >
                  {STUDENT_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
            <input value={student.memo} placeholder="메모" onChange={(event) => onMemoChange(student.id, event.target.value)} />
          </article>
        ))}
      </div>
    </section>
  );
}

import { STUDENT_STATUS_OPTIONS } from '../../lib/roster';
import type { HealthCheckStudent, HealthCheckStudentStatus, HealthCheckType } from '../../types/healthCheck';
import { StudentStatusBadge } from './StudentStatusBadge';
import { getStudentStatusLabel } from './studentStatusCopy';

export function StudentChecklist({
  students,
  selectedClass,
  checkType,
  onStatusChange,
  onMemoChange,
}: {
  students: HealthCheckStudent[];
  selectedClass: string;
  checkType?: HealthCheckType;
  onStatusChange: (studentId: string, status: HealthCheckStudentStatus) => void;
  onMemoChange: (studentId: string, memo: string) => void;
}) {
  const visibleStudents = selectedClass ? students.filter((student) => student.className === selectedClass) : [];

  return (
    <section className="card student-checklist-card" aria-labelledby="student-checklist-title">
      <div>
        <p className="eyebrow">현장 모드</p>
        <h2 id="student-checklist-title">명렬표 상태 체크</h2>
        <p className="table-description">검진 현장에서 명렬표를 보며 학생별 상태를 빠르게 체크합니다. 결핵검진은 검진 완료 여부를, 소변검사는 검체 제출 여부를 확인하는 용도로 사용할 수 있습니다.</p>
        <p className="table-description">운영 준비와 시간표 생성은 PC에서 진행하고, 현장 모드는 검진 당일 체크용으로 사용하세요. 체크 결과는 운영센터와 현황판에 반영됩니다.</p>
      </div>

      <div className="student-checklist" role="list" aria-label="선택 학급 현장 모드 학생 상태">
        {!students.length && <p className="empty">아직 학생 명렬표가 없습니다. 위의 명렬표 업로드에서 엑셀 또는 CSV 파일을 먼저 올려 주세요.</p>}
        {students.length > 0 && !selectedClass && <p className="empty">체크할 학급을 선택하면 학생 목록이 표시됩니다.</p>}
        {selectedClass && visibleStudents.length === 0 && <p className="empty">선택한 학급의 학생이 없습니다. 명렬표의 학년/반 표기를 확인해 주세요.</p>}
        {visibleStudents.map((student) => {
          const memoId = `student-memo-${student.id}`;
          const exceptionHint = getExceptionHint(student.status);
          return (
            <article className={`student-check-row status-${student.status}`} key={student.id} role="listitem">
              <div className="student-check-identity">
                <strong>{student.number}</strong>
                <span>{student.name}</span>
                <StudentStatusBadge status={student.status} checkType={checkType} />
                {exceptionHint && <small className="student-exception-hint">{exceptionHint}</small>}
              </div>
              <div className="student-status-actions" aria-label={`${student.name} 검진 상태 변경`}>
                {STUDENT_STATUS_OPTIONS.map((status) => (
                  <button
                    type="button"
                    key={status}
                    className={`status-action-${status} ${student.status === status ? 'primary' : ''}`}
                    aria-label={`${student.name} 상태를 ${getStudentStatusLabel(status, checkType)}로 변경`}
                    aria-pressed={student.status === status}
                    onClick={() => onStatusChange(student.id, status)}
                  >
                    {getStudentStatusLabel(status, checkType)}
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

function getExceptionHint(status: HealthCheckStudentStatus) {
  if (status === 'absent') return '결석 처리: 현재 확인 대상에서 제외';
  if (status === 'late' || status === 'earlyLeave' || status === 'deferred') return '확인 필요: 완료 학생과 별도 확인';
  return '';
}

import type { HealthCheckOperationState, HealthCheckStudent } from '../../types/healthCheck';
import { getClassStudentStats, normalizeOperationClassId } from '../../lib/operation';

export function ClassProgressList({
  classIds,
  state,
  students,
  onSetCurrent,
  onComplete,
  onMissing,
  onClearMissing,
}: {
  classIds: string[];
  state: HealthCheckOperationState;
  students: HealthCheckStudent[];
  onSetCurrent: (classId: string) => void;
  onComplete: (classId: string) => void;
  onMissing: (classId: string) => void;
  onClearMissing: (classId: string) => void;
}) {
  return (
    <section className="card class-progress-card" aria-labelledby="class-progress-title">
      <div className="section-title compact">
        <h2 id="class-progress-title">학급 진행 관리</h2>
      </div>
      <div className="class-progress-list" role="list" aria-label="학급별 검진 진행 상태">
        {classIds.length === 0 && <p className="empty">명렬표를 업로드하면 학급 목록이 표시됩니다.</p>}
        {classIds.map((classId) => {
          const status = getClassStatus(classId, state);
          const stats = getClassStudentStats(students, classId);
          const absentCount = students.filter((student) => normalizeOperationClassId(student.className) === classId && student.status === 'absent').length;
          return (
            <article className={`class-progress-row status-${status}`} key={classId} role="listitem">
              <div>
                <strong>{classId}</strong>
                <span>상태: {CLASS_STATUS_LABELS[status]}</span>
                {stats.hasRoster && <small>완료 {stats.completed}명 / 미검 {stats.incomplete}명</small>}
                {absentCount > 0 && <small className="class-exception-note">결석 {absentCount}명은 현재 검진 대상에서 제외 확인</small>}
              </div>
              <div className="class-progress-actions" aria-label={`${classId} 운영 처리 버튼`}>
                <button type="button" className="class-action-current" aria-label={`${classId}을 현재 검사 학급으로 지정`} onClick={() => onSetCurrent(classId)}>
                  현재 반 지정
                </button>
                <button type="button" className="class-action-complete" aria-label={`${classId} 검진 완료 처리`} onClick={() => onComplete(classId)}>
                  {status === 'active' ? '현재 반 완료' : '완료'}
                </button>
                {status === 'missing' ? (
                  <button type="button" className="class-action-clear" aria-label={`${classId} 미도착 표시 해제`} onClick={() => onClearMissing(classId)}>
                    미도착 해제
                  </button>
                ) : (
                  <button type="button" className="class-action-missing" aria-label={`${classId} 미도착 학급으로 표시`} onClick={() => onMissing(classId)}>
                    {status === 'active' ? '미도착 표시' : '미도착'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const CLASS_STATUS_LABELS = {
  waiting: '대기',
  active: '진행 중',
  completed: '완료',
  missing: '미도착',
} as const;

function getClassStatus(classId: string, state: HealthCheckOperationState): keyof typeof CLASS_STATUS_LABELS {
  if (state.currentClassId === classId) return 'active';
  if (state.completedClassIds.includes(classId)) return 'completed';
  if (state.missingClassIds.includes(classId)) return 'missing';
  return 'waiting';
}

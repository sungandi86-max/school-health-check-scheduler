import type { HealthCheckOperationState, HealthCheckStudent } from '../../types/healthCheck';
import { getClassStudentStats } from '../../lib/operation';

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
    <section className="card class-progress-card">
      <div className="section-title compact">
        <h2>학급 진행 관리</h2>
      </div>
      <div className="class-progress-list">
        {classIds.length === 0 && <p className="empty">명렬표를 업로드하면 학급 목록이 표시됩니다.</p>}
        {classIds.map((classId) => {
          const status = getClassStatus(classId, state);
          const stats = getClassStudentStats(students, classId);
          return (
            <article className={`class-progress-row status-${status}`} key={classId}>
              <div>
                <strong>{classId}</strong>
                <span>{CLASS_STATUS_LABELS[status]}</span>
                {stats.hasRoster && <small>완료 {stats.completed}명 / 미검 {stats.incomplete}명</small>}
              </div>
              <div className="class-progress-actions">
                <button type="button" onClick={() => onSetCurrent(classId)}>현재 검사로 지정</button>
                <button type="button" onClick={() => onComplete(classId)}>완료 처리</button>
                {status === 'missing' ? (
                  <button type="button" onClick={() => onClearMissing(classId)}>미도착 해제</button>
                ) : (
                  <button type="button" onClick={() => onMissing(classId)}>미도착 표시</button>
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
  active: '진행중',
  completed: '완료',
  missing: '미도착',
} as const;

function getClassStatus(classId: string, state: HealthCheckOperationState): keyof typeof CLASS_STATUS_LABELS {
  if (state.currentClassId === classId) return 'active';
  if (state.completedClassIds.includes(classId)) return 'completed';
  if (state.missingClassIds.includes(classId)) return 'missing';
  return 'waiting';
}

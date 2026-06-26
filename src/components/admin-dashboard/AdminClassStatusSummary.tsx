export interface AdminClassStatusRow {
  classId: string;
  status: 'waiting' | 'inProgress' | 'completed' | 'missing';
  totalStudents: number;
  completedStudents: number;
  incompleteStudents: number;
}

const CLASS_STATUS_LABELS: Record<AdminClassStatusRow['status'], string> = {
  waiting: '대기',
  inProgress: '진행중',
  completed: '완료',
  missing: '미도착',
};

export function AdminClassStatusSummary({ rows }: { rows: AdminClassStatusRow[] }) {
  const total = rows.length;
  const completed = rows.filter((row) => row.status === 'completed').length;
  const missing = rows.filter((row) => row.status === 'missing').length;
  const inProgress = rows.filter((row) => row.status === 'inProgress').length;

  return (
    <section className="admin-class-status-summary">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">학급 기준</p>
          <h2>학급 진행 요약</h2>
        </div>
      </div>
      <div className="admin-status-grid">
        <span>전체 {total}</span>
        <span>완료 {completed}</span>
        <span>진행중 {inProgress}</span>
        <span>미도착 {missing}</span>
      </div>
      <div className="admin-class-list">
        {rows.length ? rows.map((row) => (
          <article key={row.classId} className={`admin-class-row ${row.status}`}>
            <strong>{row.classId}</strong>
            <span>{CLASS_STATUS_LABELS[row.status]}</span>
            <small>완료 {row.completedStudents}명 / 미검 {row.incompleteStudents}명</small>
          </article>
        )) : <p className="empty">표시할 학급 데이터가 없습니다.</p>}
      </div>
    </section>
  );
}

interface AdminProgressCardsProps {
  studentTotal: number;
  completedStudents: number;
  incompleteStudents: number;
  classTotal: number;
  completedClasses: number;
  missingClasses: number;
  delayedMinutes: number;
}

export function AdminProgressCards({
  studentTotal,
  completedStudents,
  incompleteStudents,
  classTotal,
  completedClasses,
  missingClasses,
  delayedMinutes,
}: AdminProgressCardsProps) {
  const progressPercent = studentTotal ? Math.round((completedStudents / studentTotal) * 100) : 0;

  return (
    <section className="admin-progress-grid" aria-label="전체 검진 진행 요약">
      <article className="admin-progress-card primary">
        <span>진행률</span>
        <strong>{progressPercent}%</strong>
        <small>학생 완료 기준</small>
      </article>
      <article className="admin-progress-card">
        <span>완료 학생</span>
        <strong>{completedStudents} / {studentTotal}</strong>
        <small>명렬표 등록 학생</small>
      </article>
      <article className="admin-progress-card warn">
        <span>미검 학생</span>
        <strong>{incompleteStudents}</strong>
        <small>확인 또는 추가 안내 필요</small>
      </article>
      <article className="admin-progress-card">
        <span>완료 학급</span>
        <strong>{completedClasses} / {classTotal}</strong>
        <small>운영센터 처리 기준</small>
      </article>
      <article className="admin-progress-card warn">
        <span>미도착 학급</span>
        <strong>{missingClasses}</strong>
        <small>현장 확인 필요</small>
      </article>
      <article className={`admin-progress-card ${delayedMinutes > 0 ? 'danger' : ''}`}>
        <span>지연 시간</span>
        <strong>{delayedMinutes}분</strong>
        <small>{delayedMinutes > 0 ? '일정 지연 중' : '지연 없음'}</small>
      </article>
    </section>
  );
}

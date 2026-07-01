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
        <span>전체 진행률</span>
        <strong>{progressPercent}%</strong>
        <small>어디까지 진행됐는지 학생 완료 기준으로 표시</small>
      </article>
      <article className="admin-progress-card">
        <span>완료 학생</span>
        <strong>{completedStudents} / {studentTotal}</strong>
        <small>명렬표 등록 학생 기준</small>
      </article>
      <article className="admin-progress-card warn">
        <span>미검 학생</span>
        <strong>{incompleteStudents}</strong>
        <small>아직 완료 처리되지 않은 학생 수</small>
      </article>
      <article className="admin-progress-card">
        <span>완료 학급</span>
        <strong>{completedClasses} / {classTotal}</strong>
        <small>학급 단위 진행 현황</small>
      </article>
      <article className="admin-progress-card warn">
        <span>미도착 학급</span>
        <strong>{missingClasses}</strong>
        <small>{missingClasses ? '현장 확인 필요' : '미도착 학급 없음'}</small>
      </article>
      <article className={`admin-progress-card ${delayedMinutes > 0 ? 'danger' : ''}`}>
        <span>지연 여부</span>
        <strong>{delayedMinutes}분</strong>
        <small>{delayedMinutes > 0 ? '일정 지연 중' : '정상 진행 중'}</small>
      </article>
    </section>
  );
}

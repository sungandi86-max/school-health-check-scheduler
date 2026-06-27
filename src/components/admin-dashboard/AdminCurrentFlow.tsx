interface AdminCurrentFlowProps {
  currentClassId: string;
  nextClassId: string;
  missingClassIds: string[];
  delayedMinutes: number;
}

export function AdminCurrentFlow({ currentClassId, nextClassId, missingClassIds, delayedMinutes }: AdminCurrentFlowProps) {
  return (
    <section className="admin-current-flow" aria-label="현재 검진 흐름">
      <article className="admin-flow-card active">
        <span>현재 검사 학급</span>
        <strong>{currentClassId || '-'}</strong>
      </article>
      <article className="admin-flow-card next">
        <span>다음 검사 학급</span>
        <strong>{nextClassId || '-'}</strong>
      </article>
      <article className="admin-flow-card missing">
        <span>미도착 학급</span>
        <strong>{missingClassIds.length ? `${missingClassIds.length}개 학급` : '없음'}</strong>
        {missingClassIds.length > 0 && (
          <div className="admin-missing-list" aria-label="미도착 학급 목록">
            {missingClassIds.map((classId) => <b key={classId}>{classId}</b>)}
          </div>
        )}
      </article>
      <article className={`admin-flow-card delay ${delayedMinutes > 0 ? 'danger' : ''}`}>
        <span>지연 여부</span>
        <strong>{delayedMinutes > 0 ? `${delayedMinutes}분 지연` : '정상 진행'}</strong>
      </article>
    </section>
  );
}

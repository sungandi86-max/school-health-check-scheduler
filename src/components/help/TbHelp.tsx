const tbConditions = [
  '학교 일과표',
  '업체 검진 가능 시간',
  '검진 장소',
  '이동 소요시간',
  '학급/호출단위당 검진 소요시간',
  '학년별 시간 구간',
  '호출 불가 키워드',
  '호출 주의 키워드',
];

const tbSteps = ['검진 장소 입력', '업체 검진 가능 시간 설정', '이동 소요시간 설정', '학년별 시간 구간 설정', '시간표 업로드 또는 입력', '검사 시간표 자동배정하기 클릭', '결과/출력에서 검진팀용 표 또는 교사용 안내표 확인'];

export function TbHelp() {
  return (
    <section className="stack help-page">
      <div className="help-page-header">
        <p className="eyebrow">호출형 검진</p>
        <h2>결핵검진 사용 안내</h2>
        <p>학생들이 검진 장소로 이동하는 호출형 검진 시간표를 만드는 방법입니다.</p>
      </div>
      <section className="help-card">
        <h3>결핵검진은 호출형 검진입니다</h3>
        <p>결핵검진은 학생들이 검진 장소로 이동하여 진행합니다.</p>
      </section>
      <section className="help-card">
        <h3>자동배정에 반영되는 조건</h3>
        <ul>{tbConditions.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="help-card">
        <h3>호출 시간과 검진 예상 시간</h3>
        <p>호출 시간은 학생들이 교실에서 출발해야 하는 시간입니다.</p>
        <p>검진 예상 시간은 검진 장소에서 실제 검진이 진행될 예상 시간입니다.</p>
        <div className="help-formula">호출 시간 = 검진 예상 시간 - 이동 소요시간</div>
      </section>
      <section className="help-card">
        <h3>학년별 시간 구간</h3>
        <p>결핵검진은 오전 2학년, 오후 3학년처럼 학년별 시간 구간을 나누어 배정할 수 있습니다.</p>
      </section>
      <section className="help-card">
        <h3>사용 순서</h3>
        <div className="help-step-grid compact">
          {tbSteps.map((step, index) => (
            <article className="help-step-card" key={step}>
              <span className="help-number">{index + 1}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

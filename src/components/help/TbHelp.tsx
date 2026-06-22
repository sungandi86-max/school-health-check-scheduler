const tbConditions = [
  '검진 대상 학급',
  '업체 검진 가능 시간',
  '검진 장소',
  '이동 소요시간',
  '학급당 검진 소요시간',
  '학년별 시간 구간',
  '선택수업·분반수업 참고자료',
  '혼합수업 처리 방식',
];

const tbSteps = [
  '검진 장소 입력',
  '업체 검진 가능 시간 설정',
  '학년별 시간 구간 설정',
  '학급별 기준 시간표 입력',
  '필요 시 분반·혼합수업 참고자료 업로드',
  '검사 시간표 자동배정하기 클릭',
  '학급별 검진 이동표와 교직원 안내문 확인',
];

export function TbHelp() {
  return (
    <section className="stack help-page">
      <div className="help-page-header">
        <p className="eyebrow">이동형 검진</p>
        <h2>결핵검진 사용 안내</h2>
        <p>결핵검진은 검사자가 교실을 방문하는 방식이 아니라, 검진 대상 학급 학생이 검진 장소로 이동하는 방식입니다.</p>
      </div>
      <section className="help-card">
        <h3>학급 기준 이동표</h3>
        <p>결핵검진 시간표는 현재 수업 장소가 아니라 검진 대상 학급을 기준으로 만듭니다. 참고 수업 장소는 학생 이동 안내를 돕기 위한 보조 정보입니다.</p>
      </section>
      <section className="help-card">
        <h3>자동배정에 반영하는 조건</h3>
        <ul>{tbConditions.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="help-card">
        <h3>혼합수업 처리</h3>
        <p>선택과목·분반수업처럼 여러 학급 또는 여러 학년이 섞인 수업은 최대한 피하되, 시간이 부족하면 해당 검진 대상 학급 학생만 이동하도록 안내문을 생성합니다.</p>
        <p>이미 검진을 완료한 학생은 이후 다른 선택과목 수업 장소에 있더라도 다시 이동하지 않는 것을 기본 안내로 합니다.</p>
      </section>
      <section className="help-card">
        <h3>검진 시간과 이동 안내</h3>
        <p>검진 시간은 검진 장소에서 실제 검진을 시작할 예상 시간입니다. 이동 소요시간은 교직원 안내문과 검진 운영 설명에 참고로 사용됩니다.</p>
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

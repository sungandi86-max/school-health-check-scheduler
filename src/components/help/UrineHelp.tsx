const urineConditions = [
  '학교 일과표',
  '업체 검사 가능 시간',
  '장소당 검사 소요시간',
  '2학년·3학년 동시 진행 여부',
  '학년별 검사 라인',
  '수업 시간표',
  '검사 불가 키워드',
  '검사 주의 키워드',
  '선택과목·이동수업 실제 수업 장소',
  '분반자료가 있을 경우 실제 수업 교실 참고',
];

const urineRules = [
  ['가능', '일반 교실 수업'],
  ['주의', '종합강의실 수업, 혼합학년 수업, 같은 학년 내 여러 학급 혼합 수업'],
  ['불가', '체육, 컴퓨터, 정보, 스생, 체탐 등 검사 진행이 어려운 수업'],
  ['수동확인', '실제 방문 장소가 없거나 매칭이 불명확한 경우'],
];

const urineSteps = ['검사 조건 설정', '방문 장소 확인', '시간표 업로드 또는 입력', '필요 시 분반자료 업로드', '검사 시간표 자동배정하기 클릭', '결과/출력에서 공지용 표 또는 검사팀용 표 확인'];

export function UrineHelp() {
  return (
    <section className="stack help-page">
      <div className="help-page-header">
        <p className="eyebrow">방문형 검사</p>
        <h2>소변검사 사용 안내</h2>
        <p>검사팀이 교실·장소로 방문하는 방식의 소변검사 시간표를 만드는 방법입니다.</p>
      </div>
      <section className="help-card">
        <h3>소변검사는 방문형 검사입니다</h3>
        <p>소변검사는 검사팀이 학생이 있는 교실 또는 수업 장소로 방문하여 진행합니다.</p>
      </section>
      <section className="help-card">
        <h3>자동배정에 반영되는 조건</h3>
        <ul>{urineConditions.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="help-card">
        <h3>배정 가능/주의/불가 기준</h3>
        <div className="help-output-grid">
          {urineRules.map(([title, body]) => (
            <div key={title}>
              <strong>{title}</strong>
              <span>{body}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="help-card">
        <h3>중요한 안내</h3>
        <p>혼합학년 수업이어도 소변검사는 명렬표 확인을 통해 진행할 수 있으므로 기본적으로 주의 표시 후 배정 가능하게 처리합니다.</p>
        <p>종합강의실 수업은 실제 수업 장소 기준으로 표시되며, 필요한 경우 화장실 이동 안내 문구가 비고에 표시됩니다.</p>
      </section>
      <section className="help-card">
        <h3>사용 순서</h3>
        <div className="help-step-grid compact">
          {urineSteps.map((step, index) => (
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

import { OtterMascot } from '../common/OtterMascot';

const flowSteps = [
  ['검사 유형 선택', '소변검사 또는 결핵검진 중 만들 시간표 유형을 선택합니다.'],
  ['검사 조건 설정', '검사일, 업체 검사 가능 시간, 검사 소요시간, 검사 가능 교시를 입력합니다.'],
  ['시간표 입력', '컴시간알리미 엑셀 또는 공통 시간표 서식을 업로드합니다.'],
  ['필요 시 분반자료 확인', '선택과목·이동수업이 많은 학교는 분반자료로 실제 수업 장소를 참고할 수 있습니다. 분반자료는 선택사항입니다.'],
  ['자동배정 실행', '시간표를 입력한 뒤 반드시 “검사 시간표 자동배정하기” 버튼을 눌러야 결과가 생성됩니다.'],
  ['결과 확인 및 출력', '검사팀용 표, 교사용 안내표, 공지용 표, CSV, 인쇄 자료를 목적에 맞게 선택합니다.'],
];

const privacyForbidden = ['학생 이름', '학번', '주민등록번호', '검사 결과', '질병명', '상담 내용', '건강정보'];
const privacyUsed = ['학년', '학급 또는 교실명', '교시별 수업명', '교과교사명', '검사 예정 시간', '검사 장소'];
const outputs = [
  ['전체표', '보건교사용 검토자료'],
  ['검사팀용 표', '실제 진행 순서 확인용'],
  ['교사용 안내표', '담임·교과교사용 공유자료'],
  ['공지용 표', '메신저 또는 온라인 보건실 게시용'],
  ['CSV', '엑셀 편집용'],
  ['인쇄', '바로 출력용'],
];
const faqs = [
  ['시간표를 입력했는데 결과가 안 나와요.', '시간표 입력 후 반드시 “검사 시간표 자동배정하기” 버튼을 눌러야 합니다.'],
  ['컴시간알리미를 사용하지 않아도 되나요?', '네. 공통 시간표 서식을 다운로드해 작성 후 업로드할 수 있습니다.'],
  ['분반자료는 꼭 필요한가요?', '아닙니다. 선택사항입니다. 이동수업이나 선택과목의 실제 수업 장소를 더 정확히 반영하고 싶을 때 사용합니다.'],
  ['이전 작업 데이터가 계속 떠요.', '브라우저에 저장된 작업 데이터가 남아 있는 상태입니다. 첫 화면의 저장 데이터 초기화 기능을 사용할 수 있습니다.'],
  ['결과표는 어떤 걸 공유하면 되나요?', '전체표는 보건교사용 검토자료입니다. 교직원 공유용으로는 교사용 안내표 또는 공지용 표를 권장합니다.'],
];

export function CommonHelp({ onBack }: { onBack: () => void }) {
  return (
    <main className="type-select-screen">
      <div className="type-select-content help-landing">
        <div className="help-top-actions">
          <button onClick={onBack}>처음 화면으로 돌아가기</button>
        </div>
        <section className="type-hero">
          <div>
            <p className="eyebrow">사용 설명</p>
            <h1>사용 설명</h1>
            <p>검진·검사 시간표 자동배정 도우미를 처음 사용하는 선생님을 위한 안내입니다.</p>
          </div>
          <OtterMascot variant="md" className="type-hero-mascot" />
        </section>

        <section className="help-card">
          <h2>이 앱은 어떤 도구인가요?</h2>
          <p>이 앱은 보건교사가 소변검사와 결핵검진 시간표를 조금 더 쉽게 만들 수 있도록 돕는 공개용 Lite 도구입니다.</p>
          <p>학교 일과표, 업체 검사 가능 시간, 수업 시간표를 기준으로 검사 가능 시간을 자동으로 배정합니다.</p>
          <p>학생 이름, 학번, 검사 결과, 질병명 등 개인정보는 입력하지 않고 사용합니다.</p>
        </section>

        <section className="help-card">
          <h2>기본 사용 흐름</h2>
          <div className="help-step-grid">
            {flowSteps.map(([title, body], index) => (
              <article className="help-step-card" key={title}>
                <span className="help-number">{index + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="help-compare-grid">
          <article className="help-card">
            <h2>소변검사</h2>
            <ul>
              <li>방문형 검사</li>
              <li>검사팀이 교실 또는 수업 장소로 방문</li>
              <li>2학년과 3학년 동시 진행 가능</li>
              <li>학년별 라인 배정 가능</li>
              <li>실제 방문 장소 기준 출력</li>
              <li>혼합학년 수업은 명렬표 확인 필요로 표시 가능</li>
            </ul>
          </article>
          <article className="help-card">
            <h2>결핵검진</h2>
            <ul>
              <li>호출형 검진</li>
              <li>학생들이 검진 장소로 이동</li>
              <li>호출 시간과 검진 예상 시간 분리</li>
              <li>학년별 시간 구간 설정 가능</li>
              <li>검진 장소와 이동 소요시간 반영</li>
            </ul>
          </article>
        </section>

        <section className="help-card">
          <h2>개인정보 입력 금지</h2>
          <p>이 앱은 학생 개인정보를 입력하지 않고 사용하는 도구입니다.</p>
          <div className="help-compare-grid">
            <div>
              <h3>입력하지 않는 정보</h3>
              <ul>{privacyForbidden.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <h3>사용하는 정보</h3>
              <ul>{privacyUsed.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </section>

        <section className="help-card">
          <h2>결과표 종류 안내</h2>
          <div className="help-output-grid">
            {outputs.map(([title, body]) => (
              <div key={title}>
                <strong>{title}</strong>
                <span>{body}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="help-card">
          <h2>자주 묻는 질문</h2>
          <div className="help-faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

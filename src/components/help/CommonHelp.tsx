import { OtterMascot } from '../common/OtterMascot';

const operationSteps = [
  {
    title: '1단계. 학교 설정',
    body: '학교명, 기본 검진 장소, 기본 시간, 안내 문구를 설정합니다.',
  },
  {
    title: '2단계. 운영 계획',
    body: '검사 유형을 선택하고 검진일, 검사 가능 시간, 대상 학급을 설정합니다. 소변검사와 일반 건강검진은 운영 계획 중심으로, 결핵검진은 실시간 운영까지 이어지는 흐름으로 준비합니다.',
  },
  {
    title: '3단계. 시간표 생성',
    body: '입력한 조건을 기준으로 학급별 검진 순서와 이동표를 생성합니다.',
  },
  {
    title: '4단계. 실시간 운영',
    body: '결핵검진처럼 학생이 검진 장소로 이동하는 검사는 운영센터에서 현재 학급, 다음 학급, 미도착 학급, 진행률을 관리합니다.',
  },
  {
    title: '5단계. 현황 확인 및 보고',
    body: '교사용 현황판, 관리자 현황판, Display Mode, 운영 보고서를 통해 진행 상황을 확인합니다.',
  },
];

const planningItems = [
  ['소변검사', 'HR 시간, 창체 시간 등 학생이 학급에 모여 있는 시간과 연계하여 운영 계획을 세울 수 있습니다.'],
  ['일반 건강검진', '학교 일정에 맞춰 방문형 건강검진 운영을 준비합니다.'],
];

const operationItems = [
  ['결핵검진', '검진 대상 학급 이동, 현재 진행 상황, 미도착 학급, 진행률을 운영센터에서 확인하며 진행합니다.'],
  ['공유 화면', '교사용 현황판, 관리자 현황판, Display Mode는 학급 단위와 통계 중심으로 확인합니다.'],
];

const privacyNotes = [
  '공용 화면에는 학생 이름이나 학번을 표시하지 않습니다.',
  '학생별 명렬표는 운영이 필요한 화면에서만 사용합니다.',
  '소변검사는 학교 상황에 따라 HR 시간, 창체 시간 등 학생이 학급에 모여 있는 시간과 연계하여 운영할 수 있습니다.',
];

const faqs = [
  ['어디서 시작하면 되나요?', '처음에는 학교 설정을 확인한 뒤 검사 유형을 선택하고 운영 계획을 입력해 주세요.'],
  ['시간표 생성은 언제 하나요?', '검진일, 검사 가능 시간, 대상 학급, 시간표 입력을 확인한 뒤 검사 시간표 자동배정 버튼을 눌러 생성합니다.'],
  ['실시간 운영은 모든 검사에 필요한가요?', '학생이 검진 장소로 이동하는 결핵검진처럼 현장 진행 상태를 계속 확인해야 하는 검사에서 특히 유용합니다.'],
  ['공용 화면에 학생 정보가 보이나요?', '교사용 현황판, 관리자 현황판, Display Mode에는 학생 이름이나 학번을 표시하지 않고 학급 단위 정보와 통계만 보여 줍니다.'],
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
            <h1>학생건강검진 운영 도우미 사용 안내</h1>
            <p>학교 건강검진을 계획하고, 검진 당일 운영 상황을 확인하며, 종료 후 보고까지 이어지는 전체 흐름을 안내합니다.</p>
          </div>
          <OtterMascot variant="md" className="type-hero-mascot" />
        </section>

        <section className="help-card">
          <h2>학생건강검진 운영 흐름</h2>
          <p>이 도구는 시간표 생성만을 위한 화면이 아니라 운영 계획, 실시간 운영, 현황 확인과 보고를 함께 지원하는 운영 도우미입니다.</p>
          <div className="help-step-grid">
            {operationSteps.map((step, index) => (
              <article className="help-step-card" key={step.title}>
                <span className="help-number">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="help-compare-grid">
          <article className="help-card">
            <h2>운영 계획</h2>
            <ul>
              {planningItems.map(([title, body]) => (
                <li key={title}>
                  <strong>{title}</strong>
                  <span>{body}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="help-card">
            <h2>실시간 운영</h2>
            <ul>
              {operationItems.map(([title, body]) => (
                <li key={title}>
                  <strong>{title}</strong>
                  <span>{body}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="help-card">
          <h2>공용 화면 개인정보 원칙</h2>
          <ul>
            {privacyNotes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </section>

        <section className="help-card">
          <h2>현황 확인 및 보고</h2>
          <p>검진 당일에는 운영센터와 태블릿 화면에서 진행 상태를 조작하고, 교사용 현황판과 관리자 현황판, Display Mode로 현재 상황을 공유합니다.</p>
          <p>검진 종료 후에는 운영 보고서에서 전체 진행 현황, 확인 필요 학생, 운영 기록을 정리해 내부 기록과 보고에 활용합니다.</p>
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

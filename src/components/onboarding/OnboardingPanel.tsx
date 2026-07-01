import { CheckCircle2 } from 'lucide-react';

export const START_GUIDE_STEPS = [
  '학교 설정',
  '검사별 운영 계획',
  '시간표 생성',
  '실시간 운영',
];

export function StartGuide({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`start-guide-card ${compact ? 'compact' : ''}`} aria-labelledby={compact ? 'dashboard-start-guide-title' : 'entry-start-guide-title'}>
      <div className="start-guide-header">
        <div>
          <p className="eyebrow">운영 순서</p>
          <h2 id={compact ? 'dashboard-start-guide-title' : 'entry-start-guide-title'}>2·3학년 별도검사 운영은</h2>
        </div>
        <span>순서로 진행됩니다.</span>
      </div>
      <ol className="start-guide-steps">
        {START_GUIDE_STEPS.map((step, index) => (
          <li key={step}>
            <span className="start-guide-number">{index + 1}</span>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function OnboardingPanel({ onClose, onDismiss }: { onClose: () => void; onDismiss: () => void }) {
  return (
    <section className="onboarding-panel" aria-labelledby="onboarding-title" role="dialog" aria-modal="false">
      <div className="onboarding-copy">
        <p className="eyebrow">처음 실행 안내</p>
        <h2 id="onboarding-title">처음이라면 이 순서대로 시작하세요</h2>
        <p>
          School Health Hub는 2·3학년 별도검사 준비, 당일 운영, 종료 후 보고서 정리를 한 흐름으로 이어 주는 보건교사용 도구입니다.
        </p>
      </div>
      <div className="onboarding-flow" aria-label="2·3학년 별도검사 운영 흐름">
        <article>
          <CheckCircle2 size={18} aria-hidden="true" />
          <strong>운영 계획</strong>
          <span>학교 설정과 검사별 조건을 확인하고 시간표를 준비합니다.</span>
        </article>
        <article>
          <CheckCircle2 size={18} aria-hidden="true" />
          <strong>실시간 운영</strong>
          <span>운영센터에서 현재/다음 학급을 지정하고 교사용 현황판을 공유합니다.</span>
        </article>
        <article>
          <CheckCircle2 size={18} aria-hidden="true" />
          <strong>운영 종료</strong>
          <span>미검 학생과 운영 로그를 확인한 뒤 보고서를 출력하거나 PDF로 보관합니다.</span>
        </article>
      </div>
      <div className="onboarding-actions">
        <button type="button" className="primary" onClick={onClose}>가이드 확인</button>
        <button type="button" className="ghost" onClick={onDismiss}>다시 보지 않기</button>
      </div>
    </section>
  );
}
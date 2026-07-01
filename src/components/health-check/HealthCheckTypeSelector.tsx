import type { HealthCheckType } from '../../types/healthCheck';
import { HEALTH_CHECK_TYPES } from '../../lib/healthCheck';

const HOME_CARD_COPY: Record<HealthCheckType, { role: string; title: string; description: string; button: string }> = {
  urine: {
    role: '운영 계획 · Planning',
    title: '소변검사 운영 계획',
    description: '학생이 학급에 모여 있는 시간과 검사팀 동선을 고려하여 학교 상황에 맞는 운영 계획을 준비합니다.',
    button: '운영 계획 시작',
  },
  tuberculosis: {
    role: '실시간 운영 · Operation',
    title: '결핵검진 실시간 운영',
    description: '검진 대상 학급 이동, 현재 진행 상황, 운영 현황을 실시간으로 관리합니다.',
    button: '운영 시작',
  },
  general: {
    role: '운영 계획 · Planning',
    title: '일반 건강검진 운영 계획',
    description: '학교 일정에 맞춰 방문형 건강검진 운영을 준비합니다.',
    button: '운영 계획 시작',
  },
  other: {
    role: '운영 계획 · Planning',
    title: '기타 검진 운영 계획',
    description: '추가 검진 유형을 준비합니다.',
    button: '운영 계획 시작',
  },
};

export function HealthCheckTypeSelector({ onSelect }: { onSelect: (checkType: HealthCheckType) => void }) {
  return (
    <section className="type-card-grid">
      {HEALTH_CHECK_TYPES.filter((item) => item.isEnabled).map((item) => {
        const copy = HOME_CARD_COPY[item.id];
        return (
          <div className={`type-card type-card-${item.id}`} key={item.id}>
            <span className="mode-pill">{copy.role}</span>
            <h2>{copy.title}</h2>
            <p>{copy.description}</p>
            <button className="primary" onClick={() => onSelect(item.id)}>
              {copy.button}
            </button>
          </div>
        );
      })}
    </section>
  );
}

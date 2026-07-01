import type { HealthCheckType } from '../../types/healthCheck';
import { HEALTH_CHECK_TYPES } from '../../lib/healthCheck';

const HOME_CARD_COPY: Record<HealthCheckType, { role: string; title: string; description: string; button: string }> = {
  urine: {
    role: '방문형 검사 · Planning',
    title: '① 소변검사 운영 계획',
    description: '학생이 원반으로 운영되는 시간과 검사팀 동선을 고려하여 학교 상황에 맞는 운영 계획을 준비합니다.',
    button: '운영 계획 시작',
  },
  tuberculosis: {
    role: '호출형 검진 · Operation',
    title: '② 결핵검진 실시간 운영',
    description: '현재 검사 학급, 다음 이동 학급, 운영 진행 상황을 실시간으로 관리합니다.',
    button: '운영 시작',
  },
  general: {
    role: '현황 확인 · Dashboard',
    title: '③ 운영 현황판',
    description: '별도검사 진행률과 현재 운영 현황을 관리자와 교직원이 한눈에 확인합니다.',
    button: '운영 현황 보기',
  },
  other: {
    role: '운영 계획 · Planning',
    title: '기타 별도검사 운영 계획',
    description: '학교 상황에 맞는 별도검사 운영 계획을 준비합니다.',
    button: '운영 계획 시작',
  },
};

export function HealthCheckTypeSelector({
  onSelect,
  onOpenStatusDashboard,
}: {
  onSelect: (checkType: HealthCheckType) => void;
  onOpenStatusDashboard: () => void;
}) {
  return (
    <section className="type-card-grid">
      {HEALTH_CHECK_TYPES.filter((item) => item.isEnabled).map((item) => {
        const copy = HOME_CARD_COPY[item.id];
        return (
          <div className={`type-card type-card-${item.id}`} key={item.id}>
            <span className="mode-pill">{copy.role}</span>
            <h2>{copy.title}</h2>
            <p>{copy.description}</p>
            <button className="primary" onClick={() => (item.id === 'general' ? onOpenStatusDashboard() : onSelect(item.id))}>
              {copy.button}
            </button>
          </div>
        );
      })}
    </section>
  );
}

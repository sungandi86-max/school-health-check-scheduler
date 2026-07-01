import type { HealthCheckType } from '../../types/healthCheck';
import { HEALTH_CHECK_TYPES } from '../../lib/healthCheck';

const HOME_CARD_COPY: Record<HealthCheckType, { role: string; title: string; description: string; button: string }> = {
  urine: {
    role: '운영 계획',
    title: '소변검사 계획 만들기',
    description: '학급별 방문 순서와 시간표를 먼저 정리합니다.',
    button: '소변검사 계획 시작',
  },
  tuberculosis: {
    role: '실시간 운영',
    title: '결핵검진 운영 시작',
    description: '현재 학급, 다음 학급, 미도착과 지연 상황을 관리합니다.',
    button: '결핵검진 운영 시작',
  },
  general: {
    role: '현황 공유',
    title: '운영 현황판 보기',
    description: '보건실 또는 교무실 화면에 진행 상황을 크게 표시합니다.',
    button: '운영 현황 보기',
  },
  other: {
    role: '운영 계획',
    title: '기타 별도검사 계획',
    description: '학교 상황에 맞는 별도검사 운영 계획을 준비합니다.',
    button: '운영 계획 시작',
  },
};

export function HealthCheckTypeSelector({
  onSelect,
  onOpenStatusDashboard,
}: {
  onSelect: (checkType: HealthCheckType) => void;
  onOpenStatusDashboard: (mode: 'portrait' | 'landscape') => void;
}) {
  return (
    <section className="type-card-grid" aria-label="검사 유형 선택">
      {HEALTH_CHECK_TYPES.filter((item) => item.isEnabled).map((item) => {
        const copy = HOME_CARD_COPY[item.id];
        return (
          <div className={`type-card type-card-${item.id}`} key={item.id}>
            <span className="mode-pill">{copy.role}</span>
            <h2>{copy.title}</h2>
            <p>{copy.description}</p>
            {item.id === 'general' ? (
              <div className="type-card-actions" aria-label="운영 현황판 종류 선택">
                <button className="primary" onClick={() => onOpenStatusDashboard('portrait')}>
                  보건실 현황판
                </button>
                <button onClick={() => onOpenStatusDashboard('landscape')}>
                  교무실 현황판
                </button>
              </div>
            ) : (
              <button className="primary" onClick={() => onSelect(item.id)}>
                {copy.button}
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

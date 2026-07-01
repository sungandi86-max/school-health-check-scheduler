import type { HealthCheckSession } from '../../types/healthCheck';
import { getHealthCheckLabel } from '../../lib/healthCheck';

const SESSION_STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  scheduled: '예정',
  inProgress: '진행중',
  completed: '완료',
  archived: '보관',
};

export function ReportSessionInfo({ session }: { session?: HealthCheckSession }) {
  return (
    <section className="report-card report-session-info">
      <div>
        <p className="eyebrow">보고서 기본 정보</p>
        <h2>{session?.title || '선택된 검진 세션이 없습니다'}</h2>
      </div>
      <dl>
        <div>
          <dt>검사 유형</dt>
          <dd>{session ? getHealthCheckLabel(session.checkType) : '-'}</dd>
        </div>
        <div>
          <dt>검진 날짜</dt>
          <dd>{session?.date || '-'}</dd>
        </div>
        <div>
          <dt>대상 학년</dt>
          <dd>{session?.targetGrades.length ? `${session.targetGrades.join(', ')}학년` : '-'}</dd>
        </div>
        <div>
          <dt>검진 장소</dt>
          <dd>{session?.location || '-'}</dd>
        </div>
        <div>
          <dt>세션 상태</dt>
          <dd>{session ? SESSION_STATUS_LABELS[session.status] ?? session.status : '-'}</dd>
        </div>
      </dl>
    </section>
  );
}

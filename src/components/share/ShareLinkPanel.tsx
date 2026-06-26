import type { HealthCheckSession } from '../../types/healthCheck';
import { buildAdminDashboardUrl, buildReportUrl, buildTeacherDashboardUrl } from '../../lib/share';
import { CopyButton } from './CopyButton';

export function ShareLinkPanel({ session }: { session?: HealthCheckSession }) {
  const teacherUrl = buildTeacherDashboardUrl();
  const adminUrl = buildAdminDashboardUrl();
  const reportUrl = buildReportUrl();

  return (
    <section className="card share-link-panel">
      <div>
        <p className="eyebrow">공유용 화면</p>
        <h2>역할별 화면 링크</h2>
        <p className="table-description">{session?.title ? `${session.title} 기준으로 공유합니다.` : '현재 선택된 검진 세션 기준으로 공유합니다.'}</p>
      </div>
      <div className="share-role-grid">
        <ShareLinkCard
          title="보건교사용 운영센터"
          description="입력/수정, 학생 체크, 운영 상태 변경, 로그 기록"
          urlLabel="현재 화면"
        />
        <ShareLinkCard
          title="교사용 현황판"
          description="보기 전용, 모바일 우선, 수업 중 학생 이동 안내용"
          urlLabel={teacherUrl}
          copyText={teacherUrl}
          copyLabel="교사용 링크 복사"
        />
        <ShareLinkCard
          title="교무실/관리자 현황판"
          description="보기 전용, PC/큰 화면 우선, 전체 진행률 확인용"
          urlLabel={adminUrl}
          copyText={adminUrl}
          copyLabel="교무실 링크 복사"
        />
        <ShareLinkCard
          title="운영 보고서"
          description="검진 종료 후 관리자 보고용 요약 화면"
          urlLabel={reportUrl}
          copyText={reportUrl}
          copyLabel="보고서 링크 복사"
        />
      </div>
      <ShareSecurityNotice />
    </section>
  );
}

export function ShareSecurityNotice() {
  return (
    <div className="share-security-notice">
      <p>이 화면은 보건실에서 입력한 현황을 기준으로 표시됩니다.</p>
      <p>학생 개인정보가 포함될 수 있으므로 외부 공유를 금지합니다.</p>
      <p>링크는 교직원 내부 안내용으로만 사용합니다.</p>
    </div>
  );
}

function ShareLinkCard({
  title,
  description,
  urlLabel,
  copyText,
  copyLabel,
}: {
  title: string;
  description: string;
  urlLabel: string;
  copyText?: string;
  copyLabel?: string;
}) {
  return (
    <article className="share-link-card">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
        <small>{urlLabel}</small>
      </div>
      {copyText && copyLabel && <CopyButton text={copyText}>{copyLabel}</CopyButton>}
    </article>
  );
}

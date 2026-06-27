import type { HealthCheckSession } from '../../types/healthCheck';
import { buildLiroSchoolShareMessage, buildTeacherDashboardUrl } from '../../lib/share';
import { CopyButton } from './CopyButton';

export function ShareMessageBox({ session }: { session?: HealthCheckSession }) {
  const teacherUrl = buildTeacherDashboardUrl();
  const message = buildLiroSchoolShareMessage({ session, teacherDashboardUrl: teacherUrl });

  return (
    <section className="card share-message-box">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">리로스쿨 공유</p>
          <h2>교사용 발송 문구</h2>
        </div>
        <CopyButton text={message}>리로스쿨 발송문 복사</CopyButton>
      </div>
      <pre>{message}</pre>
    </section>
  );
}

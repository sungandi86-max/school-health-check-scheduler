import type { OperationReportSummary } from '../../lib/report';

export function ReportClassSummary({ summary }: { summary: OperationReportSummary['class'] }) {
  return (
    <section className="report-card">
      <p className="eyebrow">전체 진행 현황</p>
      <h2>학급 운영 결과</h2>
      <div className="report-metric-grid">
        <Metric label="전체 학급" value={`${summary.total}개`} />
        <Metric label="완료 학급" value={`${summary.completed}개`} />
        <Metric label="미도착 발생" value={`${summary.missingOccurred}개`} tone={summary.missingOccurred ? 'warn' : 'normal'} />
        <Metric label="지연 시간" value={`${summary.delayedMinutes}분`} tone={summary.delayedMinutes ? 'warn' : 'normal'} />
      </div>
    </section>
  );
}

function Metric({ label, value, tone = 'normal' }: { label: string; value: string; tone?: 'normal' | 'warn' }) {
  return (
    <div className={`report-metric ${tone === 'warn' ? 'warn' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

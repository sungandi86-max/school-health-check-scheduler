import type { OperationReportSummary } from '../../lib/report';

export function ReportClassSummary({ summary }: { summary: OperationReportSummary['class'] }) {
  return (
    <section className="report-card">
      <p className="eyebrow">학급 현황</p>
      <h2>학급 진행 요약</h2>
      <div className="report-metric-grid">
        <Metric label="전체 학급" value={`${summary.total}개`} />
        <Metric label="완료 학급" value={`${summary.completed}개`} />
        <Metric label="미도착 발생" value={`${summary.missingOccurred}개`} />
        <Metric label="지연 시간" value={`${summary.delayedMinutes}분`} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="report-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

import type { OperationReportSummary } from '../../lib/report';

export function ReportStudentSummary({ summary }: { summary: OperationReportSummary['student'] }) {
  return (
    <section className="report-card">
      <p className="eyebrow">학생 현황</p>
      <h2>검진 대상자 요약</h2>
      <div className="report-metric-grid">
        <Metric label="전체 대상자" value={`${summary.total}명`} />
        <Metric label="완료자" value={`${summary.completed}명`} />
        <Metric label="미검자" value={`${summary.incomplete}명`} />
        <Metric label="결석" value={`${summary.byStatus.absent}명`} />
        <Metric label="조퇴" value={`${summary.byStatus.earlyLeave}명`} />
        <Metric label="지각" value={`${summary.byStatus.late}명`} />
        <Metric label="추후검진" value={`${summary.byStatus.deferred}명`} />
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

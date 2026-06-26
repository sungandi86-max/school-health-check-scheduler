import { ClipboardList, Clock, Upload } from 'lucide-react';
import { getHealthCheckLabel } from '../../lib/healthCheck';
import type { HealthCheckOperationStatus, HealthCheckType } from '../../types/healthCheck';

export function OperationCenter({
  checkType,
  status,
}: {
  checkType: HealthCheckType;
  status: HealthCheckOperationStatus;
}) {
  const statusCards = [
    { label: '현재 검사반', value: status.currentClass || '-', note: getHealthCheckLabel(checkType) },
    { label: '다음 검사반', value: status.nextClass || '-', note: status.state === 'ready' ? '운영 준비중' : '대기 확인 필요' },
    { label: '예상 종료시간', value: status.expectedEndTime || '-', note: '자동 계산 예정' },
  ];
  const classGroups = [
    { title: '진행중 학급', rows: [status.currentClass || '-'] },
    { title: '완료 학급', rows: status.completedClasses.length ? status.completedClasses : ['-'] },
    { title: '미도착 학급', rows: status.pendingClasses.length ? status.pendingClasses : ['-'] },
    { title: '지연 현황', rows: status.delayedClasses.length ? status.delayedClasses : ['지연 없음'] },
  ];

  return (
    <section className="stack operation-center">
      <div className="operation-header">
        <p className="eyebrow">검진 운영</p>
        <h2>학교 건강검진 운영센터</h2>
      </div>

      <div className="operation-status-grid">
        {statusCards.map((card) => (
          <article className="metric-card operation-status-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.note}</small>
          </article>
        ))}
      </div>

      <div className="operation-layout">
        <section className="card operation-class-panel">
          <div className="section-title compact">
            <h2>학급 진행 현황</h2>
          </div>
          <div className="operation-class-grid">
            {classGroups.map((group) => (
              <article className="operation-class-group" key={group.title}>
                <h3>{group.title}</h3>
                <ul>
                  {group.rows.map((row) => (
                    <li key={`${group.title}-${row}`}>{row}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="card operation-student-panel">
          <div>
            <p className="eyebrow">학생 체크</p>
            <h2>학생 체크 영역</h2>
            <p className="table-description">명렬표 기반 학생 확인 기능이 이 영역에 표시될 예정입니다.</p>
          </div>
          <div className="operation-placeholder">
            <ClipboardList size={34} aria-hidden="true" />
            <span>Placeholder</span>
          </div>
          <button type="button" className="primary">
            <Upload size={17} />
            명렬표 업로드
          </button>
        </section>
      </div>

      <section className="card operation-memo-card">
        <label className="field">
          <span>운영 메모</span>
          <textarea placeholder="검진 운영 중 공유할 메모를 입력하세요." />
        </label>
        <div className="operation-memo-hint">
          <Clock size={16} aria-hidden="true" />
          <span>현재는 화면 구성용 메모 영역이며 저장 기능은 연결되어 있지 않습니다.</span>
        </div>
      </section>
    </section>
  );
}

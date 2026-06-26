import { Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ClassSelector } from '../health-check/ClassSelector';
import { RosterUpload } from '../health-check/RosterUpload';
import { StudentChecklist } from '../health-check/StudentChecklist';
import { StudentStatusSummary } from '../health-check/StudentStatusSummary';
import { getHealthCheckLabel } from '../../lib/healthCheck';
import { getStudentsBySession, saveStudentsBySession, updateStudentMemo, updateStudentStatus } from '../../lib/roster';
import type { HealthCheckOperationStatus, HealthCheckSession, HealthCheckStudent, HealthCheckStudentStatus, HealthCheckType } from '../../types/healthCheck';
import { formatSessionTitle, HealthCheckSessionBadge } from '../health-check/HealthCheckSessionBadge';

export function OperationCenter({
  checkType,
  session,
  status,
}: {
  checkType: HealthCheckType;
  session?: HealthCheckSession;
  status: HealthCheckOperationStatus;
}) {
  const sessionId = session?.id ?? `${checkType}-local-session`;
  const [students, setStudents] = useState<HealthCheckStudent[]>(() => getStudentsBySession(sessionId, checkType));
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    const loaded = getStudentsBySession(sessionId, checkType);
    setStudents(loaded);
    setSelectedClass(loaded[0]?.className ?? '');
  }, [checkType, sessionId]);

  useEffect(() => {
    saveStudentsBySession(sessionId, checkType, students);
  }, [checkType, sessionId, students]);

  const selectedClassStudents = useMemo(
    () => (selectedClass ? students.filter((student) => student.className === selectedClass) : []),
    [selectedClass, students],
  );

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

  const handleUpload = (nextStudents: HealthCheckStudent[]) => {
    setStudents(nextStudents);
    setSelectedClass(nextStudents[0]?.className ?? '');
  };

  const updateStatus = (studentId: string, statusValue: HealthCheckStudentStatus) => {
    setStudents((prev) => updateStudentStatus(prev, studentId, statusValue));
  };

  const updateMemo = (studentId: string, memo: string) => {
    setStudents((prev) => updateStudentMemo(prev, studentId, memo));
  };

  return (
    <section className="stack operation-center">
      <div className="operation-header">
        <p className="eyebrow">검진 운영</p>
        <h2>학교 건강검진 운영센터</h2>
      </div>

      <HealthCheckSessionBadge session={session} />

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

        <section className="operation-student-panel">
          <RosterUpload checkType={checkType} sessionId={sessionId} sessionTitle={session ? formatSessionTitle(session) : undefined} students={students} onUpload={handleUpload} />
          <StudentStatusSummary students={students} />
          <div className="card operation-class-selector-card">
            <ClassSelector students={students} value={selectedClass} onChange={setSelectedClass} />
            <p className="table-description">{selectedClass ? `${selectedClass} 학생 ${selectedClassStudents.length}명` : '명렬표 업로드 후 학급을 선택할 수 있습니다.'}</p>
          </div>
          <StudentChecklist students={students} selectedClass={selectedClass} onStatusChange={updateStatus} onMemoChange={updateMemo} />
        </section>
      </div>

      <section className="card operation-memo-card">
        <label className="field">
          <span>운영 메모</span>
          <textarea placeholder="검진 운영 중 공유할 메모를 입력하세요." />
        </label>
        <div className="operation-memo-hint">
          <Clock size={16} aria-hidden="true" />
          <span>학생 상태와 명렬표는 검사 종류별 localStorage에 저장됩니다.</span>
        </div>
      </section>
    </section>
  );
}

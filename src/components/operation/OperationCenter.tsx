import { useEffect, useMemo, useState } from 'react';
import { ClassSelector } from '../health-check/ClassSelector';
import { RosterUpload } from '../health-check/RosterUpload';
import { StudentChecklist } from '../health-check/StudentChecklist';
import { StudentStatusSummary } from '../health-check/StudentStatusSummary';
import { getHealthCheckLabel } from '../../lib/healthCheck';
import { getClassesFromStudents, getStudentsBySession, saveStudentsBySession, updateStudentMemo, updateStudentStatus } from '../../lib/roster';
import {
  clearClassMissing,
  generateNoticeMessage,
  getOperationState,
  normalizeOperationClassId,
  saveOperationState,
  setClassCompleted,
  setClassMissing,
  setCurrentClass,
  updateDelayedMinutes,
  updateOperationMemo,
} from '../../lib/operation';
import type { HealthCheckOperationStatus, HealthCheckOperationState, HealthCheckSession, HealthCheckStudent, HealthCheckStudentStatus, HealthCheckType } from '../../types/healthCheck';
import { formatSessionTitle, HealthCheckSessionBadge } from '../health-check/HealthCheckSessionBadge';
import { OperationStatusCard } from './OperationStatusCard';
import { ClassProgressList } from './ClassProgressList';
import { OperationSummary } from './OperationSummary';
import { NoticeMessageBox } from './NoticeMessageBox';
import { OperationMemo } from './OperationMemo';

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
  const [operationState, setOperationState] = useState<HealthCheckOperationState>(() => getOperationState(sessionId));
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    const loaded = getStudentsBySession(sessionId, checkType);
    setStudents(loaded);
    setOperationState(getOperationState(sessionId));
    setSelectedClass(loaded[0]?.className ?? '');
  }, [checkType, sessionId]);

  useEffect(() => {
    saveStudentsBySession(sessionId, checkType, students);
  }, [checkType, sessionId, students]);

  useEffect(() => {
    saveOperationState(sessionId, operationState);
  }, [operationState, sessionId]);

  const classIds = useMemo(() => {
    const fromStudents = getClassesFromStudents(students).map(normalizeOperationClassId);
    const fromOperation = [
      operationState.currentClassId,
      operationState.nextClassId,
      ...operationState.completedClassIds,
      ...operationState.missingClassIds,
      ...status.pendingClasses,
      ...status.completedClasses,
      ...status.delayedClasses,
    ].map(normalizeOperationClassId);
    return [...new Set([...fromStudents, ...fromOperation].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
  }, [operationState, status.completedClasses, status.delayedClasses, status.pendingClasses, students]);

  const selectedClassStudents = useMemo(
    () => (selectedClass ? students.filter((student) => normalizeOperationClassId(student.className) === normalizeOperationClassId(selectedClass)) : []),
    [selectedClass, students],
  );

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

  const noticeMessage = generateNoticeMessage(operationState, {
    checkType,
    location: session?.location,
  });

  return (
    <section className="stack operation-center">
      <div className="operation-header">
        <p className="eyebrow">검진 운영</p>
        <h2>학교 건강검진 운영센터</h2>
      </div>

      <section className="card operation-session-card">
        <HealthCheckSessionBadge session={session} />
        {session && (
          <div className="operation-session-details">
            <span>검사 종류: {getHealthCheckLabel(session.checkType)}</span>
            <span>날짜: {session.date || '-'}</span>
            <span>장소: {session.location || '-'}</span>
          </div>
        )}
      </section>

      <OperationStatusCard state={operationState} />

      <div className="operation-control-grid">
        <ClassProgressList
          classIds={classIds}
          state={operationState}
          students={students}
          onSetCurrent={(classId) => setOperationState((prev) => setCurrentClass(prev, classId, classIds))}
          onComplete={(classId) => setOperationState((prev) => setClassCompleted(prev, classId, classIds))}
          onMissing={(classId) => setOperationState((prev) => setClassMissing(prev, classId))}
          onClearMissing={(classId) => setOperationState((prev) => clearClassMissing(prev, classId))}
        />

        <div className="stack">
          <OperationSummary state={operationState} classIds={classIds} />
          <section className="card operation-delay-card">
            <label className="field">
              <span>지연 시간(분)</span>
              <input
                type="number"
                min={0}
                value={operationState.delayedMinutes}
                onChange={(event) => setOperationState((prev) => updateDelayedMinutes(prev, Number(event.target.value)))}
              />
            </label>
          </section>
          <NoticeMessageBox message={noticeMessage} />
        </div>
      </div>

      <div className="operation-layout">
        <section className="operation-student-panel">
          <RosterUpload checkType={checkType} sessionId={sessionId} sessionTitle={session ? formatSessionTitle(session) : undefined} students={students} onUpload={handleUpload} />
          <StudentStatusSummary students={students} />
          <div className="card operation-class-selector-card">
            <ClassSelector students={students} value={selectedClass} onChange={setSelectedClass} />
            <p className="table-description">{selectedClass ? `${selectedClass} 학생 ${selectedClassStudents.length}명` : '명렬표 업로드 후 학급을 선택할 수 있습니다.'}</p>
          </div>
          <StudentChecklist students={students} selectedClass={selectedClass} onStatusChange={updateStatus} onMemoChange={updateMemo} />
        </section>

        <OperationMemo value={operationState.operationMemo} onSave={(memo) => setOperationState((prev) => updateOperationMemo(prev, memo))} />
      </div>
    </section>
  );
}

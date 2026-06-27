import { useEffect, useMemo, useState } from 'react';
import { ClassSelector } from '../health-check/ClassSelector';
import { RosterUpload } from '../health-check/RosterUpload';
import { StudentChecklist } from '../health-check/StudentChecklist';
import { StudentStatusSummary } from '../health-check/StudentStatusSummary';
import { getHealthCheckLabel } from '../../lib/healthCheck';
import { getClassesFromStudents, getStudentsBySession, STUDENT_STATUS_LABELS, updateStudentMemo, updateStudentStatus } from '../../lib/roster';
import { healthCheckStudentRepository } from '../../lib/repositories/HealthCheckStudentRepository';
import { healthCheckOperationStateRepository } from '../../lib/repositories/HealthCheckOperationStateRepository';
import { addOperationLog, getOperationLogs } from '../../lib/logs';
import { healthCheckOperationLogRepository } from '../../lib/repositories/HealthCheckOperationLogRepository';
import {
  clearClassMissing,
  generateNoticeMessage,
  getOperationState,
  normalizeOperationClassId,
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
import { OperationLogPanel } from './OperationLogPanel';
import { ShareLinkPanel } from '../share/ShareLinkPanel';
import { ShareMessageBox } from '../share/ShareMessageBox';
import { useHealthCheckRealtime } from '../../hooks/useHealthCheckRealtime';
import { AccessNotice } from '../common/AccessNotice';
import { RoleBadge } from '../common/RoleBadge';

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
  const [operationLogs, setOperationLogs] = useState(() => getOperationLogs(sessionId));
  const [selectedClass, setSelectedClass] = useState('');
  const [studentError, setStudentError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [logError, setLogError] = useState('');
  const [operationStateLoaded, setOperationStateLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStudentError('');
    setOperationError('');
    setOperationStateLoaded(false);
    setLogError('');
    void healthCheckOperationLogRepository
      .listBySession(sessionId)
      .then((logs) => {
        if (cancelled) return;
        setOperationLogs(logs);
      })
      .catch((error) => {
        console.warn('[OperationCenter] Failed to load operation logs.', error);
        if (cancelled) return;
        setOperationLogs(getOperationLogs(sessionId));
        setLogError('운영 로그를 불러오지 못해 브라우저 저장 데이터를 사용합니다.');
      });
    void healthCheckOperationStateRepository
      .get(sessionId)
      .then((loadedState) => {
        if (cancelled) return;
        setOperationState(loadedState);
        setOperationStateLoaded(true);
      })
      .catch((error) => {
        console.warn('[OperationCenter] Failed to load operation state.', error);
        if (cancelled) return;
        setOperationState(getOperationState(sessionId));
        setOperationStateLoaded(true);
        setOperationError('운영상태를 불러오지 못해 브라우저 저장 데이터를 사용합니다.');
      });
    void healthCheckStudentRepository
      .listBySession(sessionId, checkType)
      .then((loaded) => {
        if (cancelled) return;
        setStudents(loaded);
        setSelectedClass(loaded[0]?.className ?? '');
      })
      .catch((error) => {
        console.warn('[OperationCenter] Failed to load students.', error);
        if (cancelled) return;
        const fallbackStudents = getStudentsBySession(sessionId, checkType);
        setStudents(fallbackStudents);
        setSelectedClass(fallbackStudents[0]?.className ?? '');
        setStudentError('학생 명렬표를 불러오지 못해 브라우저 저장 데이터를 사용합니다.');
      });
    return () => {
      cancelled = true;
    };
  }, [checkType, sessionId]);

  useEffect(() => {
    if (!operationStateLoaded) return;
    void healthCheckOperationStateRepository.save(operationState).catch((error) => {
      console.warn('[OperationCenter] Failed to save operation state.', error);
      setOperationError('운영상태 저장 중 오류가 발생했습니다. 브라우저 저장 데이터로 계속 진행합니다.');
    });
  }, [operationState, operationStateLoaded]);

  useHealthCheckRealtime(sessionId, () => {
    void Promise.all([
      healthCheckOperationStateRepository.get(sessionId),
      healthCheckOperationLogRepository.listBySession(sessionId),
      healthCheckStudentRepository.listBySession(sessionId, checkType),
    ])
      .then(([nextState, nextLogs, nextStudents]) => {
        setOperationState(nextState);
        setOperationLogs(nextLogs);
        setStudents(nextStudents);
        setSelectedClass((prev) => prev || nextStudents[0]?.className || '');
      })
      .catch((error) => {
        console.warn('[OperationCenter] Failed to refresh realtime data.', error);
      });
  });

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

  const handleUpload = async (nextStudents: HealthCheckStudent[]) => {
    setStudentError('');
    setStudents(nextStudents);
    setSelectedClass(nextStudents[0]?.className ?? '');
    try {
      const saved = await healthCheckStudentRepository.replaceForSession(sessionId, checkType, nextStudents);
      setStudents(saved);
      setSelectedClass(saved[0]?.className ?? '');
    } catch (error) {
      console.warn('[OperationCenter] Failed to save uploaded students.', error);
      setStudentError('명렬표 저장 중 오류가 발생했습니다. 브라우저 저장 데이터로 계속 진행합니다.');
    }
  };

  const updateStatus = (studentId: string, statusValue: HealthCheckStudentStatus) => {
    const student = students.find((item) => item.id === studentId);
    if (student && student.status !== statusValue) {
      recordLog({
        type: 'studentStatusChanged',
        message: `${student.name} ${STUDENT_STATUS_LABELS[statusValue]} 상태로 변경`,
        relatedClassId: normalizeOperationClassId(student.className),
        relatedStudentId: student.id,
      });
    }
    setStudents((prev) => updateStudentStatus(prev, studentId, statusValue));
    setStudentError('');
    void healthCheckStudentRepository.updateStatus(sessionId, checkType, studentId, statusValue).catch((error) => {
      console.warn('[OperationCenter] Failed to update student status.', error);
      setStudentError('학생 상태 저장 중 오류가 발생했습니다. 브라우저 저장 데이터로 계속 진행합니다.');
    });
  };

  const updateMemo = (studentId: string, memo: string) => {
    setStudents((prev) => updateStudentMemo(prev, studentId, memo));
    setStudentError('');
    void healthCheckStudentRepository.updateMemo(sessionId, checkType, studentId, memo).catch((error) => {
      console.warn('[OperationCenter] Failed to update student memo.', error);
      setStudentError('학생 메모 저장 중 오류가 발생했습니다. 브라우저 저장 데이터로 계속 진행합니다.');
    });
  };

  const noticeMessage = generateNoticeMessage(operationState, {
    checkType,
    location: session?.location,
  });

  const recordLog = (input: Parameters<typeof addOperationLog>[1]) => {
    setLogError('');
    void healthCheckOperationLogRepository.add(sessionId, input)
      .then((savedLog) => {
        setOperationLogs((prev) => [savedLog, ...prev.filter((log) => log.id !== savedLog.id)].slice(0, 500));
      })
      .catch((error) => {
        console.warn('[OperationCenter] Failed to save operation log.', error);
        setOperationLogs(getOperationLogs(sessionId));
        setLogError('운영 로그 저장 중 오류가 발생했습니다. 브라우저 저장 데이터로 계속 진행합니다.');
      });
  };

  const handleSetCurrent = (classId: string) => {
    setOperationState((prev) => setCurrentClass(prev, classId, classIds));
    recordLog({
      type: 'classStarted',
      message: `${normalizeOperationClassId(classId)} 현재 검사 학급 지정`,
      relatedClassId: normalizeOperationClassId(classId),
    });
  };

  const handleComplete = (classId: string) => {
    setOperationState((prev) => setClassCompleted(prev, classId, classIds));
    recordLog({
      type: 'classCompleted',
      message: `${normalizeOperationClassId(classId)} 검사 완료`,
      relatedClassId: normalizeOperationClassId(classId),
    });
  };

  const handleMissing = (classId: string) => {
    setOperationState((prev) => setClassMissing(prev, classId));
    recordLog({
      type: 'classMissing',
      message: `${normalizeOperationClassId(classId)} 미도착 표시`,
      relatedClassId: normalizeOperationClassId(classId),
    });
  };

  const handleClearMissing = (classId: string) => {
    setOperationState((prev) => clearClassMissing(prev, classId));
    recordLog({
      type: 'classMissingCleared',
      message: `${normalizeOperationClassId(classId)} 미도착 해제`,
      relatedClassId: normalizeOperationClassId(classId),
    });
  };

  const handleDelayChange = (minutes: number) => {
    const nextMinutes = Math.max(0, Number.isFinite(minutes) ? minutes : 0);
    if (nextMinutes !== operationState.delayedMinutes) {
      recordLog({
        type: 'delayUpdated',
        message: `지연 시간 ${nextMinutes}분으로 변경`,
      });
    }
    setOperationState((prev) => updateDelayedMinutes(prev, nextMinutes));
  };

  const handleMemoSave = (memo: string) => {
    setOperationState((prev) => updateOperationMemo(prev, memo));
    recordLog({
      type: 'memoUpdated',
      message: '운영 메모 저장',
    });
  };

  const handleNoticeCopy = () => {
    recordLog({
      type: 'noticeGenerated',
      message: '교사용 안내 문구 복사',
    });
  };

  const handleManualLog = (message: string) => {
    recordLog({
      type: 'manualNote',
      message,
    });
  };

  return (
    <section className="stack operation-center">
      <div className="operation-header">
        <div className="role-header-line"><RoleBadge role="healthTeacher" /></div>
        <p className="eyebrow">검진 운영</p>
        <h2>학교 건강검진 운영센터</h2>
      </div>

      <AccessNotice role="healthTeacher" />

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

      <ShareLinkPanel session={session} />
      <ShareMessageBox session={session} />

      <OperationStatusCard state={operationState} />

      <div className="operation-control-grid">
        <ClassProgressList
          classIds={classIds}
          state={operationState}
          students={students}
          onSetCurrent={handleSetCurrent}
          onComplete={handleComplete}
          onMissing={handleMissing}
          onClearMissing={handleClearMissing}
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
                onChange={(event) => handleDelayChange(Number(event.target.value))}
              />
            </label>
          </section>
          <NoticeMessageBox message={noticeMessage} onCopy={handleNoticeCopy} />
          <OperationLogPanel logs={operationLogs} onAddManualLog={handleManualLog} />
        </div>
      </div>

      <div className="operation-layout">
        <section className="operation-student-panel">
          <RosterUpload checkType={checkType} sessionId={sessionId} sessionTitle={session ? formatSessionTitle(session) : undefined} students={students} onUpload={handleUpload} />
          {studentError && <p className="table-description">{studentError}</p>}
          {operationError && <p className="table-description">{operationError}</p>}
          {logError && <p className="table-description">{logError}</p>}
          <StudentStatusSummary students={students} />
          <div className="card operation-class-selector-card">
            <ClassSelector students={students} value={selectedClass} onChange={setSelectedClass} />
            <p className="table-description">{selectedClass ? `${selectedClass} 학생 ${selectedClassStudents.length}명` : '명렬표 업로드 후 학급을 선택할 수 있습니다.'}</p>
          </div>
          <StudentChecklist students={students} selectedClass={selectedClass} onStatusChange={updateStatus} onMemoChange={updateMemo} />
        </section>

        <OperationMemo value={operationState.operationMemo} onSave={handleMemoSave} />
      </div>
    </section>
  );
}

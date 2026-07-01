import { useEffect, useMemo, useState } from 'react';
import { getHealthCheckLabel } from '../../lib/healthCheck';
import { generateNoticeMessage, normalizeOperationClassId } from '../../lib/operation';
import { getStudentSummary } from '../../lib/roster';
import { healthCheckDataService } from '../../lib/services/healthCheckDataService';
import { useHealthCheckRealtime } from '../../hooks/useHealthCheckRealtime';
import type { HealthCheckOperationState, HealthCheckSession, HealthCheckStudent } from '../../types/healthCheck';

type DisplaySnapshot = {
  session?: HealthCheckSession;
  state: HealthCheckOperationState;
  students: HealthCheckStudent[];
};

export function OperationDisplay() {
  const [snapshot, setSnapshot] = useState<DisplaySnapshot>(() => createEmptyDisplaySnapshot());
  const [error, setError] = useState('');

  const refresh = () => {
    setError('');
    void loadDisplaySnapshotAsync()
      .then(setSnapshot)
      .catch((loadError) => {
        console.warn('[OperationDisplay] Failed to refresh display snapshot.', loadError);
        setError('운영 현황을 불러오지 못했습니다. 보건실 운영센터 데이터를 확인해 주세요.');
      });
  };

  const realtimeSessionId = snapshot.session?.id ?? 'display-local-session';
  useHealthCheckRealtime(realtimeSessionId, refresh);

  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('schoolHealthHub.')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const studentSummary = useMemo(() => getStudentSummary(snapshot.students), [snapshot.students]);
  const classProgress = useMemo(() => getClassProgress(snapshot.state, snapshot.students), [snapshot.state, snapshot.students]);
  const progressPercent = studentSummary.total ? Math.round((studentSummary.completed / studentSummary.total) * 100) : classProgress.percent;
  const notice = snapshot.state.noticeMessage || generateNoticeMessage(snapshot.state, {
    checkType: snapshot.session?.checkType,
    location: snapshot.session?.location,
  });

  return (
    <main className="display-mode-page" aria-label="실시간 운영 현황판">
      <header className="display-mode-header">
        <div>
          <p className="eyebrow">실시간 운영 현황판</p>
          <h1>{snapshot.session?.title || '검진 진행 현황'}</h1>
          <p>
            {snapshot.session
              ? `${snapshot.session.date || '검진일 미입력'} · ${getHealthCheckLabel(snapshot.session.checkType)} · ${snapshot.session.location || '장소 미정'}`
              : '선택된 검진 세션이 없습니다'}
          </p>
        </div>
        <div className={`display-delay-badge ${snapshot.state.delayedMinutes > 0 ? 'warn' : ''}`}>
          <span>지연 여부</span>
          <strong>{snapshot.state.delayedMinutes > 0 ? `${snapshot.state.delayedMinutes}분 지연` : '정상 진행'}</strong>
        </div>
      </header>

      {error && <p className="display-mode-error">{error}</p>}

      <section className="display-hero-grid">
        <article className="display-status-card primary">
          <span>현재 검사 학급</span>
          <strong>{snapshot.state.currentClassId || '-'}</strong>
          <small>검진 장소에서 진행 중</small>
        </article>
        <article className="display-status-card">
          <span>다음 검사 학급</span>
          <strong>{snapshot.state.nextClassId || '-'}</strong>
          <small>다음 이동 안내 대상</small>
        </article>
        <article className={`display-status-card ${snapshot.state.missingClassIds.length ? 'warn' : ''}`}>
          <span>미도착 학급</span>
          <strong>{snapshot.state.missingClassIds.length ? snapshot.state.missingClassIds.join(', ') : '없음'}</strong>
          <small>학생 개인정보 없이 학급 단위만 표시</small>
        </article>
      </section>

      <section className="display-progress-panel">
        <div>
          <span>전체 진행률</span>
          <strong>{progressPercent}%</strong>
          <small>
            {studentSummary.total
              ? `완료 ${studentSummary.completed}명 / 전체 ${studentSummary.total}명`
              : `완료 ${classProgress.completed}개 학급 / 전체 ${classProgress.total}개 학급`}
          </small>
        </div>
        <div className="display-progress-track" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </section>

      <section className="display-notice-panel">
        <span>안내 문구</span>
        <p>{notice || '현재 안내할 운영 상태가 없습니다.'}</p>
      </section>

      <footer className="display-mode-footer">
        <span>마지막 업데이트 {formatTime(snapshot.state.updatedAt)}</span>
        <span>학급 단위 정보와 통계만 표시됩니다.</span>
      </footer>
    </main>
  );
}

function getClassProgress(state: HealthCheckOperationState, students: HealthCheckStudent[]) {
  const classIds = [
    ...students.map((student) => student.className),
    state.currentClassId,
    state.nextClassId,
    ...state.completedClassIds,
    ...state.missingClassIds,
  ]
    .map(normalizeOperationClassId)
    .filter(Boolean);
  const total = new Set(classIds).size;
  const completed = new Set(state.completedClassIds.map(normalizeOperationClassId).filter(Boolean)).size;
  return {
    total,
    completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}

function createEmptyDisplaySnapshot(): DisplaySnapshot {
  return {
    state: createInitialOperationState('display-local-session'),
    students: [],
  };
}

async function loadDisplaySnapshotAsync(): Promise<DisplaySnapshot> {
  const session = await getActiveSessionFromService();
  const sessionId = session?.id ?? 'display-local-session';
  const [state, students] = await Promise.all([
    healthCheckDataService.getOperationState(sessionId),
    session ? healthCheckDataService.listStudents(session.id, session.checkType) : Promise.resolve([]),
  ]);
  return { session, state, students };
}

async function getActiveSessionFromService() {
  const [sessions, activeSessionId] = await Promise.all([
    healthCheckDataService.listSessions(),
    healthCheckDataService.getActiveSessionId(),
  ]);
  return sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
}

function createInitialOperationState(sessionId: string): HealthCheckOperationState {
  return {
    sessionId,
    currentClassId: '',
    nextClassId: '',
    completedClassIds: [],
    missingClassIds: [],
    delayedMinutes: 0,
    noticeMessage: '',
    operationMemo: '',
    updatedAt: new Date().toISOString(),
  };
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

import { useEffect, useMemo, useState } from 'react';
import { getHealthCheckLabel } from '../../lib/healthCheck';
import { generateNoticeMessage, normalizeOperationClassId } from '../../lib/operation';
import { getStudentSummary } from '../../lib/roster';
import { healthCheckDataService } from '../../lib/services/healthCheckDataService';
import { loadSchoolSettings } from '../../lib/settings';
import { useHealthCheckRealtime } from '../../hooks/useHealthCheckRealtime';
import type { HealthCheckOperationState, HealthCheckSession, HealthCheckStudent } from '../../types/healthCheck';

type DisplaySnapshot = {
  session?: HealthCheckSession;
  state: HealthCheckOperationState;
  students: HealthCheckStudent[];
};

type DisplayMode = 'portrait' | 'landscape';

export function OperationDisplay() {
  const [snapshot, setSnapshot] = useState<DisplaySnapshot>(() => createEmptyDisplaySnapshot());
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [schoolSettings] = useState(() => loadSchoolSettings());

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

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const studentSummary = useMemo(() => getStudentSummary(snapshot.students), [snapshot.students]);
  const classProgress = useMemo(() => getClassProgress(snapshot.state, snapshot.students), [snapshot.state, snapshot.students]);
  const progressPercent = studentSummary.total ? Math.round((studentSummary.completed / studentSummary.total) * 100) : classProgress.percent;
  const notice = snapshot.state.noticeMessage || generateNoticeMessage(snapshot.state, {
    checkType: snapshot.session?.checkType,
    location: snapshot.session?.location,
  });
  const sessionMeta = snapshot.session
    ? `${snapshot.session.date || '검진일 미입력'} · ${getHealthCheckLabel(snapshot.session.checkType)} · ${snapshot.session.location || '장소 미정'}`
    : '선택된 검진 세션이 없습니다';
  const displayMode = getDisplayMode();
  const schoolName = getDisplayText(schoolSettings.schoolName, '우리 학교');
  const checkName = snapshot.session ? getHealthCheckLabel(snapshot.session.checkType) : '검진';
  const upcomingClassId = getUpcomingClassId(snapshot.state, snapshot.students);
  const remainingClassCount = Math.max(classProgress.total - classProgress.completed, 0);
  const expectedEndLabel = getExpectedEndLabel(classProgress, snapshot.state);

  if (displayMode === 'portrait') {
    return (
      <main className="display-mode-page signage-mode-page display-portrait" aria-label="보건실 세로형 검진 사이니지">
        <header className="display-portrait-header">
          <div className="display-logo-mark" aria-label="학교 로고">SH</div>
          <div>
            <p>{schoolName}</p>
            <strong>{snapshot.session?.title || checkName}</strong>
          </div>
        </header>

        {error && <p className="display-mode-error">{error}</p>}

        <section className="display-portrait-main" aria-label="검진 학급 안내">
          <article className="display-portrait-card current-class-card">
            <span>현재 검사 중</span>
            <strong>{snapshot.state.currentClassId || '-'}</strong>
          </article>
          <article className="display-portrait-card">
            <span>다음 학급</span>
            <strong>{snapshot.state.nextClassId || '-'}</strong>
          </article>
          <article className="display-portrait-card upcoming">
            <span>잠시 후</span>
            <strong>{upcomingClassId || '-'}</strong>
          </article>
        </section>

        <footer className="display-portrait-footer">
          <section className="display-progress-panel">
            <div>
              <span>전체 진행률</span>
              <strong>{progressPercent}%</strong>
            </div>
            <div className="display-progress-track" aria-hidden="true">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          </section>
          <section className="display-notice-panel">
            <span>안내 문구</span>
            <p>{notice || '가방은 교실에 두고 이동하세요.'}</p>
          </section>
        </footer>
      </main>
    );
  }

  return (
    <main className="display-mode-page signage-mode-page display-landscape" aria-label="교무실 가로형 검진 사이니지">
      <header className="display-mode-header">
        <div className="display-brand-lockup" aria-label="학교 로고">
          <div className="display-logo-mark">SH</div>
          <div>
            <p className="eyebrow">{schoolName}</p>
            <strong>검진 운영 현황</strong>
          </div>
        </div>
        <div className="display-clock" aria-label="현재 시간">
          <span>{formatDate(currentTime)}</span>
          <strong>{formatCurrentTime(currentTime)}</strong>
        </div>
      </header>

      {error && <p className="display-mode-error">{error}</p>}

      <section className="display-session-strip" aria-label="검진 세션 정보">
        <span>{snapshot.session?.title || '검진 진행 현황'}</span>
        <strong>{sessionMeta}</strong>
      </section>

      <section className="display-landscape-summary" aria-label="교무실 운영 요약">
        <article className="display-status-card primary current-class-card">
          <span>현재 검사 학급</span>
          <strong>{snapshot.state.currentClassId || '-'}</strong>
        </article>
        <article className="display-status-card">
          <span>다음 학급</span>
          <strong>{snapshot.state.nextClassId || '-'}</strong>
        </article>
        <article className="display-status-card">
          <span>완료 학급</span>
          <strong>{classProgress.completed}</strong>
        </article>
        <article className="display-status-card">
          <span>남은 학급</span>
          <strong>{remainingClassCount}</strong>
        </article>
        <article className="display-status-card">
          <span>예상 종료 시간</span>
          <strong>{expectedEndLabel}</strong>
        </article>
      </section>

      <div className="display-landscape-main">
        <section className="display-progress-panel">
          <div>
            <span>전체 진행률</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="display-progress-track" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </section>

        <section className="display-notice-panel">
          <span>현재 운영 상태</span>
          <p>{notice || '현재 안내할 운영 상태가 없습니다.'}</p>
        </section>
      </div>

      <footer className="display-mode-footer">
        <span>마지막 업데이트 {formatTime(snapshot.state.updatedAt)}</span>
        <span>학생 개인정보는 표시하지 않습니다</span>
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

function getUpcomingClassId(state: HealthCheckOperationState, students: HealthCheckStudent[]) {
  const excluded = new Set(
    [
      state.currentClassId,
      state.nextClassId,
      ...state.completedClassIds,
      ...state.missingClassIds,
    ]
      .map(normalizeOperationClassId)
      .filter(Boolean),
  );
  return students
    .map((student) => normalizeOperationClassId(student.className))
    .find((classId) => classId && !excluded.has(classId)) ?? '';
}

function getExpectedEndLabel(progress: { total: number; completed: number }, state: HealthCheckOperationState) {
  if (progress.total > 0 && progress.completed >= progress.total) return '완료';
  if (!state.currentClassId && !state.nextClassId) return '미정';
  return '운영 중';
}

function getDisplayMode(): DisplayMode {
  if (typeof window === 'undefined') return 'landscape';
  const value = new URLSearchParams(window.location.search).get('mode');
  return value === 'portrait' ? 'portrait' : 'landscape';
}

function getDisplayText(value: string | undefined, fallback: string) {
  const text = String(value ?? '').trim();
  return text && !text.includes('?') ? text : fallback;
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

function formatCurrentTime(value: Date) {
  return value.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value: Date) {
  return value.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

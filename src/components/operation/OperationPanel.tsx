// Deprecated: legacy operation panel kept for the existing scheduler tab.
// New health check operation work should use OperationCenter and healthCheckDataService.
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCopy, FileInput, MonitorSmartphone, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { ScheduleAssignment } from '../../types';

type StudentStatus = 'pending' | 'completed' | 'absent' | 'earlyLeave' | 'late' | 'deferred';
type ClassStatus = 'waiting' | 'running' | 'completed' | 'missing' | 'paused';

interface RosterStudent {
  id: string;
  grade: string;
  className: string;
  number: string;
  name: string;
  status: StudentStatus;
  memo: string;
}

interface OperationState {
  currentClass: string;
  nextClass: string;
  activeClassStatus: ClassStatus;
  missingClasses: string[];
  delayMinutes: number;
  publicNotice: string;
  log: string[];
  students: RosterStudent[];
  updatedAt: string;
}

interface ScheduleClass {
  className: string;
  grade: string;
  startTime: string;
  endTime: string;
  callTime: string;
  order: number;
}

const STORAGE_KEY = 'school-health-check-operation-v1';

const STATUS_LABELS: Record<StudentStatus, string> = {
  pending: '대기',
  completed: '완료',
  absent: '결석',
  earlyLeave: '조퇴',
  late: '지각',
  deferred: '추후검진',
};

const STATUS_OPTIONS: StudentStatus[] = ['pending', 'completed', 'absent', 'earlyLeave', 'late', 'deferred'];

const emptyState: OperationState = {
  currentClass: '',
  nextClass: '',
  activeClassStatus: 'waiting',
  missingClasses: [],
  delayMinutes: 0,
  publicNotice: '수업 중 해당 학급 학생이 있으면 검진 장소로 이동할 수 있도록 안내 부탁드립니다.',
  log: [],
  students: [],
  updatedAt: '',
};

export function OperationPanel({ assignments }: { assignments: ScheduleAssignment[] }) {
  const [state, setState] = useState<OperationState>(() => loadOperationState());
  const [view, setView] = useState<'nurse' | 'teacher' | 'tablet' | 'big' | 'admin'>('nurse');
  const [selectedClass, setSelectedClass] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const scheduleClasses = useMemo(() => createScheduleClasses(assignments), [assignments]);
  const currentSchedule = scheduleClasses.find((item) => item.className === state.currentClass);
  const nextSchedule = scheduleClasses.find((item) => item.className === state.nextClass);
  const currentStudents = state.students.filter((student) => student.className === state.currentClass);
  const selectedStudents = state.students.filter((student) => student.className === (selectedClass || state.currentClass));
  const completedCount = state.students.filter((student) => student.status === 'completed').length;
  const targetCount = state.students.length;
  const uncheckedStudents = state.students.filter((student) => student.status !== 'completed');
  const currentUnchecked = currentStudents.filter((student) => student.status !== 'completed');
  const currentClassIndex = scheduleClasses.findIndex((item) => item.className === state.currentClass);
  const progressPercent = targetCount
    ? Math.round((completedCount / targetCount) * 100)
    : getClassProgressPercent(scheduleClasses, state.currentClass);

  useEffect(() => {
    saveOperationState(state);
  }, [state]);

  useEffect(() => {
    if (!selectedClass && state.currentClass) setSelectedClass(state.currentClass);
  }, [selectedClass, state.currentClass]);

  const patchState = (patch: Partial<OperationState>, log?: string) => {
    setState((prev) => {
      const nextLog = log ? [`${formatNow()} ${log}`, ...prev.log].slice(0, 120) : prev.log;
      return { ...prev, ...patch, log: nextLog, updatedAt: new Date().toISOString() };
    });
  };

  const startClass = (className: string) => {
    const index = scheduleClasses.findIndex((item) => item.className === className);
    patchState(
      {
        currentClass: className,
        nextClass: scheduleClasses[index + 1]?.className ?? '',
        activeClassStatus: 'running',
        missingClasses: state.missingClasses.filter((item) => item !== className),
      },
      `${className} 검진 시작`,
    );
  };

  const completeClass = (className = state.currentClass) => {
    const index = scheduleClasses.findIndex((item) => item.className === className);
    const nextClass = scheduleClasses[index + 1]?.className ?? '';
    patchState(
      {
        currentClass: nextClass,
        nextClass: scheduleClasses[index + 2]?.className ?? '',
        activeClassStatus: nextClass ? 'waiting' : 'completed',
        missingClasses: state.missingClasses.filter((item) => item !== className),
      },
      `${className} 검진 완료${nextClass ? `, 다음 ${nextClass}` : ''}`,
    );
  };

  const markMissing = (className: string) => {
    patchState(
      {
        missingClasses: state.missingClasses.includes(className) ? state.missingClasses : [...state.missingClasses, className],
        activeClassStatus: state.currentClass === className ? 'missing' : state.activeClassStatus,
      },
      `${className} 미도착 표시`,
    );
  };

  const moveToPreviousClass = () => {
    if (currentClassIndex > 0) startClass(scheduleClasses[currentClassIndex - 1].className);
  };

  const moveToNextClass = () => {
    if (state.nextClass) startClass(state.nextClass);
    else if (currentClassIndex >= 0 && scheduleClasses[currentClassIndex + 1]) startClass(scheduleClasses[currentClassIndex + 1].className);
    else if (!state.currentClass && scheduleClasses[0]) startClass(scheduleClasses[0].className);
  };

  const updateStudent = (studentId: string, patch: Partial<RosterStudent>) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.map((student) => (student.id === studentId ? { ...student, ...patch } : student)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const setAllCurrentCompleted = () => {
    if (!state.currentClass) return;
    setState((prev) => ({
      ...prev,
      students: prev.students.map((student) => (student.className === state.currentClass ? { ...student, status: 'completed' } : student)),
      log: [`${formatNow()} ${state.currentClass} 학생 전체 완료 처리`, ...prev.log].slice(0, 120),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleRosterUpload = async (file?: File) => {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const students = parseRosterWorkbook(workbook);
    if (!students.length) {
      alert('명렬표에서 학생 정보를 찾지 못했습니다. 번호/성명/이름/학년/반/학급 열이 있는지 확인해 주세요.');
      return;
    }
    patchState({ students }, `명렬표 업로드: ${students.length}명`);
    setSelectedClass(students[0]?.className ?? '');
  };

  const resetOperation = () => {
    if (!window.confirm('실시간 운영 현황과 명렬표 체크 상태를 초기화할까요?')) return;
    setState({ ...emptyState, log: [`${formatNow()} 운영 현황 초기화`], updatedAt: new Date().toISOString() });
    setSelectedClass('');
  };

  const copyTeacherMessage = () => {
    const text = createTeacherMessage(state);
    navigator.clipboard.writeText(text).then(() => alert('리로스쿨 공유 문구를 복사했습니다.'));
  };

  const copyAdminPlan = () => {
    navigator.clipboard.writeText(ADMIN_PLAN_TEXT).then(() => alert('관리자 보고용 구상안을 복사했습니다.'));
  };

  return (
    <section className="stack operation-page">
      <div className="card operation-hero">
        <div>
          <p className="eyebrow">고교학점제 대응</p>
          <h2>실시간 검진 운영 대시보드</h2>
          <p className="muted">보건교사용 화면에서 현황을 입력하면 교사용 PC·모바일 현황판에 같은 정보가 표시됩니다. 현재 버전은 같은 브라우저 저장소 기반 MVP입니다.</p>
        </div>
        <div className="operation-tabs no-print">
          <button className={view === 'nurse' ? 'primary' : ''} onClick={() => setView('nurse')}>보건교사용</button>
          <button className={view === 'teacher' ? 'primary' : ''} onClick={() => setView('teacher')}>교사용 모바일/PC</button>
          <button className={view === 'tablet' ? 'primary' : ''} onClick={() => setView('tablet')}>태블릿</button>
          <button className={view === 'big' ? 'primary' : ''} onClick={() => setView('big')}>교무실 큰 화면</button>
          <button className={view === 'admin' ? 'primary' : ''} onClick={() => setView('admin')}>관리자 구상안</button>
        </div>
      </div>

      {view === 'nurse' && (
        <div className="operation-layout">
          <div className="stack">
            <div className="card">
              <div className="card-title-row">
                <h3>1. 검진 현황 입력</h3>
                <button onClick={resetOperation}><RefreshCcw size={16} /> 초기화</button>
              </div>
              <div className="field-grid compact-grid">
                <label>
                  현재 검사 반
                  <select value={state.currentClass} onChange={(event) => startClass(event.target.value)}>
                    <option value="">선택</option>
                    {scheduleClasses.map((item) => (
                      <option key={item.className} value={item.className}>{item.className} ({item.startTime})</option>
                    ))}
                  </select>
                </label>
                <label>
                  다음 반
                  <select value={state.nextClass} onChange={(event) => patchState({ nextClass: event.target.value }, `다음 반 ${event.target.value || '없음'}으로 변경`)}>
                    <option value="">없음</option>
                    {scheduleClasses.map((item) => <option key={item.className} value={item.className}>{item.className}</option>)}
                  </select>
                </label>
                <label>
                  지연 시간(분)
                  <input type="number" min="0" value={state.delayMinutes} onChange={(event) => patchState({ delayMinutes: Number(event.target.value) || 0 }, `지연 ${event.target.value || 0}분 표시`)} />
                </label>
              </div>
              <div className="actions wrap">
                <button className="primary" disabled={!state.currentClass} onClick={() => state.currentClass && startClass(state.currentClass)}>검사 시작</button>
                <button disabled={!state.currentClass} onClick={() => completeClass()}>현재 반 완료 후 다음으로</button>
                <button disabled={!state.currentClass} onClick={() => state.currentClass && markMissing(state.currentClass)}>현재 반 미도착 표시</button>
                <button disabled={!state.currentClass} onClick={setAllCurrentCompleted}>현재 반 학생 전체 완료</button>
              </div>
              <label className="full-label">
                교사용 안내 문구
                <textarea rows={3} value={state.publicNotice} onChange={(event) => patchState({ publicNotice: event.target.value })} />
              </label>
            </div>

            <div className="card">
              <div className="card-title-row">
                <h3>2. 명렬표 업로드·완료 체크</h3>
                <button onClick={() => fileRef.current?.click()}><FileInput size={16} /> 명렬표 업로드</button>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(event) => handleRosterUpload(event.target.files?.[0])} />
              <div className="field-grid compact-grid">
                <label>
                  체크할 반
                  <select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}>
                    <option value="">선택</option>
                    {uniqueClasses(state.students).map((className) => <option key={className} value={className}>{className}</option>)}
                  </select>
                </label>
                <div className="mini-summary"><strong>{targetCount}</strong><span>명렬표 인원</span></div>
                <div className="mini-summary"><strong>{completedCount}</strong><span>완료</span></div>
                <div className="mini-summary warn"><strong>{uncheckedStudents.length}</strong><span>미완료/예외</span></div>
              </div>
              <div className="student-list">
                {selectedStudents.length === 0 && <p className="muted">명렬표를 업로드하거나 체크할 반을 선택해 주세요.</p>}
                {selectedStudents.map((student) => (
                  <div key={student.id} className={`student-row status-${student.status}`}>
                    <button className={student.status === 'completed' ? 'primary' : ''} onClick={() => updateStudent(student.id, { status: student.status === 'completed' ? 'pending' : 'completed' })}>
                      {student.status === 'completed' ? '완료' : '체크'}
                    </button>
                    <strong>{student.number}</strong>
                    <span>{student.name}</span>
                    <select value={student.status} onChange={(event) => updateStudent(student.id, { status: event.target.value as StudentStatus })}>
                      {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                    </select>
                    <input placeholder="메모" value={student.memo} onChange={(event) => updateStudent(student.id, { memo: event.target.value })} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="stack">
            <TeacherDashboard state={state} currentSchedule={currentSchedule} nextSchedule={nextSchedule} uncheckedCount={uncheckedStudents.length} currentUnchecked={currentUnchecked} />
            <div className="card">
              <div className="card-title-row">
                <h3>운영 기록</h3>
                <button onClick={copyTeacherMessage}><ClipboardCopy size={16} /> 리로스쿨 문구 복사</button>
              </div>
              <div className="log-list">
                {state.log.length === 0 ? <p className="muted">아직 기록이 없습니다.</p> : state.log.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'teacher' && <TeacherDashboard state={state} currentSchedule={currentSchedule} nextSchedule={nextSchedule} uncheckedCount={uncheckedStudents.length} currentUnchecked={currentUnchecked} />}
      {view === 'tablet' && (
        <TabletModePanel
          state={state}
          currentSchedule={currentSchedule}
          nextSchedule={nextSchedule}
          completedCount={completedCount}
          targetCount={targetCount}
          progressPercent={progressPercent}
          canMovePrevious={currentClassIndex > 0}
          canMoveNext={Boolean(state.nextClass || scheduleClasses[currentClassIndex + 1] || (!state.currentClass && scheduleClasses[0]))}
          onComplete={() => completeClass()}
          onMissing={() => state.currentClass && markMissing(state.currentClass)}
          onPrevious={moveToPreviousClass}
          onNext={moveToNextClass}
        />
      )}
      {view === 'big' && <BigScreenDashboard state={state} completedCount={completedCount} targetCount={targetCount} scheduleClasses={scheduleClasses} />}
      {view === 'admin' && (
        <div className="card admin-plan">
          <div className="card-title-row">
            <h3>관리자 보고용 구상안</h3>
            <button onClick={copyAdminPlan}><ClipboardCopy size={16} /> 구상안 복사</button>
          </div>
          <pre>{ADMIN_PLAN_TEXT}</pre>
        </div>
      )}
    </section>
  );
}

function TabletModePanel({
  state,
  currentSchedule,
  nextSchedule,
  completedCount,
  targetCount,
  progressPercent,
  canMovePrevious,
  canMoveNext,
  onComplete,
  onMissing,
  onPrevious,
  onNext,
}: {
  state: OperationState;
  currentSchedule?: ScheduleClass;
  nextSchedule?: ScheduleClass;
  completedCount: number;
  targetCount: number;
  progressPercent: number;
  canMovePrevious: boolean;
  canMoveNext: boolean;
  onComplete: () => void;
  onMissing: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const currentOrder = currentSchedule ? `${currentSchedule.order}번` : '-';
  const progressText = targetCount ? `완료 ${completedCount}명 / 전체 ${targetCount}명` : '학급 순서 기준';

  return (
    <section className="tablet-mode" aria-label="태블릿 운영 화면">
      <header className="tablet-mode-header">
        <div>
          <p className="eyebrow">Tablet Mode</p>
          <h2>검진장 태블릿</h2>
          <span>현장 검사자용</span>
        </div>
      </header>

      <div className="tablet-focus-grid">
        <article className="tablet-focus-card tablet-focus-current">
          <span>현재 검사 학급</span>
          <strong>{state.currentClass || '-'}</strong>
          <small>{currentSchedule ? `${currentSchedule.startTime}~${currentSchedule.endTime}` : '선택된 학급 없음'}</small>
        </article>
        <article className="tablet-focus-card">
          <span>현재 검사 순번</span>
          <strong>{currentOrder}</strong>
          <small>{state.currentClass ? '진행 중인 학급 기준' : '검사 시작 전'}</small>
        </article>
        <article className="tablet-focus-card tablet-focus-progress">
          <span>전체 진행률</span>
          <strong>{progressPercent}%</strong>
          <small>{progressText}</small>
          <div className="tablet-progress-track" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </article>
        <article className="tablet-focus-card">
          <span>다음 학급</span>
          <strong>{state.nextClass || '-'}</strong>
          <small>{nextSchedule ? `${nextSchedule.startTime}~${nextSchedule.endTime}` : '다음 학급 없음'}</small>
        </article>
      </div>

      <div className="tablet-action-grid" aria-label="태블릿 운영 버튼">
        <button type="button" className="tablet-action primary" disabled={!state.currentClass} onClick={onComplete}>
          <CheckCircle2 size={36} />
          완료
        </button>
        <button type="button" className="tablet-action warning" disabled={!state.currentClass} onClick={onMissing}>
          <AlertTriangle size={34} />
          미도착
        </button>
        <button type="button" className="tablet-action secondary" disabled={!canMovePrevious} onClick={onPrevious}>
          <ChevronLeft size={34} />
          이전
        </button>
        <button type="button" className="tablet-action secondary" disabled={!canMoveNext} onClick={onNext}>
          다음
          <ChevronRight size={34} />
        </button>
      </div>

      <p className="tablet-mode-notice">{state.publicNotice}</p>
    </section>
  );
}

function TeacherDashboard({ state, currentSchedule, nextSchedule, uncheckedCount, currentUnchecked }: {
  state: OperationState;
  currentSchedule?: ScheduleClass;
  nextSchedule?: ScheduleClass;
  uncheckedCount: number;
  currentUnchecked: RosterStudent[];
}) {
  return (
    <div className="teacher-dashboard">
      <div className="teacher-main-card">
        <div className="teacher-main-header">
          <MonitorSmartphone size={24} />
          <div>
            <p className="eyebrow">교사용 실시간 현황</p>
            <h2>{state.currentClass ? `${state.currentClass} 검사 ${statusText(state.activeClassStatus)}` : '검진 대기 중'}</h2>
          </div>
        </div>
        <p className="teacher-notice">{state.publicNotice}</p>
        {state.delayMinutes > 0 && <div className="delay-banner">현재 약 {state.delayMinutes}분 지연 중입니다.</div>}
      </div>
      <div className="teacher-card-grid">
        <StatusCard label="현재" value={state.currentClass || '-'} sub={currentSchedule ? `${currentSchedule.startTime}~${currentSchedule.endTime}` : '검사 반 선택 전'} />
        <StatusCard label="다음" value={state.nextClass || '-'} sub={nextSchedule ? `${nextSchedule.startTime}~${nextSchedule.endTime}` : '다음 반 없음'} />
        <StatusCard label="미도착" value={state.missingClasses.length ? state.missingClasses.join(', ') : '-'} sub="수업 중 해당 학생 확인 요청" tone={state.missingClasses.length ? 'warn' : 'normal'} />
        <StatusCard label="전체 미완료" value={`${uncheckedCount}명`} sub="명렬표 업로드 시 표시" tone={uncheckedCount ? 'warn' : 'normal'} />
      </div>
      {currentUnchecked.length > 0 && (
        <div className="card current-unchecked-card">
          <h3>현재 반 미완료/예외 학생</h3>
          <p className="muted">보건교사용 확인용입니다. 교사용 공유 시에는 이름 공개 범위를 학교 방침에 맞춰 조정하세요.</p>
          <div className="pill-list">
            {currentUnchecked.map((student) => <span key={student.id}>{student.number} {student.name} · {STATUS_LABELS[student.status]}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

function BigScreenDashboard({ state, completedCount, targetCount, scheduleClasses }: { state: OperationState; completedCount: number; targetCount: number; scheduleClasses: ScheduleClass[] }) {
  const progress = targetCount ? Math.round((completedCount / targetCount) * 100) : 0;
  const completedClasses = scheduleClasses.filter((item) => {
    const classStudents = state.students.filter((student) => student.className === item.className);
    return classStudents.length > 0 && classStudents.every((student) => student.status === 'completed');
  });
  return (
    <div className="big-screen">
      <div className="big-title"><ShieldCheck size={40} /> 학생 검진 진행 현황</div>
      <div className="big-grid">
        <div><span>현재</span><strong>{state.currentClass || '-'}</strong></div>
        <div><span>다음</span><strong>{state.nextClass || '-'}</strong></div>
        <div><span>미도착</span><strong>{state.missingClasses.length ? state.missingClasses.join(', ') : '-'}</strong></div>
        <div><span>진행률</span><strong>{progress}%</strong></div>
      </div>
      <div className="big-notice">{state.publicNotice}</div>
      {state.delayMinutes > 0 && <div className="big-delay">지연 {state.delayMinutes}분</div>}
      <div className="big-footer">완료 반 {completedClasses.length}개 · 완료 학생 {completedCount}/{targetCount || '-'}명 · 마지막 갱신 {state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString('ko-KR') : '-'}</div>
    </div>
  );
}

function StatusCard({ label, value, sub, tone = 'normal' }: { label: string; value: string; sub: string; tone?: 'normal' | 'warn' }) {
  return (
    <div className={`status-card ${tone === 'warn' ? 'status-card-warn' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

function createScheduleClasses(assignments: ScheduleAssignment[]): ScheduleClass[] {
  const map = new Map<string, ScheduleClass>();
  assignments
    .filter((item) => item.order && (item.unitName || item.homeRoomName || item.locationName))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .forEach((item) => {
      const className = normalizeClassName(item.unitName || item.homeRoomName || item.locationName);
      if (!className || map.has(className)) return;
      map.set(className, {
        className,
        grade: item.grade,
        startTime: item.callTime || item.scheduledTime || item.examTime || '',
        endTime: item.examTime || item.scheduledTime || '',
        callTime: item.callTime || '',
        order: item.order ?? 0,
      });
    });
  return [...map.values()].sort((a, b) => a.order - b.order);
}

function parseRosterWorkbook(workbook: XLSX.WorkBook): RosterStudent[] {
  const students: RosterStudent[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, raw: false, defval: '' });
    const headerIndex = rows.findIndex((row) => row.some((cell) => /성명|이름|학생명/.test(String(cell))) && row.some((cell) => /번호|번/.test(String(cell))));
    if (headerIndex < 0) continue;
    const header = rows[headerIndex].map((cell) => String(cell).trim());
    const nameIndex = findHeaderIndex(header, ['성명', '이름', '학생명']);
    const numberIndex = findHeaderIndex(header, ['번호', '번']);
    const gradeIndex = findHeaderIndex(header, ['학년']);
    const classIndex = findHeaderIndex(header, ['학급', '반']);
    for (const row of rows.slice(headerIndex + 1)) {
      const name = String(row[nameIndex] ?? '').trim();
      if (!name || /계|합계|총원/.test(name)) continue;
      const number = String(row[numberIndex] ?? '').trim();
      const gradeRaw = gradeIndex >= 0 ? String(row[gradeIndex] ?? '').trim() : inferGradeFromSheet(sheetName);
      const classRaw = classIndex >= 0 ? String(row[classIndex] ?? '').trim() : inferClassFromSheet(sheetName);
      const className = normalizeClassName(classRaw.includes('-') ? classRaw : `${onlyNumber(gradeRaw)}-${onlyNumber(classRaw)}`);
      if (!className || className === '-') continue;
      students.push({
        id: `${className}-${number || students.length + 1}-${name}`,
        grade: onlyNumber(gradeRaw) || className.split('-')[0] || '',
        className,
        number,
        name,
        status: 'pending',
        memo: '',
      });
    }
  }
  return dedupeStudents(students).sort((a, b) => a.className.localeCompare(b.className, 'ko', { numeric: true }) || Number(a.number) - Number(b.number));
}

function findHeaderIndex(header: string[], candidates: string[]) {
  return header.findIndex((item) => candidates.some((candidate) => item.includes(candidate)));
}

function inferGradeFromSheet(sheetName: string) {
  return sheetName.match(/([123])\s*학년/)?.[1] ?? sheetName.match(/^([123])/)?.[1] ?? '';
}

function inferClassFromSheet(sheetName: string) {
  return sheetName.match(/([0-9]+)\s*반/)?.[1] ?? sheetName.match(/[123]\D+([0-9]{1,2})/)?.[1] ?? '';
}

function onlyNumber(value: string) {
  return value.match(/\d+/)?.[0] ?? '';
}

function normalizeClassName(value: string) {
  const raw = String(value || '').trim().replace(/학년/g, '').replace(/반/g, '').replace(/\s+/g, '');
  const match = raw.match(/(\d+)\D+(\d+)/) ?? raw.match(/^(\d)(\d{1,2})$/);
  if (match) return `${Number(match[1])}-${Number(match[2])}`;
  return raw;
}

function dedupeStudents(students: RosterStudent[]) {
  const seen = new Set<string>();
  return students.filter((student) => {
    const key = `${student.className}|${student.number}|${student.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueClasses(students: RosterStudent[]) {
  return [...new Set(students.map((student) => student.className))].sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
}

function getClassProgressPercent(scheduleClasses: ScheduleClass[], currentClass: string) {
  if (!scheduleClasses.length) return 0;
  const currentIndex = scheduleClasses.findIndex((item) => item.className === currentClass);
  if (currentIndex < 0) return 0;
  return Math.round((currentIndex / scheduleClasses.length) * 100);
}

function statusText(status: ClassStatus) {
  if (status === 'running') return '진행 중';
  if (status === 'completed') return '완료';
  if (status === 'missing') return '미도착';
  if (status === 'paused') return '일시중지';
  return '대기';
}

function formatNow() {
  return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function loadOperationState(): OperationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptyState, ...JSON.parse(raw) } : emptyState;
  } catch {
    return emptyState;
  }
}

function saveOperationState(state: OperationState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createTeacherMessage(state: OperationState) {
  return [
    '금일 학생 검진이 진행됩니다.',
    '고교학점제 이동수업으로 학생들이 여러 교실에 분산되어 있으므로, 수업 중인 선생님께서는 실시간 현황 링크를 확인하시고 해당 학급 학생이 있는 경우 검진 장소로 이동할 수 있도록 안내 부탁드립니다.',
    '',
    `현재 검사: ${state.currentClass || '-'}`,
    `다음 검사: ${state.nextClass || '-'}`,
    state.missingClasses.length ? `미도착 학급: ${state.missingClasses.join(', ')}` : '미도착 학급: 없음',
    state.delayMinutes > 0 ? `현재 지연: 약 ${state.delayMinutes}분` : '현재 지연: 없음',
    '',
    '※ 방송 안내는 최소화할 예정이므로 링크 확인 협조 부탁드립니다.',
  ].join('\n');
}

const ADMIN_PLAN_TEXT = `학생 검진 운영 시스템 개선 구상안

1. 추진 배경
- 올해 교육과정 변화 및 고교학점제 적용 학년에서 이동수업이 증가하며, 기존 학급 단위 검진 안내 방식만으로는 학생 이동 관리에 어려움이 발생함.
- 검진 일정은 연초 및 월간 예정사항으로 사전 안내되었으나, 수행평가·이동수업·조퇴·지각 등 현장 변수가 겹치며 검진 진행 상황을 교직원이 실시간으로 공유할 필요가 확인됨.
- 방송 안내는 수업 방해 민원이 발생할 수 있어, 방송을 최소화하면서도 학생을 제때 검진 장소로 이동시키는 보완 체계가 필요함.

2. 개선 방향
- 보건실에서 검진 진행 상황을 입력하면 교무실 PC와 수업 중 교사용 모바일 화면에서 실시간으로 확인할 수 있는 검진 운영 대시보드를 활용함.
- 학생에게 직접 안내하기보다, 현재 학생을 지도 중인 교사가 링크를 통해 검진 현황을 확인하고 해당 학급 학생을 안내하는 방식으로 운영함.

3. 주요 기능
- 현재 검사 학급, 다음 검사 학급, 미도착 학급, 지연 시간 표시
- 명렬표 업로드 후 학생별 검진 완료 여부 체크
- 미검 학생, 조퇴·지각·추후검진 학생 메모 관리
- 교무실 큰 화면용 진행 현황판 제공
- 리로스쿨 메시지로 교사용 현황 링크 공유
- 검진 당일 운영 기록 저장 및 다음 해 개선 자료로 활용

4. 기대 효과
- 방송 횟수와 수업 방해를 줄이면서 검진 진행 상황을 공유할 수 있음.
- 조퇴·지각 학생의 미검을 줄이고, 검진 완료 여부 확인 시간을 단축할 수 있음.
- 보건실 단독 대응이 아닌 학교 전체가 같은 정보를 보고 협조할 수 있는 구조를 만들 수 있음.
- 고교학점제 전면 적용 이후 반복될 검진 운영 혼선을 줄일 수 있음.

5. 협조 요청 사항
- 검진 당일 교직원에게 리로스쿨로 실시간 현황 링크를 공유할 수 있도록 협조 요청
- 조퇴 예정 학생은 조퇴 전 검진 여부 확인 후 귀가 안내
- 수행평가 등 검진 시간 조정이 필요한 경우 시간표 확정 전 사전 공유
- 미도착 학급 발생 시 방송보다 우선하여 교사용 현황 링크와 학년부 안내를 활용`;

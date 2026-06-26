import { ClipboardCopy, FileInput, Link as LinkIcon, MonitorSmartphone, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import * as XLSX from 'xlsx';
import type { AppData } from '../../types';
import {
  addOperationLog,
  buildOperationSchedule,
  formatDateTime,
  loadOperationState,
  normalizeClassName,
  OPERATION_STORAGE_KEY,
  saveOperationState,
  SCHEDULE_STATUS_LABELS,
  STUDENT_STATUS_LABELS,
  type OperationScheduleItem,
  type OperationState,
  type ScheduleRunStatus,
  type StudentExamStatus,
  type StudentRecord,
} from '../../lib/operation';

interface HealthOperationPanelProps {
  data: AppData;
}

type OperationView = 'health' | 'teacher' | 'board' | 'plan';

const STATUS_OPTIONS: StudentExamStatus[] = ['pending', 'completed', 'earlyLeave', 'late', 'absent', 'deferred'];

export function HealthOperationPanel({ data }: HealthOperationPanelProps) {
  const initialView = getInitialView();
  const [view, setView] = useState<OperationView>(initialView);
  const [state, setState] = useState<OperationState>(() => loadOperationState());
  const rosterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveOperationState(state);
  }, [state]);

  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key === OPERATION_STORAGE_KEY) setState(loadOperationState());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const current = state.schedule.find((item) => item.id === state.currentScheduleId) ?? state.schedule.find((item) => item.status === 'active') ?? null;
  const next = useMemo(() => {
    if (!state.schedule.length) return null;
    const currentOrder = current?.order ?? 0;
    return state.schedule.find((item) => item.status === 'waiting' && item.order > currentOrder) ?? state.schedule.find((item) => item.status === 'waiting') ?? null;
  }, [current?.order, state.schedule]);

  const currentStudents = useMemo(() => {
    if (!current) return [];
    return state.roster.filter((student) => student.className === current.className || `${student.grade}-${student.className}` === current.className);
  }, [current, state.roster]);

  const counts = useMemo(() => createCounts(state.roster), [state.roster]);
  const missedClasses = state.schedule.filter((item) => item.status === 'missed');
  const completedClasses = state.schedule.filter((item) => item.status === 'completed');
  const teacherLink = createShareLink('teacher');
  const boardLink = createShareLink('board');

  const updateState = (updater: (prev: OperationState) => OperationState) => setState((prev) => updater(prev));

  const importSchedule = () => {
    const schedule = buildOperationSchedule(data.assignments);
    if (!schedule.length) {
      window.alert('먼저 검사 시간표 자동배정을 실행한 뒤 운영 화면으로 불러와 주세요.');
      return;
    }
    updateState((prev) => addOperationLog({
      ...prev,
      title: data.settings.examType === 'tb' ? '학생 결핵검진 실시간 진행현황' : '학생 소변검사 실시간 진행현황',
      examDate: data.settings.examDate,
      schedule,
      currentScheduleId: schedule[0]?.id ?? '',
      delayMinutes: 0,
    }, `자동배정표 ${schedule.length}개 단위를 운영 화면으로 불러왔습니다.`));
  };

  const resetOperation = () => {
    if (!window.confirm('실시간 운영 데이터와 체크 현황을 초기화할까요?')) return;
    setState(loadEmptyOperation(data.settings.examDate));
  };

  const setCurrentSchedule = (id: string) => {
    updateState((prev) => addOperationLog({
      ...prev,
      currentScheduleId: id,
      schedule: prev.schedule.map((item) => item.id === id ? { ...item, status: 'active' } : item.status === 'active' ? { ...item, status: 'waiting' } : item),
    }, `${formatScheduleLabel(prevItem(prev.schedule, id))} 검사를 시작했습니다.`));
  };

  const updateScheduleStatus = (id: string, status: ScheduleRunStatus) => {
    updateState((prev) => {
      const target = prev.schedule.find((item) => item.id === id);
      const nextSchedule = prev.schedule.map((item) => item.id === id ? { ...item, status } : item);
      const nextWaiting = nextSchedule.find((item) => item.status === 'waiting' && item.order > (target?.order ?? 0));
      return addOperationLog({
        ...prev,
        schedule: nextSchedule,
        currentScheduleId: status === 'active' ? id : nextWaiting?.id ?? prev.currentScheduleId,
      }, `${formatScheduleLabel(target)} 상태를 '${SCHEDULE_STATUS_LABELS[status]}'로 변경했습니다.`);
    });
  };

  const updateStudentStatus = (studentId: string, status: StudentExamStatus) => {
    updateState((prev) => ({
      ...prev,
      roster: prev.roster.map((student) => student.id === studentId ? { ...student, status } : student),
    }));
  };

  const updateStudentMemo = (studentId: string, memo: string) => {
    updateState((prev) => ({ ...prev, roster: prev.roster.map((student) => student.id === studentId ? { ...student, memo } : student) }));
  };

  const onRosterUpload = async (file?: File) => {
    if (!file) return;
    const parsed = await parseRosterWorkbook(file);
    if (!parsed.length) {
      window.alert('명렬표에서 학생 정보를 찾지 못했습니다. 학년/반/번호/이름 열이 있는 엑셀 파일을 사용해 주세요.');
      return;
    }
    updateState((prev) => addOperationLog({ ...prev, roster: parsed }, `명렬표 ${parsed.length}명을 업로드했습니다.`));
  };

  const copy = async (text: string, message = '복사했습니다.') => {
    try {
      await navigator.clipboard.writeText(text);
      window.alert(message);
    } catch {
      window.prompt('복사할 내용을 선택해 주세요.', text);
    }
  };

  const planText = createAdminPlanText();

  return (
    <section className="stack operation-page">
      <div className="operation-header card">
        <div>
          <p className="eyebrow">고교학점제 검진 운영 확장 기능</p>
          <h2>실시간 검진 운영 대시보드</h2>
          <p>보건교사가 현장 상태를 입력하면 교무실 PC와 수업 중 교사용 모바일 화면에서 같은 진행 현황을 확인하는 구조입니다.</p>
        </div>
        <div className="operation-view-tabs no-print">
          <button className={view === 'health' ? 'active' : ''} onClick={() => setView('health')}>보건교사용</button>
          <button className={view === 'teacher' ? 'active' : ''} onClick={() => setView('teacher')}>교사용 모바일/PC</button>
          <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>교무실 큰 화면</button>
          <button className={view === 'plan' ? 'active' : ''} onClick={() => setView('plan')}>관리자 구상안</button>
        </div>
      </div>

      {view === 'health' && (
        <HealthOperatorView
          state={state}
          current={current}
          next={next}
          currentStudents={currentStudents}
          counts={counts}
          missedClasses={missedClasses}
          completedClasses={completedClasses}
          teacherLink={teacherLink}
          boardLink={boardLink}
          rosterRef={rosterRef}
          importSchedule={importSchedule}
          resetOperation={resetOperation}
          setCurrentSchedule={setCurrentSchedule}
          updateScheduleStatus={updateScheduleStatus}
          updateStudentStatus={updateStudentStatus}
          updateStudentMemo={updateStudentMemo}
          onRosterUpload={onRosterUpload}
          copy={copy}
          setDelay={(minutes) => updateState((prev) => ({ ...prev, delayMinutes: minutes }))}
          setNotice={(noticeMessage) => updateState((prev) => ({ ...prev, noticeMessage }))}
        />
      )}

      {view === 'teacher' && <TeacherStatusView state={state} current={current} next={next} missedClasses={missedClasses} counts={counts} />}
      {view === 'board' && <BoardStatusView state={state} current={current} next={next} missedClasses={missedClasses} counts={counts} completedClasses={completedClasses} />}
      {view === 'plan' && (
        <div className="card stack">
          <div className="section-title">
            <h2>관리자 보고용 구상안</h2>
            <div className="actions"><button onClick={() => copy(planText, '관리자 구상안을 복사했습니다.')}><ClipboardCopy size={16} /> 구상안 복사</button></div>
          </div>
          <pre className="proposal-box">{planText}</pre>
        </div>
      )}

      <input ref={rosterRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(event) => onRosterUpload(event.target.files?.[0])} />
    </section>
  );
}

function HealthOperatorView({
  state,
  current,
  next,
  currentStudents,
  counts,
  missedClasses,
  completedClasses,
  teacherLink,
  boardLink,
  rosterRef,
  importSchedule,
  resetOperation,
  setCurrentSchedule,
  updateScheduleStatus,
  updateStudentStatus,
  updateStudentMemo,
  onRosterUpload,
  copy,
  setDelay,
  setNotice,
}: {
  state: OperationState;
  current: OperationScheduleItem | null;
  next: OperationScheduleItem | null;
  currentStudents: StudentRecord[];
  counts: ReturnType<typeof createCounts>;
  missedClasses: OperationScheduleItem[];
  completedClasses: OperationScheduleItem[];
  teacherLink: string;
  boardLink: string;
  rosterRef: RefObject<HTMLInputElement | null>;
  importSchedule: () => void;
  resetOperation: () => void;
  setCurrentSchedule: (id: string) => void;
  updateScheduleStatus: (id: string, status: ScheduleRunStatus) => void;
  updateStudentStatus: (studentId: string, status: StudentExamStatus) => void;
  updateStudentMemo: (studentId: string, memo: string) => void;
  onRosterUpload: (file?: File) => void;
  copy: (text: string, message?: string) => void;
  setDelay: (minutes: number) => void;
  setNotice: (message: string) => void;
}) {
  const pendingStudents = state.roster.filter((student) => student.status !== 'completed');
  const currentGuide = createTeacherMessage(current, next, missedClasses, state.delayMinutes, state.noticeMessage);
  return (
    <div className="stack">
      <div className="operation-grid">
        <div className="card stack">
          <div className="section-title">
            <h2>운영 준비</h2>
            <div className="actions">
              <button onClick={importSchedule}><MonitorSmartphone size={16} /> 자동배정표 불러오기</button>
              <button onClick={() => rosterRef.current?.click()}><FileInput size={16} /> 명렬표 업로드</button>
              <button onClick={resetOperation}><RotateCcw size={16} /> 운영 초기화</button>
            </div>
          </div>
          <div className="metric-grid compact-metrics">
            <MetricLike label="불러온 순서" value={`${state.schedule.length}개`} />
            <MetricLike label="명렬표" value={`${state.roster.length}명`} />
            <MetricLike label="완료" value={`${counts.completed}명`} />
            <MetricLike label="미완료" value={`${counts.notCompleted}명`} />
          </div>
          <div className="share-link-box">
            <strong>리로스쿨 공유 링크</strong>
            <div><span>교사용:</span><code>{teacherLink}</code><button onClick={() => copy(teacherLink)}><LinkIcon size={14} /> 복사</button></div>
            <div><span>교무실:</span><code>{boardLink}</code><button onClick={() => copy(boardLink)}><LinkIcon size={14} /> 복사</button></div>
            <p>※ 현재 버전은 브라우저 저장소 기반 MVP입니다. 여러 기기에서 완전한 실시간 공유를 하려면 Supabase/Firebase 같은 실시간 DB 연결이 필요합니다.</p>
          </div>
        </div>

        <div className="card stack current-control-card">
          <div className="section-title"><h2>현재 진행 제어</h2></div>
          <div className="current-status-card">
            <span>현재 검사</span>
            <strong>{current ? formatScheduleLabel(current) : '-'}</strong>
            <small>{current?.examTime || '-'} / {current?.venue || '검진 장소 미입력'}</small>
          </div>
          <div className="current-status-card next">
            <span>다음 검사</span>
            <strong>{next ? formatScheduleLabel(next) : '-'}</strong>
            <small>{next?.examTime || '-'}</small>
          </div>
          <div className="inline-fields wide">
            <label>지연 시간(분)<input type="number" min={0} value={state.delayMinutes} onChange={(event) => setDelay(Number(event.target.value))} /></label>
            <button className="primary" disabled={!current} onClick={() => current && updateScheduleStatus(current.id, 'completed')}>현재 반 완료</button>
            <button disabled={!current} onClick={() => current && updateScheduleStatus(current.id, 'missed')}>현재 반 미도착</button>
          </div>
          <FieldLike label="교사용 안내 문구">
            <textarea value={state.noticeMessage} onChange={(event) => setNotice(event.target.value)} rows={3} />
          </FieldLike>
          <button onClick={() => copy(currentGuide, '교사용 안내 문구를 복사했습니다.')}><ClipboardCopy size={16} /> 현재 안내 문구 복사</button>
        </div>
      </div>

      <div className="operation-grid two-one">
        <div className="card stack">
          <div className="section-title"><h2>검진 순서</h2></div>
          <div className="operation-schedule-list">
            {state.schedule.map((item) => (
              <button key={item.id} className={`schedule-pill ${item.status} ${current?.id === item.id ? 'selected' : ''}`} onClick={() => setCurrentSchedule(item.id)}>
                <strong>{item.order}. {formatScheduleLabel(item)}</strong>
                <span>{item.callTime || item.examTime} / {SCHEDULE_STATUS_LABELS[item.status]}</span>
              </button>
            ))}
            {!state.schedule.length && <p className="empty-text">자동배정표를 불러오면 검진 순서가 표시됩니다.</p>}
          </div>
        </div>

        <div className="card stack">
          <div className="section-title"><h2>현재 반 명렬표 체크</h2></div>
          <StudentChecklist students={currentStudents} updateStudentStatus={updateStudentStatus} updateStudentMemo={updateStudentMemo} />
        </div>
      </div>

      <div className="operation-grid two-one">
        <div className="card stack">
          <div className="section-title"><h2>미검·조퇴·지각 학생</h2></div>
          <div className="student-chip-list">
            {pendingStudents.slice(0, 80).map((student) => <span key={student.id} className={`student-chip ${student.status}`}>{studentLabel(student)} · {STUDENT_STATUS_LABELS[student.status]}</span>)}
            {!pendingStudents.length && <p className="empty-text">미완료 학생이 없습니다.</p>}
          </div>
        </div>
        <div className="card stack">
          <div className="section-title"><h2>운영 기록</h2></div>
          <div className="log-list">
            {state.logs.map((log) => <div key={log.id}><strong>{formatDateTime(log.at)}</strong><span>{log.message}</span></div>)}
            {!state.logs.length && <p className="empty-text">운영 기록이 아직 없습니다.</p>}
          </div>
        </div>
      </div>

      <div className="summary-strip">
        <span>미도착 반: {missedClasses.map(formatScheduleLabel).join(', ') || '없음'}</span>
        <span>완료 반: {completedClasses.length}개</span>
        <span>마지막 갱신: {formatDateTime(state.lastUpdatedAt)}</span>
      </div>
    </div>
  );
}

function TeacherStatusView({ state, current, next, missedClasses, counts }: {
  state: OperationState;
  current: OperationScheduleItem | null;
  next: OperationScheduleItem | null;
  missedClasses: OperationScheduleItem[];
  counts: ReturnType<typeof createCounts>;
}) {
  return (
    <div className="teacher-mobile-shell">
      <div className="teacher-status-card hero">
        <span>{state.title}</span>
        <strong>{current ? formatScheduleLabel(current) : '대기 중'}</strong>
        <p>현재 검사 중</p>
      </div>
      <div className="teacher-status-grid">
        <div><span>다음</span><strong>{next ? formatScheduleLabel(next) : '-'}</strong><small>{next?.callTime || next?.examTime || ''}</small></div>
        <div><span>지연</span><strong>{state.delayMinutes ? `${state.delayMinutes}분` : '없음'}</strong><small>현장 입력 기준</small></div>
      </div>
      <div className="teacher-alert">
        <strong>수업 중 안내</strong>
        <p>{createTeacherMessage(current, next, missedClasses, state.delayMinutes, state.noticeMessage)}</p>
      </div>
      {!!missedClasses.length && <div className="teacher-alert warning"><strong>미도착</strong><p>{missedClasses.map(formatScheduleLabel).join(', ')} 학생이 수업 중이면 검진 장소로 보내주세요.</p></div>}
      <div className="teacher-status-grid">
        <div><span>완료 학생</span><strong>{counts.completed}명</strong></div>
        <div><span>미완료 학생</span><strong>{counts.notCompleted}명</strong></div>
      </div>
      <p className="teacher-last-updated">마지막 갱신: {formatDateTime(state.lastUpdatedAt)}</p>
    </div>
  );
}

function BoardStatusView({ state, current, next, missedClasses, counts, completedClasses }: {
  state: OperationState;
  current: OperationScheduleItem | null;
  next: OperationScheduleItem | null;
  missedClasses: OperationScheduleItem[];
  counts: ReturnType<typeof createCounts>;
  completedClasses: OperationScheduleItem[];
}) {
  const progress = state.schedule.length ? Math.round((completedClasses.length / state.schedule.length) * 100) : 0;
  return (
    <div className="board-screen">
      <div className="board-title"><span>{state.examDate}</span><strong>{state.title}</strong><em>마지막 갱신 {formatDateTime(state.lastUpdatedAt)}</em></div>
      <div className="board-main-grid">
        <div className="board-panel current"><span>현재 검사</span><strong>{current ? formatScheduleLabel(current) : '-'}</strong><small>{current?.examTime || ''}</small></div>
        <div className="board-panel"><span>다음 검사</span><strong>{next ? formatScheduleLabel(next) : '-'}</strong><small>{next?.callTime || next?.examTime || ''}</small></div>
        <div className="board-panel warning"><span>미도착</span><strong>{missedClasses.length ? missedClasses.map(formatScheduleLabel).join(', ') : '없음'}</strong></div>
        <div className="board-panel"><span>지연</span><strong>{state.delayMinutes ? `${state.delayMinutes}분` : '없음'}</strong></div>
      </div>
      <div className="board-progress"><div style={{ width: `${progress}%` }} /><span>{progress}% 완료 · {completedClasses.length}/{state.schedule.length}개 단위</span></div>
      <div className="board-sub-grid">
        <div><span>학생 완료</span><strong>{counts.completed}명</strong></div>
        <div><span>학생 미완료</span><strong>{counts.notCompleted}명</strong></div>
        <div><span>조퇴/지각/추후</span><strong>{counts.earlyLeave + counts.late + counts.deferred}명</strong></div>
      </div>
    </div>
  );
}

function StudentChecklist({ students, updateStudentStatus, updateStudentMemo }: {
  students: StudentRecord[];
  updateStudentStatus: (studentId: string, status: StudentExamStatus) => void;
  updateStudentMemo: (studentId: string, memo: string) => void;
}) {
  if (!students.length) return <p className="empty-text">현재 반과 일치하는 명렬표 학생이 없습니다. 명렬표의 학년·반 표기를 확인해 주세요.</p>;
  return (
    <div className="student-checklist">
      {students.map((student) => (
        <div key={student.id} className={`student-row ${student.status}`}>
          <div><strong>{student.number}. {student.name}</strong><span>{student.grade}학년 {student.className}반</span></div>
          <select value={student.status} onChange={(event) => updateStudentStatus(student.id, event.target.value as StudentExamStatus)}>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{STUDENT_STATUS_LABELS[status]}</option>)}
          </select>
          <input placeholder="메모" value={student.memo} onChange={(event) => updateStudentMemo(student.id, event.target.value)} />
        </div>
      ))}
    </div>
  );
}

function MetricLike({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function FieldLike({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function createCounts(roster: StudentRecord[]) {
  const completed = roster.filter((student) => student.status === 'completed').length;
  return {
    completed,
    notCompleted: roster.length - completed,
    pending: roster.filter((student) => student.status === 'pending').length,
    earlyLeave: roster.filter((student) => student.status === 'earlyLeave').length,
    late: roster.filter((student) => student.status === 'late').length,
    deferred: roster.filter((student) => student.status === 'deferred').length,
  };
}

function createTeacherMessage(current: OperationScheduleItem | null, next: OperationScheduleItem | null, missedClasses: OperationScheduleItem[], delayMinutes: number, noticeMessage: string) {
  const lines = [
    current ? `현재 ${formatScheduleLabel(current)} 검사 중입니다.` : '현재 검진 진행 대기 중입니다.',
    next ? `다음 순서: ${formatScheduleLabel(next)}${next.callTime ? ` (${next.callTime} 이동)` : ''}` : '다음 순서는 아직 없습니다.',
    delayMinutes ? `현장 지연: 약 ${delayMinutes}분` : '',
    missedClasses.length ? `미도착: ${missedClasses.map(formatScheduleLabel).join(', ')}` : '',
    noticeMessage,
  ].filter(Boolean);
  return lines.join('\n');
}

function formatScheduleLabel(item?: OperationScheduleItem | null) {
  if (!item) return '-';
  return item.unitName || item.className || `${item.grade}-${item.className}`;
}

function studentLabel(student: StudentRecord) {
  return `${student.grade}-${student.className} ${student.number} ${student.name}`;
}

function prevItem(schedule: OperationScheduleItem[], id: string) {
  return schedule.find((item) => item.id === id);
}

function createShareLink(view: 'teacher' | 'board') {
  const url = new URL(window.location.href);
  url.searchParams.set('healthView', view);
  return url.toString();
}

function getInitialView(): OperationView {
  const params = new URLSearchParams(window.location.search);
  const healthView = params.get('healthView');
  if (healthView === 'teacher' || healthView === 'board') return healthView;
  return 'health';
}

function loadEmptyOperation(examDate: string): OperationState {
  return {
    title: '학생 결핵검진 실시간 진행현황',
    examDate,
    roster: [],
    schedule: [],
    currentScheduleId: '',
    delayMinutes: 0,
    noticeMessage: '수업 중 해당 학급 학생이 있으면 검진 장소로 이동할 수 있도록 안내 부탁드립니다.',
    logs: [],
    lastUpdatedAt: new Date().toISOString(),
  };
}

async function parseRosterWorkbook(file: File): Promise<StudentRecord[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const rows: StudentRecord[] = [];
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    raw.forEach((row, index) => {
      const student = parseRosterRow(row, sheetName, index);
      if (student) rows.push(student);
    });
  });
  return dedupeStudents(rows);
}

function parseRosterRow(row: Record<string, unknown>, sheetName: string, index: number): StudentRecord | null {
  const keys = Object.keys(row);
  const get = (patterns: string[]) => {
    const key = keys.find((item) => patterns.some((pattern) => item.replace(/\s/g, '').includes(pattern)));
    return key ? String(row[key] ?? '').trim() : '';
  };
  const rawGrade = get(['학년', 'grade']);
  const rawClass = get(['반', 'class']);
  const rawNumber = get(['번호', '번', 'number', 'no']);
  const rawName = get(['성명', '이름', 'name']);
  const values = keys.map((key) => String(row[key] ?? '').trim()).filter(Boolean);
  const name = rawName || values.find((value) => /[가-힣]{2,}/.test(value) && !/(학년|반|번호|성명|이름)/.test(value)) || '';
  if (!name) return null;
  const grade = normalizeNumeric(rawGrade) || inferGrade(sheetName) || normalizeNumeric(values[0]) || '';
  const className = normalizeNumeric(rawClass) || inferClass(sheetName) || normalizeNumeric(values[1]) || '';
  const number = normalizeNumeric(rawNumber) || normalizeNumeric(values.find((value) => /^\d{1,2}$/.test(value)) || '') || String(index + 1);
  if (!grade || !className) return null;
  return {
    id: `student-${grade}-${className}-${number}-${name}`,
    grade,
    className: normalizeClassName(`${grade}-${className}`).split('-')[1] || className,
    number,
    name,
    status: 'pending',
    memo: '',
  };
}

function normalizeNumeric(value: string) {
  const match = String(value || '').match(/\d+/);
  return match ? String(Number(match[0])) : '';
}

function inferGrade(text: string) {
  const match = text.match(/(\d+)\s*학년|^(\d)[-_]/);
  return match ? String(Number(match[1] || match[2])) : '';
}

function inferClass(text: string) {
  const match = text.match(/(\d+)\s*반|[-_](\d+)/);
  return match ? String(Number(match[1] || match[2])) : '';
}

function dedupeStudents(students: StudentRecord[]) {
  const map = new Map<string, StudentRecord>();
  students.forEach((student) => map.set(student.id, student));
  return Array.from(map.values()).sort((a, b) => `${a.grade}-${a.className}-${a.number.padStart(2, '0')}`.localeCompare(`${b.grade}-${b.className}-${b.number.padStart(2, '0')}`));
}

function createAdminPlanText() {
  return `학생 결핵검진 실시간 운영 시스템 개선 구상안

1. 추진 배경
- 2026학년도부터 전 학년 고교학점제 적용으로 학생들이 학급 교실에 고정되어 있지 않고 선택과목·분반수업 장소로 분산됩니다.
- 올해 교육과정이 먼저 바뀐 학년에서 결핵검진 진행 시 학생들이 본인 학급 검진 시간을 인지하지 못하거나, 수업 장소가 흩어져 첫 학급 미도착·지연·미검 학생 발생 등 혼선이 있었습니다.
- 방송 안내는 즉각적인 효과는 있으나 수업 중 방송에 대한 민원이 발생할 수 있어, 방송 의존도를 낮추는 대체 안내 체계가 필요합니다.

2. 개선 방향
- 기존의 학급별 검진 시간표는 유지하되, 보건실에서 실시간 진행 상황을 입력하면 교무실 PC와 수업 중 교사용 모바일 화면에서 현재 상황을 확인할 수 있도록 합니다.
- 학생에게 직접 안내하는 방식이 아니라, 현재 학생을 데리고 있는 교과교사가 링크를 통해 현재 검진 반·다음 검진 반·미도착 반을 확인하고 해당 학생을 보내는 구조로 운영합니다.

3. 주요 기능
- 보건교사용 관리 화면: 현재 검사 반, 다음 반, 미도착 반, 지연 시간, 안내 문구 입력
- 명렬표 업로드 및 학생별 완료 체크: 완료·미검·조퇴·지각·추후검진 상태 확인
- 교사용 모바일/PC 현황판: 현재 검사 반, 다음 반, 미도착 반, 지연 여부 실시간 확인
- 교무실 큰 화면: 전체 진행률, 완료 반, 미도착 반, 예상 지연 상황 표시
- 운영 기록 저장: 미도착, 안내 요청, 조퇴 미검 등 다음 해 개선 근거 확보

4. 운영 방법
- 검진 당일 아침 리로스쿨 메시지로 전 교사에게 실시간 현황 링크를 발송합니다.
- 수업 중인 교사는 링크를 확인하여 해당 학급 학생이 수업 중이면 검진 장소로 이동하도록 안내합니다.
- 조퇴·지각 학생은 담임 또는 담당 교사가 검진 여부를 확인한 뒤 보건실과 연결합니다.
- 방송은 긴급 상황이나 전체 안내가 꼭 필요한 경우로 최소화합니다.

5. 기대 효과
- 고교학점제 이동수업 환경에서 학생 검진 이동 누락 감소
- 방송 의존도 감소 및 수업 방해 민원 완화
- 조퇴·지각·미검 학생 관리 강화
- 보건실 단독 대응이 아니라 학교 전체가 진행 상황을 공유하는 운영 체계 마련
- 다음 해 검진 계획 수립을 위한 객관적 기록 확보

6. 협조 요청 사항
- 검진 일정은 연초 및 월간 예정사항으로 공유되므로 수행평가 등과 충돌 가능성이 있는 경우 시간표 확정 전 보건실로 사전 협의 부탁드립니다.
- 검진 당일 조퇴 예정 학생은 조퇴 전 검진 여부를 확인해 주시기 바랍니다.
- 검진 시간 중 해당 학급 학생이 수업 중인 경우, 실시간 현황판 확인 후 검진 장소로 이동할 수 있도록 안내 부탁드립니다.`;
}

import { ClipboardCopy, Download, FileInput, FileText, Printer, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AppData,
  DayScheduleItem,
  DivisionHandling,
  ExamSettings,
  ExamTemplate,
  ExamType,
  LocationCategory,
  ManualOverride,
  SubjectDivision,
  TimetableRow,
  VisitLocation,
} from './types';
import {
  createDefaultData,
  DEFAULT_DAY_SCHEDULE,
  getGuideText,
  TB_BLOCKED_KEYWORDS,
  TB_CAUTION_KEYWORDS,
  URINE_BLOCKED_KEYWORDS,
  URINE_CAUTION_KEYWORDS,
} from './lib/defaultData';
import { clearAppData, loadAppData, saveAppData } from './lib/storage';
import {
  createFullTable,
  createLabTable,
  createTbGradeTables,
  createTeacherTable,
  createUrineTwoColumnTable,
  createUrineLineTables,
  downloadJsonBackup,
  exportTableToCsv,
} from './lib/csv';
import { makeSchedule, createManualConfirmRows } from './lib/scheduler';
import { parseTimetablePaste } from './lib/paste';
import {
  CommonImportRow,
  convertPreviewToAppRows,
  downloadCommonTemplateCsv,
  downloadCommonTemplateXlsx,
  parseWorkbookFile,
} from './lib/commonTemplate';
import { AppFooter } from './components/common/AppFooter';
import { OtterMascot } from './components/common/OtterMascot';

const PERIODS = [1, 2, 3, 4, 5, 6, 7];
const CATEGORIES: LocationCategory[] = ['일반교실', '특별실', '선택과목 장소', '체육시설', '수동확인'];
const DIVISION_HANDLINGS: DivisionHandling[] = ['자동제외', '장소반영'];

export function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showTypeConfirm, setShowTypeConfirm] = useState(false);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  const manualRows = useMemo(
    () => createManualConfirmRows(data.divisions, data.assignments, data.judgements),
    [data.divisions, data.assignments, data.judgements],
  );

  const dashboard = useMemo(() => {
    const totalCandidates = data.locations.filter((item) => item.isVisitable && item.includeInAuto).length;
    const lineCount = Math.max(1, data.settings.teamCount || 1);
    const vendorMinutes = minutesBetween(data.settings.startTime, data.settings.endTime);
    const gradeStats = createGradeStats(data);
    const estimatedMinutes =
      data.settings.examType === 'urine' && data.settings.urineSimultaneous && data.settings.urineParallelMode === 'grade'
        ? Math.max(0, ...gradeStats.map((stat) => stat.estimatedMinutes))
        : Math.ceil((totalCandidates * data.settings.durationMinutes) / lineCount);
    return {
      totalCandidates,
      done: data.assignments.filter((item) => item.order).length,
      manual: manualRows.length,
      blocked: data.judgements.filter((item) => item.status === '불가').length,
      estimatedMinutes,
      vendorMinutes,
      fitsVendorTime: estimatedMinutes <= vendorMinutes,
      gradeStats,
    };
  }, [data, manualRows.length]);

  const setSettings = (settings: ExamSettings) => setData((prev) => ({ ...prev, settings }));
  const guideText = getGuideText(data.settings.examType);
  const mode = getModeCopy(data.settings.examType);
  const selectExamType = (examType: ExamType) => {
    const template = data.templates.find((item) => item.examType === examType);
    const keywordSet = examType === 'tb' ? data.keywordSets.tuberculosis : data.keywordSets.urine;
    setData((prev) => ({
      ...prev,
      ...(template ? structuredClone(template.data) : {}),
      settings: {
        ...(template ? structuredClone(template.data.settings) : prev.settings),
        examType,
        blockedKeywords: keywordSet.blockedKeywords,
        cautionKeywords: keywordSet.cautionKeywords,
      },
      activeTemplateId: template?.id ?? '',
      hasSelectedExamType: true,
    }));
    setActiveTab('settings');
  };
  const confirmReselectType = () => {
    setShowTypeConfirm(true);
  };
  const reselectType = () => {
    setData((prev) => ({ ...prev, hasSelectedExamType: false, assignments: [], judgements: [], manualOverrides: [] }));
    setActiveTab('dashboard');
    setShowTypeConfirm(false);
  };
  const startNewSchedule = () => {
    if (window.confirm('새 시간표를 만들기 위해 검사 유형 선택 화면으로 돌아갈까요?')) {
      setData((prev) => ({ ...prev, hasSelectedExamType: false, assignments: [], judgements: [], manualOverrides: [] }));
      setActiveTab('dashboard');
    }
  };
  const saveCurrentTemplate = () => {
    const defaultName = `${data.settings.examDate.slice(0, 4) || new Date().getFullYear()} ${mode.shortLabel}`;
    const name = window.prompt('저장할 템플릿 이름을 입력하세요.', defaultName);
    if (!name) return;
    const now = new Date().toISOString();
    const template: ExamTemplate = {
      id: data.activeTemplateId || `tpl-${Date.now()}`,
      name,
      year: name.match(/\d{4}/)?.[0] ?? data.settings.examDate.slice(0, 4),
      examType: data.settings.examType,
      createdAt: data.templates.find((item) => item.id === data.activeTemplateId)?.createdAt ?? now,
      updatedAt: now,
      data: snapshotTemplateData(data),
    };
    setData((prev) => ({
      ...prev,
      activeTemplateId: template.id,
      templates: prev.templates.some((item) => item.id === template.id)
        ? prev.templates.map((item) => (item.id === template.id ? template : item))
        : [...prev.templates, template],
    }));
  };

  const loadTemplate = (templateId: string) => {
    const template = data.templates.find((item) => item.id === templateId);
    if (!template) return;
    setData((prev) => ({ ...prev, ...structuredClone(template.data), activeTemplateId: template.id }));
  };

  const copyTemplate = () => {
    const source = data.templates.find((item) => item.id === data.activeTemplateId) ?? data.templates.find((item) => item.examType === data.settings.examType);
    const nextYear = String((Number(source?.year) || new Date().getFullYear()) + 1);
    const name = window.prompt('복사해서 만들 새 템플릿 이름을 입력하세요.', `${nextYear} ${mode.shortLabel}`);
    if (!name || !source) return;
    const now = new Date().toISOString();
    const copied: ExamTemplate = {
      ...structuredClone(source),
      id: `tpl-${Date.now()}`,
      name,
      year: name.match(/\d{4}/)?.[0] ?? nextYear,
      createdAt: now,
      updatedAt: now,
      data: {
        ...structuredClone(source.data),
        assignments: [],
        judgements: [],
        manualOverrides: [],
        settings: { ...structuredClone(source.data.settings), examDate: `${nextYear}-06-24` },
      },
    };
    setData((prev) => ({ ...prev, ...copied.data, activeTemplateId: copied.id, templates: [...prev.templates, copied] }));
  };
  const runSchedule = () => {
    const messages = validateBeforeSchedule(data);
    setValidationMessages(messages);
    if (messages.length > 0) {
      alert(messages.join('\n'));
      return;
    }
    const result = makeSchedule(data);
    setData((prev) => ({ ...prev, ...result }));
    setActiveTab('results');
  };

  const resetExamples = () => {
    clearAppData();
    setData(createDefaultData());
  };

  const importBackup = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData;
        setData({ ...createDefaultData(), ...parsed });
      } catch {
        alert('JSON 백업 파일을 읽을 수 없습니다.');
      }
    };
    reader.readAsText(file);
  };

  const copyText = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text);
    alert(message);
  };

  const tables = {
    full: createFullTable(data.assignments, data.settings),
    lab: createLabTable(data.assignments),
    urineLines: createUrineLineTables(data.assignments),
    urineTwoColumn: createUrineTwoColumnTable(data.assignments, data.settings),
    tbGrades: createTbGradeTables(data.assignments, data.settings),
    teacher: createTeacherTable(data.assignments, data.settings),
  };

  if (!data.hasSelectedExamType) {
    return <ExamTypeSelect onSelect={selectExamType} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <OtterMascot variant="sm" decorative />
          <div>
            <strong>검진·검사 자동배정</strong>
            <span>{mode.shortLabel}</span>
            <span>{mode.sidebarDetail}</span>
          </div>
        </div>
        <nav>
          {[
            ['dashboard', '대시보드'],
            ['settings', '검사 조건'],
            ['locations', mode.unitMenu],
            ['timetable', '시간표 입력'],
            ['divisions', '분반 참고'],
            ['results', '결과/출력'],
          ].map(([id, label]) => (
            <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>
              {label}
            </button>
          ))}
        </nav>
        <button className="primary full" onClick={runSchedule}>
          <Sparkles size={18} /> 검사 시간표 만들기
        </button>
        <button className="full" onClick={confirmReselectType}>검사 유형 다시 선택</button>
        <button className="full" onClick={startNewSchedule}>새 시간표 만들기</button>
        <div className="sidebar-mascot">
          <OtterMascot variant="md" decorative />
          <span>쑤캥T 보건실 도구모음</span>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">내부 업무용 도구</p>
            <h1>{mode.title}</h1>
          </div>
          <div className="toolbar">
            <button onClick={() => exportTableToCsv(tables.full)} title="전체 자동 배정표 CSV">
              <Download size={17} /> 전체 CSV
            </button>
            <button onClick={() => window.print()} title="인쇄용 화면">
              <Printer size={17} /> 인쇄
            </button>
            <button onClick={() => copyText(guideText, '안내 문구를 복사했습니다.')} title="안내 문구 복사">
              <ClipboardCopy size={17} /> 안내 복사
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <Dashboard
            data={data}
            dashboard={dashboard}
            runSchedule={runSchedule}
            exportFull={() => exportTableToCsv(tables.full)}
            print={() => window.print()}
            copyGuide={() => copyText(guideText, '안내 문구를 복사했습니다.')}
            guideText={guideText}
            backup={() => downloadJsonBackup(data)}
            importClick={() => fileRef.current?.click()}
            saveTemplate={saveCurrentTemplate}
            loadTemplate={loadTemplate}
            copyTemplate={copyTemplate}
            mode={mode}
            validationMessages={validationMessages}
          />
        )}
        {activeTab === 'settings' && <SettingsPanel data={data} setData={setData} settings={data.settings} setSettings={setSettings} />}
        {activeTab === 'locations' && <LocationsPanel data={data} setData={setData} mode={mode} />}
        {activeTab === 'timetable' && <TimetablePanel data={data} setData={setData} resetExamples={resetExamples} />}
        {activeTab === 'divisions' && <DivisionsPanel data={data} setData={setData} />}
        {activeTab === 'results' && (
          <ResultsPanel
            data={data}
            setData={setData}
            manualRows={manualRows}
            tables={tables}
            guideText={guideText}
            copyGuide={() => copyText(guideText, '안내 문구를 복사했습니다.')}
            copyTeacher={() =>
              copyText(
                tables.teacher.rows.map((row) => `${row[0]} ${row[1]} ${row[3]}`).join('\n'),
                '교사용 안내 문구를 복사했습니다.',
              )
            }
          />
        )}

        <AppFooter />
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(event) => importBackup(event.target.files?.[0])} />
      </main>
      {showTypeConfirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>검사 유형 다시 선택</h2>
            <p>검사 유형을 변경하면 현재 설정과 자동배정 결과가 초기화될 수 있습니다. 계속하시겠습니까?</p>
            <div className="actions">
              <button onClick={() => setShowTypeConfirm(false)}>취소</button>
              <button className="primary" onClick={reselectType}>유형 다시 선택</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({
  data,
  dashboard,
  runSchedule,
  exportFull,
  print,
  copyGuide,
  guideText,
  backup,
  importClick,
  saveTemplate,
  loadTemplate,
  copyTemplate,
  mode,
  validationMessages,
}: {
  data: AppData;
  dashboard: {
    totalCandidates: number;
    done: number;
    manual: number;
    blocked: number;
    estimatedMinutes: number;
    vendorMinutes: number;
    fitsVendorTime: boolean;
    gradeStats: ReturnType<typeof createGradeStats>;
  };
  runSchedule: () => void;
  exportFull: () => void;
  print: () => void;
  copyGuide: () => void;
  guideText: string;
  backup: () => void;
  importClick: () => void;
  saveTemplate: () => void;
  loadTemplate: (templateId: string) => void;
  copyTemplate: () => void;
  mode: ReturnType<typeof getModeCopy>;
  validationMessages: string[];
}) {
  const visibleTemplates = data.templates.filter((template) => template.examType === data.settings.examType);
  const selectedTemplateId = visibleTemplates.some((template) => template.id === data.activeTemplateId) ? data.activeTemplateId : visibleTemplates[0]?.id ?? '';
  return (
    <section className="stack">
      <div className="notice notice-with-mascot">
        <OtterMascot variant="sm" decorative />
        <span>{guideText}</span>
      </div>
      <div className="card template-bar">
        <Field label="연도별 검사 템플릿">
          <select value={selectedTemplateId} onChange={(event) => loadTemplate(event.target.value)}>
            {visibleTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </Field>
        <button onClick={saveTemplate}>현재 템플릿 저장</button>
        <button onClick={copyTemplate}>기존 템플릿 복사</button>
      </div>
      <div className="metric-grid">
        <Metric label={mode.dateLabel} value={data.settings.examDate || '-'} />
        <Metric label={mode.gradeLabel} value={data.settings.targetGrades.join(', ') || '-'} />
        <Metric label={mode.totalLabel} value={dashboard.totalCandidates} />
        {dashboard.gradeStats.map((stat) => (
          <Metric key={`${stat.grade}-count`} label={`${stat.grade}학년 ${data.settings.examType === 'tb' ? '호출 단위 수' : '방문 장소 수'}`} value={stat.count} />
        ))}
        <Metric label="자동 배정 완료 수" value={dashboard.done} />
        {data.settings.examType === 'tb' &&
          dashboard.gradeStats.map((stat) => <Metric key={`${stat.grade}-done`} label={`${stat.grade}학년 배정 완료 수`} value={stat.done} />)}
        <Metric label="수동 확인 필요 수" value={dashboard.manual} />
        <Metric label={mode.blockedLabel} value={dashboard.blocked} />
        <Metric label="업체 검사 가능 시간" value={`${data.settings.startTime}~${data.settings.endTime}`} />
        <Metric label="단위당 소요시간" value={`${data.settings.durationMinutes}분`} />
        <Metric label="예상 총 소요시간" value={`${dashboard.estimatedMinutes}분`} />
        {dashboard.gradeStats.map((stat) => (
          <Metric key={`${stat.grade}-minutes`} label={`${stat.grade}학년 예상 소요시간`} value={`${stat.estimatedMinutes}분`} />
        ))}
        <Metric label="업체 시간 내 배정 가능 여부" value={dashboard.fitsVendorTime ? '가능' : '주의'} />
        {data.settings.examType === 'tb' &&
          dashboard.gradeStats.map((stat) => <Metric key={`${stat.grade}-fits`} label={`${stat.grade}학년 시간 구간 내 배정`} value={stat.fits ? '가능' : '주의'} />)}
      </div>
      {!dashboard.fitsVendorTime && (
        <div className="warning-banner">업체 검사 가능 시간 안에 모든 단위를 배정하기 어려울 수 있습니다. 소요시간, 검사팀 수, 검사 가능 교시를 조정해 주세요.</div>
      )}
      {dashboard.gradeStats.some((stat) => !stat.fits) && (
        <div className="warning-banner">
          {data.settings.examType === 'tb'
            ? '해당 학년의 검진 가능 시간 안에 모든 호출 단위를 배정하기 어려울 수 있습니다. 학년별 시간 구간, 호출단위당 소요시간, 검진 라인 수를 조정해 주세요.'
            : '해당 학년 라인의 검사 가능 시간 안에 모든 방문 장소를 배정하기 어려울 수 있습니다. 학년별 시작 시간, 장소당 소요시간, 검사팀 수, 검사 가능 교시를 조정해 주세요.'}
        </div>
      )}
      {validationMessages.length > 0 && (
        <div className="warning-list">
          <strong>자동배정 전 확인 필요</strong>
          {validationMessages.map((message, index) => <p key={index}>{message}</p>)}
        </div>
      )}
      <div className="card actions">
        <button className="primary" onClick={runSchedule}>
          <Sparkles size={18} /> 검사 시간표 만들기
        </button>
        <button onClick={exportFull}>
          <Download size={17} /> CSV 다운로드
        </button>
        <button onClick={print}>
          <Printer size={17} /> 인쇄용 화면
        </button>
        <button onClick={copyGuide}>
          <ClipboardCopy size={17} /> 안내 문구 복사
        </button>
        <button onClick={backup}>
          <FileText size={17} /> JSON 백업
        </button>
        <button onClick={importClick}>
          <FileInput size={17} /> JSON 불러오기
        </button>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ExamTypeSelect({ onSelect }: { onSelect: (examType: ExamType) => void }) {
  return (
    <main className="type-select-screen">
      <div className="type-select-content">
        <section className="type-hero">
          <div>
            <p className="eyebrow">학교 보건 업무 도구</p>
            <h1>검진·검사 시간표 자동배정 도우미</h1>
            <p>소변검사와 결핵검진 시간표를 학교 일과표, 업체 검사 가능 시간, 수업 시간표를 기준으로 자동 배정합니다.</p>
            <strong className="brand-line">쑤캥T 보건실 도구모음</strong>
          </div>
          <OtterMascot variant="lg" className="type-hero-mascot" />
        </section>
        <section className="type-card-grid">
          <div className="type-card">
            <span className="mode-pill">방문형 검사</span>
            <h2>소변검사 시간표 만들기</h2>
            <p>검사팀이 실제 방문 가능한 교실·장소를 기준으로 순서를 배정합니다.</p>
            <button className="primary" onClick={() => onSelect('urine')}>소변검사 시작</button>
          </div>
          <div className="type-card">
            <span className="mode-pill">호출형 검진</span>
            <h2>결핵검진 시간표 만들기</h2>
            <p>학생들이 검진 장소로 이동해야 하므로 호출 가능한 학급·수업단위를 기준으로 순서를 배정합니다.</p>
            <button className="primary" onClick={() => onSelect('tb')}>결핵검진 시작</button>
          </div>
        </section>
      </div>
      <AppFooter />
    </main>
  );
}

function SettingsPanel({
  data,
  setData,
  settings,
  setSettings,
}: {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  settings: ExamSettings;
  setSettings: (settings: ExamSettings) => void;
}) {
  const update = <K extends keyof ExamSettings>(key: K, value: ExamSettings[K]) => setSettings({ ...settings, [key]: value });
  const updateDaySchedule = (index: number, patch: Partial<DayScheduleItem>) =>
    update(
      'daySchedule',
      settings.daySchedule.map((item, rowIndex) => (rowIndex === index ? { ...item, ...patch } : item)),
    );
  const updateTeamsByGrade = (grade: string, value: number) => update('teamsByGrade', { ...settings.teamsByGrade, [grade]: value });
  const updateGradeStartTime = (grade: string, value: string) => update('gradeStartTimes', { ...settings.gradeStartTimes, [grade]: value });
  const updateGradeTimeBlock = (grade: string, patch: Partial<(typeof settings.gradeTimeBlocks)[number]>) =>
    update(
      'gradeTimeBlocks',
      settings.gradeTimeBlocks.map((block) => (block.grade === grade ? { ...block, ...patch } : block)),
    );
  const saveSchoolDefaults = () =>
    setData((prev) => ({ ...prev, schoolDefaults: { daySchedule: structuredClone(settings.daySchedule) } }));
  const loadSchoolDefaults = () => update('daySchedule', structuredClone(data.schoolDefaults.daySchedule));
  const saveKeywordSet = () =>
    setData((prev) => ({
      ...prev,
      keywordSets:
        settings.examType === 'tb'
          ? {
              ...prev.keywordSets,
              tuberculosis: { blockedKeywords: settings.blockedKeywords, cautionKeywords: settings.cautionKeywords },
            }
          : {
              ...prev.keywordSets,
              urine: { blockedKeywords: settings.blockedKeywords, cautionKeywords: settings.cautionKeywords },
            },
    }));

  return (
    <section className="card stack">
      <h2>검사 조건 설정</h2>
      <div className="form-grid">
        <Field label="검사 유형">
          <input value={getModeCopy(settings.examType).shortLabel} readOnly />
        </Field>
        <Field label={settings.examType === 'tb' ? '결핵검진일' : '소변검사일'}>
          <input type="date" value={settings.examDate} onChange={(event) => update('examDate', event.target.value)} />
        </Field>
        <Field label="업체 검사 가능 시작 시간">
          <input type="time" value={settings.startTime} onChange={(event) => update('startTime', event.target.value)} />
        </Field>
        <Field label="업체 검사 가능 종료 시간">
          <input type="time" value={settings.endTime} onChange={(event) => update('endTime', event.target.value)} />
        </Field>
        <div className="form-help">업체가 실제 검사를 시작·종료할 수 있는 시간을 입력해 주세요. 자동배정은 학교 일과표와 업체 가능 시간이 겹치는 시간 안에서만 진행됩니다.</div>
        <Field label={settings.examType === 'tb' ? '학급/호출단위당 검진 소요시간(분)' : '장소당 검사 소요시간(분)'}>
          <input type="number" min={1} value={settings.durationMinutes} onChange={(event) => update('durationMinutes', Number(event.target.value))} />
        </Field>
        <Field label={settings.examType === 'tb' ? '검진 라인 수' : '검사팀 수'}>
          <input type="number" min={1} value={settings.teamCount} onChange={(event) => update('teamCount', Number(event.target.value))} />
        </Field>
        {settings.examType === 'urine' && (
          <>
            <Field label="동시 진행 여부">
              <label className="toggle">
                <input type="checkbox" checked={settings.urineSimultaneous} onChange={(event) => update('urineSimultaneous', event.target.checked)} /> 사용
              </label>
            </Field>
            <Field label="병렬 배정 방식">
              <select value={settings.urineParallelMode} onChange={(event) => update('urineParallelMode', event.target.value as ExamSettings['urineParallelMode'])}>
                <option value="sequential">전체 순차 배정</option>
                <option value="grade">학년별 동시 배정</option>
                <option value="team">검사팀 수 기준 병렬 배정</option>
              </select>
            </Field>
            {['2', '3'].map((grade) => (
              <Field key={`urine-grade-${grade}`} label={`${grade}학년 검사팀 수 / 시작 시간`}>
                <div className="inline-fields">
                  <input type="number" min={1} value={settings.teamsByGrade[grade] ?? 1} onChange={(event) => updateTeamsByGrade(grade, Number(event.target.value))} />
                  <input type="time" value={settings.gradeStartTimes[grade] ?? settings.startTime} onChange={(event) => updateGradeStartTime(grade, event.target.value)} />
                </div>
              </Field>
            ))}
          </>
        )}
        {settings.examType === 'tb' && (
          <>
            <Field label="한 번에 호출할 최대 단위 수">
              <input type="number" min={1} value={settings.maxUnitsPerCall} onChange={(event) => update('maxUnitsPerCall', Number(event.target.value))} />
            </Field>
            <Field label="이동 소요시간(분)">
              <input type="number" min={0} value={settings.travelMinutes} onChange={(event) => update('travelMinutes', Number(event.target.value))} />
              <span className="field-note">호출 시간 = 검진 예상 시간 - 이동 소요시간으로 계산됩니다.</span>
            </Field>
            <Field label="검진 장소">
              <input value={settings.examVenue} onChange={(event) => update('examVenue', event.target.value)} />
            </Field>
            <Field label="대기 허용 여부">
              <label className="toggle">
                <input type="checkbox" checked={settings.allowWaiting} onChange={(event) => update('allowWaiting', event.target.checked)} /> 허용
              </label>
            </Field>
            <Field label="학년별 시간 구간 사용">
              <label className="toggle">
                <input type="checkbox" checked={settings.useGradeTimeBlocks} onChange={(event) => update('useGradeTimeBlocks', event.target.checked)} /> 사용
              </label>
            </Field>
            {settings.gradeTimeBlocks.map((block) => (
              <Field key={`tb-block-${block.grade}`} label={`${block.grade}학년 검진 가능 시간`}>
                <div className="inline-fields wide">
                  <input value={block.label} onChange={(event) => updateGradeTimeBlock(block.grade, { label: event.target.value })} />
                  <input type="time" value={block.startTime} onChange={(event) => updateGradeTimeBlock(block.grade, { startTime: event.target.value })} />
                  <input type="time" value={block.endTime} onChange={(event) => updateGradeTimeBlock(block.grade, { endTime: event.target.value })} />
                </div>
              </Field>
            ))}
          </>
        )}
        <Field label="쉬는 시간 포함">
          <label className="toggle">
            <input type="checkbox" checked={settings.includeBreaks} onChange={(event) => update('includeBreaks', event.target.checked)} /> 포함
          </label>
        </Field>
        <Field label="교시 경계 넘김 허용">
          <label className="toggle">
            <input type="checkbox" checked={settings.allowCrossPeriod} onChange={(event) => update('allowCrossPeriod', event.target.checked)} /> 허용
          </label>
        </Field>
        <Field label="검사 대상 학년">
          <input value={settings.targetGrades.join(', ')} onChange={(event) => update('targetGrades', splitKeywords(event.target.value))} />
        </Field>
        <Field label="제외 시간 설정">
          <input placeholder="예: 10:20-10:35, 점심시간" value={settings.excludedTimes} onChange={(event) => update('excludedTimes', event.target.value)} />
        </Field>
      </div>
      <div className="card subtle stack">
        <div className="section-title">
          <h2>기본 일과 시간표</h2>
          <div className="actions">
            <button onClick={() => update('daySchedule', structuredClone(DEFAULT_DAY_SCHEDULE))}>학교 preset 적용</button>
            <button onClick={loadSchoolDefaults}>저장된 학교 기본값 불러오기</button>
            <button onClick={saveSchoolDefaults}>현재 일과표를 학교 기본값으로 저장</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{['구분', '시작', '종료', '배정 가능', '교시'].map((header) => <th key={header}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {settings.daySchedule.map((item, index) => (
                <tr key={item.id}>
                  <td><input value={item.label} onChange={(event) => updateDaySchedule(index, { label: event.target.value })} /></td>
                  <td><input type="time" value={item.startTime} onChange={(event) => updateDaySchedule(index, { startTime: event.target.value })} /></td>
                  <td><input type="time" value={item.endTime} onChange={(event) => updateDaySchedule(index, { endTime: event.target.value })} /></td>
                  <td><input type="checkbox" checked={item.assignable} onChange={(event) => updateDaySchedule(index, { assignable: event.target.checked })} /></td>
                  <td>{item.period ? `${item.period}교시` : '자동 제외'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card subtle">
        <strong>검사 가능 교시</strong>
        <div className="chips">
          {PERIODS.map((period) => (
            <label key={period} className="chip">
              <input
                type="checkbox"
                checked={settings.availablePeriods.includes(period)}
                onChange={(event) =>
                  update(
                    'availablePeriods',
                    event.target.checked ? [...settings.availablePeriods, period].sort() : settings.availablePeriods.filter((item) => item !== period),
                  )
                }
              />
              {period}교시
            </label>
          ))}
        </div>
      </div>
      <KeywordEditor label="검사 불가 키워드" keywords={settings.blockedKeywords} onChange={(items) => update('blockedKeywords', items)} />
      <KeywordEditor label="검사 주의 키워드" keywords={settings.cautionKeywords} onChange={(items) => update('cautionKeywords', items)} />
      <div className="actions">
        <button onClick={saveKeywordSet}>현재 키워드 세트를 검사 유형 기본값으로 저장</button>
        <button
          onClick={() =>
            settings.examType === 'tb'
              ? setSettings({ ...settings, blockedKeywords: TB_BLOCKED_KEYWORDS, cautionKeywords: TB_CAUTION_KEYWORDS })
              : setSettings({ ...settings, blockedKeywords: URINE_BLOCKED_KEYWORDS, cautionKeywords: URINE_CAUTION_KEYWORDS })
          }
        >
          검사 유형 기본 키워드 적용
        </button>
      </div>
    </section>
  );
}

function KeywordEditor({ label, keywords, onChange }: { label: string; keywords: string[]; onChange: (items: string[]) => void }) {
  return (
    <Field label={label}>
      <textarea value={keywords.join(', ')} onChange={(event) => onChange(splitKeywords(event.target.value))} />
    </Field>
  );
}

function LocationsPanel({
  data,
  setData,
  mode,
}: {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  mode: ReturnType<typeof getModeCopy>;
}) {
  const update = (index: number, patch: Partial<VisitLocation>) =>
    setData((prev) => ({ ...prev, locations: prev.locations.map((item, rowIndex) => (rowIndex === index ? { ...item, ...patch } : item)) }));

  return (
    <section className="card stack">
      <TableTitle title={`${mode.unitMenu} 목록`} action={() => setData((prev) => ({ ...prev, locations: [...prev.locations, emptyLocation(prev.locations.length + 1)] }))} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {['단위ID', '표시명', '학년', '구분', mode.visitabilityLabel, '자동배정 포함 여부', '위치/비고'].map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.locations.map((item, index) => (
              <tr key={`${item.id}-${index}`}>
                <td><input value={item.id} onChange={(event) => update(index, { id: event.target.value })} /></td>
                <td><input value={item.displayName} onChange={(event) => update(index, { displayName: event.target.value })} /></td>
                <td><input value={item.grade} onChange={(event) => update(index, { grade: event.target.value })} /></td>
                <td>
                  <select value={item.category} onChange={(event) => update(index, { category: event.target.value as LocationCategory })}>
                    {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </td>
                <td><input type="checkbox" checked={item.isVisitable} onChange={(event) => update(index, { isVisitable: event.target.checked })} /></td>
                <td><input type="checkbox" checked={item.includeInAuto} onChange={(event) => update(index, { includeInAuto: event.target.checked })} /></td>
                <td><input value={item.notes} onChange={(event) => update(index, { notes: event.target.value })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TimetablePanel({ data, setData, resetExamples }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; resetExamples: () => void }) {
  const [paste, setPaste] = useState('');
  const [previewRows, setPreviewRows] = useState<CommonImportRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const commonFileRef = useRef<HTMLInputElement>(null);
  const comciganFileRef = useRef<HTMLInputElement>(null);
  const update = (index: number, patch: Partial<TimetableRow>) =>
    setData((prev) => ({ ...prev, timetables: prev.timetables.map((item, rowIndex) => (rowIndex === index ? { ...item, ...patch } : item)) }));

  const applyPaste = () => {
    const rows = parseTimetablePaste(paste).map((row) => {
      const location = data.locations.find((item) => item.displayName === row.displayName || item.id === row.displayName);
      return { ...row, locationId: location?.id ?? row.locationId, displayName: location?.displayName ?? row.displayName };
    });
    setData((prev) => ({ ...prev, timetables: rows }));
  };
  const uploadWorkbook = async (file: File | undefined, mode: 'common' | 'comcigan') => {
    if (!file) return;
    const preview = await parseWorkbookFile(file, mode);
    setPreviewRows(preview.rows);
    setWarnings(preview.warnings);
  };
  const applyPreview = () => {
    const converted = convertPreviewToAppRows(previewRows, data.settings);
    setData((prev) => ({
      ...prev,
      locations: converted.locations,
      timetables: converted.timetables,
      divisions: converted.divisions.length ? converted.divisions : prev.divisions,
      assignments: [],
      judgements: [],
      manualOverrides: [],
    }));
  };
  const updatePreview = (index: number, patch: Partial<CommonImportRow>) =>
    setPreviewRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));

  return (
    <section className="stack">
      <div className="card stack">
        <h2>교실/장소별 시간표 입력</h2>
        <div className="notice notice-with-mascot">
          <OtterMascot variant="sm" decorative />
          <span>
          컴시간알리미를 사용하지 않는 학교는 공통 시간표 서식을 다운로드한 뒤 학급별 시간표를 입력해 업로드해 주세요.
          {'\n'}학생 이름, 학번, 검사 결과, 질병명 등 개인정보는 입력하지 않습니다.
          {'\n'}검사단위와 교시별 수업명만 입력하면 자동으로 검진·검사 시간표를 배정할 수 있습니다.
          </span>
        </div>
        <div className="actions">
          <button onClick={() => comciganFileRef.current?.click()}><FileInput size={17} /> 컴시간알리미 엑셀 업로드</button>
          <button onClick={downloadCommonTemplateXlsx}><Download size={17} /> 공통 시간표 서식 다운로드</button>
          <button onClick={downloadCommonTemplateCsv}><Download size={17} /> CSV 서식 다운로드</button>
          <button onClick={() => commonFileRef.current?.click()}><FileInput size={17} /> 공통 서식 업로드</button>
        </div>
        <input ref={comciganFileRef} type="file" accept=".xlsx,.xls" hidden onChange={(event) => uploadWorkbook(event.target.files?.[0], 'comcigan')} />
        <input ref={commonFileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(event) => uploadWorkbook(event.target.files?.[0], 'common')} />
        <textarea
          className="paste-box"
          placeholder="2-1교실 / 국어 / 영어 / 체육 / 수학 / 사회 / 과학 / 자율"
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
        />
        <div className="actions">
          <button className="primary" onClick={applyPaste}>붙여넣기 표 변환</button>
          <button onClick={resetExamples}>예시 데이터 입력</button>
          <button onClick={() => setData((prev) => ({ ...prev, timetables: [] }))}>
            <RotateCcw size={17} /> 전체 초기화
          </button>
        </div>
      </div>
      {warnings.length > 0 && (
        <div className="card warning-list">
          <strong>업로드 경고</strong>
          {warnings.map((warning, index) => <p key={index}>{warning}</p>)}
        </div>
      )}
      {previewRows.length > 0 && (
        <div className="card table-wrap">
          <div className="section-title">
            <h2>업로드 변환 결과 미리보기</h2>
            <button className="primary" onClick={applyPreview}>미리보기 내용을 시간표에 적용</button>
          </div>
          <table>
            <thead>
              <tr>{['검사단위', '학년', '구분', '실제장소', '자동배정', ...PERIODS.map((p) => `${p}교시`), '비고'].map((header) => <th key={header}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {previewRows.map((row, index) => (
                <tr key={`${row.unit}-${index}`}>
                  <td><input value={row.unit} onChange={(event) => updatePreview(index, { unit: event.target.value })} /></td>
                  <td><input value={row.grade} onChange={(event) => updatePreview(index, { grade: event.target.value })} /></td>
                  <td><input value={row.category} onChange={(event) => updatePreview(index, { category: event.target.value })} /></td>
                  <td><input value={row.actualLocation} onChange={(event) => updatePreview(index, { actualLocation: event.target.value })} /></td>
                  <td>
                    <select value={row.autoInclude} onChange={(event) => updatePreview(index, { autoInclude: event.target.value })}>
                      <option>포함</option>
                      <option>제외</option>
                    </select>
                  </td>
                  {PERIODS.map((period) => (
                    <td key={period}>
                      <input
                        value={row.periods[period - 1] ?? ''}
                        onChange={(event) => {
                          const periods = [...row.periods];
                          periods[period - 1] = event.target.value;
                          updatePreview(index, { periods });
                        }}
                      />
                    </td>
                  ))}
                  <td><input value={row.notes} onChange={(event) => updatePreview(index, { notes: event.target.value })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              {['장소ID', '표시명', ...PERIODS.map((p) => `${p}교시`), '비고'].map((header) => <th key={header}>{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.timetables.map((item, index) => (
              <tr key={`${item.locationId}-${index}`}>
                <td><input value={item.locationId} onChange={(event) => update(index, { locationId: event.target.value })} /></td>
                <td><input value={item.displayName} onChange={(event) => update(index, { displayName: event.target.value })} /></td>
                {PERIODS.map((period) => (
                  <td key={period}>
                    <input
                      value={item.periods[period - 1] ?? ''}
                      onChange={(event) => {
                        const periods = [...item.periods];
                        periods[period - 1] = event.target.value;
                        update(index, { periods });
                      }}
                    />
                  </td>
                ))}
                <td><input value={item.notes} onChange={(event) => update(index, { notes: event.target.value })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DivisionsPanel({ data, setData }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>> }) {
  const update = (index: number, patch: Partial<SubjectDivision>) =>
    setData((prev) => ({ ...prev, divisions: prev.divisions.map((item, rowIndex) => (rowIndex === index ? { ...item, ...patch } : item)) }));

  return (
    <section className="card stack">
      <TableTitle title="선택과목 분반 참고 목록" action={() => setData((prev) => ({ ...prev, divisions: [...prev.divisions, emptyDivision()] }))} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {['분반명', '학년', '실제 장소', '자동배정 처리', '비고'].map((header) => <th key={header}>{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.divisions.map((item, index) => (
              <tr key={`${item.name}-${index}`}>
                <td><input value={item.name} onChange={(event) => update(index, { name: event.target.value })} /></td>
                <td><input value={item.grade} onChange={(event) => update(index, { grade: event.target.value })} /></td>
                <td><input value={item.actualLocationId} onChange={(event) => update(index, { actualLocationId: event.target.value, handling: event.target.value ? '장소반영' : '자동제외' })} /></td>
                <td>
                  <select value={item.handling} onChange={(event) => update(index, { handling: event.target.value as DivisionHandling })}>
                    {DIVISION_HANDLINGS.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </td>
                <td><input value={item.notes} onChange={(event) => update(index, { notes: event.target.value })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ResultsPanel({
  data,
  setData,
  manualRows,
  tables,
  guideText,
  copyGuide,
  copyTeacher,
}: {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  manualRows: ReturnType<typeof createManualConfirmRows>;
  tables: {
    full: ReturnType<typeof createFullTable>;
    lab: ReturnType<typeof createLabTable>;
    urineLines: ReturnType<typeof createUrineLineTables>;
    urineTwoColumn: ReturnType<typeof createUrineTwoColumnTable>;
    tbGrades: ReturnType<typeof createTbGradeTables>;
    teacher: ReturnType<typeof createTeacherTable>;
  };
  guideText: string;
  copyGuide: () => void;
  copyTeacher: () => void;
}) {
  const setOverride = (locationId: string, patch: Partial<ManualOverride>) => {
    setData((prev) => {
      const existing = prev.manualOverrides.find((item) => item.locationId === locationId);
      const next = existing ? prev.manualOverrides.map((item) => (item.locationId === locationId ? { ...item, ...patch } : item)) : [...prev.manualOverrides, { locationId, ...patch }];
      return { ...prev, manualOverrides: next };
    });
  };

  return (
    <section className="stack print-area">
      <div className="notice">{guideText}</div>
      <div className="card actions no-print">
        <button onClick={() => exportTableToCsv(tables.full)}><Download size={17} /> 전체 자동 배정표 CSV</button>
        {data.settings.examType === 'urine' && <button onClick={() => exportTableToCsv(tables.lab)}><Download size={17} /> 임상병리사용 CSV</button>}
        {data.settings.examType === 'urine' &&
          tables.urineLines.map((table) => (
            <button key={table.name} onClick={() => exportTableToCsv(table)}><Download size={17} /> {table.name.replaceAll('_', ' ')} CSV</button>
          ))}
        {data.settings.examType === 'urine' && <button onClick={() => exportTableToCsv(tables.urineTwoColumn)}><Download size={17} /> 2단표 CSV 다운로드</button>}
        {data.settings.examType === 'urine' && <button onClick={() => window.print()}><Printer size={17} /> 학년별 2단표 출력</button>}
        {data.settings.examType === 'tb' &&
          tables.tbGrades.map((table) => (
            <button key={table.name} onClick={() => exportTableToCsv(table)}><Download size={17} /> {table.name.replaceAll('_', ' ')} CSV</button>
          ))}
        <button onClick={() => exportTableToCsv(tables.teacher)}><Download size={17} /> 교사용 안내표 CSV</button>
        <button onClick={copyGuide}><ClipboardCopy size={17} /> 안내 문구 복사</button>
        <button onClick={copyTeacher}><ClipboardCopy size={17} /> 교사용 안내 복사</button>
      </div>

      <ResultTable title="A. 전체 자동 배정표" headers={tables.full.headers} rows={tables.full.rows} />
      <ManualAdjustments assignments={data.assignments} setOverride={setOverride} />
      {data.settings.examType === 'urine' && <ResultTable title="B. 임상병리사용 간단표" headers={tables.lab.headers} rows={tables.lab.rows} compact />}
      {data.settings.examType === 'urine' &&
        tables.urineLines.map((table) => <ResultTable key={table.name} title={table.name.replaceAll('_', ' ')} headers={table.headers} rows={table.rows} compact />)}
      {data.settings.examType === 'urine' && <UrineTwoColumnPrintTable table={tables.urineTwoColumn} />}
      {data.settings.examType === 'tb' &&
        tables.tbGrades.map((table) => <ResultTable key={table.name} title={table.name.replaceAll('_', ' ')} headers={table.headers} rows={table.rows} compact />)}
      <ResultTable title={data.settings.examType === 'tb' ? 'B. 교사용 안내표' : 'C. 교사용 안내표'} headers={tables.teacher.headers} rows={tables.teacher.rows} />
      <div className="card table-wrap">
        <h2>D. 수동 확인 필요 목록</h2>
        <table>
          <thead>
            <tr>{['항목명', '유형', '제외 또는 확인 사유', '필요한 확인', '실제 장소 입력란', '비고'].map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {manualRows.length ? manualRows.map((row, index) => (
              <tr key={`${row.name}-${index}`}>
                <td>{row.name}</td>
                <td><span className="badge manual">{row.type}</span></td>
                <td>{row.reason}</td>
                <td>{row.required}</td>
                <td>{row.actualLocation}</td>
                <td>{row.note}</td>
              </tr>
            )) : <tr><td colSpan={6} className="empty">수동 확인 필요 항목이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ManualAdjustments({ assignments, setOverride }: { assignments: AppData['assignments']; setOverride: (locationId: string, patch: Partial<ManualOverride>) => void }) {
  return (
    <div className="card table-wrap no-print">
      <h2>수동 조정</h2>
      <table>
        <thead>
          <tr>{['방문 장소', '검사 예정 시간', '해당 교시', '검사 제외', '교시 고정', '비고'].map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {assignments.map((item) => (
            <tr key={item.locationId}>
              <td>{item.locationName}</td>
              <td><input type="time" defaultValue={item.scheduledTime} onBlur={(event) => setOverride(item.locationId, { scheduledTime: event.target.value })} /></td>
              <td>
                <select defaultValue={item.period ?? ''} onChange={(event) => setOverride(item.locationId, { period: event.target.value ? Number(event.target.value) : null })}>
                  <option value="">선택</option>
                  {PERIODS.map((period) => <option key={period} value={period}>{period}교시</option>)}
                </select>
              </td>
              <td><input type="checkbox" defaultChecked={item.excluded} onChange={(event) => setOverride(item.locationId, { excluded: event.target.checked })} /></td>
              <td><input type="checkbox" defaultChecked={item.locked} onChange={(event) => setOverride(item.locationId, { locked: event.target.checked })} /></td>
              <td><input defaultValue={item.note} onBlur={(event) => setOverride(item.locationId, { note: event.target.value })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UrineTwoColumnPrintTable({ table }: { table: ReturnType<typeof createUrineTwoColumnTable> }) {
  return (
    <div className="card two-column-print-page">
      <div className="two-column-print-header">
        <div>
          <h2>학년별 2단 인쇄표</h2>
          <p>
            소변검사는 2학년과 3학년을 동시에 진행할 수 있도록 학년별 라인으로 배정하였습니다.
            검사 예정 시간은 현장 진행 상황에 따라 변동될 수 있습니다.
            해당 시간 수업 중인 선생님께서는 학생들이 질서 있게 검사에 참여할 수 있도록 협조 부탁드립니다.
          </p>
        </div>
      </div>
      <div className="two-column-table-wrap">
        <table className="two-column-table">
          <thead>
            <tr className="grade-title-row">
              <th colSpan={3}>2학년 소변검사</th>
              <th colSpan={3}>3학년 소변검사</th>
            </tr>
            <tr>
              <th>검진 시간</th>
              <th>교실</th>
              <th>교과교사</th>
              <th>검진 시간</th>
              <th>교실</th>
              <th>교과교사</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.length ? (
              table.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty">2단표로 표시할 소변검사 배정 결과가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultTable({ title, headers, rows, compact = false }: { title: string; headers: string[]; rows: string[][]; compact?: boolean }) {
  return (
    <div className={`card table-wrap ${compact ? 'compact' : ''}`}>
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`}>{['가능', '주의', '불가', '수동확인'].includes(cell) ? <span className={`badge ${cell}`}>{cell}</span> : cell}</td>
              ))}
            </tr>
          )) : <tr><td colSpan={headers.length} className="empty">표시할 데이터가 없습니다.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TableTitle({ title, action }: { title: string; action: () => void }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      <button onClick={action}>행 추가</button>
    </div>
  );
}

function splitKeywords(value: string) {
  return value
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyLocation(index: number): VisitLocation {
  return {
    id: `NEW-${index}`,
    displayName: '',
    grade: '',
    category: '수동확인',
    isVisitable: true,
    includeInAuto: false,
    notes: '',
  };
}

function emptyDivision(): SubjectDivision {
  return {
    name: '',
    grade: '',
    actualLocationId: '',
    handling: '자동제외',
    notes: '',
  };
}

function snapshotTemplateData(data: AppData) {
  return {
    settings: structuredClone(data.settings),
    locations: structuredClone(data.locations),
    timetables: structuredClone(data.timetables),
    divisions: structuredClone(data.divisions),
    judgements: structuredClone(data.judgements),
    assignments: structuredClone(data.assignments),
    manualOverrides: structuredClone(data.manualOverrides),
  };
}

function getModeCopy(examType: ExamType) {
  if (examType === 'tb') {
    return {
      shortLabel: '결핵검진',
      sidebarDetail: '호출형 / 검진 장소 이동 기준',
      title: '검진 장소 이동을 위한 호출 시간표 자동배정',
      unitMenu: '호출 단위',
      unitLabel: '호출 단위',
      dateLabel: '검진일',
      gradeLabel: '검진 대상 학년',
      totalLabel: '전체 호출 단위 수',
      blockedLabel: '호출 불가 시간 충돌 수',
      visitabilityLabel: '호출 가능 여부',
    };
  }

  return {
    shortLabel: '소변검사',
    sidebarDetail: '방문형 / 교실·장소 기준',
    title: '실제 방문 가능한 교실·장소 기준 자동배정',
    unitMenu: '방문 장소',
    unitLabel: '방문 장소',
    dateLabel: '검사일',
    gradeLabel: '검사 대상 학년',
    totalLabel: '전체 방문 장소 수',
    blockedLabel: '검사 불가 시간 충돌 수',
    visitabilityLabel: '실제 방문 가능 여부',
  };
}

function minutesBetween(start: string, end: string) {
  const [startHour = '0', startMinute = '0'] = start.split(':');
  const [endHour = '0', endMinute = '0'] = end.split(':');
  return Math.max(0, Number(endHour) * 60 + Number(endMinute) - (Number(startHour) * 60 + Number(startMinute)));
}

function minutesFromTime(time: string) {
  const [hour = '0', minute = '0'] = time.split(':');
  return Number(hour) * 60 + Number(minute);
}

function validateBeforeSchedule(data: AppData) {
  const messages: string[] = [];
  const settings = data.settings;
  const targetCount = data.locations.filter((item) => item.isVisitable && item.includeInAuto).length;

  if (minutesFromTime(settings.startTime) >= minutesFromTime(settings.endTime)) {
    messages.push('업체 검사 가능 시작 시간이 종료 시간보다 늦거나 같습니다.');
  }

  if (!settings.durationMinutes || settings.durationMinutes <= 0) {
    messages.push('단위당 소요시간은 1분 이상이어야 합니다.');
  }

  if (settings.availablePeriods.length === 0) {
    messages.push('검사 가능 교시가 하나도 선택되지 않았습니다.');
  }

  if (settings.examType === 'urine' && targetCount === 0) {
    messages.push('소변검사 자동배정에 사용할 방문 장소가 없습니다.');
  }

  if (settings.examType === 'tb' && targetCount === 0) {
    messages.push('결핵검진 자동배정에 사용할 호출 단위가 없습니다.');
  }

  return messages;
}

function createGradeStats(data: AppData) {
  const grades = ['2', '3'];
  return grades.map((grade) => {
    const count = data.locations.filter((item) => item.grade === grade && item.isVisitable && item.includeInAuto).length;
    const done = data.assignments.filter((item) => item.grade === grade && item.order).length;
    const lines = Math.max(1, data.settings.examType === 'urine' ? data.settings.teamsByGrade[grade] ?? 1 : data.settings.teamCount || 1);
    const estimatedMinutes = Math.ceil((count * data.settings.durationMinutes) / lines);
    const block = data.settings.gradeTimeBlocks.find((item) => item.grade === grade);
    const availableMinutes =
      data.settings.examType === 'tb' && data.settings.useGradeTimeBlocks && block
        ? minutesBetween(block.startTime, block.endTime)
        : minutesBetween(data.settings.gradeStartTimes[grade] ?? data.settings.startTime, data.settings.endTime);

    return {
      grade,
      count,
      done,
      estimatedMinutes,
      availableMinutes,
      fits: estimatedMinutes <= availableMinutes,
    };
  });
}

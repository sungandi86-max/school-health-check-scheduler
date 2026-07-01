import { ClipboardCopy, Download, FileInput, FileText, Printer, RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AppData,
  DayScheduleItem,
  DivisionHandling,
  ExamSettings,
  ExamTemplate,
  ExamType,
  GradeTimeMode,
  LocationCategory,
  ManualOverride,
  RestrictedVenue,
  RoomMapping,
  SubjectDivision,
  ScheduleAssignment,
  TimetableRow,
  VenueRestrictionMode,
  VenueRestrictionWeekday,
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
import { clearAppData, getStoredAppDataInfo, loadAppData, saveAppData } from './lib/storage';
import {
  createFullTable,
  createLabTable,
  createTbGradeTables,
  createTbTeamTable,
  createTeacherTable,
  createUrineTwoColumnTable,
  createUrineLineTables,
  createTbTwoColumnTable,
  downloadJsonBackup,
  exportTableToCsv,
  formatVisitLocation,
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
import { parseSubjectCell } from './lib/subjectParser';
import { parseRestrictedVenueWorkbook } from './lib/restrictedVenueParser';
import { parseRoomMappingWorkbook } from './lib/roomMappingParser';
import { calculateGradeTimeBlocks, GRADE_TIME_MODE_OPTIONS, getEffectiveGradeTimeBlocks, getGradeTimeModeLabel } from './lib/gradeTime';
import { AppFooter } from './components/common/AppFooter';
import { OtterMascot } from './components/common/OtterMascot';
import { OnboardingPanel, StartGuide } from './components/onboarding/OnboardingPanel';
import { CommonHelp } from './components/help/CommonHelp';
import { UrineHelp } from './components/help/UrineHelp';
import { TbHelp } from './components/help/TbHelp';
import { OperationPanel } from './components/operation/OperationPanel';
import { OperationCenter } from './components/operation/OperationCenter';
import { TeacherDashboard } from './components/teacher-dashboard/TeacherDashboard';
import { AdminDashboard } from './components/admin-dashboard/AdminDashboard';
import { OperationReport } from './components/report/OperationReport';
import { OperationDisplay } from './components/display/OperationDisplay';
import { SchoolSettingsPanel } from './components/settings/SchoolSettingsPanel';
import { HealthCheckTypeSelector } from './components/health-check/HealthCheckTypeSelector';
import { HealthCheckSummary } from './components/health-check/HealthCheckSummary';
import { HealthCheckSessionSelector } from './components/health-check/HealthCheckSessionSelector';
import { formatSessionUpdatedAt, HEALTH_CHECK_SESSION_STATUS_LABELS } from './components/health-check/HealthCheckSessionBadge';
import { createOperationStatus } from './lib/operation';
import { getHealthCheckLabel, normalizeHealthCheckType, toExamType } from './lib/healthCheck';
import { healthCheckDataService } from './lib/services/healthCheckDataService';
import { dismissOnboarding, shouldShowOnboarding } from './lib/onboarding';
import { loadSchoolSettings, resetSchoolSettings, saveSchoolSettings } from './lib/settings';
import type { HealthCheckSession, HealthCheckSessionStatus, HealthCheckType } from './types/healthCheck';
import type { SchoolSettings } from './types/settings';

const PERIODS = [1, 2, 3, 4, 5, 6, 7];
const CATEGORIES: LocationCategory[] = ['일반교실', '특별실', '선택과목 장소', '체육시설', '수동확인'];
const DIVISION_HANDLINGS: DivisionHandling[] = ['자동제외', '장소반영'];
const VENUE_RESTRICTION_MODES: VenueRestrictionMode[] = ['가능', '주의', '불가'];
const VENUE_WEEKDAYS: VenueRestrictionWeekday[] = ['auto', '월', '화', '수', '목', '금'];
const APP_TITLE = '학교 별도검사 운영 도우미';
const NEW_SCHEDULE_WARNING = '새 시간표를 만들면 현재 입력 화면은 초기화됩니다. 기존 데이터는 JSON 백업 후 진행하는 것을 권장합니다. 계속하시겠습니까?';
const RESET_STORAGE_WARNING = '브라우저에 저장된 검사 조건, 시간표, 분반자료, 자동배정 결과가 삭제됩니다. 계속하시겠습니까?';

export function App() {
  const [data, setData] = useState<AppData>(() => loadAppData({ startAtTypeSelect: shouldStartAtHome() }));
  const [activeTab, setActiveTab] = useState(() => getInitialActiveTab());
  const [showTypeConfirm, setShowTypeConfirm] = useState(false);
  const [storedInfo, setStoredInfo] = useState(() => getStoredAppDataInfo());
  const [entryNotice, setEntryNotice] = useState('');
  const [showCommonHelp, setShowCommonHelp] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding());
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [sessions, setSessions] = useState<HealthCheckSession[]>([]);
  const [activeSessionIdState, setActiveSessionIdState] = useState('');
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [creatingDefaultSession, setCreatingDefaultSession] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(() => loadSchoolSettings());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = APP_TITLE;
  }, []);

  useEffect(() => {
    if (!data.hasSelectedExamType) return;
    saveAppData(data);
    setStoredInfo(getStoredAppDataInfo());
  }, [data]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionIdState) ?? sessions[0],
    [activeSessionIdState, sessions],
  );

  const applySessionToData = (session: HealthCheckSession) => {
    const examType = toExamType(session.checkType);
    setData((prev) => ({
      ...prev,
      healthCheckType: session.checkType,
      settings: {
        ...prev.settings,
        healthCheckType: session.checkType,
        examType,
        operationMode: examType === 'tb' ? 'move' : 'visit',
        examDate: session.date,
        targetGrades: session.targetGrades,
        examVenue: session.location || prev.settings.examVenue,
      },
      needsReschedule: true,
    }));
  };

  const refreshSessions = async () => {
    try {
      const [nextSessions, activeId] = await Promise.all([
        healthCheckDataService.listSessions(),
        healthCheckDataService.getActiveSessionId(),
      ]);
      setSessions(nextSessions);
      setActiveSessionIdState(activeId || nextSessions[0]?.id || '');
      setSessionsLoaded(true);
      return nextSessions;
    } catch (error) {
      console.warn('[App] Failed to refresh health check sessions.', error);
      setSessionsLoaded(true);
      return [];
    }
  };

  useEffect(() => {
    void refreshSessions();
  }, []);

  useEffect(() => {
    if (!data.hasSelectedExamType || !sessionsLoaded || creatingDefaultSession) return;
    if (sessions.length === 0) {
      setCreatingDefaultSession(true);
      void (async () => {
        try {
          const created = await healthCheckDataService.createSessionFromDefaults({
            checkType: data.settings.healthCheckType,
            date: data.settings.examDate,
            targetGrades: data.settings.targetGrades,
            location: data.settings.examVenue || schoolSettings.defaultLocation,
          });
          await refreshSessions();
          setActiveSessionIdState(created.id);
        } catch (error) {
          console.warn('[App] Failed to create default health check session.', error);
        } finally {
          setCreatingDefaultSession(false);
        }
      })();
      return;
    }
    if (!activeSessionIdState && sessions[0]) {
      void healthCheckDataService.setActiveSessionId(sessions[0].id);
      setActiveSessionIdState(sessions[0].id);
    }
  }, [activeSessionIdState, creatingDefaultSession, data.hasSelectedExamType, data.settings.examDate, data.settings.examVenue, data.settings.healthCheckType, data.settings.targetGrades, schoolSettings.defaultLocation, sessions, sessionsLoaded]);

  const manualRows = useMemo(
    () => createManualConfirmRows(data.divisions, data.assignments, data.judgements),
    [data.divisions, data.assignments, data.judgements],
  );

  const dashboard = useMemo(() => {
    const totalCandidates = data.locations.filter((item) => item.includeInAuto && (data.settings.examType === 'tb' || item.isVisitable)).length;
    const lineCount = Math.max(1, data.settings.teamCount || 1);
    const vendorMinutes = minutesBetween(data.settings.startTime, data.settings.endTime);
    const gradeStats = createGradeStats(data);
    const duplicateWarnings = createDuplicateVisitLocationWarnings(data.assignments);
    const estimatedMinutes =
      data.settings.examType === 'urine' && data.settings.urineSimultaneous && data.settings.urineParallelMode === 'grade'
        ? Math.max(0, ...gradeStats.map((stat) => stat.estimatedMinutes))
        : Math.ceil((totalCandidates * data.settings.durationMinutes) / lineCount);
    return {
      totalCandidates,
      done: data.assignments.filter((item) => item.order).length,
      cautionDone: data.settings.examType === 'tb' ? data.assignments.filter((item) => item.order && item.judgement === '주의').length : 0,
      mixedGradeDone: data.settings.examType === 'tb' ? data.assignments.filter((item) => item.order && (item.roomMappingReason?.includes('혼합학년') || item.note.includes('혼합학년'))).length : 0,
      fallbackDone: data.settings.examType === 'tb' ? data.assignments.filter((item) => item.order && item.isFallback).length : 0,
      mixedDurationDone: data.settings.examType === 'tb' ? data.assignments.filter((item) => item.order && item.hasMixedDurationExtra).length : 0,
      mixedManual: data.settings.examType === 'tb' ? manualRows.filter((item) => String(item.reason).includes('혼합')).length : 0,
      unassigned: data.settings.examType === 'tb' ? data.assignments.filter((item) => !item.order).length : 0,
      timeShortage: data.settings.examType === 'tb' ? data.assignments.filter((item) => !item.order && (item.failedReason?.includes('배정 불가') || item.failedReason?.includes('시간'))).length : 0,
      filteredOut: data.settings.examType === 'tb' ? data.assignments.filter((item) => !item.order && (item.failedReason?.includes('교시') || item.failedReason?.includes('키워드'))).length : 0,
      manual: manualRows.length,
      blocked: data.judgements.filter((item) => item.status === '불가').length,
      estimatedMinutes,
      vendorMinutes,
      fitsVendorTime: estimatedMinutes <= vendorMinutes,
      gradeStats,
      duplicateWarnings,
    };
  }, [data, manualRows.length]);

  const setSettings = (settings: ExamSettings) => setData((prev) => ({ ...prev, settings, needsReschedule: true }));
  const baseGuideText =
    data.settings.examType === 'tb'
      ? `${getGuideText(data.settings.examType)}\n${tbGradeTimeGuideSentence(data.settings)}`
      : getGuideText(data.settings.examType);
  const guideText = [baseGuideText, schoolSettings.defaultNoticeMessage].filter(Boolean).join('\n');
  const mode = getModeCopy(data.settings.examType);
  const checkLabel = getHealthCheckLabel(data.settings.healthCheckType);
  const applySchoolDefaultsToExamSettings = (settings: ExamSettings, source = schoolSettings): ExamSettings => ({
    ...settings,
    startTime: source.defaultStartTime || settings.startTime,
    endTime: source.defaultEndTime || settings.endTime,
    travelMinutes: source.defaultMoveMinutes,
    examVenue: source.defaultLocation || settings.examVenue,
  });
  const saveSchoolSettingsFromPanel = (nextSettings: SchoolSettings) => {
    const saved = saveSchoolSettings(nextSettings);
    setSchoolSettings(saved);
    setData((prev) => ({ ...prev, settings: applySchoolDefaultsToExamSettings(prev.settings, saved), needsReschedule: true }));
  };
  const resetSchoolSettingsFromPanel = () => {
    const nextSettings = resetSchoolSettings();
    setSchoolSettings(nextSettings);
    setData((prev) => ({ ...prev, settings: applySchoolDefaultsToExamSettings(prev.settings, nextSettings), needsReschedule: true }));
  };
  const startFreshExamType = async (checkType: HealthCheckType) => {
    const fresh = createDefaultData();
    const healthCheckType = normalizeHealthCheckType(checkType);
    const examType = toExamType(healthCheckType);
    const keywordSet = examType === 'tb' ? fresh.keywordSets.tb : fresh.keywordSets.urine;
    const session = await healthCheckDataService.createSessionFromDefaults({
      checkType: healthCheckType,
      date: fresh.settings.examDate,
      targetGrades: fresh.settings.targetGrades,
      location: schoolSettings.defaultLocation || fresh.settings.examVenue,
    });
    await refreshSessions();
    setActiveSessionIdState(session.id);
    setData({
      ...fresh,
      healthCheckType,
      healthCheckSessions: [],
      operationStatus: createOperationStatus(healthCheckType, []),
      settings: {
        ...fresh.settings,
        healthCheckType,
        examType,
        operationMode: examType === 'tb' ? 'move' : 'visit',
        blockedKeywords: keywordSet.blockedKeywords,
        cautionKeywords: keywordSet.cautionKeywords,
        startTime: schoolSettings.defaultStartTime || fresh.settings.startTime,
        endTime: schoolSettings.defaultEndTime || fresh.settings.endTime,
        travelMinutes: schoolSettings.defaultMoveMinutes,
        examVenue: schoolSettings.defaultLocation || fresh.settings.examVenue,
      },
      activeTemplateId: '',
      hasSelectedExamType: true,
    });
    setActiveTab('settings');
    setEntryNotice('');
  };
  const selectExamType = (checkType: HealthCheckType) => {
    if (storedInfo.exists && !window.confirm(NEW_SCHEDULE_WARNING)) return;
    void startFreshExamType(checkType);
  };
  const continueStoredWork = () => {
    const restored = loadAppData({ startAtTypeSelect: false });
    setData(restored);
    setActiveTab(getRouteTab() ?? restored.currentView ?? 'dashboard');
    setEntryNotice('');
    setStoredInfo(getStoredAppDataInfo());
    void refreshSessions();
  };
  const continueSessionFromHome = async (sessionId: string) => {
    await selectSession(sessionId);
    setData((prev) => ({ ...prev, hasSelectedExamType: true }));
    setActiveTab('dashboard');
    setEntryNotice('');
  };
  const hideOnboarding = () => setShowOnboarding(false);
  const hideOnboardingPermanently = () => {
    dismissOnboarding();
    setShowOnboarding(false);
  };
  const resetStoredData = () => {
    if (!window.confirm(RESET_STORAGE_WARNING)) return;
    clearAppData();
    setData(createDefaultData());
    setActiveTab('dashboard');
    setShowTypeConfirm(false);
    setStoredInfo(getStoredAppDataInfo());
    setEntryNotice('저장 데이터가 초기화되었습니다. 검사 유형을 선택해 새 시간표를 만들어 주세요.');
    setSessions([]);
    setActiveSessionIdState('');
    setSessionsLoaded(true);
  };
  const confirmReselectType = () => {
    setShowTypeConfirm(true);
  };
  const reselectType = () => {
    setData((prev) => ({ ...prev, hasSelectedExamType: false }));
    setActiveTab('dashboard');
    setShowTypeConfirm(false);
  };
  const startNewSchedule = () => {
    if (window.confirm(NEW_SCHEDULE_WARNING)) {
      void startFreshExamType(data.settings.healthCheckType);
    }
  };
  const createSession = async (input: {
    title: string;
    checkType: HealthCheckType;
    date: string;
    targetGrades: string[];
    location: string;
    status: HealthCheckSessionStatus;
  }) => {
    try {
      const session = await healthCheckDataService.createSession(input);
      await refreshSessions();
      setActiveSessionIdState(session.id);
      applySessionToData(session);
      return session;
    } catch (error) {
      console.warn('[App] Failed to create health check session.', error);
      return undefined;
    }
  };
  const selectSession = async (sessionId: string) => {
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return;
    try {
      await healthCheckDataService.setActiveSessionId(session.id);
      setActiveSessionIdState(session.id);
      applySessionToData(session);
    } catch (error) {
      console.warn('[App] Failed to select health check session.', error);
    }
  };
  const removeSession = async (sessionId: string) => {
    if (!window.confirm('이 검진 세션을 삭제하시겠습니까? 세션 기반 데이터 연결은 다음 단계에서 더 정리됩니다.')) return;
    try {
      const next = await healthCheckDataService.deleteSession(sessionId);
      setSessions(next);
      const activeId = await healthCheckDataService.getActiveSessionId();
      const nextActive = next.find((session) => session.id === activeId) ?? next[0];
      setActiveSessionIdState(nextActive?.id ?? '');
      if (nextActive) applySessionToData(nextActive);
    } catch (error) {
      console.warn('[App] Failed to delete health check session.', error);
    }
  };
  const changeSessionStatus = async (sessionId: string, status: HealthCheckSessionStatus) => {
    try {
      const updated = await healthCheckDataService.updateSession(sessionId, { status });
      await refreshSessions();
      if (updated && sessionId === activeSession?.id) applySessionToData(updated);
    } catch (error) {
      console.warn('[App] Failed to update health check session.', error);
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
      healthCheckType: data.settings.healthCheckType,
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
    setData((prev) => ({ ...prev, ...result, operationStatus: createOperationStatus(prev.settings.healthCheckType, result.assignments), needsReschedule: false }));
    setActiveTab('results');
  };

  const resetExamples = () => {
    resetStoredData();
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

  const selectAppTab = (tabId: string) => {
    setActiveTab(tabId);
    const path = getTabPath(tabId);
    if (path && window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    } else if (!path && window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  };
  const openStatusDashboard = (mode: 'portrait' | 'landscape') => {
    setActiveTab('display');
    window.history.pushState({}, '', `/display?mode=${mode}`);
  };

  const tables = {
    full: createFullTable(data.assignments, data.settings),
    lab: createLabTable(data.assignments),
    urineLines: createUrineLineTables(data.assignments),
    urineTwoColumn: createUrineTwoColumnTable(data.assignments, data.settings),
    tbTeam: createTbTeamTable(data.assignments, data.settings),
    tbGrades: createTbGradeTables(data.assignments, data.settings),
    tbTwoColumn: createTbTwoColumnTable(data.assignments, data.settings),
    teacher: createTeacherTable(data.assignments, data.settings),
  };

  if (!data.hasSelectedExamType && showCommonHelp) {
    return <CommonHelp onBack={() => setShowCommonHelp(false)} />;
  }

  if (activeTab === 'display') {
    return <OperationDisplay />;
  }

  if (!data.hasSelectedExamType && activeTab === 'admin-dashboard') {
    return <AdminDashboard />;
  }

  const sidebarMenuGroups = [
    {
      title: '운영 준비',
      items: [
        ['school-settings', '학교 설정'],
        ['settings', '검사 조건'],
        ['locations', '검진 대상 학급'],
        ['timetable', '학급별 검진 순서 입력'],
        ['divisions', '분반·혼합수업 참고자료'],
      ],
    },
    {
      title: '운영 계획',
      items: [
        ['dashboard', '대시보드'],
        ['results', '학급별 검진 이동표'],
      ],
    },
    {
      title: '실시간 운영',
      items: [
        ['operation', '현장 모드'],
        ['operation-center', '검진 운영'],
        ['teacher-dashboard', '교사용 현황판'],
        ['admin-dashboard', '관리자 현황판'],
        ['display', 'Display 현황판'],
      ],
    },
    {
      title: '운영 결과',
      items: [
        ['report', '운영 보고서'],
      ],
    },
    {
      title: '기타',
      items: [
        [data.settings.examType === 'urine' ? 'urine-help' : 'tb-help', '검진 사용 안내'],
      ],
    },
  ];
  if (!data.hasSelectedExamType) {
    return (
      <ExamTypeSelect
        onSelect={selectExamType}
        onOpenStatusDashboard={openStatusDashboard}
        onContinue={continueStoredWork}
        sessions={sessions}
        activeSession={activeSession}
        onContinueSession={continueSessionFromHome}
        onReset={resetStoredData}
        hasStoredData={storedInfo.exists}
        versionMismatch={storedInfo.versionMismatch}
        notice={entryNotice}
        onOpenHelp={() => setShowCommonHelp(true)}
        showOnboarding={showOnboarding}
        onCloseOnboarding={hideOnboarding}
        onDismissOnboarding={hideOnboardingPermanently}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <OtterMascot variant="sm" decorative />
          <div>
            <strong>검진·검사 자동배정</strong>
            <span>{checkLabel}</span>
            <span>{mode.sidebarDetail}</span>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="주요 화면 이동">

          {sidebarMenuGroups.map((group) => (
            <section className="sidebar-menu-group" key={group.title} aria-labelledby={`sidebar-group-${group.title}`}>
              <h2 id={`sidebar-group-${group.title}`}>{group.title}</h2>
              <div className="sidebar-menu-items">
                {group.items.map(([id, label]) => (
                  <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => selectAppTab(id)}>
                    {label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>
        <div className="sidebar-actions">
          <button className="primary full" onClick={runSchedule}>
            <Sparkles size={18} /> 검사 시간표 자동배정하기
          </button>
          <button className="full" onClick={confirmReselectType}>검사 유형 다시 선택</button>
          <button className="full" onClick={startNewSchedule}>새 시간표 만들기</button>
          <button className="full" onClick={resetStoredData}>저장 데이터 초기화</button>
        </div>
        <div className="sidebar-mascot">
          <OtterMascot variant="md" decorative />
          <span>검진·검사 시간표 자동배정 도우미</span>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">내부 업무용 도구</p>
            <h1>{data.settings.healthCheckType === 'general' ? '일반 건강검진 시간표 자동배정' : mode.title}</h1>
            {data.settings.examType === 'tb' && (
              <p className="topbar-subtitle">선택수업·분반수업은 참고자료로 활용하고, 검진은 학급별 명렬표 기준으로 진행됩니다.</p>
            )}
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

        <HealthCheckSessionSelector
          sessions={sessions}
          activeSession={activeSession}
          defaultCheckType={data.settings.healthCheckType}
          defaultDate={data.settings.examDate}
          defaultGrades={data.settings.targetGrades}
          defaultLocation={data.settings.examVenue || schoolSettings.defaultLocation}
          onCreate={createSession}
          onSelect={selectSession}
          onDelete={removeSession}
          onStatusChange={changeSessionStatus}
        />

        {data.needsReschedule && (
          <div className="reschedule-banner no-print">
            <span>검사 조건 또는 시간표가 변경되었습니다. 최신 조건을 반영하려면 자동배정을 다시 실행해 주세요.</span>
            <button className="primary" onClick={runSchedule}>
              <Sparkles size={17} /> 다시 자동배정하기
            </button>
          </div>
        )}

        {activeTab === 'urine-help' && <UrineHelp />}
        {activeTab === 'tb-help' && <TbHelp />}
        {activeTab === 'operation-center' && <OperationCenter checkType={data.settings.healthCheckType} session={activeSession} status={data.operationStatus ?? createOperationStatus(data.settings.healthCheckType, data.assignments)} />}
        {activeTab === 'teacher-dashboard' && <TeacherDashboard />}
        {activeTab === 'admin-dashboard' && <AdminDashboard />}
        {activeTab === 'display' && <OperationDisplay />}
        {activeTab === 'report' && <OperationReport />}
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
        {activeTab === 'school-settings' && <SchoolSettingsPanel settings={schoolSettings} onSave={saveSchoolSettingsFromPanel} onReset={resetSchoolSettingsFromPanel} />}
        {activeTab === 'locations' && <LocationsPanel data={data} setData={setData} mode={mode} />}
        {activeTab === 'timetable' && <TimetablePanel data={data} setData={setData} resetExamples={resetExamples} />}
        {activeTab === 'divisions' && <DivisionsPanel data={data} setData={setData} />}
        {activeTab === 'operation' && <OperationPanel assignments={data.assignments} />}
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
                data.settings.examType === 'tb'
                  ? [
                      guideText,
                      '',
                      ...tables.teacher.rows.map((row) => `${row[0]} / ${row[1]} / ${row[2]}`),
                    ].join('\n')
                  : tables.teacher.rows.map((row) => `${row[0]} ${row[1]} ${row[3]}`).join('\n'),
                '교사용 안내 문구를 복사했습니다.',
              )
            }            runSchedule={runSchedule}
            openExamHelp={() => setActiveTab(data.settings.examType === 'urine' ? 'urine-help' : 'tb-help')}
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
    cautionDone: number;
    mixedGradeDone: number;
    fallbackDone: number;
    mixedDurationDone: number;
    mixedManual: number;
    unassigned: number;
    timeShortage: number;
    filteredOut: number;
    manual: number;
    blocked: number;
    estimatedMinutes: number;
    vendorMinutes: number;
    fitsVendorTime: boolean;
    gradeStats: ReturnType<typeof createGradeStats>;
    duplicateWarnings: ReturnType<typeof createDuplicateVisitLocationWarnings>;
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
  const visibleTemplates = data.templates.filter((template) => normalizeHealthCheckType(template.healthCheckType ?? template.examType) === data.settings.healthCheckType);
  const selectedTemplateId = visibleTemplates.some((template) => template.id === data.activeTemplateId) ? data.activeTemplateId : visibleTemplates[0]?.id ?? '';
  return (
    <section className="stack">
      <div className="notice notice-with-mascot">
        <OtterMascot variant="sm" decorative />
        <span>{guideText}</span>
      </div>
      <HealthCheckSummary checkType={data.settings.healthCheckType} examDate={data.settings.examDate} />
      <StartGuide compact />
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
          <Metric key={`${stat.grade}-count`} label={`${stat.grade}학년 ${data.settings.examType === 'tb' ? '검진 대상 학급 수' : '방문 장소 수'}`} value={stat.count} />
        ))}
        <Metric label="자동 배정 완료 수" value={dashboard.done} />
        {data.settings.examType === 'tb' && <Metric label="주의 배정 수" value={dashboard.cautionDone} />}
        {data.settings.examType === 'tb' && <Metric label="혼합학년 포함 배정 수" value={dashboard.mixedGradeDone} />}
        {data.settings.examType === 'tb' && <Metric label="fallback 배정 수" value={dashboard.fallbackDone} />}
        {data.settings.examType === 'tb' && <Metric label="추가 소요시간 적용 수" value={dashboard.mixedDurationDone} />}
        {data.settings.examType === 'tb' && <Metric label="수동확인 혼합수업 수" value={dashboard.mixedManual} />}
        {data.settings.examType === 'tb' &&
          dashboard.gradeStats.map((stat) => <Metric key={`${stat.grade}-done`} label={`${stat.grade}학년 배정 완료 수`} value={stat.done} />)}
        <Metric label="수동 확인 필요 수" value={dashboard.manual} />
        {data.settings.examType === 'tb' && <Metric label="미배정 검진 대상 학급 수" value={dashboard.unassigned} />}
        {data.settings.examType === 'tb' && <Metric label="시간 부족 미배정 수" value={dashboard.timeShortage} />}
        {data.settings.examType === 'tb' && <Metric label="조건 필터 미배정 수" value={dashboard.filteredOut} />}
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
            ? '해당 학년의 검진 가능 시간 안에 모든 검진 대상 학급을 배정하기 어려울 수 있습니다. 학년별 시간 구간, 학급당 소요시간, 검진 라인 수를 조정해 주세요.'
            : '해당 학년 라인의 검사 가능 시간 안에 모든 방문 장소를 배정하기 어려울 수 있습니다. 학년별 시작 시간, 장소당 소요시간, 검사팀 수, 검사 가능 교시를 조정해 주세요.'}
        </div>
      )}
      {data.settings.examType === 'urine' && dashboard.duplicateWarnings.length > 0 && (
        <div className="warning-list">
          <strong>동일한 방문 장소가 여러 번 배정된 항목이 있습니다. 결과를 공유하기 전에 중복 배정 목록을 확인해 주세요.</strong>
          <div className="table-wrap compact">
            <table>
              <thead>
                <tr>
                  <th>학년</th>
                  <th>방문 장소</th>
                  <th>배정 횟수</th>
                  <th>관련 시간</th>
                  <th>관련 기준 학급</th>
                  <th>필요한 확인</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.duplicateWarnings.map((warning) => (
                  <tr key={`${warning.grade}-${warning.visitLocation}-${warning.unitNames.join('-')}`}>
                    <td>{warning.grade}학년</td>
                    <td>{warning.visitLocation}</td>
                    <td>{warning.count}</td>
                    <td>{warning.times.join(', ')}</td>
                    <td>{warning.unitNames.join(', ')}</td>
                    <td>{warning.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {dashboard.done === 0 && dashboard.totalCandidates > 0 && (
        <div className="action-notice">
          <span>방문 장소와 시간표가 입력되어 있습니다. 자동배정을 실행하면 검사 시간표가 생성됩니다.</span>
          <button className="primary" onClick={runSchedule}>
            <Sparkles size={17} /> 검사 시간표 자동배정하기
          </button>
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
          <Sparkles size={18} /> 검사 시간표 자동배정하기
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

function ExamTypeSelect({
  onSelect,
  onOpenStatusDashboard,
  onOpenHelp,
  onContinue,
  sessions,
  activeSession,
  onContinueSession,
  onReset,
  hasStoredData,
  versionMismatch,
  notice,
  showOnboarding,
  onCloseOnboarding,
  onDismissOnboarding,
}: {
  onSelect: (checkType: HealthCheckType) => void;
  onOpenStatusDashboard: (mode: 'portrait' | 'landscape') => void;
  onOpenHelp: () => void;
  onContinue: () => void;
  sessions: HealthCheckSession[];
  activeSession?: HealthCheckSession;
  onContinueSession: (sessionId: string) => void | Promise<void>;
  onReset: () => void;
  hasStoredData: boolean;
  versionMismatch: boolean;
  notice: string;
  showOnboarding: boolean;
  onCloseOnboarding: () => void;
  onDismissOnboarding: () => void;
}) {
  return (
    <main className="type-select-screen">
      <div className="type-select-content">
        <section className="type-hero">
          <div>
            <p className="eyebrow">학교 보건 업무 도구</p>
            <h1>{APP_TITLE}</h1>
            <span className="mode-pill">v1.0.0 MVP</span>
            <p>결핵검진과 소변검사의 준비, 당일 운영, 현황 공유, 보고서 정리를 한 흐름으로 진행합니다.</p>
            <strong className="brand-line">보건교사용 현장 운영 도구</strong>
          </div>
          <OtterMascot variant="lg" className="type-hero-mascot" />
        </section>

        {sessions.length > 0 && (
          <HomeSessionOverview
            sessions={sessions}
            activeSession={activeSession}
            onContinueSession={onContinueSession}
          />
        )}

        <HealthCheckTypeSelector onSelect={onSelect} onOpenStatusDashboard={onOpenStatusDashboard} />

        <StartGuide />

        <section className="entry-help-card">
          <div>
            <strong>처음 사용한다면</strong>
            <span>학교 설정, 검사 조건, 시간표 생성, 실시간 운영, 운영 보고서 순서로 진행합니다.</span>
          </div>
          <button onClick={onOpenHelp}>사용 안내 보기</button>
        </section>

        {showOnboarding && <OnboardingPanel onClose={onCloseOnboarding} onDismiss={onDismissOnboarding} />}

        {notice && <div className="entry-reset-notice">{notice}</div>}
        {hasStoredData && (
          <details className="stored-work-summary">
            <summary>이전 작업 데이터가 있습니다.</summary>
            <div className="stored-work-panel">
              <div>
                <strong>이 브라우저에 저장된 이전 작업을 이어서 사용할 수 있습니다.</strong>
                <p>새 검진을 시작하려면 위의 검사 유형 카드를 선택해 주세요.</p>
                {versionMismatch && <p>저장 데이터가 이전 형식이라 일부 표시가 최신 화면과 다를 수 있습니다.</p>}
              </div>
              <div className="actions">
                <button onClick={onContinue}>이전 작업 이어가기</button>
                <button className="ghost" onClick={onReset}>저장 데이터 초기화</button>
              </div>
            </div>
          </details>
        )}
      </div>
      <AppFooter />
    </main>
  );
}

function HomeSessionOverview({
  sessions,
  activeSession,
  onContinueSession,
}: {
  sessions: HealthCheckSession[];
  activeSession?: HealthCheckSession;
  onContinueSession: (sessionId: string) => void | Promise<void>;
}) {
  const recentSession = activeSession ?? sessions[0];
  const otherSessions = sessions.filter((session) => session.id !== recentSession?.id).slice(0, 4);

  if (!recentSession) return null;

  return (
    <section className="home-session-overview" aria-label="최근 작업과 기존 세션">
      <article className="home-recent-session-card">
        <div>
          <span>최근 작업</span>
          <strong>{recentSession.title || getHealthCheckLabel(recentSession.checkType)}</strong>
          <em className={`session-status-badge is-${recentSession.status}`}>{HEALTH_CHECK_SESSION_STATUS_LABELS[recentSession.status]}</em>
        </div>
        <dl>
          <div>
            <dt>마지막 수정</dt>
            <dd>{formatSessionUpdatedAt(recentSession)}</dd>
          </div>
          <div>
            <dt>검진 정보</dt>
            <dd>{recentSession.date || '날짜 미정'} · {getHealthCheckLabel(recentSession.checkType)}</dd>
          </div>
        </dl>
        <button type="button" className="primary" onClick={() => onContinueSession(recentSession.id)}>
          이어하기
        </button>
      </article>

      {otherSessions.length > 0 && (
        <div className="home-session-list">
          <div className="home-session-list-heading">
            <span>기존 세션 선택</span>
            <strong>{sessions.length}개 세션</strong>
          </div>
          <div className="home-session-list-grid">
            {otherSessions.map((session) => (
              <button type="button" className="home-session-card" key={session.id} onClick={() => onContinueSession(session.id)}>
                <strong>{session.title || getHealthCheckLabel(session.checkType)}</strong>
                <em className={`session-status-badge is-${session.status}`}>{HEALTH_CHECK_SESSION_STATUS_LABELS[session.status]}</em>
                <span>{session.date || '날짜 미정'} · {getHealthCheckLabel(session.checkType)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
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
  const update = <K extends keyof ExamSettings>(key: K, value: ExamSettings[K]) =>
    setData((prev) => {
      const nextSettings = { ...prev.settings, [key]: value };
      if (
        nextSettings.examType === 'tb' &&
        nextSettings.useGradeTimeBlocks &&
        nextSettings.gradeTimeMode !== 'CUSTOM_BY_GRADE' &&
        ['startTime', 'endTime', 'daySchedule'].includes(String(key))
      ) {
        nextSettings.gradeTimeBlocks = calculateGradeTimeBlocks(nextSettings);
      }
      return { ...prev, settings: nextSettings, needsReschedule: true };
    });
  const updateDaySchedule = (index: number, patch: Partial<DayScheduleItem>) =>
    setData((prev) => {
      const nextSettings = {
        ...prev.settings,
        daySchedule: prev.settings.daySchedule.map((item, rowIndex) => (rowIndex === index ? { ...item, ...patch } : item)),
      };
      if (nextSettings.examType === 'tb' && nextSettings.useGradeTimeBlocks && nextSettings.gradeTimeMode !== 'CUSTOM_BY_GRADE') {
        nextSettings.gradeTimeBlocks = calculateGradeTimeBlocks(nextSettings);
      }
      return { ...prev, settings: nextSettings, needsReschedule: true };
    });
  const updateTeamsByGrade = (grade: string, value: number) => update('teamsByGrade', { ...settings.teamsByGrade, [grade]: value });
  const updateGradeStartTime = (grade: string, value: string) => update('gradeStartTimes', { ...settings.gradeStartTimes, [grade]: value });
  const updateGradeTimeBlock = (grade: string, patch: Partial<(typeof settings.gradeTimeBlocks)[number]>) =>
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        gradeTimeBlocks: prev.settings.gradeTimeBlocks.map((block) => (block.grade === grade ? { ...block, ...patch } : block)),
      },
      needsReschedule: true,
    }));
  const isCustomGradeTime = settings.gradeTimeMode === 'CUSTOM_BY_GRADE';
  const effectiveGradeTimeMode: GradeTimeMode = settings.useGradeTimeBlocks ? settings.gradeTimeMode : 'ALL_GRADES_FULL_RANGE';
  const displayedGradeTimeBlocks = settings.useGradeTimeBlocks ? calculateGradeTimeBlocks(settings, effectiveGradeTimeMode) : [];
  const updateGradeTimeMode = (mode: GradeTimeMode) => {
    setData((prev) => {
      const nextSettings = { ...prev.settings, gradeTimeMode: mode, useGradeTimeBlocks: true };
      return {
        ...prev,
        settings: {
          ...nextSettings,
          gradeTimeBlocks: calculateGradeTimeBlocks(nextSettings, mode),
        },
        needsReschedule: true,
      };
    });
  };
  const updateUseGradeTimeBlocks = (enabled: boolean) =>
    setData((prev) => {
      const nextSettings = { ...prev.settings, useGradeTimeBlocks: enabled };
      return {
        ...prev,
        settings: {
          ...nextSettings,
          gradeTimeBlocks: enabled && nextSettings.gradeTimeMode !== 'CUSTOM_BY_GRADE' ? calculateGradeTimeBlocks(nextSettings) : nextSettings.gradeTimeBlocks,
        },
        needsReschedule: true,
      };
    });
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
              tb: { blockedKeywords: settings.blockedKeywords, cautionKeywords: settings.cautionKeywords },
            }
          : {
              ...prev.keywordSets,
              urine: { blockedKeywords: settings.blockedKeywords, cautionKeywords: settings.cautionKeywords },
            },
    }));

  return (
    <section className="card stack">
      <h2>검사 조건 설정</h2>
      <div className="settings-section-heading">
        <div>
          <strong>기본 설정</strong>
          <p>검사 유형, 운영 방식, 날짜와 장소처럼 자동배정 전에 꼭 확인할 항목입니다.</p>
        </div>
      </div>
      <div className="form-grid">
        <Field label="검사 유형">
          <input value={getHealthCheckLabel(settings.healthCheckType)} readOnly />
        </Field>
        <Field label="검사 운영 방식">
          <select value={settings.operationMode} onChange={(event) => update('operationMode', event.target.value as ExamSettings['operationMode'])}>
            <option value="visit">방문형 검사 - 검사자가 현재 수업 장소를 방문</option>
            <option value="move">이동형 검사 - 검진 대상 학급이 검진 장소로 이동</option>
          </select>
          <span className="field-note">
            {settings.operationMode === 'move'
              ? '결핵검진·건강검진처럼 학생이 검진 장소로 이동하는 방식입니다. 수업 장소 자료는 자동배정 보조 자료로만 사용하고 출력표에는 표시하지 않습니다.'
              : '소변검사처럼 검사자가 교실·수업 장소를 방문하는 방식입니다. 현재 수업 장소가 중요합니다.'}
          </span>
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
        <Field label="검진 장소">
          <input value={settings.examVenue} onChange={(event) => update('examVenue', event.target.value)} />
        </Field>
      </div>

      <details className="advanced-settings">
        <summary>
          <span>고급 설정</span>
          <small>소요시간, 검사팀 수, 병렬 배정과 교시 경계 같은 세부 조건</small>
        </summary>
        <div className="settings-advanced-stack">
          <div className="form-grid">
            <Field label={settings.examType === 'tb' ? '학급당 검진 소요시간(분)' : '장소당 검사 소요시간(분)'}>
              <input type="number" min={1} value={settings.durationMinutes} onChange={(event) => update('durationMinutes', Number(event.target.value))} />
            </Field>
            <Field label="검사팀 수">
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
                <Field label="한 번에 이동할 최대 학급 수">
                  <input type="number" min={1} value={settings.maxUnitsPerCall} onChange={(event) => update('maxUnitsPerCall', Number(event.target.value))} />
                </Field>
                <Field label="이동 소요시간(분)">
                  <input type="number" min={0} value={settings.travelMinutes} onChange={(event) => update('travelMinutes', Number(event.target.value))} />
                  <span className="field-note">학생 이동 안내 시간 = 검진 예상 시간 - 이동 소요시간으로 계산됩니다.</span>
                </Field>
                <Field label="대기 허용 여부">
                  <label className="toggle">
                    <input type="checkbox" checked={settings.allowWaiting} onChange={(event) => update('allowWaiting', event.target.checked)} /> 허용
                  </label>
                </Field>
                <Field label="학년별 시간 구간 사용">
                  <label className="toggle">
                    <input type="checkbox" checked={settings.useGradeTimeBlocks} onChange={(event) => updateUseGradeTimeBlocks(event.target.checked)} /> 사용
                  </label>
                </Field>
                <Field label="학년별 시간 배정 방식">
                  <select value={effectiveGradeTimeMode} disabled={!settings.useGradeTimeBlocks} onChange={(event) => updateGradeTimeMode(event.target.value as GradeTimeMode)}>
                    {GRADE_TIME_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <span className="field-note">현재 방식: {getGradeTimeModeLabel(effectiveGradeTimeMode)}</span>
                </Field>
                {!settings.useGradeTimeBlocks && (
                  <div className="form-help">학년별 구간을 적용하지 않고 2학년과 3학년 모두 업체 검사 가능 전체 시간 안에서 배정합니다.</div>
                )}
                {settings.useGradeTimeBlocks && !isCustomGradeTime && (
                  <div className="form-help">
                    자동 계산된 구간: {displayedGradeTimeBlocks.map((block) => `${block.grade}학년 ${block.label} ${block.startTime}~${block.endTime}`).join(' / ')}
                  </div>
                )}
                {settings.useGradeTimeBlocks && settings.gradeTimeMode === 'ALL_GRADES_FULL_RANGE' && (
                  <div className="form-help">학년별 시간 구간을 강제하지 않고 업체 검진 가능 시간 전체에서 자동배정합니다.</div>
                )}
                {displayedGradeTimeBlocks.map((block) => (
                  <Field key={`tb-block-${block.grade}`} label={`${block.grade}학년 검진 가능 시간`}>
                    <div className="inline-fields wide">
                      <input value={block.label} disabled={!isCustomGradeTime} onChange={(event) => updateGradeTimeBlock(block.grade, { label: event.target.value })} />
                      <input type="time" value={block.startTime} disabled={!isCustomGradeTime} onChange={(event) => updateGradeTimeBlock(block.grade, { startTime: event.target.value })} />
                      <input type="time" value={block.endTime} disabled={!isCustomGradeTime} onChange={(event) => updateGradeTimeBlock(block.grade, { endTime: event.target.value })} />
                    </div>
                  </Field>
                ))}
                <div className="form-help">혼합수업을 모두 제외하면 검진 가능 시간이 부족할 수 있습니다. 이 경우 일부 혼합수업 시간에 배정하되, 해당 검진 대상 학급 학생만 이동하도록 안내문이 자동 생성됩니다.</div>
                <Field label="혼합수업 처리 방식">
                  <select value={settings.tbMixedClassHandling} onChange={(event) => update('tbMixedClassHandling', event.target.value as ExamSettings['tbMixedClassHandling'])}>
                    <option value="defer">혼합수업 최대한 회피</option>
                    <option value="auto">혼합수업 허용 + 안내문 자동삽입</option>
                    <option value="manual">혼합수업 완전 제외</option>
                  </select>
                </Field>
                <Field label="같은 학년 혼합수업 추가 소요시간">
                  <input type="number" min={0} value={settings.tbSameGradeMixedExtraMinutes} onChange={(event) => update('tbSameGradeMixedExtraMinutes', Number(event.target.value))} />
                </Field>
                <Field label="여러 학년 혼합수업 추가 소요시간">
                  <input type="number" min={0} value={settings.tbMixedGradeExtraMinutes} onChange={(event) => update('tbMixedGradeExtraMinutes', Number(event.target.value))} />
                </Field>
                <Field label="수동확인 혼합 학급 수 기준">
                  <input type="number" min={2} value={settings.tbMixedManualClassThreshold} onChange={(event) => update('tbMixedManualClassThreshold', Number(event.target.value))} />
                </Field>
                <Field label="혼합수업 2슬롯 확보 여부">
                  <label className="toggle">
                    <input type="checkbox" checked={settings.tbMixedUseTwoSlots} onChange={(event) => update('tbMixedUseTwoSlots', event.target.checked)} /> 사용
                  </label>
                </Field>
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
        </div>
      </details>
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
      <div className="keyword-guide">
        학교마다 과목명과 특별실 명칭이 다를 수 있습니다. 검사 진행이 어려운 수업명은 불가 키워드에 추가하고, 확인이 필요한 수업명은 주의 키워드에 추가해 주세요.
      </div>
      <KeywordEditor
        label="검사 불가 키워드"
        description="해당 키워드가 포함된 수업은 자동배정에서 제외됩니다."
        keywords={settings.blockedKeywords}
        defaultKeywords={settings.examType === 'tb' ? TB_BLOCKED_KEYWORDS : URINE_BLOCKED_KEYWORDS}
        onChange={(items) => update('blockedKeywords', items)}
      />
      <KeywordEditor
        label="검사 주의 키워드"
        description="해당 키워드가 포함된 수업은 배정 가능하지만 결과표에 주의 표시됩니다."
        keywords={settings.cautionKeywords}
        defaultKeywords={settings.examType === 'tb' ? TB_CAUTION_KEYWORDS : URINE_CAUTION_KEYWORDS}
        onChange={(items) => update('cautionKeywords', items)}
      />
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

function KeywordEditor({
  label,
  description,
  keywords,
  defaultKeywords,
  onChange,
}: {
  label: string;
  description: string;
  keywords: string[];
  defaultKeywords: string[];
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const addKeywords = () => {
    const next = mergeKeywords(keywords, draft);
    if (next.length !== keywords.length) onChange(next);
    setDraft('');
  };
  const removeKeyword = (keyword: string) => onChange(keywords.filter((item) => item !== keyword));

  return (
    <div className="card subtle keyword-editor">
      <div className="section-title">
        <div>
          <h2>{label}</h2>
          <p>{description}</p>
        </div>
        <div className="actions">
          <button onClick={() => onChange(structuredClone(defaultKeywords))}>기본값 적용</button>
          <button onClick={() => onChange([])}>전체 삭제</button>
        </div>
      </div>
      <div className="keyword-chip-list">
        {keywords.length ? (
          keywords.map((keyword) => (
            <span key={keyword} className="keyword-chip">
              {keyword}
              <button type="button" aria-label={`${keyword} 삭제`} onClick={() => removeKeyword(keyword)}>
                ×
              </button>
            </span>
          ))
        ) : (
          <span className="keyword-empty">등록된 키워드가 없습니다.</span>
        )}
      </div>
      <div className="keyword-add-row">
        <input
          value={draft}
          placeholder="새 키워드 입력, 쉼표로 여러 개 추가"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addKeywords();
            }
          }}
        />
        <button onClick={addKeywords}>추가</button>
      </div>
    </div>
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
    setData((prev) => ({ ...prev, locations: prev.locations.map((item, rowIndex) => (rowIndex === index ? { ...item, ...patch } : item)), needsReschedule: true }));

  return (
    <section className="card stack">
      <TableTitle title={`${mode.unitMenu} 목록`} action={() => setData((prev) => ({ ...prev, locations: [...prev.locations, emptyLocation(prev.locations.length + 1)], needsReschedule: true }))} />
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
  const [uploadNotices, setUploadNotices] = useState<string[]>([]);
  const [timetableWeekday, setTimetableWeekday] = useState<VenueRestrictionWeekday>('auto');
  const [lastUploadMode, setLastUploadMode] = useState<'직접 입력' | '컴시간알리미' | '공통 서식'>('직접 입력');
  const commonFileRef = useRef<HTMLInputElement>(null);
  const comciganFileRef = useRef<HTMLInputElement>(null);
  const restrictedVenueFileRef = useRef<HTMLInputElement>(null);
  const isTb = data.settings.examType === 'tb';
  const detectedExamWeekday = getWeekdayFromDateString(data.settings.examDate);
  const appliedTimetableWeekday = timetableWeekday === 'auto' ? detectedExamWeekday : timetableWeekday;
  const appliedTimetableWeekdayLabel = appliedTimetableWeekday ? `${appliedTimetableWeekday}요일` : '검사일 미입력';
  const update = (index: number, patch: Partial<TimetableRow>) =>
    setData((prev) => ({ ...prev, timetables: prev.timetables.map((item, rowIndex) => (rowIndex === index ? { ...item, ...patch } : item)), needsReschedule: true }));

  const applyPaste = () => {
    const rows = parseTimetablePaste(paste).map((row) => {
      const location = data.locations.find((item) => item.displayName === row.displayName || item.id === row.displayName);
      return { ...row, locationId: location?.id ?? row.locationId, displayName: location?.displayName ?? row.displayName };
    });
    setData((prev) => ({ ...prev, timetables: rows, needsReschedule: true }));
  };
  const uploadWorkbook = async (file: File | undefined, mode: 'common' | 'comcigan') => {
    if (!file) return;
    const preview = await parseWorkbookFile(file, mode, { targetWeekday: appliedTimetableWeekday || '월' });
    setPreviewRows(preview.rows);
    setWarnings(preview.warnings);
    setUploadNotices(preview.notices ?? []);
    setLastUploadMode(mode === 'comcigan' ? '컴시간알리미' : '공통 서식');
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
      needsReschedule: true,
    }));
  };
  const updatePreview = (index: number, patch: Partial<CommonImportRow>) =>
    setPreviewRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  const uploadRestrictedVenueFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const imported = await Promise.all(Array.from(files).map((file) => parseRestrictedVenueWorkbook(file)));
    const nextWarnings = imported.flatMap((item) => item.warnings);
    const nextVenues = imported.flatMap((item) => item.venues);
    const nextEntries = imported.flatMap((item) => item.entries);
    const venueIds = new Set(nextVenues.map((venue) => venue.id));
    setWarnings(nextWarnings);
    setData((prev) => ({
      ...prev,
      restrictedVenues: [...prev.restrictedVenues.filter((venue) => !venueIds.has(venue.id)), ...nextVenues],
      restrictedVenueEntries: [...prev.restrictedVenueEntries.filter((entry) => !venueIds.has(entry.venueId)), ...nextEntries],
      needsReschedule: true,
    }));
  };
  const updateRestrictedVenue = (venueId: string, patch: Partial<RestrictedVenue>) =>
    setData((prev) => {
      const venues = prev.restrictedVenues.map((venue) => (venue.id === venueId ? { ...venue, ...patch } : venue));
      const updated = venues.find((venue) => venue.id === venueId);
      return {
        ...prev,
        restrictedVenues: venues,
        restrictedVenueEntries: prev.restrictedVenueEntries.map((entry) =>
          entry.venueId === venueId && updated
            ? { ...entry, mode: updated.mode, reason: updated.note }
            : entry,
        ),
        needsReschedule: true,
      };
    });
  const updateRestrictedWeekday = (weekday: VenueRestrictionWeekday) =>
    setData((prev) => ({ ...prev, restrictedVenueWeekday: weekday, needsReschedule: true }));

  return (
    <section className="stack">
      <div className="card stack">
        <h2>{isTb ? '학급별 검진 순서 입력' : '교실/장소별 시간표 입력'}</h2>
        <div className="notice notice-with-mascot">
          <OtterMascot variant="sm" decorative />
          <span>
            {isTb
              ? '결핵검진은 검진 대상 학급 기준으로 시간표를 만듭니다. 학급별 검진 순서와 검진 가능 시간만 입력해 주세요.'
              : '컴시간알리미를 사용하지 않는 학교는 공통 시간표 서식을 다운로드한 뒤 학급별 시간표를 입력해 업로드해 주세요.'}
            {'\n'}학생 이름, 학번, 검사 결과, 질병명 등 개인정보는 입력하지 않습니다.
            {'\n'}{isTb ? '수업 장소 자료는 자동배정 보조 자료로만 활용하고 결과표에는 표시하지 않습니다.' : '검사단위와 교시별 수업명만 입력하면 자동으로 검진·검사 시간표를 배정할 수 있습니다.'}
          </span>
        </div>
        <div className="actions">
          <button onClick={() => comciganFileRef.current?.click()}><FileInput size={17} /> 컴시간알리미 엑셀 업로드</button>
          <button onClick={downloadCommonTemplateXlsx}><Download size={17} /> 공통 시간표 서식 다운로드</button>
          <button onClick={downloadCommonTemplateCsv}><Download size={17} /> CSV 서식 다운로드</button>
          <button onClick={() => commonFileRef.current?.click()}><FileInput size={17} /> 공통 서식 업로드</button>
        </div>
        <div className="inline-fields">
          <Field label="검사일">
            <input value={data.settings.examDate || ''} readOnly />
          </Field>
          <Field label="적용 요일">
            <select value={timetableWeekday} onChange={(event) => setTimetableWeekday(event.target.value as VenueRestrictionWeekday)}>
              <option value="auto">검사일 기준 자동{detectedExamWeekday ? ` (${detectedExamWeekday}요일)` : ''}</option>
              {(['월', '화', '수', '목', '금'] as const).map((weekday) => (
                <option key={weekday} value={weekday}>{weekday}요일</option>
              ))}
            </select>
          </Field>
        </div>
        <input ref={comciganFileRef} type="file" accept=".xlsx,.xls" hidden onChange={(event) => uploadWorkbook(event.target.files?.[0], 'comcigan')} />
        <input ref={commonFileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(event) => uploadWorkbook(event.target.files?.[0], 'common')} />
        <textarea
          className="paste-box"
          placeholder={isTb ? '2-1 / 2-2 / 2-3 / 2-4 / 2-5 / 2-6 / 2-7' : '2-1교실 / 국어 / 영어 / 체육 / 수학 / 사회 / 과학 / 자율'}
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
        />
        {data.needsReschedule && data.timetables.length > 0 && (
          <div className="action-notice">
            <span>시간표가 입력되었습니다. 검사 조건을 확인한 뒤 [검사 시간표 자동배정하기]를 눌러 결과를 생성해 주세요.</span>
          </div>
        )}
        <div className="actions">
          <button className="primary" onClick={applyPaste}>붙여넣기 표 변환</button>
          <button onClick={resetExamples}>예시 데이터 입력</button>
          <button onClick={() => setData((prev) => ({ ...prev, timetables: [], needsReschedule: true }))}>
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
      {uploadNotices.length > 0 && (
        <div className="card warning-list">
          <strong>업로드 안내</strong>
          {uploadNotices.map((notice, index) => <p key={index}>{notice}</p>)}
        </div>
      )}
      {previewRows.length > 0 && (
        <div className="card table-wrap">
          <div className="section-title">
            <h2>업로드 변환 결과 미리보기</h2>
            <button className="primary" onClick={applyPreview}>미리보기 내용을 시간표에 적용</button>
          </div>
          <div className="preview-summary">
            <span>검사일: {data.settings.examDate || '-'}</span>
            <span>적용 요일: {appliedTimetableWeekdayLabel}</span>
            <span>업로드 방식: {lastUploadMode}</span>
            <span>읽은 시간표 행 수: {previewRows.length}</span>
          </div>
          <table>
            <thead>
              <tr>{(isTb ? ['검진 대상 학급', '학년', '구분', '자동배정', ...PERIODS.map((p) => `${p}교시`), '비고'] : ['검사단위', '학년', '구분', '실제장소', '자동배정', ...PERIODS.map((p) => `${p}교시`), '비고']).map((header) => <th key={header}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {previewRows.map((row, index) => (
                <tr key={`${row.unit}-${index}`}>
                  <td><input value={row.unit} onChange={(event) => updatePreview(index, { unit: event.target.value })} /></td>
                  <td><input value={row.grade} onChange={(event) => updatePreview(index, { grade: event.target.value })} /></td>
                  <td><input value={row.category} onChange={(event) => updatePreview(index, { category: event.target.value })} /></td>
                  {!isTb && <td><input value={row.actualLocation} onChange={(event) => updatePreview(index, { actualLocation: event.target.value })} /></td>}
                  <td>
                    <select value={row.autoInclude} onChange={(event) => updatePreview(index, { autoInclude: event.target.value })}>
                      <option>포함</option>
                      <option>제외</option>
                    </select>
                  </td>
                  {PERIODS.map((period) => (
                    <td key={period}>
                      <div className="period-cell-editor">
                        <input
                          value={row.periods[period - 1] ?? ''}
                          title={row.rawTexts?.[period - 1] ?? row.periods[period - 1] ?? ''}
                          onChange={(event) => {
                            const parsed = parseSubjectCell(event.target.value);
                            const periods = [...row.periods];
                            const teachers = [...(row.teachers ?? Array.from({ length: 7 }, () => ''))];
                            const rawTexts = [...(row.rawTexts ?? row.periods)];
                            periods[period - 1] = parsed.subject;
                            teachers[period - 1] = parsed.teacher;
                            rawTexts[period - 1] = parsed.rawText;
                            updatePreview(index, { periods, teachers, rawTexts });
                          }}
                        />
                        {!isTb && row.teachers?.[period - 1] && <span className="teacher-hint">교사: {row.teachers[period - 1]}</span>}
                      </div>
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
              {(isTb ? ['검진 대상 학급 ID', '검진 대상 학급', ...PERIODS.map((p) => `${p}교시`), '비고'] : ['장소ID', '표시명', ...PERIODS.map((p) => `${p}교시`), '비고']).map((header) => <th key={header}>{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.timetables.map((item, index) => (
              <tr key={`${item.locationId}-${index}`}>
                <td><input value={item.locationId} onChange={(event) => update(index, { locationId: event.target.value })} /></td>
                <td><input value={item.displayName} onChange={(event) => update(index, { displayName: event.target.value })} /></td>
                {PERIODS.map((period) => (
                  <td key={period}>
                    <div className="period-cell-editor">
                      <input
                        value={item.periods[period - 1] ?? ''}
                        title={item.rawTexts?.[period - 1] ?? item.periods[period - 1] ?? ''}
                        onChange={(event) => {
                          const parsed = parseSubjectCell(event.target.value);
                          const periods = [...item.periods];
                          const teachers = [...(item.teachers ?? Array.from({ length: 7 }, () => ''))];
                          const rawTexts = [...(item.rawTexts ?? item.periods)];
                          periods[period - 1] = parsed.subject;
                          teachers[period - 1] = parsed.teacher;
                          rawTexts[period - 1] = parsed.rawText;
                          update(index, { periods, teachers, rawTexts });
                        }}
                      />
                      {!isTb && item.teachers?.[period - 1] && <span className="teacher-hint">교사: {item.teachers[period - 1]}</span>}
                    </div>
                  </td>
                ))}
                <td><input value={item.notes} onChange={(event) => update(index, { notes: event.target.value })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(data.settings.examType === 'urine' || data.settings.examType === 'tb') && (
        <div className="card stack">
          <div className="section-title">
            <div>
              <h2>{isTb ? '고급 참고자료 · 혼합수업 회피 참고 시간표' : '검사 불가 장소 참고 시간표'}</h2>
              <p className="table-description">
                {isTb
                  ? '결핵검진은 검진 대상 학급 기준으로 진행됩니다. 이 자료는 혼합수업을 최대한 피하기 위한 고급 참고자료이며, 결과표에는 수업 장소를 표시하지 않습니다.'
                  : '학생 화장실 이동 안내가 필요하거나 검사 진행이 어려운 장소가 있는 경우, 해당 장소의 시간표를 업로드해 주세요.'}
                {!isTb && (
                  <>
                    {'\n'}불가 장소에 있는 학급은 해당 교시에 소변검사 자동배정에서 제외되고, 종합강의실 계열 장소는 주의로 표시됩니다.
                    {'\n'}예: 2층 종합강의실 수업은 자동배정 가능하지만 화장실 이동 안내가 필요할 수 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="actions">
              <button onClick={() => restrictedVenueFileRef.current?.click()}><FileInput size={17} /> 장소 시간표 업로드</button>
              <button onClick={() => setData((prev) => ({ ...prev, restrictedVenues: [], restrictedVenueEntries: [], needsReschedule: true }))}>
                <RotateCcw size={17} /> 장소 제한 초기화
              </button>
            </div>
          </div>
          <input
            ref={restrictedVenueFileRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            hidden
            onChange={(event) => uploadRestrictedVenueFiles(event.target.files)}
          />
          <div className="form-grid compact-form-grid">
            <Field label="장소 시간표 적용 요일">
              <select value={data.restrictedVenueWeekday} onChange={(event) => updateRestrictedWeekday(event.target.value as VenueRestrictionWeekday)}>
                {VENUE_WEEKDAYS.map((weekday) => (
                  <option key={weekday} value={weekday}>{weekday === 'auto' ? '자동 감지' : weekday}</option>
                ))}
              </select>
            </Field>
            <Metric label="등록 장소 수" value={data.restrictedVenues.length} />
            <Metric label="장소 시간표 항목 수" value={data.restrictedVenueEntries.length} />
          </div>
          {data.restrictedVenues.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>{['장소ID', '장소명', '층', '학생 화장실 접근', '처리 방식', '비고'].map((header) => <th key={header}>{header}</th>)}</tr>
                </thead>
                <tbody>
                  {data.restrictedVenues.map((venue) => (
                    <tr key={venue.id}>
                      <td>{venue.id}</td>
                      <td>{venue.name}</td>
                      <td>{venue.floor}</td>
                      <td>
                        <select
                          value={venue.hasStudentRestroom ? '가능' : '불가'}
                          onChange={(event) => updateRestrictedVenue(venue.id, { hasStudentRestroom: event.target.value === '가능' })}
                        >
                          <option>가능</option>
                          <option>불가</option>
                        </select>
                      </td>
                      <td>
                        <select value={venue.mode} onChange={(event) => updateRestrictedVenue(venue.id, { mode: event.target.value as VenueRestrictionMode })}>
                          {VENUE_RESTRICTION_MODES.map((mode) => <option key={mode}>{mode}</option>)}
                        </select>
                      </td>
                      <td>
                        <input value={venue.note} onChange={(event) => updateRestrictedVenue(venue.id, { note: event.target.value })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.restrictedVenueEntries.length > 0 && (
            <div className="table-wrap compact">
              <h3>장소 시간표 적용 미리보기</h3>
              <table>
                <thead>
                  <tr>{(isTb ? ['요일', '교시', '검진 대상 학급', '수업명', '처리'] : ['요일', '교시', '학급', '수업명', '교과교사', '제한 장소', '처리']).map((header) => <th key={header}>{header}</th>)}</tr>
                </thead>
                <tbody>
                  {data.restrictedVenueEntries.slice(0, 80).map((entry, index) => (
                    <tr key={`${entry.venueId}-${entry.weekday}-${entry.period}-${entry.className}-${index}`}>
                      <td>{entry.weekday}</td>
                      <td>{entry.period}교시</td>
                      <td>{entry.className}</td>
                      <td>{entry.subject}</td>
                      {!isTb && <td>{entry.teacher}</td>}
                      {!isTb && <td>{entry.venueName}</td>}
                      <td><span className={`badge ${entry.mode}`}>{entry.mode}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function DivisionsPanel({ data, setData }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>> }) {
  const roomMappingFileRef = useRef<HTMLInputElement>(null);
  const [mappingWarnings, setMappingWarnings] = useState<string[]>([]);
  const isTb = data.settings.examType === 'tb';
  const rawRoomMappingDescription = isTb
    ? '선택과목·분반수업 중이어도 결핵검진은 검진 대상 학급 학생만 정해진 시간에 이동합니다. 분반자료는 혼합수업을 최대한 피하기 위한 보조 자료입니다.'
    : '이동수업이나 선택과목 수업은 원래 학급 교실과 실제 수업 교실이 다를 수 있습니다. 분반자료를 업로드하면 실제 수업 교실과 혼합학년 여부를 기준으로 검사팀이 방문할 장소를 더 정확히 확인할 수 있습니다.';
  const roomMappingDescription = isTb
    ? '결핵검진은 현재 수업 장소 기준이 아니라 검진 대상 학급 기준으로 진행됩니다. 수업 장소 자료는 자동배정 보조 자료로만 활용하고 출력표에는 표시하지 않습니다.'
    : rawRoomMappingDescription;
  const update = (index: number, patch: Partial<SubjectDivision>) =>
    setData((prev) => ({ ...prev, divisions: prev.divisions.map((item, rowIndex) => (rowIndex === index ? { ...item, ...patch } : item)), needsReschedule: true }));
  const updateRoomMapping = (index: number, patch: Partial<RoomMapping>) =>
    setData((prev) => ({
      ...prev,
      roomMappings: prev.roomMappings.map((item, rowIndex) => (rowIndex === index ? { ...item, ...patch } : item)),
      needsReschedule: true,
    }));
  const uploadRoomMappingFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const imported = await Promise.all(Array.from(files).map((file) => parseRoomMappingWorkbook(file)));
    const fileNames = imported.map((item) => item.fileName);
    const mappings = imported.flatMap((item) => item.mappings);
    setMappingWarnings(imported.flatMap((item) => item.warnings));
    setData((prev) => ({
      ...prev,
      roomMappings: [...prev.roomMappings.filter((item) => !item.sourceFile || !fileNames.includes(item.sourceFile)), ...mappings],
      uploadedMappingFileNames: [...new Set([...prev.uploadedMappingFileNames.filter((name) => !fileNames.includes(name)), ...fileNames])],
      roomMappingSettings: { ...prev.roomMappingSettings, enabled: true },
      needsReschedule: true,
    }));
  };
  const clearRoomMappings = () =>
    setData((prev) => ({ ...prev, roomMappings: [], uploadedMappingFileNames: [], roomMappingSettings: { enabled: true }, needsReschedule: true }));

  return (
    <section className="stack">
      <div className="card stack">
        <TableTitle title={isTb ? '분반·혼합수업 참고자료' : '선택과목 분반 참고 목록'} action={() => setData((prev) => ({ ...prev, divisions: [...prev.divisions, emptyDivision()], needsReschedule: true }))} />
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
      </div>
      {(data.settings.examType === 'urine' || data.settings.examType === 'tb') && (
        <div className="card stack">
          <div className="section-title">
            <div>
              <h2>{isTb ? '분반자료 업로드 · 혼합수업 참고자료' : '분반자료 업로드 · 실제 수업 교실 매핑'}</h2>
              <p className="table-description">{roomMappingDescription}</p>
            </div>
            <div className="actions">
              <button onClick={() => roomMappingFileRef.current?.click()}><FileInput size={17} /> 분반자료 업로드</button>
              <button onClick={clearRoomMappings}><RotateCcw size={17} /> 분반자료 초기화</button>
            </div>
          </div>
          <input
            ref={roomMappingFileRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            hidden
            onChange={(event) => uploadRoomMappingFiles(event.target.files)}
          />
          <div className="form-grid compact-form-grid">
            <Field label="실제 수업 교실 매핑 사용">
              <select
                value={data.roomMappingSettings.enabled ? '사용' : '미사용'}
                onChange={(event) =>
                  setData((prev) => ({
                    ...prev,
                    roomMappingSettings: { enabled: event.target.value === '사용' },
                    needsReschedule: true,
                  }))
                }
              >
                <option>사용</option>
                <option>미사용</option>
              </select>
            </Field>
            <Metric label="업로드 파일 수" value={data.uploadedMappingFileNames.length} />
            <Metric label="매핑 행 수" value={data.roomMappings.length} />
          </div>
          {data.uploadedMappingFileNames.length > 0 && (
            <p className="table-description">업로드 파일: {data.uploadedMappingFileNames.join(', ')}</p>
          )}
          {mappingWarnings.length > 0 && (
            <div className="warning-list">
              <strong>분반자료 업로드 경고</strong>
              {mappingWarnings.map((warning, index) => <p key={index}>{warning}</p>)}
            </div>
          )}
          {data.roomMappings.length > 0 && (
            <div className="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    {['학년', '과목명', '분반명', '컴시간 표시 교실', '실제 수업 교실', '층', '학생 화장실 접근', '포함 학년', '포함 학급', '혼합 여부', isTb ? '결핵검진 참고 판정' : '소변검사 판정', '사유'].map((header) => <th key={header}>{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.roomMappings.map((item, index) => (
                    <tr key={item.id}>
                      <td><input value={item.grade} onChange={(event) => updateRoomMapping(index, { grade: event.target.value })} /></td>
                      <td><input value={item.subjectName ?? ''} onChange={(event) => updateRoomMapping(index, { subjectName: event.target.value })} /></td>
                      <td><input value={item.divisionName ?? ''} onChange={(event) => updateRoomMapping(index, { divisionName: event.target.value })} /></td>
                      <td><input value={item.comciganRoom ?? ''} onChange={(event) => updateRoomMapping(index, { comciganRoom: event.target.value })} /></td>
                      <td><input value={item.actualRoom} onChange={(event) => updateRoomMapping(index, { actualRoom: event.target.value })} /></td>
                      <td><input value={item.floor ?? ''} onChange={(event) => updateRoomMapping(index, { floor: event.target.value })} /></td>
                      <td>
                        <select
                          value={item.restroomAccessible ? '가능' : '불가'}
                          onChange={(event) => updateRoomMapping(index, { restroomAccessible: event.target.value === '가능' })}
                        >
                          <option>가능</option>
                          <option>불가</option>
                        </select>
                      </td>
                      <td>
                        <input
                          value={(item.involvedGrades ?? []).join(', ')}
                          onChange={(event) => updateRoomMapping(index, { involvedGrades: splitCommaValues(event.target.value), isMixedGrade: splitCommaValues(event.target.value).length >= 2 })}
                        />
                      </td>
                      <td>
                        <input
                          value={(item.involvedClasses ?? []).join(', ')}
                          onChange={(event) => {
                            const classes = splitCommaValues(event.target.value);
                            const grades = [...new Set(classes.map((className) => className.split('-')[0]).filter(Boolean))];
                            updateRoomMapping(index, {
                              involvedClasses: classes,
                              involvedGrades: grades.length ? grades : item.involvedGrades,
                              isMixedClass: classes.length >= 2,
                              isMixedGrade: grades.length >= 2,
                            });
                          }}
                        />
                      </td>
                      <td>
                        <div className="badge-stack">
                          {item.isMixedGrade && <span className="badge 불가">혼합학년</span>}
                          {!item.isMixedGrade && item.isMixedClass && <span className="badge 주의">동학년 혼합</span>}
                        </div>
                      </td>
                      <td>
                        <select value={item.urineExamAvailability} onChange={(event) => updateRoomMapping(index, { urineExamAvailability: event.target.value as VenueRestrictionMode })}>
                          {VENUE_RESTRICTION_MODES.map((mode) => <option key={mode}>{mode}</option>)}
                        </select>
                      </td>
                      <td><input value={item.reason ?? ''} onChange={(event) => updateRoomMapping(index, { reason: event.target.value })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
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
  runSchedule,
  openExamHelp,
}: {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  manualRows: ReturnType<typeof createManualConfirmRows>;
  tables: {
    full: ReturnType<typeof createFullTable>;
    lab: ReturnType<typeof createLabTable>;
    urineLines: ReturnType<typeof createUrineLineTables>;
    urineTwoColumn: ReturnType<typeof createUrineTwoColumnTable>;
    tbTeam: ReturnType<typeof createTbTeamTable>;
    tbGrades: ReturnType<typeof createTbGradeTables>;
    tbTwoColumn: ReturnType<typeof createTbTwoColumnTable>;
    teacher: ReturnType<typeof createTeacherTable>;
  };
  guideText: string;
  copyGuide: () => void;
  copyTeacher: () => void;
  runSchedule: () => void;
  openExamHelp: () => void;
}) {
  const setOverride = (locationId: string, patch: Partial<ManualOverride>) => {
    setData((prev) => {
      const existing = prev.manualOverrides.find((item) => item.locationId === locationId);
      const next = existing ? prev.manualOverrides.map((item) => (item.locationId === locationId ? { ...item, ...patch } : item)) : [...prev.manualOverrides, { locationId, ...patch }];
      return { ...prev, manualOverrides: next };
    });
  };
  const isUrine = data.settings.examType === 'urine';
  const [operationSummary, setOperationSummary] = useState({
    total: '',
    done: '',
    missed: '',
    absent: '',
    earlyLeave: '',
    refused: '',
    placeMismatch: '',
    followUp: '',
  });
  const updateOperationSummary = (key: keyof typeof operationSummary, value: string) => setOperationSummary((prev) => ({ ...prev, [key]: value }));
  const operationMessage = isUrine
    ? `오늘 2·3학년 소변검사는 결석생 및 검사 거부 학생 등 ${operationSummary.missed || '○'}명을 제외하고 완료되었습니다. 협조해 주셔서 감사합니다.\n검사 결과상 추가 확인이 필요한 학생에게는 보건실에서 개별 안내문을 배부할 예정입니다.`
    : `오늘 2·3학년 결핵검진은 결석생 및 검사 거부 학생 등 ${operationSummary.missed || '○'}명을 제외하고 진행되었습니다. 협조해 주셔서 감사합니다.\n미검 학생과 추가 확인이 필요한 학생은 보건실에서 별도 확인 후 안내하겠습니다.`;
  const resultGuide = isUrine
    ? `이 화면은 소변검사 자동배정 결과를 확인하고 출력하는 화면입니다.
전체 자동 배정표는 보건교사용 검토표이며, 실제 공유용 자료는 임상병리사용 간단표, 교사용 안내표, 학년별 2단 인쇄표를 사용해 주세요.

소변검사는 2학년 라인과 3학년 라인을 동시에 운영할 수 있도록 학년별 병렬 배정되었습니다.
검사 예정 시간은 현장 진행 상황에 따라 변동될 수 있습니다.`
    : `이 화면은 결핵검진 자동배정 결과를 확인하고 출력하는 화면입니다.
전체 자동 배정표는 보건교사용 검토표이며, 실제 공유용 자료는 검진팀용 간단표와 교사용 안내표를 사용해 주세요.

결핵검진은 학생들이 검진 장소로 이동하는 이동형 검진입니다.
결핵검진은 현재 수업 장소 기준이 아니라 검진 대상 학급 기준으로 진행됩니다.
선택과목·분반수업 중이어도 지정된 검진 대상 학급 학생만 이동하며, 이미 검진을 완료한 학생은 다시 이동하지 않습니다.
수업 장소 자료는 자동배정 보조 자료로만 활용하고 출력표에는 표시하지 않습니다.
검진 장소에서는 학급별 명렬표 기준으로 완료 여부를 확인합니다.`;
  const gradeStats = createGradeStats(data);
  const grade2 = gradeStats.find((stat) => stat.grade === '2');
  const grade3 = gradeStats.find((stat) => stat.grade === '3');
  const assigned = data.assignments.filter((item) => item.order);
  const unassignedTbRows = isUrine ? [] : data.assignments.filter((item) => !item.order);
  const timeShortageCount = unassignedTbRows.filter((item) => item.failedReason?.includes('배정 불가') || item.failedReason?.includes('시간')).length;
  const filteredOutCount = unassignedTbRows.filter((item) => item.failedReason?.includes('교시') || item.failedReason?.includes('키워드')).length;
  const candidateCountByLocation = new Map<string, number>();
  if (!isUrine) {
    for (const judgement of data.judgements) {
      if (judgement.status === '가능' || judgement.status === '주의') {
        candidateCountByLocation.set(judgement.locationId, (candidateCountByLocation.get(judgement.locationId) ?? 0) + 1);
      }
    }
  }
  const assignedGrade2 = assigned.filter((item) => item.grade === '2').length;
  const assignedGrade3 = assigned.filter((item) => item.grade === '3').length;
  const cautionAssigned = isUrine ? 0 : assigned.filter((item) => item.judgement === '주의').length;
  const mixedGradeAssigned = isUrine ? 0 : assigned.filter((item) => item.roomMappingReason?.includes('혼합학년') || item.note.includes('혼합학년')).length;
  const fallbackAssigned = isUrine ? 0 : assigned.filter((item) => item.isFallback).length;
  const mixedDurationAssigned = isUrine ? 0 : assigned.filter((item) => item.hasMixedDurationExtra).length;
  const mixedManualCount = isUrine ? 0 : manualRows.filter((item) => String(item.reason).includes('혼합')).length;
  const blockedCount = data.judgements.filter((item) => item.status === '불가').length;
  const totalEstimate =
    isUrine && data.settings.urineSimultaneous && data.settings.urineParallelMode === 'grade'
      ? Math.max(grade2?.estimatedMinutes ?? 0, grade3?.estimatedMinutes ?? 0)
      : Math.ceil((data.locations.filter((item) => item.isVisitable && item.includeInAuto).length * data.settings.durationMinutes) / Math.max(1, data.settings.teamCount || 1));
  const fullDescription = isUrine
    ? '보건교사용 검토표입니다. 검사 라인, 학년, 시간, 수업, 판정, 비고를 전체적으로 확인할 때 사용합니다. 교직원에게 그대로 공유하기보다는 검토용으로 사용해 주세요.'
    : '교직원 공유용 시간표입니다. 몇 시에 어느 학급이 어느 검진 장소로 이동하는지만 간단히 표시합니다.';
  const teamDescription = isUrine
    ? '검사팀이 실제 방문 순서를 확인할 때 사용하는 표입니다. 학년별 라인에 따라 교실 방문 순서를 확인할 수 있습니다.'
    : '검진 대상 학급별 이동 순서를 확인할 때 사용하는 표입니다. 검진 장소에서는 학급별 명렬표로 완료 여부를 확인합니다.';
  const teacherDescription = isUrine
    ? '담임 및 교과교사에게 공유할 안내용 표입니다. 검사 시간에 학생들이 질서 있게 참여할 수 있도록 협조 요청 문구가 포함됩니다.'
    : '교직원에게 공유할 안내용 표입니다. 검진 대상 학급 학생들이 정해진 시간에 이동할 수 있도록 협조 요청 문구가 포함됩니다.';
  const twoColumnDescription = isUrine
    ? '2학년과 3학년 소변검사 라인을 좌우로 나누어 한눈에 볼 수 있는 표입니다. 검사팀 및 내부 검토용으로 적합합니다.'
    : '2학년과 3학년 결핵검진 학급별 이동 시간표를 좌우로 나누어 한눈에 볼 수 있는 표입니다. 검진팀 및 교직원 공지용으로 적합합니다.';
  const noticeDescription =
    '메신저 공지, 교직원 안내, 화면 캡처 공유용으로 적합합니다.';
  const ultraCompactDescription = isUrine
    ? '교과교사 정보를 제외하고 시간대별 교실만 빠르게 공유하는 초압축 공지표입니다.'
    : '검진 시간, 검진 대상 학급, 검진 장소만 빠르게 공유하는 초압축 공지표입니다.';
  const scrollToTwoColumn = () => document.getElementById(isUrine ? 'urine-two-column-print' : 'tb-two-column-print')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToNotice = () => document.getElementById(isUrine ? 'urine-notice-print' : 'tb-notice-print')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToUltraCompact = () => document.getElementById(isUrine ? 'urine-ultra-compact-print' : 'tb-ultra-compact-print')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <section className="stack print-area">
      <div className="notice result-guide-card">
        <span>{resultGuide}</span>
        <button className="ghost" onClick={openExamHelp}>{isUrine ? '소변검사 사용 안내 보기' : '결핵검진 사용 안내 보기'}</button>
      </div>
      {assigned.length === 0 && (
        <div className="action-notice no-print">
          <span>
            아직 자동배정 결과가 없습니다.
            <br />
            검사 조건과 시간표 입력을 확인한 뒤 [검사 시간표 자동배정하기] 버튼을 눌러 주세요.
          </span>
          <button className="primary" onClick={runSchedule}>
            <Sparkles size={17} /> 검사 시간표 자동배정하기
          </button>
        </div>
      )}
      <div className="metric-grid result-summary-grid">
        <Metric label="전체 배정 수" value={assigned.length} />
        <Metric label="2학년 배정 수" value={assignedGrade2} />
        <Metric label="3학년 배정 수" value={assignedGrade3} />
        {!isUrine && <Metric label="주의 배정 수" value={cautionAssigned} />}
        {!isUrine && <Metric label="혼합학년 포함 배정 수" value={mixedGradeAssigned} />}
        {!isUrine && <Metric label="fallback 배정 수" value={fallbackAssigned} />}
        {!isUrine && <Metric label="추가 소요시간 적용 수" value={mixedDurationAssigned} />}
        {!isUrine && <Metric label="수동확인 혼합수업 수" value={mixedManualCount} />}
        <Metric label="수동 확인 필요 수" value={manualRows.length} />
        {!isUrine && <Metric label="미배정 검진 대상 학급 수" value={unassignedTbRows.length} />}
        {!isUrine && <Metric label="시간 부족 미배정 수" value={timeShortageCount} />}
        {!isUrine && <Metric label="조건 필터 미배정 수" value={filteredOutCount} />}
        <Metric label={isUrine ? '검사 불가 충돌 수' : '호출 불가 충돌 수'} value={blockedCount} />
        {isUrine ? (
          <>
            <Metric label="예상 전체 소요시간" value={`${totalEstimate}분`} />
            <Metric label="2학년 라인 소요시간" value={`${grade2?.estimatedMinutes ?? 0}분`} />
            <Metric label="3학년 라인 소요시간" value={`${grade3?.estimatedMinutes ?? 0}분`} />
          </>
        ) : (
          <>
            <Metric label="2학년 예상 소요시간" value={`${grade2?.estimatedMinutes ?? 0}분`} />
            <Metric label="3학년 예상 소요시간" value={`${grade3?.estimatedMinutes ?? 0}분`} />
          </>
        )}
      </div>
      {manualRows.length > 0 && (
        <div className="warning-banner no-print">수동 확인이 필요한 항목이 있습니다. 시간표를 공유하기 전에 아래 수동 확인 목록을 먼저 확인해 주세요.</div>
      )}
      {!isUrine && !data.settings.examVenue.trim() && (
        <div className="warning-banner no-print">검진 장소가 입력되지 않았습니다. 결과 공유 전 검진 장소를 확인해 주세요.</div>
      )}
      <div className="result-button-groups no-print">
        <OutputButtonGroup title="A. 보건교사용 검토자료" description="전체 배정 결과를 검토하거나 수정 확인용으로 사용하는 표입니다.">
          <button onClick={() => exportTableToCsv(tables.full)}><Download size={17} /> 전체표 CSV</button>
        </OutputButtonGroup>
        <OutputButtonGroup
          title="B. 검사팀 전달자료"
          description={isUrine ? '검사팀이 실제 이동 순서를 확인할 때 사용하는 간단표입니다.' : '검진 대상 학급별 이동 순서를 확인할 때 사용하는 학급별 이동표입니다.'}
        >
          {isUrine ? (
            <>
              <button onClick={() => exportTableToCsv(tables.lab)}><Download size={17} /> 검사팀용 CSV</button>
              {tables.urineLines.map((table) => (
                <button key={table.name} onClick={() => exportTableToCsv(table)}>
                  <Download size={17} /> {lineCsvLabel(table.name)}
                </button>
              ))}
              <button onClick={scrollToTwoColumn}><FileText size={17} /> 2단표 보기</button>
              <button onClick={scrollToNotice}><FileText size={17} /> 공지용 세로형 보기</button>
              <button onClick={scrollToUltraCompact}><FileText size={17} /> 초압축 공지표 보기</button>
            </>
          ) : (
            <>
              <button onClick={() => exportTableToCsv(tables.tbTeam)}><Download size={17} /> 검진팀용 학급별 CSV</button>
              {tables.tbGrades.map((table) => (
                <button key={table.name} onClick={() => exportTableToCsv(table)}>
                  <Download size={17} /> {table.name.includes('2학년') ? '2학년 학급별 이동표 CSV' : table.name.includes('3학년') ? '3학년 학급별 이동표 CSV' : `${table.name.replaceAll('_', ' ')} CSV`}
                </button>
              ))}
              <button onClick={scrollToTwoColumn}><FileText size={17} /> 2단표 보기</button>
              <button onClick={scrollToNotice}><FileText size={17} /> 공지용 세로형 보기</button>
              <button onClick={scrollToUltraCompact}><FileText size={17} /> 초압축 공지표 보기</button>
            </>
          )}
        </OutputButtonGroup>
        <OutputButtonGroup title="C. 교사용 안내자료" description={isUrine ? '담임 및 교과교사에게 공유할 안내용 자료입니다.' : '검진 대상 학급 이동 안내를 교직원에게 공유하는 자료입니다.'}>
          <button onClick={() => exportTableToCsv(tables.teacher)}><Download size={17} /> 교사용 CSV</button>
          <button onClick={copyTeacher}><ClipboardCopy size={17} /> 교사용 안내 복사</button>
        </OutputButtonGroup>
        <OutputButtonGroup title="D. 공통" description="화면 인쇄 또는 메신저 안내 문구 복사용입니다.">
          <button onClick={() => window.print()}><Printer size={17} /> 인쇄</button>
          <button onClick={copyGuide}><ClipboardCopy size={17} /> 안내 복사</button>
        </OutputButtonGroup>
      </div>

      <ResultTable title={isUrine ? 'A. 전체 자동 배정표' : 'A. 교직원 공유용 시간표'} description={fullDescription} headers={tables.full.headers} rows={tables.full.rows} />
      {isUrine && <ManualAdjustments assignments={data.assignments} examType={data.settings.examType} setOverride={setOverride} />}
      {isUrine && <ResultTable title="B. 임상병리사용 간단표" description={teamDescription} headers={tables.lab.headers} rows={tables.lab.rows} compact />}
      {isUrine &&
        tables.urineLines.map((table) => <ResultTable key={table.name} title={table.name.replaceAll('_', ' ')} description={teamDescription} headers={table.headers} rows={table.rows} compact />)}
      {!isUrine && <ResultTable title="B. 검진팀용 학급별 이동표" description={teamDescription} headers={tables.tbTeam.headers} rows={tables.tbTeam.rows} compact />}
      {!isUrine &&
        tables.tbGrades.map((table) => <ResultTable key={table.name} title={table.name.replaceAll('_', ' ')} description={teamDescription} headers={table.headers} rows={table.rows} compact />)}
      {isUrine && <ResultTable title="C. 교사용 안내표" description={teacherDescription} headers={tables.teacher.headers} rows={tables.teacher.rows} />}
      {isUrine && <UrineTwoColumnPrintTable table={tables.urineTwoColumn} description={twoColumnDescription} />}
      {isUrine && <UrineNoticeVerticalTable table={tables.urineTwoColumn} description={noticeDescription} />}
      {isUrine && <UrineUltraCompactNoticeTable table={tables.urineTwoColumn} description={ultraCompactDescription} />}
      {!isUrine && <TbTwoColumnPrintTable table={tables.tbTwoColumn} settings={data.settings} description={twoColumnDescription} />}
      {!isUrine && <TbNoticeVerticalTable table={tables.tbTwoColumn} settings={data.settings} description={noticeDescription} />}
      {!isUrine && <TbUltraCompactNoticeTable assignments={data.assignments} settings={data.settings} description={ultraCompactDescription} />}
      {!isUrine && (
        <details className="card table-wrap internal-detail-panel">
          <summary>내부 확인용 상세 정보</summary>
          <p className="table-description">혼합수업 여부, 미배정 사유, 계산 로그, 조정 필요 사항은 이 영역에서만 확인합니다. 인쇄용/공유용 시간표에는 표시하지 않습니다.</p>
          <ManualAdjustments assignments={data.assignments} examType={data.settings.examType} setOverride={setOverride} />
        </details>
      )}
      {!isUrine && unassignedTbRows.length > 0 && (
        <div className="card table-wrap internal-detail-panel">
          <h2>미배정 검진 대상 학급</h2>
          <table>
            <thead>
              <tr>{['학년', '검진 대상 학급', '사유', '필요한 확인', '가능한 후보 시간 수'].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {unassignedTbRows.map((row) => (
                <tr key={`unassigned-${row.locationId}`}>
                  <td>{row.grade}</td>
                  <td>{row.unitName || row.locationName}</td>
                  <td>{row.failedReason || '배정 시간 없음'}</td>
                  <td>학급 이동 가능 시간 또는 수동 배정 확인 필요</td>
                  <td>{candidateCountByLocation.get(row.locationId) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={`card table-wrap ${isUrine ? '' : 'internal-detail-panel'}`}>
        <h2>{isUrine ? 'E. 수동 확인 필요 목록' : 'D. 수동 확인 필요 목록'}</h2>
        <table>
          <thead>
            <tr>{(isUrine ? ['항목명', '사유', '필요한 확인', '비고'] : ['학년', '검진 대상 학급', '후보 시간 수', '제외된 후보 수', '사유', '필요한 확인']).map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {manualRows.length ? manualRows.map((row, index) => (
              isUrine ? (
                <tr key={`${row.name}-${index}`}>
                  <td>{row.name}</td>
                  <td>{row.reason}</td>
                  <td>{row.required}</td>
                  <td>{[row.type, row.note].filter(Boolean).join(' / ')}</td>
                </tr>
              ) : (
                <tr key={`${row.name}-${index}`}>
                  <td>{row.grade}</td>
                  <td>{row.unitName || row.name}</td>
                  <td>{row.candidateCount}</td>
                  <td>{row.excludedCount}</td>
                  <td>{sanitizeTbManualText(row.reason)}</td>
                  <td>{sanitizeTbManualText(row.required)}</td>
                </tr>
              )
            )) : <tr><td colSpan={isUrine ? 4 : 6} className="empty">수동 확인 필요 항목이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="card stack">
        <h2>편성 기준 안내</h2>
        <ul className="basis-list">
          <li>나이스 시간표: 기준 자료</li>
          <li>교무부 분반 확인 자료: 기준 자료</li>
          <li>수업 장소 자료: 자동배정 보조 자료로만 활용하며 결핵검진 출력표에는 표시하지 않음</li>
          <li>{isUrine ? '담당교사명: 참고 정보' : '담당교사명: 결핵검진 출력 기준에 포함하지 않음'}</li>
          <li>미검 학생: 검진 후 별도 확인</li>
          <li>수행평가 일정은 교과 평가 운영 사항이므로 자동배정 기준에는 포함하지 않습니다. 검진·검사 일정은 외부기관 일정에 따라 진행되며, 평가 일정은 교과에서 사전 조정이 필요한 항목입니다.</li>
        </ul>
      </div>
      <div className="card stack no-print">
        <div className="section-title">
          <div>
            <h2>당일 운영 요약</h2>
            <p className="table-description">공개용 Lite 앱이므로 학생 이름이나 학번은 입력하지 않고 숫자만 기록합니다.</p>
          </div>
          <button onClick={() => navigator.clipboard.writeText(operationMessage).then(() => alert('당일 운영 요약 문구를 복사했습니다.'))}>
            <ClipboardCopy size={17} /> 요약 문구 복사
          </button>
        </div>
        <div className="form-grid compact-form-grid">
          {[
            ['total', '전체 대상 학생 수'],
            ['done', '완료 학생 수'],
            ['missed', '미검 학생 수'],
            ['absent', '결석'],
            ['earlyLeave', '조퇴'],
            ['refused', '검사 거부'],
            ['placeMismatch', '장소 불일치로 미확인'],
            ['followUp', '추가 확인 필요 학생 수'],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <input type="number" min={0} value={operationSummary[key as keyof typeof operationSummary]} onChange={(event) => updateOperationSummary(key as keyof typeof operationSummary, event.target.value)} />
            </Field>
          ))}
        </div>
        <div className="notice">{operationMessage}</div>
      </div>
    </section>
  );
}

function ManualAdjustments({ assignments, examType, setOverride }: { assignments: AppData['assignments']; examType: ExamType; setOverride: (locationId: string, patch: Partial<ManualOverride>) => void }) {
  return (
    <div className="card table-wrap no-print">
      <h2>수동 조정</h2>
      <table>
        <thead>
          <tr>{[examType === 'tb' ? '검진 대상 학급' : '방문 장소', '검사 예정 시간', '해당 교시', '검사 제외', '교시 고정', '비고'].map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {assignments.map((item) => (
            <tr key={item.locationId}>
              <td>{examType === 'tb' ? item.unitName || item.locationName : formatVisitLocation(item)}</td>
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

function OutputButtonGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="card result-button-group">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}

function lineCsvLabel(name: string) {
  if (name.includes('2학년')) return '2학년 라인 CSV';
  if (name.includes('3학년')) return '3학년 라인 CSV';
  return `${name.replaceAll('_', ' ')} CSV`;
}

function UrineTwoColumnPrintTable({ table, description }: { table: ReturnType<typeof createUrineTwoColumnTable>; description: string }) {
  const [isCompact, setIsCompact] = useState(true);
  const printTwoColumnOnly = () => {
    setIsCompact(true);
    document.body.classList.add('print-two-column-only');
    window.setTimeout(() => window.print(), 0);
    window.setTimeout(() => document.body.classList.remove('print-two-column-only'), 1000);
  };

  return (
    <div id="urine-two-column-print" className={`card two-column-print-page ${isCompact ? 'compact-two-column' : ''}`}>
      <div className="two-column-print-header">
        <div>
          <h2>D. 학년별 2단 인쇄표</h2>
          <p className="table-description">{description}</p>
          <p>
            소변검사는 2학년과 3학년을 동시에 진행할 수 있도록 학년별 라인으로 배정하였습니다.
            검사 예정 시간은 현장 진행 상황에 따라 변동될 수 있습니다.
            종합강의실 수업은 현장 화장실 이동 안내가 필요할 수 있습니다.
            해당 시간 수업 중인 선생님께서는 학생들이 질서 있게 검사에 참여할 수 있도록 협조 부탁드립니다.
          </p>
        </div>
        <div className="actions no-print">
          <button className={!isCompact ? 'primary' : ''} onClick={() => setIsCompact(false)}>일반형</button>
          <button className={isCompact ? 'primary' : ''} onClick={() => setIsCompact(true)}>공지용 압축형</button>
          <button onClick={printTwoColumnOnly}><Printer size={17} /> 2단표 인쇄</button>
          <button onClick={() => exportTableToCsv(table)}><Download size={17} /> 2단표 CSV 다운로드</button>
        </div>
      </div>
      <h3 className="two-column-title">2·3학년 소변검사 시간표</h3>
      <div className="two-column-table-wrap">
        <table className="two-column-table">
          <colgroup>
            <col className="time-col" />
            <col className="room-col" />
            <col className="teacher-col" />
            <col className="time-col" />
            <col className="room-col" />
            <col className="teacher-col" />
          </colgroup>
          <thead>
            <tr className="grade-title-row">
              <th colSpan={3}>2학년 소변검사</th>
              <th colSpan={3}>3학년 소변검사</th>
            </tr>
            <tr>
              <th>검사 시간</th>
              <th>교실/장소</th>
              <th>교과교사</th>
              <th>검사 시간</th>
              <th>교실/장소</th>
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

function UrineNoticeVerticalTable({ table, description }: { table: ReturnType<typeof createUrineTwoColumnTable>; description: string }) {
  const grade2Rows = table.rows.map((row) => row.slice(0, 3)).filter((row) => row.some(Boolean));
  const grade3Rows = table.rows.map((row) => row.slice(3, 6)).filter((row) => row.some(Boolean));
  const printNoticeOnly = () => {
    document.body.classList.add('print-urine-notice-only');
    window.setTimeout(() => window.print(), 0);
    window.setTimeout(() => document.body.classList.remove('print-urine-notice-only'), 1000);
  };

  return (
    <div id="urine-notice-print" className="card urine-notice-page">
      <div className="urine-notice-header">
        <div>
          <h2>E. 공지용 세로형 표</h2>
          <p className="table-description">{description}</p>
        </div>
        <div className="actions no-print">
          <button onClick={printNoticeOnly}><Printer size={17} /> 세로형 표 인쇄</button>
          <button onClick={() => exportNoticeRowsToCsv('소변검사_공지용_세로형표', grade2Rows, grade3Rows)}><Download size={17} /> 세로형 CSV</button>
        </div>
      </div>
      <div className="urine-notice-sheet">
        <h3>2·3학년 소변검사 시간표</h3>
        <UrineNoticeSection title="2학년 소변검사" rows={grade2Rows} />
        <UrineNoticeSection title="3학년 소변검사" rows={grade3Rows} />
      </div>
    </div>
  );
}

function UrineNoticeSection({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="urine-notice-section">
      <h4>{title}</h4>
      <table className="urine-notice-table">
        <thead>
          <tr>
            <th>검사 시간</th>
            <th>교실/장소</th>
            <th>교과교사</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={`${title}-${index}`}>
              <td>{row[0]}</td>
              <td>{row[1]}</td>
              <td>{row[2]}</td>
            </tr>
          )) : (
            <tr><td colSpan={3} className="empty">배정 결과가 없습니다.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function UrineUltraCompactNoticeTable({ table, description }: { table: ReturnType<typeof createUrineTwoColumnTable>; description: string }) {
  const rows = table.rows
    .map((row) => [row[0] || row[3] || '', row[1] || '', row[4] || ''])
    .filter((row) => row.some(Boolean));
  const printUltraCompactOnly = () => {
    document.body.classList.add('print-urine-ultra-only');
    window.setTimeout(() => window.print(), 0);
    window.setTimeout(() => document.body.classList.remove('print-urine-ultra-only'), 1000);
  };

  return (
    <div id="urine-ultra-compact-print" className="card urine-ultra-page">
      <div className="urine-notice-header">
        <div>
          <h2>F. 초압축 공지표</h2>
          <p className="table-description">{description}</p>
        </div>
        <div className="actions no-print">
          <button onClick={printUltraCompactOnly}><Printer size={17} /> 초압축표 인쇄</button>
          <button onClick={() => exportTableToCsv({ name: '소변검사_초압축_공지표', headers: ['검사 시간', '2학년 교실/장소', '3학년 교실/장소'], rows })}><Download size={17} /> 초압축 CSV</button>
        </div>
      </div>
      <div className="urine-notice-sheet ultra">
        <h3>2·3학년 소변검사 시간표</h3>
        <table className="urine-notice-table ultra">
          <thead>
            <tr>
              <th>검사 시간</th>
              <th>2학년 교실/장소</th>
              <th>3학년 교실/장소</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={index}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
              </tr>
            )) : (
              <tr><td colSpan={3} className="empty">배정 결과가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function exportNoticeRowsToCsv(name: string, grade2Rows: string[][], grade3Rows: string[][]) {
  exportTableToCsv({
    name,
    headers: ['학년', '검사 시간', '교실/장소', '교과교사'],
    rows: [
      ...grade2Rows.map((row) => ['2학년', ...row]),
      ...grade3Rows.map((row) => ['3학년', ...row]),
    ],
  });
}

function TbTwoColumnPrintTable({ table, settings, description }: { table: ReturnType<typeof createTbTwoColumnTable>; settings: ExamSettings; description: string }) {
  const [isCompact, setIsCompact] = useState(true);
  const printTwoColumnOnly = () => {
    setIsCompact(true);
    document.body.classList.add('print-tb-two-column-only');
    window.setTimeout(() => window.print(), 0);
    window.setTimeout(() => document.body.classList.remove('print-tb-two-column-only'), 1000);
  };

  return (
    <div id="tb-two-column-print" className={`card tb-print-two-column-table ${isCompact ? 'tb-compact-two-column' : ''}`}>
      <div className="two-column-print-header">
        <div>
          <h2>D. 학년별 2단 인쇄표</h2>
          <p className="table-description">{description}</p>
          <p>{tbScheduleSummary(settings)}</p>
        </div>
        <div className="actions no-print">
          <button className={!isCompact ? 'primary' : ''} onClick={() => setIsCompact(false)}>일반형</button>
          <button className={isCompact ? 'primary' : ''} onClick={() => setIsCompact(true)}>공지용 압축형</button>
          <button onClick={printTwoColumnOnly}><Printer size={17} /> 2단표 인쇄</button>
          <button onClick={() => exportTableToCsv(table)}><Download size={17} /> 2단표 CSV 다운로드</button>
        </div>
      </div>
      <h3 className="two-column-title">2·3학년 결핵검진 학급별 이동 시간표</h3>
      <TbPrintGuide />
      <div className="two-column-table-wrap">
        <table className="two-column-table">
          <colgroup>
            <col style={{ width: '17.5%' }} />
            <col style={{ width: '12.5%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '17.5%' }} />
            <col style={{ width: '12.5%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr className="grade-title-row">
              <th colSpan={3}>2학년 결핵검진</th>
              <th colSpan={3}>3학년 결핵검진</th>
            </tr>
            <tr>
              <th>검진 시간</th>
              <th>검진 대상 학급</th>
              <th>검진 장소</th>
              <th>검진 시간</th>
              <th>검진 대상 학급</th>
              <th>검진 장소</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.length ? table.rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}
              </tr>
            )) : (
              <tr><td colSpan={6} className="empty">2단표로 표시할 결핵검진 배정 결과가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TbNoticeVerticalTable({ table, settings, description }: { table: ReturnType<typeof createTbTwoColumnTable>; settings: ExamSettings; description: string }) {
  const grade2Rows = table.rows.map((row) => row.slice(0, 3)).filter((row) => row.some(Boolean));
  const grade3Rows = table.rows.map((row) => row.slice(3, 6)).filter((row) => row.some(Boolean));
  const sections = [
    { grade: '2', title: '2학년 결핵검진', rows: grade2Rows },
    { grade: '3', title: '3학년 결핵검진', rows: grade3Rows },
  ].sort((a, b) => getTbGradeBlockStart(settings, a.grade).localeCompare(getTbGradeBlockStart(settings, b.grade)) || a.grade.localeCompare(b.grade, 'ko', { numeric: true }));
  const printNoticeOnly = () => {
    document.body.classList.add('print-tb-notice-only');
    window.setTimeout(() => window.print(), 0);
    window.setTimeout(() => document.body.classList.remove('print-tb-notice-only'), 1000);
  };

  return (
    <div id="tb-notice-print" className="card tb-print-vertical-table">
      <div className="urine-notice-header">
        <div>
          <h2>E. 공지용 세로형 표</h2>
          <p className="table-description">{description}</p>
        </div>
        <div className="actions no-print">
          <button onClick={printNoticeOnly}><Printer size={17} /> 세로형 표 인쇄</button>
          <button onClick={() => exportTbNoticeRowsToCsv('결핵검진_공지용_세로형표', grade2Rows, grade3Rows)}><Download size={17} /> 세로형 CSV</button>
        </div>
      </div>
      <div className="tb-notice-sheet">
        <h3>2·3학년 결핵검진 학급별 이동 시간표</h3>
        <p className="table-description">{tbScheduleSummary(settings)}</p>
        <TbPrintGuide />
        {sections.map((section) => <TbNoticeSection key={section.grade} title={section.title} rows={section.rows} />)}
      </div>
    </div>
  );
}

function TbNoticeSection({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="urine-notice-section">
      <h4>{title}</h4>
      <table className="urine-notice-table">
        <colgroup>
          <col style={{ width: '35%' }} />
          <col style={{ width: '25%' }} />
          <col style={{ width: '40%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>검진 시간</th>
            <th>검진 대상 학급</th>
            <th>검진 장소</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={`${title}-${index}`}>
              <td>{row[0]}</td>
              <td>{row[1]}</td>
              <td>{row[2]}</td>
            </tr>
          )) : (
            <tr><td colSpan={3} className="empty">배정 결과가 없습니다.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function TbPrintGuide() {
  return (
    <div className="notice tb-class-movement-guide">
      <span>결핵검진은 검진 대상 학급 기준으로 진행됩니다.</span>
      <span>안내된 시간에 해당 학급 학생들이 검진 장소로 이동합니다.</span>
      <span>선택과목·분반수업 중이어도 해당 시간에 지정된 학급 학생만 이동합니다.</span>
      <span>이미 검진을 완료한 학생은 이후 다른 수업 장소에 있더라도 다시 이동하지 않습니다.</span>
      <span>검진 장소에서는 학급별 명렬표를 기준으로 완료 여부를 확인합니다.</span>
    </div>
  );
}

function TbUltraCompactNoticeTable({ assignments, settings, description }: { assignments: ScheduleAssignment[]; settings: ExamSettings; description: string }) {
  const rows = normalizeTbNoticeAssignments(assignments)
    .map((item) => [`${item.grade}학년`, tbExamRange(item), item.unitName || item.locationName.replace(/교실$/, ''), item.examVenue || settings.examVenue]);
  const printUltraCompactOnly = () => {
    document.body.classList.add('print-tb-ultra-only');
    window.setTimeout(() => window.print(), 0);
    window.setTimeout(() => document.body.classList.remove('print-tb-ultra-only'), 1000);
  };

  return (
    <div id="tb-ultra-compact-print" className="card tb-print-ultra-table">
      <div className="urine-notice-header">
        <div>
          <h2>F. 초압축 공지표</h2>
          <p className="table-description">{description}</p>
        </div>
        <div className="actions no-print">
          <button onClick={printUltraCompactOnly}><Printer size={17} /> 초압축표 인쇄</button>
          <button onClick={() => exportTableToCsv({ name: '결핵검진_초압축_학급별_공지표', headers: ['학년', '검진 시간', '검진 대상 학급', '검진 장소'], rows })}><Download size={17} /> 초압축 CSV</button>
        </div>
      </div>
      <div className="tb-notice-sheet ultra">
        <h3>2·3학년 결핵검진 학급별 이동 시간표</h3>
        <table className="urine-notice-table ultra">
          <thead>
            <tr>
              <th>학년</th>
              <th>검진 시간</th>
              <th>검진 대상 학급</th>
              <th>검진 장소</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={index}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="empty">배정 결과가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function normalizeTbNoticeAssignments(assignments: ScheduleAssignment[]) {
  const rows = assignments
    .filter((item) => item.order)
    .map((item) => ({ ...item }))
    .sort((a, b) => (a.examTime || a.scheduledTime || '').localeCompare(b.examTime || b.scheduledTime || '') || a.grade.localeCompare(b.grade, 'ko', { numeric: true }));
  const cursors = new Map<string, number>();
  for (const item of rows) {
    const key = item.timeBlockLabel || item.lineName || item.grade || 'tb';
    const originalStart = timeStringToMinutes(item.examTime || item.scheduledTime || '23:59');
    const start = Math.max(originalStart, cursors.get(key) ?? originalStart);
    item.scheduledTime = formatMinutesAsTime(start);
    item.examTime = item.scheduledTime;
    cursors.set(key, start + Math.max(1, item.estimatedDurationMinutes ?? 0));
  }
  return rows.sort((a, b) => (a.examTime || a.scheduledTime || '').localeCompare(b.examTime || b.scheduledTime || '') || a.grade.localeCompare(b.grade, 'ko', { numeric: true }));
}

function tbExamRange(item: ScheduleAssignment) {
  const start = item.examTime || item.scheduledTime;
  if (!start) return '';
  return `${start}~${addTimeMinutes(start, item.estimatedDurationMinutes ?? 0)}`;
}

function timeStringToMinutes(time: string) {
  const [hour = '0', minute = '0'] = time.split(':');
  return Number(hour) * 60 + Number(minute);
}

function formatMinutesAsTime(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function addTimeMinutes(time: string, minutes: number) {
  const [hour = '0', minute = '0'] = time.split(':');
  const total = Number(hour) * 60 + Number(minute) + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function getTbGradeBlockStart(settings: ExamSettings, grade: string) {
  if (!settings.useGradeTimeBlocks) return settings.startTime;
  const block = calculateGradeTimeBlocks(settings, settings.gradeTimeMode).find((item) => item.grade === grade);
  return block?.startTime || settings.startTime;
}

function exportTbNoticeRowsToCsv(name: string, grade2Rows: string[][], grade3Rows: string[][]) {
  exportTableToCsv({
    name,
    headers: ['학년', '검진 시간', '검진 대상 학급', '검진 장소'],
    rows: [
      ...grade2Rows.map((row) => ['2학년', ...row]),
      ...grade3Rows.map((row) => ['3학년', ...row]),
    ],
  });
}

function sanitizeTbManualText(value: string | undefined) {
  return String(value ?? '')
    .replaceAll('실제 수업 장소 확인 필요', '학급 이동 시간 확인 필요')
    .replaceAll('실제 방문 장소 없음', '검진 대상 학급 확인 필요')
    .replaceAll('실제교실 사유', '참고자료 사유')
    .replaceAll('실제 수업 교실', '참고자료')
    .replaceAll('수업 장소 확인 필요', '학급 이동 시간 확인 필요');
}

function tbScheduleSummary(settings: ExamSettings) {
  const effectiveMode: GradeTimeMode = settings.useGradeTimeBlocks ? settings.gradeTimeMode : 'ALL_GRADES_FULL_RANGE';
  const effectiveBlocks = settings.useGradeTimeBlocks && effectiveMode !== 'ALL_GRADES_FULL_RANGE' ? getEffectiveGradeTimeBlocks(settings) : calculateGradeTimeBlocks(settings, 'ALL_GRADES_FULL_RANGE');
  const grade2 = effectiveBlocks.find((item) => item.grade === '2');
  const grade3 = effectiveBlocks.find((item) => item.grade === '3');
  return [
    `학년별 운영 방식: ${getGradeTimeModeLabel(effectiveMode)}`,
    grade2 ? `2학년 검진 시간 구간: ${grade2.startTime}~${grade2.endTime}` : '',
    grade3 ? `3학년 검진 시간 구간: ${grade3.startTime}~${grade3.endTime}` : '',
    `검진 장소: ${settings.examVenue || '-'}`,
    `이동 소요시간: ${settings.travelMinutes || 0}분`,
  ].filter(Boolean).join(' / ');
}

function tbGradeTimeGuideSentence(settings: ExamSettings) {
  if (!settings.useGradeTimeBlocks || settings.gradeTimeMode === 'ALL_GRADES_FULL_RANGE') {
    return '이번 결핵검진은 학년 구분 없이 업체 검진 가능 시간 전체 안에서 자동배정하여 운영합니다.';
  }
  const modeLabel = getGradeTimeModeLabel(settings.gradeTimeMode);
  const blocks = getEffectiveGradeTimeBlocks(settings)
    .map((block) => `${block.grade}학년 ${block.startTime}~${block.endTime}`)
    .join(', ');
  return `이번 결핵검진은 ${modeLabel} 방식으로 운영합니다.${blocks ? ` (${blocks})` : ''}`;
}

function ResultTable({
  title,
  description,
  headers,
  rows,
  compact = false,
}: {
  title: string;
  description?: string;
  headers: string[];
  rows: string[][];
  compact?: boolean;
}) {
  const isTbMovementTable =
    headers.length === 3 &&
    headers[0].includes('검진 시간') &&
    headers[1].includes('검진 대상 학급') &&
    headers[2].includes('검진 장소');
  return (
    <div className={`card table-wrap ${compact ? 'compact' : ''} ${isTbMovementTable ? 'tb-movement-result-table' : ''}`}>
      <h2>{title}</h2>
      {description && <p className="table-description">{description}</p>}
      <table>
        {isTbMovementTable && (
          <colgroup>
            <col style={{ width: '35%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '40%' }} />
          </colgroup>
        )}
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

function splitCommaValues(value: string) {
  return splitKeywords(value);
}

function mergeKeywords(current: string[], value: string) {
  const seen = new Set(current.map((item) => item.trim()).filter(Boolean));
  const next = [...seen];
  for (const keyword of splitKeywords(value)) {
    if (!seen.has(keyword)) {
      seen.add(keyword);
      next.push(keyword);
    }
  }
  return next;
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
    restrictedVenues: structuredClone(data.restrictedVenues),
    restrictedVenueEntries: structuredClone(data.restrictedVenueEntries),
    restrictedVenueWeekday: data.restrictedVenueWeekday,
    roomMappings: structuredClone(data.roomMappings),
    roomMappingSettings: structuredClone(data.roomMappingSettings),
    uploadedMappingFileNames: structuredClone(data.uploadedMappingFileNames),
  };
}

function getInitialActiveTab() {
  return getRouteTab() ?? 'dashboard';
}

function shouldStartAtHome() {
  return !getRouteTab();
}

function getRouteTab() {
  if (typeof window === 'undefined') return undefined;
  const routes: Record<string, string> = {
    '/teacher-dashboard': 'teacher-dashboard',
    '/admin-dashboard': 'admin-dashboard',
    '/display': 'display',
    '/report': 'report',
  };
  return routes[window.location.pathname];
}

function getTabPath(tabId: string) {
  const paths: Record<string, string> = {
    'teacher-dashboard': '/teacher-dashboard',
    'admin-dashboard': '/admin-dashboard',
    display: '/display',
    report: '/report',
  };
  return paths[tabId];
}

function getModeCopy(examType: ExamType) {
  if (examType === 'tb') {
    return {
      shortLabel: '결핵검진',
      sidebarDetail: '이동형 / 검진 대상 학급 기준',
      title: '학급 기준 결핵검진 이동 시간표 자동배정',
      unitMenu: '검진 대상 학급',
      unitLabel: '검진 대상 학급',
      dateLabel: '검진일',
      gradeLabel: '검진 대상 학년',
      totalLabel: '전체 검진 대상 학급 수',
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

function getWeekdayFromDateString(dateString: string): Exclude<VenueRestrictionWeekday, 'auto'> | '' {
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return '';
  const weekday = new Date(year, month - 1, day).getDay();
  const weekdays: Record<number, Exclude<VenueRestrictionWeekday, 'auto'>> = { 1: '월', 2: '화', 3: '수', 4: '목', 5: '금' };
  return weekdays[weekday] ?? '';
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
    messages.push('결핵검진 자동배정에 사용할 검진 대상 학급이 없습니다.');
  }

  return messages;
}

function createDuplicateVisitLocationWarnings(assignments: ScheduleAssignment[]) {
  const rows = assignments.filter((item) => item.grade && (item.order || item.duplicateWarning));
  const byVisitLocation = new Map<string, ScheduleAssignment[]>();
  const byUnit = new Map<string, ScheduleAssignment[]>();

  for (const item of rows) {
    const visitKey = `${item.grade}|${normalizeDashboardVisitLocation(formatVisitLocation(item))}`;
    const unitKey = `${item.grade}|${item.unitId || item.locationId || item.unitName}`;
    byVisitLocation.set(visitKey, [...(byVisitLocation.get(visitKey) ?? []), item]);
    byUnit.set(unitKey, [...(byUnit.get(unitKey) ?? []), item]);
  }

  const warnings = new Map<string, {
    grade: string;
    visitLocation: string;
    count: number;
    times: string[];
    unitNames: string[];
    action: string;
  }>();

  const addWarning = (items: ScheduleAssignment[], action: string) => {
    if (items.length < 2 && !items.some((item) => item.duplicateWarning)) return;
    const first = items[0];
    const key = `${first.grade}|${normalizeDashboardVisitLocation(formatVisitLocation(first))}|${items.map((item) => item.unitId || item.locationId).join(',')}`;
    warnings.set(key, {
      grade: first.grade,
      visitLocation: formatVisitLocation(first),
      count: items.length,
      times: [...new Set(items.map((item) => item.scheduledTime).filter(Boolean))],
      unitNames: [...new Set(items.map((item) => item.unitName || item.homeRoomName || item.locationName).filter(Boolean))],
      action,
    });
  };

  byVisitLocation.forEach((items) => addWarning(items, '방문 장소 중복 여부 확인 및 수동 배정'));
  byUnit.forEach((items) => addWarning(items, '기준 학급 중복 여부 확인'));

  return [...warnings.values()].sort(
    (a, b) => a.grade.localeCompare(b.grade, 'ko', { numeric: true }) || a.visitLocation.localeCompare(b.visitLocation, 'ko', { numeric: true }),
  );
}

function normalizeDashboardVisitLocation(value: string) {
  return value.replace(/\s/g, '').replace(/교실$/, '').toUpperCase();
}

function createGradeStats(data: AppData) {
  const grades = ['2', '3'];
  const effectiveBlocks = getEffectiveGradeTimeBlocks(data.settings);
  return grades.map((grade) => {
    const count = data.locations.filter((item) => item.grade === grade && item.includeInAuto && (data.settings.examType === 'tb' || item.isVisitable)).length;
    const done = data.assignments.filter((item) => item.grade === grade && item.order).length;
    const lines = Math.max(1, data.settings.examType === 'urine' ? data.settings.teamsByGrade[grade] ?? 1 : data.settings.teamCount || 1);
    const estimatedMinutes = Math.ceil((count * data.settings.durationMinutes) / lines);
    const block = effectiveBlocks.find((item) => item.grade === grade);
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


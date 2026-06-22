import type { AppData, ExamSettings, SubjectDivision, TimetableRow, VisitLocation } from '../types';

export const URINE_BLOCKED_KEYWORDS = [
  '컴퓨터',
  '컴퓨터실',
  '정보',
  '코딩',
  '프로그래밍',
  '체육',
  '스포츠',
  '스생',
  '체탐',
  '운동장',
  '체육관',
  '무용',
];

export const URINE_CAUTION_KEYWORDS = [
  '음악',
  '미술',
  '과학실',
  '실험',
  '가정',
  '기술',
  '특별실',
  '창체',
  '동아리',
  '선택',
  '이동수업',
];

export const TB_BLOCKED_KEYWORDS = [
  '컴퓨터',
  '컴퓨터실',
  '정보',
  '코딩',
  '프로그래밍',
  '체육',
  '스포츠',
  '스생',
  '체탐',
  '운동장',
  '체육관',
  '무용',
  '외부활동',
  '현장체험',
];

export const TB_CAUTION_KEYWORDS = [
  '선택',
  '이동수업',
  '음악',
  '미술',
  '과학실',
  '실험',
  '가정',
  '기술',
  '특별실',
  '창체',
  '동아리',
];

export const DEFAULT_DAY_SCHEDULE = [
  { id: 'homeroom', label: '등교 및 조회', kind: 'excluded' as const, startTime: '07:50', endTime: '08:00', assignable: false },
  { id: 'p1', label: '1교시', kind: 'period' as const, period: 1, startTime: '08:10', endTime: '09:00', assignable: true },
  { id: 'p2', label: '2교시', kind: 'period' as const, period: 2, startTime: '09:10', endTime: '10:00', assignable: true },
  { id: 'p3', label: '3교시', kind: 'period' as const, period: 3, startTime: '10:10', endTime: '11:00', assignable: true },
  { id: 'lunch', label: '점심시간', kind: 'excluded' as const, startTime: '11:00', endTime: '12:10', assignable: false },
  { id: 'p4', label: '4교시', kind: 'period' as const, period: 4, startTime: '12:10', endTime: '13:00', assignable: true },
  { id: 'p5', label: '5교시', kind: 'period' as const, period: 5, startTime: '13:10', endTime: '14:00', assignable: true },
  { id: 'p6', label: '6교시', kind: 'period' as const, period: 6, startTime: '14:10', endTime: '15:00', assignable: true },
  { id: 'p7', label: '7교시', kind: 'period' as const, period: 7, startTime: '15:10', endTime: '16:00', assignable: true },
];

export const URINE_GUIDE_TEXT =
  '안녕하세요. 보건실입니다.\n\n' +
  '소변검사는 외부 검사기관 임상병리사 선생님들께서 각 수업 장소를 순회하며, 학급별 명렬표를 기준으로 학생을 확인하고 검체를 확인·수거하는 방식으로 진행됩니다.\n\n' +
  '현재 시간표는 교무부 분반 확인 자료 및 나이스 시간표를 기준으로 편성하였습니다. 다만 실제 수업 운영 과정에서 교실, 담당교사, 분반 구성이 자료와 다를 수 있습니다.\n\n' +
  '이번 검사는 담당교사명을 기준으로 진행되는 것이 아니라, 명렬표를 기준으로 해당 학급 학생을 확인하는 방식입니다. 담당교사명 차이만으로는 검사 진행에 큰 지장은 없습니다.\n\n' +
  '실제 수업 장소가 안내된 시간표와 다른 경우에만 보건실로 알려주시면 확인하겠습니다.';

export const TB_GUIDE_TEXT =
  '안녕하세요. 보건실입니다.\n\n' +
  '2·3학년 결핵검진 시간표를 안내드립니다.\n\n' +
  '결핵검진은 소변검사와 달리 검사자가 각 교실을 방문하는 방식이 아니라, 안내된 시간에 해당 학급 학생들이 검진 장소로 이동하여 검사받는 방식으로 진행됩니다.\n\n' +
  '시간표는 학급 단위 이동이 가능한 시간을 우선으로 정리하였으며, 전체 시간표상 선택과목·분반수업 등 학년과 학급이 섞여 있는 수업을 모두 제외하기는 어려워 일부 학급은 혼합수업 시간대에 검진이 배정될 수 있습니다.\n\n' +
  '혼합수업 중인 경우에도 해당 시간에 지정된 검진 대상 학급 학생만 검진 장소로 이동하면 됩니다. 이미 검진을 완료한 학생은 이후 다른 수업 장소에 있더라도 다시 이동하지 않습니다.\n\n' +
  '검진 장소에서는 학급별 명렬표를 기준으로 검진 완료 여부를 확인하겠습니다.\n\n' +
  '각 교과 선생님들께서는 해당 시간에 검진 대상 학급 학생들이 이동 후 복귀할 수 있도록 안내 부탁드립니다.\n\n' +
  '미검 학생은 추후 보건실에서 확인하여 별도 안내하겠습니다.';

export function getGuideText(examType: ExamSettings['examType']) {
  return examType === 'tb' ? TB_GUIDE_TEXT : URINE_GUIDE_TEXT;
}

const settings: ExamSettings = {
  examType: 'urine',
  operationMode: 'visit',
  examDate: '2026-06-24',
  targetGrades: ['2', '3'],
  startTime: '08:10',
  endTime: '16:00',
  availablePeriods: [1, 2, 3, 4, 5, 6, 7],
  durationMinutes: 7,
  teamCount: 1,
  urineSimultaneous: true,
  urineParallelMode: 'grade',
  urineMixedGradeHandling: 'allow-caution',
  teamsByGrade: { '2': 1, '3': 1 },
  gradeStartTimes: { '2': '08:10', '3': '08:10' },
  travelMinutes: 5,
  examVenue: '검진 장소',
  maxUnitsPerCall: 1,
  allowWaiting: false,
  tbMixedClassHandling: 'defer',
  tbSameGradeMixedExtraMinutes: 3,
  tbMixedGradeExtraMinutes: 5,
  tbMixedManualClassThreshold: 4,
  tbMixedUseTwoSlots: false,
  useGradeTimeBlocks: true,
  gradeTimeMode: 'G2_AM_G3_PM' as const,
  gradeTimeBlocks: [
    { grade: '2', label: '2학년 오전', startTime: '08:10', endTime: '11:00' },
    { grade: '3', label: '3학년 오후', startTime: '12:10', endTime: '16:00' },
  ],
  includeBreaks: true,
  allowCrossPeriod: false,
  excludedTimes: '',
  blockedKeywords: URINE_BLOCKED_KEYWORDS,
  cautionKeywords: URINE_CAUTION_KEYWORDS,
  daySchedule: DEFAULT_DAY_SCHEDULE,
};

const roomRows = [
  ['2-1', '2'],
  ['2-2', '2'],
  ['2-3', '2'],
  ['2-4', '2'],
  ['2-5', '2'],
  ['2-6', '2'],
  ['2-7', '2'],
  ['2-8', '2'],
  ['2-9', '2'],
  ['2-10', '2'],
  ['2-11', '2'],
  ['2-12', '2'],
  ['3-1', '3'],
  ['3-2', '3'],
  ['3-3', '3'],
  ['3-4', '3'],
  ['3-5', '3'],
  ['3-6', '3'],
  ['3-7', '3'],
  ['3-8', '3'],
  ['3-9', '3'],
  ['3-10', '3'],
  ['3-11', '3'],
  ['3-12', '3'],
] as const;

const locations: VisitLocation[] = [
  ...roomRows.map(([room, grade]) => ({
    id: `R${room}`,
    displayName: `${room}교실`,
    grade,
    category: '일반교실' as const,
    isVisitable: true,
    includeInAuto: true,
    notes: `${grade}학년 ${room.split('-')[1]}반 교실`,
  })),
  {
    id: 'LAB-COM',
    displayName: '컴퓨터실',
    grade: '공통',
    category: '특별실',
    isVisitable: false,
    includeInAuto: false,
    notes: '검사 진행 어려움',
  },
  {
    id: 'GYM',
    displayName: '체육관',
    grade: '공통',
    category: '체육시설',
    isVisitable: false,
    includeInAuto: false,
    notes: '자동배정 제외',
  },
];

const timetableSubjects = [
  ['2-1', ['세지', '사문2', '영어1', '세사', '일어', '독서', '미적']],
  ['2-2', ['세사', '현윤', '화언A', '독서', '정보', '세지', '화언B']],
  ['2-3', ['물리', '세지', '스생2', '현윤', '미적', '사문2', '일어']],
  ['2-4', ['현윤', '미영', '화언A', '세지', '영어1', '화학', '화언B']],
  ['2-5', ['사문2', '기하2', '미적', '생명', '스생2', '지구', '영어1']],
  ['2-6', ['지구', '생명', '영어1', '사문2', '미적', '현윤', '정보']],
  ['2-7', ['화학', '물리', '화언B', '기하2', '일어', '생명', '미적']],
  ['2-8', ['생명', '지구', '정보', '화학', '화언B', '기하2', '영어1']],
  ['2-9', ['영어1', '물리', '일어', '화학', '화언B', '지구', '생명']],
  ['2-10', ['생명', '미적', '스생2', '기하2', '영어1', '화언A', '지구']],
  ['2-11', ['미적', '화학', '물리', '스생2', '지구', '일어', '기하2']],
  ['2-12', ['정보', '화언B', '미적', '스생2', '생명', '화언A', '물리']],
  ['3-1', ['생윤', '수탐', '진독', '심국A', '심수', '심영A', '생과']],
  ['3-2', ['사문3', '생과', '심영A', '진프3', '언매', '사탐B', '수탐']],
  ['3-3', ['심국A', '심수', '생윤', '생과', '미창', '사문3', '심영A']],
  ['3-4', ['진프3', '심국A', '생과', '사문3', '생윤', '한지', '심수']],
  ['3-5', ['심영A', '심영B', '음연', '사탐A', '사문3', '생윤', '심국B']],
  ['3-6', ['심국B', '진프3', '지구2', '생명2', '사탐A', '생과', '심수']],
  ['3-7', ['진독', '심수', '사탐B', '지구2', '화학2', '물리2', '심영A']],
  ['3-8', ['심수', '심국B', '화학2', '물리2', '사탐A', '생명2', '공학']],
  ['3-9', ['생명2', '심영A', '진독', '심국B', '심수', '심국A', '물리2']],
  ['3-10', ['사탐B', '언매', '심국A', '기하3', '진프3', '심수', '지구2']],
  ['3-11', ['화학2', '스생3', '심수', '심영A', '심국A', '공학', '사탐A']],
  ['3-12', ['물리2', '심국A', '기하3', '심수', '언매', '심영A', '생명2']],
] as const;

const timetables: TimetableRow[] = timetableSubjects.map(([room, periods]) => ({
  locationId: `R${room}`,
  displayName: `${room}교실`,
  periods: [...periods],
  notes: '통합 문서1.xlsx 학급시간표 월(22) 반영',
}));

const divisions: SubjectDivision[] = [
  {
    name: '2-13',
    grade: '2',
    actualLocationId: '',
    handling: '자동제외',
    notes: '선택과목 분반, 실제 교실 아님',
  },
  {
    name: '3-13',
    grade: '3',
    actualLocationId: '',
    handling: '자동제외',
    notes: '선택과목 분반, 실제 교실 아님',
  },
];

export function createDefaultData(): AppData {
  const base = {
    settings: structuredClone(settings),
    locations: structuredClone(locations),
    timetables: structuredClone(timetables),
    divisions: structuredClone(divisions),
    judgements: [],
    assignments: [],
    manualOverrides: [],
    restrictedVenues: [],
    restrictedVenueEntries: [],
    restrictedVenueWeekday: 'auto' as const,
    roomMappings: [],
    roomMappingSettings: { enabled: true },
    uploadedMappingFileNames: [],
  };
  const tbBase = {
    ...structuredClone(base),
    settings: {
      ...structuredClone(settings),
      examType: 'tb' as const,
      operationMode: 'move' as const,
      examDate: '2026-06-25',
      blockedKeywords: structuredClone(TB_BLOCKED_KEYWORDS),
      cautionKeywords: structuredClone(TB_CAUTION_KEYWORDS),
      examVenue: '검진 장소',
      durationMinutes: 8,
      travelMinutes: 5,
      teamCount: 1,
      maxUnitsPerCall: 1,
      tbMixedClassHandling: 'defer' as const,
      tbSameGradeMixedExtraMinutes: 3,
      tbMixedGradeExtraMinutes: 5,
      tbMixedManualClassThreshold: 4,
      tbMixedUseTwoSlots: false,
      useGradeTimeBlocks: true,
      gradeTimeMode: 'G2_AM_G3_PM' as const,
      gradeTimeBlocks: [
        { grade: '2', label: '2학년 오전', startTime: '08:10', endTime: '11:00' },
        { grade: '3', label: '3학년 오후', startTime: '12:10', endTime: '16:00' },
      ],
    },
  };

  return {
    ...base,
    templates: [
      {
        id: 'tpl-2026-urine',
        name: '2026 소변검사',
        year: '2026',
        examType: 'urine',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: structuredClone(base),
      },
      {
        id: 'tpl-2026-tb',
        name: '2026 결핵검진',
        year: '2026',
        examType: 'tb',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: structuredClone(tbBase),
      },
    ],
    activeTemplateId: 'tpl-2026-urine',
    schoolDefaults: {
      daySchedule: structuredClone(DEFAULT_DAY_SCHEDULE),
    },
    keywordSets: {
      urine: {
        blockedKeywords: structuredClone(URINE_BLOCKED_KEYWORDS),
        cautionKeywords: structuredClone(URINE_CAUTION_KEYWORDS),
      },
      tb: {
        blockedKeywords: structuredClone(TB_BLOCKED_KEYWORDS),
        cautionKeywords: structuredClone(TB_CAUTION_KEYWORDS),
      },
    },
    hasSelectedExamType: false,
    needsReschedule: false,
  };
}

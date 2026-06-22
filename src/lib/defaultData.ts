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
  '수행평가',
  '시험',
  '평가',
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
  '본 시간표는 학생 개인 이동을 추적하는 자료가 아니라, 소변검사팀이 실제 방문할 수 있는 교실·장소를 기준으로 자동 배정한 자료입니다.\n' +
  '선택과목 운영으로 인해 2-13, 3-13 등 시간표상 분반명이 포함될 수 있으나, 실제 방문 장소가 없는 분반은 자동배정에서 제외하였습니다.\n' +
  '해당 교실 또는 장소에서 검사를 진행할 때 학생의 실제 반은 임상병리사분이 명렬표를 넘기며 확인합니다.\n' +
  '일부 이동수업·선택과목 수업은 여러 학년이 함께 수업 중일 수 있습니다. 해당 경우 검사팀이 명렬표를 확인하며 진행합니다.\n' +
  '컴퓨터 수업, 정보 수업, 체육 수업 등 검사 진행이 어려운 시간은 자동 제외하였습니다.\n' +
  '종합강의실 수업은 현장 화장실 이동 안내가 필요할 수 있습니다.\n' +
  '검사 예정 시간은 현장 진행 상황에 따라 변동될 수 있습니다.';

export const TB_GUIDE_TEXT =
  '결핵검진은 학생들이 검진 장소로 이동하여 진행하는 호출형 검진입니다.\n' +
  '첨부된 시간표의 호출 시간에 맞춰 학생들이 검진 장소로 이동할 수 있도록 협조 부탁드립니다.\n' +
  '호출 시간은 학생들이 교실에서 출발해야 하는 시간이며, 검진 예상 시간은 검진 장소에서 실제 검진이 진행될 예상 시간입니다.\n' +
  '이번 결핵검진은 학년별 시간 구간을 나누어 운영할 수 있습니다.\n' +
  '일부 이동수업·선택과목 수업은 실제 수업 장소와 호출 단위 확인이 필요할 수 있습니다. 해당 경우 수업 담당 선생님께서는 학생들이 호출 시간에 맞춰 이동할 수 있도록 협조 부탁드립니다.\n' +
  '여러 학년이 함께 수업 중인 경우에는 학년별 호출 시간 구간에 맞춰 현장에서 확인 후 진행할 수 있습니다.\n' +
  '점심시간과 조회 시간은 자동 배정에서 제외하였습니다.\n' +
  '체육수업, 컴퓨터수업, 정보수업 등 이동 및 호출이 어려운 시간은 자동 제외하였습니다.\n' +
  '검진일 수행평가는 사전 조정 요청이 된 상태이나, 시간표상 평가 관련 문구가 있을 경우 수동 확인 대상으로 표시합니다.\n' +
  '검진 시간은 현장 진행 상황에 따라 다소 변동될 수 있습니다.';

export function getGuideText(examType: ExamSettings['examType']) {
  return examType === 'tb' ? TB_GUIDE_TEXT : URINE_GUIDE_TEXT;
}

const settings: ExamSettings = {
  examType: 'urine',
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
      examDate: '2026-06-25',
      blockedKeywords: structuredClone(TB_BLOCKED_KEYWORDS),
      cautionKeywords: structuredClone(TB_CAUTION_KEYWORDS),
      examVenue: '검진 장소',
      durationMinutes: 8,
      travelMinutes: 5,
      teamCount: 1,
      maxUnitsPerCall: 1,
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

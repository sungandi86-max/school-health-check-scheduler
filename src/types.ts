export type JudgementStatus = '가능' | '주의' | '불가' | '수동확인';
export type LocationCategory = '일반교실' | '특별실' | '선택과목 장소' | '체육시설' | '수동확인';
export type DivisionHandling = '자동제외' | '장소반영';
export type ExamType = 'urine' | 'tb';
export type DayScheduleKind = 'excluded' | 'period';
export type UrineParallelMode = 'sequential' | 'grade' | 'team';
export type UrineMixedGradeHandling = 'allow-caution' | 'manual-confirm' | 'exclude';
export type VenueRestrictionMode = '가능' | '주의' | '불가';
export type VenueRestrictionWeekday = 'auto' | '월' | '화' | '수' | '목' | '금';
export type UrineExamAvailability = VenueRestrictionMode;

export interface GradeTimeBlock {
  grade: string;
  label: string;
  startTime: string;
  endTime: string;
}

export interface DayScheduleItem {
  id: string;
  label: string;
  kind: DayScheduleKind;
  period?: number;
  startTime: string;
  endTime: string;
  assignable: boolean;
}

export interface ExamSettings {
  examType: ExamType;
  examDate: string;
  targetGrades: string[];
  startTime: string;
  endTime: string;
  availablePeriods: number[];
  durationMinutes: number;
  teamCount: number;
  urineSimultaneous: boolean;
  urineParallelMode: UrineParallelMode;
  urineMixedGradeHandling: UrineMixedGradeHandling;
  teamsByGrade: Record<string, number>;
  gradeStartTimes: Record<string, string>;
  travelMinutes: number;
  examVenue: string;
  maxUnitsPerCall: number;
  allowWaiting: boolean;
  useGradeTimeBlocks: boolean;
  gradeTimeBlocks: GradeTimeBlock[];
  includeBreaks: boolean;
  allowCrossPeriod: boolean;
  excludedTimes: string;
  blockedKeywords: string[];
  cautionKeywords: string[];
  daySchedule: DayScheduleItem[];
}

export interface VisitLocation {
  id: string;
  displayName: string;
  grade: string;
  category: LocationCategory;
  isVisitable: boolean;
  includeInAuto: boolean;
  notes: string;
}

export interface TimetableRow {
  locationId: string;
  displayName: string;
  periods: string[];
  teachers?: string[];
  rawTexts?: string[];
  notes: string;
}

export interface SubjectDivision {
  name: string;
  grade: string;
  actualLocationId: string;
  handling: DivisionHandling;
  notes: string;
}

export interface PeriodJudgement {
  locationId: string;
  period: number;
  subject: string;
  status: JudgementStatus;
  reason: string;
  teacher?: string;
  restrictedVenueName?: string;
  restrictedVenueReason?: string;
  actualRoom?: string;
  roomMappingReason?: string;
  comciganRoom?: string;
}

export interface ScheduleAssignment {
  id: string;
  order: number | null;
  scheduledTime: string;
  callTime?: string;
  examTime?: string;
  examVenue?: string;
  lineName?: string;
  timeBlockLabel?: string;
  locationId: string;
  locationName: string;
  unitName: string;
  homeRoomName: string;
  actualRoomName?: string;
  displayVisitLocation: string;
  grade: string;
  period: number | null;
  subject: string;
  teacher?: string;
  judgement: JudgementStatus;
  isManual: boolean;
  locked: boolean;
  excluded: boolean;
  note: string;
  failedReason?: string;
  restrictedVenueName?: string;
  restrictedVenueReason?: string;
  actualRoom?: string;
  roomMappingReason?: string;
  comciganRoom?: string;
}

export interface RestrictedVenue {
  id: string;
  name: string;
  floor: string;
  hasStudentRestroom: boolean;
  mode: VenueRestrictionMode;
  note: string;
}

export interface RestrictedVenueEntry {
  venueId: string;
  venueName: string;
  floor: string;
  weekday: Exclude<VenueRestrictionWeekday, 'auto'>;
  period: number;
  classCode: string;
  className: string;
  subject: string;
  teacher: string;
  rawText: string;
  mode: VenueRestrictionMode;
  reason: string;
}

export interface RoomMapping {
  id: string;
  grade: string;
  subjectName?: string;
  divisionName?: string;
  comciganRoom?: string;
  actualRoom: string;
  floor?: string;
  restroomAccessible: boolean;
  urineExamAvailability: UrineExamAvailability;
  reason?: string;
  sourceFile?: string;
  rawText?: string;
  teacher?: string;
  involvedGrades?: string[];
  involvedClasses?: string[];
  isMixedGrade?: boolean;
  isMixedClass?: boolean;
  mixedReason?: string;
}

export interface RoomMappingSettings {
  enabled: boolean;
}

export interface ManualOverride {
  locationId: string;
  scheduledTime?: string;
  period?: number | null;
  excluded?: boolean;
  locked?: boolean;
  note?: string;
}

export interface ExportTable {
  name: string;
  headers: string[];
  rows: string[][];
}

export interface SchoolDefaults {
  daySchedule: DayScheduleItem[];
}

export interface KeywordSets {
  urine: {
    blockedKeywords: string[];
    cautionKeywords: string[];
  };
  tb: {
    blockedKeywords: string[];
    cautionKeywords: string[];
  };
}

export interface TemplateData {
  settings: ExamSettings;
  locations: VisitLocation[];
  timetables: TimetableRow[];
  divisions: SubjectDivision[];
  judgements: PeriodJudgement[];
  assignments: ScheduleAssignment[];
  manualOverrides: ManualOverride[];
  restrictedVenues: RestrictedVenue[];
  restrictedVenueEntries: RestrictedVenueEntry[];
  restrictedVenueWeekday: VenueRestrictionWeekday;
  roomMappings: RoomMapping[];
  roomMappingSettings: RoomMappingSettings;
  uploadedMappingFileNames: string[];
}

export interface ExamTemplate {
  id: string;
  name: string;
  year: string;
  examType: ExamType;
  createdAt: string;
  updatedAt: string;
  data: TemplateData;
}

export interface AppData {
  appDataVersion?: string;
  currentView?: string;
  settings: ExamSettings;
  locations: VisitLocation[];
  timetables: TimetableRow[];
  divisions: SubjectDivision[];
  judgements: PeriodJudgement[];
  assignments: ScheduleAssignment[];
  manualOverrides: ManualOverride[];
  restrictedVenues: RestrictedVenue[];
  restrictedVenueEntries: RestrictedVenueEntry[];
  restrictedVenueWeekday: VenueRestrictionWeekday;
  roomMappings: RoomMapping[];
  roomMappingSettings: RoomMappingSettings;
  uploadedMappingFileNames: string[];
  templates: ExamTemplate[];
  activeTemplateId: string;
  schoolDefaults: SchoolDefaults;
  keywordSets: KeywordSets;
  hasSelectedExamType: boolean;
  needsReschedule: boolean;
}

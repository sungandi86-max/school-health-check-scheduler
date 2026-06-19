import { readFileSync } from 'node:fs';

const files = {
  scheduler: readFileSync('src/lib/scheduler.ts', 'utf8'),
  roomMappingParser: readFileSync('src/lib/roomMappingParser.ts', 'utf8'),
  restrictedVenueParser: readFileSync('src/lib/restrictedVenueParser.ts', 'utf8'),
  storage: readFileSync('src/lib/storage.ts', 'utf8'),
  csv: readFileSync('src/lib/csv.ts', 'utf8'),
  types: readFileSync('src/types.ts', 'utf8'),
};

const SECOND_FLOOR_NOTE = '2층 종합강의실 수업 / 화장실 이동 안내 필요';
const MIXED_GRADE_NOTE = '혼합학년 수업 / 명렬표 확인 필요';
const blockedKeywordIndex = files.scheduler.indexOf('hasKeyword(subject, settings.blockedKeywords)');
const secondFloorIndex = files.scheduler.indexOf('isSecondFloorLectureRoomSource(roomMapping, restriction)');
const mixedGradeIndex = files.scheduler.indexOf("settings.examType === 'urine' && isMixedGrade");
const roomMappingBlockedIndex = files.scheduler.indexOf("roomMapping?.urineExamAvailability === '불가'");

const checks = [
  {
    name: '소변검사 자동배정 후보에 주의 판정 포함',
    file: 'scheduler',
    pass: files.scheduler.includes("item.status === '가능' || item.status === '주의'"),
  },
  {
    name: '불가 키워드가 혼합학년보다 우선',
    file: 'scheduler',
    pass: blockedKeywordIndex >= 0 && mixedGradeIndex >= 0 && blockedKeywordIndex < mixedGradeIndex,
  },
  {
    name: '2층 종합강의실은 불가 판정 전에 주의로 강제 포함',
    file: 'scheduler',
    pass:
      secondFloorIndex >= 0 &&
      roomMappingBlockedIndex >= 0 &&
      secondFloorIndex < roomMappingBlockedIndex &&
      files.scheduler.includes(SECOND_FLOOR_NOTE),
  },
  {
    name: '혼합학년 소변검사는 기본 주의 처리',
    file: 'scheduler',
    pass:
      mixedGradeIndex >= 0 &&
      mixedGradeIndex < roomMappingBlockedIndex &&
      files.scheduler.includes("settings.urineMixedGradeHandling === 'exclude'") &&
      files.scheduler.includes("settings.urineMixedGradeHandling === 'manual-confirm'") &&
      files.scheduler.includes("status: '주의'") &&
      files.scheduler.includes(MIXED_GRADE_NOTE),
  },
  {
    name: '혼합학년 처리 설정 타입과 기본값 존재',
    file: 'types/storage',
    pass:
      files.types.includes("export type UrineMixedGradeHandling = 'allow-caution' | 'manual-confirm' | 'exclude'") &&
      files.storage.includes('urineMixedGradeHandling') &&
      files.storage.includes('allow-caution'),
  },
  {
    name: '2층 종합강의실과 혼합학년 출력 비고 정규화',
    file: 'csv',
    pass:
      files.csv.includes('SECOND_FLOOR_LECTURE_ROOM_NOTE') &&
      files.csv.includes('MIXED_GRADE_NOTE') &&
      files.csv.includes('isMixedGradeAssignment'),
  },
  {
    name: '분반자료 혼합학년은 주의 처리',
    file: 'roomMappingParser',
    pass:
      files.roomMappingParser.includes('const MIXED_GRADE_NOTE') &&
      files.roomMappingParser.includes("if (isMixedGrade) return '주의'") &&
      files.roomMappingParser.includes(MIXED_GRADE_NOTE),
  },
  {
    name: '분반자료 2층 종합강의실은 주의 처리',
    file: 'roomMappingParser',
    pass:
      files.roomMappingParser.includes("return { availability: '주의', reason: '2층 종합강의실 수업 / 화장실 이동 안내 필요' }") &&
      files.roomMappingParser.includes('if (isComprehensiveLectureRoom(room)) return false'),
  },
  {
    name: '장소 제한 2층 종합강의실은 주의 처리',
    file: 'restrictedVenueParser',
    pass:
      files.restrictedVenueParser.includes("if (isComprehensiveLectureRoom(name)) return '주의'") &&
      files.restrictedVenueParser.includes(SECOND_FLOOR_NOTE),
  },
  {
    name: '저장 데이터의 과거 2층 종합강의실 값 보정',
    file: 'storage',
    pass:
      files.storage.includes("name: '2층 종합강의실'") &&
      files.storage.includes("mode: '주의'") &&
      files.storage.includes(SECOND_FLOOR_NOTE),
  },
  {
    name: 'U-2 계열 장소 정규화 포함',
    file: 'scheduler/roomMappingParser',
    pass:
      files.scheduler.includes('/^U-2-\\d+/.test(normalized)') &&
      files.roomMappingParser.includes('/^U-2-\\d+/.test(normalized)'),
  },
];

const failed = checks.filter((check) => !check.pass);

for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name} (${check.file})`);
}

if (failed.length) {
  console.error(`\n${failed.length} urine room rule regression check(s) failed.`);
  process.exit(1);
}

console.log('\nAll urine room rule regression checks passed.');

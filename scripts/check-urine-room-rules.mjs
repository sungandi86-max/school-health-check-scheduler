import { readFileSync } from 'node:fs';

const files = {
  scheduler: readFileSync('src/lib/scheduler.ts', 'utf8'),
  roomMappingParser: readFileSync('src/lib/roomMappingParser.ts', 'utf8'),
  restrictedVenueParser: readFileSync('src/lib/restrictedVenueParser.ts', 'utf8'),
  storage: readFileSync('src/lib/storage.ts', 'utf8'),
  csv: readFileSync('src/lib/csv.ts', 'utf8'),
};

const REQUIRED_NOTE = '2층 종합강의실 수업 / 화장실 이동 안내 필요';

const checks = [
  {
    name: '소변검사 자동배정 후보에 주의 판정 포함',
    file: 'scheduler',
    pass: files.scheduler.includes("item.status === '가능' || item.status === '주의'"),
  },
  {
    name: '2층 종합강의실 배정 기본 비고 정규화',
    file: 'scheduler',
    pass: files.scheduler.includes('SECOND_FLOOR_LECTURE_ROOM_NOTE') && files.scheduler.includes('createAssignmentNote'),
  },
  {
    name: '2층 종합강의실 출력 비고 정규화',
    file: 'csv',
    pass: files.csv.includes('SECOND_FLOOR_LECTURE_ROOM_NOTE') && files.csv.includes('displayNote(item)'),
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
      files.restrictedVenueParser.includes(REQUIRED_NOTE),
  },
  {
    name: '저장 데이터의 과거 2층 종합강의실 값 보정',
    file: 'storage',
    pass:
      files.storage.includes("name: '2층 종합강의실'") &&
      files.storage.includes("mode: '주의'") &&
      files.storage.includes(REQUIRED_NOTE),
  },
  {
    name: 'U-2 계열 장소 정규화 포함',
    file: 'roomMappingParser',
    pass: files.roomMappingParser.includes('/^U-2-\\d+/.test(normalized)'),
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

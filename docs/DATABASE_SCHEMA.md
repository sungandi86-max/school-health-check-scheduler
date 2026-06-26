# School Health Hub Database Schema

이 문서는 School Health Hub의 localStorage 기반 데이터를 Supabase PostgreSQL로 이전하기 위한 초기 데이터베이스 설계입니다. 이번 Sprint에서는 앱 코드에서 실제 DB 읽기/쓰기를 하지 않으며, 기존 localStorage 동작을 유지합니다.

## 전체 데이터 구조

현재 앱의 핵심 데이터는 `HealthCheckSession`을 중심으로 연결됩니다.

- 하나의 `health_check_sessions` 행은 특정 날짜에 실시하는 하나의 검진을 나타냅니다.
- 학생 명렬표, 운영 상태, 운영 로그, 보고서 메모는 모두 `session_id`로 세션에 연결됩니다.
- 앱은 현재 `session_20260626_tuberculosis_...` 같은 문자열 ID를 사용하므로, 초기 스키마는 UUID가 아닌 `text` ID를 사용합니다.
- 향후 Supabase Auth와 RLS를 붙일 때 학교/기관 단위 컬럼을 추가할 수 있습니다.

## 테이블별 역할

### health_check_sessions

검진 세션 기본 정보입니다.

주요 필드:
- `id`: 앱에서 생성한 세션 ID
- `title`: 검진 제목
- `check_type`: `urine`, `tuberculosis`, `general`, `other`
- `date`: 검진일
- `target_grades`: 대상 학년 배열
- `location`: 검진 장소
- `status`: `draft`, `scheduled`, `inProgress`, `completed`, `archived`

### health_check_students

세션별 명렬표 학생과 검진 상태입니다.

주요 필드:
- `session_id`: `health_check_sessions.id` 참조
- `check_type`: 검사 종류
- `grade`, `class_name`, `number`, `name`: 명렬표 정보
- `status`: `pending`, `completed`, `absent`, `earlyLeave`, `late`, `deferred`
- `memo`: 학생별 운영 메모

### health_check_operation_states

세션별 현재 운영 상태입니다. 세션당 1행을 기준으로 합니다.

주요 필드:
- `session_id`: 기본키이자 세션 참조
- `current_class_id`: 현재 검사 학급
- `next_class_id`: 다음 검사 학급
- `completed_class_ids`: 완료 학급 배열
- `missing_class_ids`: 미도착 학급 배열
- `delayed_minutes`: 지연 시간
- `notice_message`: 교사용 안내문
- `operation_memo`: 운영 메모

### health_check_operation_logs

운영 중 발생한 자동/수동 로그입니다.

주요 필드:
- `type`: `classStarted`, `classCompleted`, `classMissing`, `studentStatusChanged`, `manualNote` 등
- `message`: 표시용 로그 문구
- `related_class_id`: 관련 학급
- `related_student_id`: 관련 학생

### health_check_report_notes

검진 종료 후 보고서에 들어갈 특이사항/개선사항입니다.

주요 필드:
- `session_id`: 기본키이자 세션 참조
- `notes`: 보고서 메모

## localStorage key와 Supabase table 매핑

| localStorage key | Supabase table | 설명 |
| --- | --- | --- |
| `schoolHealthHub.sessions` | `health_check_sessions` | 검진 세션 목록 |
| `schoolHealthHub.activeSessionId` | 별도 사용자 설정 테이블 필요 | 현재 선택 세션. Supabase Auth 도입 후 사용자별 preference로 분리 권장 |
| `schoolHealthHub.students.{sessionId}` | `health_check_students` | 세션별 학생 명렬표 |
| `schoolHealthHub.operation.{sessionId}` | `health_check_operation_states` | 세션별 운영 상태 |
| `schoolHealthHub.logs.{sessionId}` | `health_check_operation_logs` | 세션별 운영 로그 |
| `schoolHealthHub.reportNotes.{sessionId}` | `health_check_report_notes` | 세션별 보고서 개선사항 |
| `health-check-scheduler:{checkType}:v1` | 추후 검토 | 기존 스케줄러 설정/배정 데이터. 초기 실시간 동기화 범위에서는 제외 가능 |

## Realtime 적용 대상

실시간 현황판에 필요한 구독 대상입니다.

| table | Realtime 필요 | 이유 |
| --- | --- | --- |
| `health_check_sessions` | 선택 | 세션 상태/장소 변경을 교사용 화면에 반영 |
| `health_check_students` | 필요 | 학생 상태 변경, 미검 현황 자동 갱신 |
| `health_check_operation_states` | 필요 | 현재/다음/미도착/지연 상태 실시간 반영 |
| `health_check_operation_logs` | 필요 | 관리자 현황판 최근 로그 반영 |
| `health_check_report_notes` | 선택 | 보고서 공동 작성이 필요할 때만 구독 |

Supabase Realtime을 사용할 때는 위 테이블을 publication에 포함해야 합니다. 운영 현황 화면은 `session_id` 기준으로 필터링 구독하는 방식을 권장합니다.

## 개인정보 보호 주의사항

이 데이터에는 학생 이름, 학년, 반, 번호, 검진 상태, 운영 메모가 포함될 수 있습니다.

- 외부 공개 URL에서 직접 접근할 수 없도록 RLS를 반드시 적용해야 합니다.
- anon key는 공개되어도 되는 키이지만, RLS 없이 테이블을 공개하면 개인정보가 노출될 수 있습니다.
- 로그와 메모에는 진단명, 민감한 건강 정보, 상세 사유를 적지 않도록 운영 지침이 필요합니다.
- 보고서 출력/복사 기능에는 학생명 마스킹 옵션을 추가하는 것을 권장합니다.
- 테스트 데이터에는 실제 학생 이름과 건강 정보를 사용하지 않습니다.

## 향후 RLS 적용 계획

이번 Sprint에서는 RLS 정책을 완성하지 않습니다. 다음 단계에서 다음 정책을 설계합니다.

- 학교/기관 단위 `school_id` 또는 `tenant_id` 추가
- Supabase Auth 사용자와 학교/역할 매핑 테이블 추가
- 보건교사: 세션, 학생, 운영 상태, 로그, 보고서 읽기/쓰기
- 교사: 선택 세션의 현황 읽기 전용
- 관리자: 현황/보고서 읽기, 필요 시 보고서 메모 작성
- 외부 익명 접근 차단

## 마이그레이션 메모

초기 마이그레이션은 다음 순서가 안전합니다.

1. `schoolHealthHub.sessions`를 `health_check_sessions`에 upsert
2. 각 세션별 `schoolHealthHub.students.{sessionId}`를 `health_check_students`에 upsert
3. 각 세션별 `schoolHealthHub.operation.{sessionId}`를 `health_check_operation_states`에 upsert
4. 각 세션별 `schoolHealthHub.logs.{sessionId}`를 `health_check_operation_logs`에 insert
5. 각 세션별 `schoolHealthHub.reportNotes.{sessionId}`를 `health_check_report_notes`에 upsert

기존 앱의 문자열 ID를 유지하면 마이그레이션 중 프런트엔드 참조가 단순해집니다.

# Architecture Review

문서 시작점: [PROJECT.md](PROJECT.md)

## Good

### 1. 현재 디렉터리 구조

현재 `src`는 `components`, `hooks`, `lib`, `types`, `test`로 나뉘어 있어 MVP 규모에서는 이해하기 쉽습니다.

`components`는 `operation`, `health-check`, `teacher-dashboard`, `admin-dashboard`, `display`, `report`, `settings`, `share`처럼 실제 제품 화면 단위로 분리되어 있습니다.

### 2. 컴포넌트 구조

실시간 운영, 교사용 현황판, 관리자 현황판, Display, 보고서가 각각 별도 폴더로 나뉘어 있어 사용자의 역할별 화면 구분이 명확합니다.

특히 `OperationCenter` 주변 컴포넌트는 학급 진행, 상태 카드, 안내문, 로그, 메모, 명렬표 체크가 작은 컴포넌트로 분리되어 있어 현장 운영 기능을 확장하기 좋습니다.

### 3. 라우팅 구조

외부 공유가 필요한 화면은 `/teacher-dashboard`, `/admin-dashboard`, `/display`, `/report` 경로로 접근할 수 있고, 내부 작업 화면은 `activeTab` 기반으로 유지됩니다.

MVP에서는 별도 라우터 없이도 사이드바, 모바일 하단 탭, Display Mode 진입을 단순하게 유지할 수 있습니다.

### 4. Session 구조

`HealthCheckSession`을 중심으로 세션, 학생 명렬표, 운영 상태, 운영 로그, 보고서 메모가 연결되는 방향은 제품 구조와 잘 맞습니다.

세션 상태가 `draft`, `scheduled`, `inProgress`, `completed`, `archived`로 정의되어 있어 향후 운영 대시보드와 보고서 흐름을 확장하기 좋습니다.

### 5. Storage 구조

`healthCheckDataService`가 localStorage와 Supabase provider를 같은 인터페이스로 감싸고 있어 저장 방식 전환의 출발점이 이미 잡혀 있습니다.

Supabase 연결 실패 시 localStorage fallback으로 동작하는 구조는 MVP 안정성에 도움이 됩니다.

### 6. Supabase 구조

세션, 학생, 운영 상태, 운영 로그 Repository가 분리되어 있어 Supabase 전환 범위가 비교적 명확합니다.

환경변수가 없으면 Supabase client가 `null`이 되고 앱이 localStorage 기반으로 유지되는 점은 배포와 테스트에 안전합니다.

### 7. Workspace 구조

현재 제품 흐름은 `운영 대시보드 -> 운영 준비 -> 운영 계획 -> 현장 모드 -> 현황 공유 -> 운영 결과` 흐름과 잘 맞습니다.

사이드바도 운영 준비, 운영 계획, 실시간 운영, 운영 결과로 나뉘어 있어 Workspace Guide의 기본 구조를 사용자 화면에 반영하고 있습니다.

### 8. 확장성

검사 유형이 `urine`, `tuberculosis`, `general`, `other`로 정의되어 있어 결핵검진과 소변검사 이후 일반 건강검진, 기타 별도검사로 확장할 여지가 있습니다.

Display, 관리자, 교사용 화면이 이미 학급 단위 정보 중심으로 구성되어 있어 개인정보 보호 원칙을 유지하며 공유 화면을 확장할 수 있습니다.

### 9. 현재 MVP에서 그대로 유지해도 되는 부분

MVP에서는 `App.tsx` 중심의 탭 전환, localStorage 기본 저장, Supabase 선택 저장 방식을 그대로 유지해도 됩니다.

현장 운영, 현황 공유, 보고서까지 이어지는 핵심 제품 흐름이 이미 작동하는 구조이므로 당장 큰 구조 변경보다 실제 검진 시나리오 QA가 더 중요합니다.

## Needs Improvement

### 1. 현재 디렉터리 구조

루트 문서와 `docs` 문서가 함께 존재합니다. 현재는 `PROJECT.md`가 허브 역할을 하므로 괜찮지만, 앞으로 문서가 늘어나면 설계 문서, 운영 문서, 릴리즈 문서를 더 명확히 분류할 필요가 있습니다.

### 2. 컴포넌트 구조

`App.tsx`가 라우팅, 세션 관리, 설정, 대시보드, 스케줄러 패널, 모바일 패널, 여러 하위 화면 렌더링을 많이 담당하고 있습니다.

제품이 Workspace 단위로 확장되면 `App.tsx`는 shell과 route orchestration만 담당하고, 별도검사 Workspace는 별도 모듈로 분리하는 것이 좋습니다.

### 3. 라우팅 구조

현재 라우팅은 일부 URL path와 `activeTab` 상태가 섞여 있습니다.

공유 화면은 URL 기반이고 내부 화면은 탭 기반이라 MVP에서는 충분하지만, Workspace가 늘어나면 route 정의를 한곳에서 관리해야 화면 이동과 권한 정책을 일관되게 적용할 수 있습니다.

### 4. Session 구조

세션은 별도검사 Workspace의 중심 개념으로 잘 잡혀 있지만, 기존 스케줄러 데이터와 신규 세션 기반 운영 데이터가 완전히 하나의 모델로 합쳐진 것은 아닙니다.

`AppData.healthCheckSessions`, localStorage key, `HealthCheckSession`, active session state가 공존하므로 장기적으로 세션 단일 원천을 더 명확히 해야 합니다.

### 5. Storage 구조

현재 `storageAdapter`의 Supabase adapter는 비활성화되어 있고, 실제 Supabase 연동은 `healthCheckDataService`와 Repository 계층을 통해 일부 도메인에 적용됩니다.

이 이중 구조는 과도한 변경 없이 MVP를 안정화하는 데 유리하지만, 개발자가 어떤 저장 경로를 써야 하는지 헷갈릴 수 있습니다.

### 6. Supabase 구조

Supabase Repository는 준비되어 있지만, RLS와 Auth, 학교 단위 tenant 구조는 아직 문서상 계획 단계입니다.

운영용으로 확장하기 전에는 `school_id`, 사용자 역할, RLS 정책, 공유 링크 권한을 제품 요구사항과 함께 확정해야 합니다.

### 7. Workspace 구조

현재는 별도검사 Workspace 하나가 앱 전체와 거의 동일합니다.

향후 교직원 건강검진, 보건교육, 감염병 관리가 들어오면 Workspace별 entry, navigation, data boundary를 분리하지 않으면 `App.tsx`와 공통 상태가 빠르게 복잡해질 수 있습니다.

### 8. 유지보수성

레거시 `OperationPanel`과 신규 `OperationCenter`가 함께 존재합니다.

두 화면 모두 현장 운영과 학생 상태 체크를 다루기 때문에, 어느 화면이 장기 기준인지 문서와 메뉴에서 더 명확히 해야 합니다.

### 9. 중복 코드

관리자 현황판, Display, 교사용 현황판이 각각 active session과 operation state를 불러오는 유사 로직을 가지고 있습니다.

현재는 화면별 독립성이 장점이지만, 같은 snapshot 생성 로직은 공통 hook 또는 query helper로 묶을 수 있습니다.

### 10. 리팩터링이 필요한 부분

가장 먼저 리팩터링할 후보는 `App.tsx`의 화면 분기와 세션 orchestration입니다.

두 번째 후보는 운영 현황 snapshot 생성 로직입니다. 같은 세션, 학생, 운영 상태, 로그를 화면마다 다시 조합하는 부분을 공통화하면 QA 범위가 줄어듭니다.

## Future

### 1. Workspace Shell 분리

School Health Hub가 여러 Workspace를 지원하려면 `WorkspaceShell`, `WorkspaceNavigation`, `WorkspaceDashboard` 같은 공통 구조를 도입하는 것이 좋습니다.

별도검사 Workspace는 현재 구조를 기반으로 첫 번째 구현체가 되고, 이후 교직원 건강검진, 보건교육, 감염병 대응 Workspace가 같은 shell을 공유할 수 있습니다.

### 2. Route Registry 도입

현재의 `activeTab`, `getRouteTab`, `getTabPath`, 모바일 탭 매핑을 하나의 route registry로 정리하면 확장성이 좋아집니다.

각 route는 `workspace`, `stage`, `label`, `path`, `visibility`, `publicAccess`, `requiresSession` 같은 메타데이터를 가질 수 있습니다.

### 3. Session Boundary 강화

세션 단위 데이터 경계를 더 강하게 만들 필요가 있습니다.

스케줄러 설정, 배정 결과, 명렬표, 운영 상태, 로그, 보고서 메모가 모두 `sessionId` 아래에 모이면 새로고침, 세션 전환, Supabase 동기화, 보고서 재생성이 더 안정적입니다.

### 4. Operation Snapshot 공통화

교사용 현황판, 관리자 현황판, Display, 운영 보고서는 모두 같은 운영 데이터를 다른 관점으로 보여줍니다.

`createOperationSnapshot(sessionId)` 또는 `useOperationSnapshot(sessionId)` 계층을 만들면 개인정보 노출 정책도 한곳에서 관리할 수 있습니다.

### 5. Security Boundary 도입

공용 화면과 운영 화면의 데이터 범위를 코드 레벨에서 분리하면 안전합니다.

예를 들어 public dashboard용 snapshot에는 학생 이름과 학번 필드를 애초에 포함하지 않는 구조가 좋습니다.

### 6. Supabase 운영 전환

Supabase를 실사용하려면 다음 순서가 적절합니다.

- schema와 현재 타입 매핑 확정
- `school_id` 또는 tenant 구조 도입
- RLS 정책 작성
- anon key 기반 client 접근 검증
- Realtime 구독 범위 점검
- SECURITY_AUDIT.md 기준 릴리즈 전 점검

### 7. 테스트 전략 보강

현재 테스트는 핵심 유틸과 일부 컴포넌트에 존재합니다.

향후에는 세션 생성, 시간표 생성, 운영센터 상태 변경, 현황판 표시, 보고서 출력 흐름을 MVP smoke scenario로 묶는 것이 좋습니다.

### 8. 문서 유지 전략

`PROJECT.md`가 Documentation Hub가 되었으므로, 새 기능을 만들기 전 관련 문서가 먼저 갱신되는 흐름을 유지하는 것이 좋습니다.

제품 방향은 `PROJECT.md`, 장기 방향은 `docs/VISION.md`, 데이터와 보안은 `docs/DATABASE_SCHEMA.md`, `SECURITY.md`, `SECURITY_AUDIT.md`를 기준으로 삼으면 됩니다.

### 9. 유지해도 되는 MVP 선택

지금 단계에서는 새 라우터 도입, 전체 상태관리 라이브러리 도입, 대규모 폴더 이동은 미루는 것이 좋습니다.

MVP의 핵심 리스크는 구조 미학보다 실제 검진 당일 흐름, 개인정보 노출, Supabase 동기화 안정성입니다.

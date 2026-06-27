# School Health Hub Sprint Guide

School Health Hub는 작은 Sprint 단위로 개발하고 검증합니다. 각 Sprint는 현장 요구사항을 빠르게 반영하되, 기존 기능을 깨뜨리지 않는 것을 기본 원칙으로 합니다.

## 역할 분담

### 사용자

- 현장 요구사항 제공
- 실제 학교 운영 기준 설명
- 우선순위 결정
- 완료 결과 확인

### ChatGPT

- 제품 방향 설계
- 요구사항 정리
- Sprint 범위 조정
- 리뷰 관점 제안
- 문서 구조 제안

### Codex

- 저장소에서 실제 구현 수행
- 기존 코드 구조 파악
- 파일 수정
- 빌드 실행
- 변경 요약 보고
- 요청 시 커밋 및 푸시 수행

## Sprint 작성 형식

각 Sprint는 다음 정보를 포함합니다.

- Sprint 번호 또는 이름
- 목표
- 주의사항
- 작업 내용
- 완료 조건
- 완료 후 보고 항목
- 커밋 여부

## Sprint 진행 규칙

1. Sprint 시작 전 현재 Git 상태를 확인합니다.
2. 새 프로젝트를 만들지 않고 기존 저장소에서 작업합니다.
3. 기존 기능 삭제나 큰 구조 변경은 명시 요청이 있을 때만 진행합니다.
4. 구현보다 안정화가 목표인 Sprint에서는 문서, 문구, 빈 상태, 오류 처리, 빌드 검증을 우선합니다.
5. 각 Sprint 완료 전 `npm run build`를 실행합니다.
6. TypeScript 오류가 있으면 수정 후 다시 빌드합니다.
7. 완료 보고에는 변경 파일, 주요 변경 내용, 남은 TODO, 추천 커밋 메시지를 포함합니다.
8. 사용자가 요청한 경우 Sprint 완료 후 반드시 커밋하고 푸시합니다.
9. 주요 릴리스마다 GitHub Release를 작성합니다.

## 커밋 메시지 규칙

커밋 메시지는 짧고 명확한 영어 동사형 문장으로 작성합니다.

예시:

- `Add school default settings panel`
- `Add printable operation report`
- `Prepare v3 release documentation and empty states`
- `Document long-term product roadmap`

## 릴리스 운영 규칙

주요 릴리스 전에는 다음을 확인합니다.

- README 최신화
- 릴리스 노트 작성
- `docs/CHANGELOG.md` 업데이트
- `npm run build` 통과
- 개인정보 노출 여부 점검
- localStorage 모드 동작 확인
- Supabase 미설정 fallback 확인
- GitHub Release 초안 작성

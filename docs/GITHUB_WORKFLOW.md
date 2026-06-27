# GitHub Workflow

이 문서는 School Health Hub를 GitHub Issue, Project, Milestone, Pull Request, Release 중심으로 관리하는 기본 흐름을 정리합니다.

## 1. Issue 작성

새 기능, 버그, 문서 작업, 운영 개선 아이디어는 먼저 Issue로 기록합니다.

사용 템플릿:

- Feature request: 새 기능 또는 개선 제안
- Bug report: 오류 또는 이상 동작 보고
- Sprint task: Sprint 단위 구현 작업

Issue에는 다음을 가능한 한 명확히 적습니다.

- 현장 배경
- 사용자
- 요구사항
- 완료 조건
- 관련 화면
- 우선순위

## 2. Sprint Task 생성

실제로 개발할 작업은 Sprint Task로 정리합니다.

Sprint Task에는 다음 항목을 포함합니다.

- Sprint 번호
- 목표
- 작업 내용
- 완료 조건
- 테스트 방법
- 추천 커밋 메시지

작업 범위가 크면 하나의 Sprint에 모두 넣지 않고 작은 Sprint로 나눕니다.

## 3. GitHub Project 운영

Project Board는 다음 컬럼을 사용합니다.

- Backlog: 아이디어와 장기 과제
- Todo: 진행하기로 결정한 작업
- In Progress: 현재 작업 중인 항목
- Review: 구현 후 검토가 필요한 항목
- Done: 완료 및 커밋/푸시된 항목

자세한 운영 방식은 [Project Board Guide](PROJECT_BOARD.md)를 참고합니다.

## 4. Codex 작업

Codex는 저장소에서 실제 구현과 문서 수정을 담당합니다.

기본 원칙:

- 새 프로젝트를 만들지 않습니다.
- 기존 기능을 삭제하지 않습니다.
- 작업 전 Git 상태를 확인합니다.
- 요구사항에 맞는 파일만 수정합니다.
- 완료 전 `npm run build`를 실행합니다.
- 사용자가 요청한 경우에만 커밋/푸시합니다.

## 5. ChatGPT 리뷰

ChatGPT는 구현 전후로 설계와 리뷰를 돕습니다.

주요 역할:

- 요구사항 정리
- Sprint 범위 조정
- 사용자 흐름 점검
- 개인정보 노출 위험 검토
- 문서 구조와 릴리스 노트 검토

## 6. Commit

Sprint 완료 후 사용자가 요청하면 커밋합니다.

커밋 메시지는 짧고 명확한 영어 동사형 문장으로 작성합니다.

예시:

- `Add printable operation report`
- `Prepare v3 release documentation and empty states`
- `Add long-term product planning docs`
- `Add GitHub issue and PR templates`

## 7. Pull Request

협업 브랜치를 사용할 경우 Pull Request를 생성합니다.

PR에는 다음을 포함합니다.

- 작업 요약
- 변경 파일
- 테스트 결과
- 스크린샷
- 체크리스트

작업이 작고 개인 저장소 `master`에 직접 반영하는 경우에도 PR 템플릿은 릴리스 전 검토 체크리스트로 사용할 수 있습니다.

## 8. Release 작성

주요 릴리스마다 GitHub Release를 작성합니다.

Release 작성 전 확인 항목:

- `npm run build` 통과
- README 최신화
- CHANGELOG 업데이트
- 릴리스 노트 작성
- 개인정보 노출 여부 확인
- Supabase 미설정 fallback 확인
- 주요 화면 동작 확인

v3.0.0 릴리스 초안은 [RELEASE_NOTES_v3.0.0.md](RELEASE_NOTES_v3.0.0.md)를 기준으로 작성합니다.

# Versioning Guide

School Health Hub의 버전 번호와 릴리스 기준을 정의합니다.

## 1. Semantic Versioning 기준

School Health Hub는 Semantic Versioning 형식을 사용합니다.

```text
MAJOR.MINOR.PATCH
```

- MAJOR: 화면 구조, 데이터 구조, 운영 방식이 크게 바뀌는 정식 릴리스
- MINOR: 기존 기능을 유지하면서 새로운 기능을 추가하는 릴리스
- PATCH: 버그 수정, 문서 보강, 작은 UI 개선 릴리스

예시:

- `v3.0.0`: School Health Hub 첫 정식 버전
- `v3.1.0`: 기존 기능 유지 + 새 운영 기능 추가
- `v3.1.1`: 오류 수정 또는 문서 보강

## 2. alpha / beta / stable 기준

### alpha

초기 기능 검증 단계입니다.

- 내부 테스트 중심
- 데이터 구조가 바뀔 수 있음
- UI와 사용 흐름이 자주 변경될 수 있음

예시:

```text
v3.0.0-alpha.1
```

### beta

현장 테스트가 가능한 단계입니다.

- 핵심 기능은 동작함
- 일부 예외 상황이나 문서가 부족할 수 있음
- 실제 운영 전 제한된 사용자 테스트에 적합함

예시:

```text
v3.0.0-beta.1
```

### stable

정식 사용을 권장하는 안정 버전입니다.

- `npm run build` 통과
- 주요 화면 수동 테스트 완료
- README, CHANGELOG, RELEASE_NOTES 정리 완료
- 배포 후 확인 완료

예시:

```text
v3.0.0
```

## 3. 버전 이력 기준

### v1.0.0 기존 스케줄러

- 소변검사와 결핵검진 시간표 자동배정 중심
- localStorage 기반 단일 브라우저 사용
- 공지용 표, 교사용 안내표, 검사팀용 표 출력

### v2.x 개발 버전

- 운영센터와 현황판 개념 확장
- 세션, 명렬표, 운영 로그, 보고서 기능의 기반 정리
- Supabase 연동을 위한 구조 준비

### v3.0.0 School Health Hub 첫 정식 버전

- 세션 관리
- 명렬표 관리
- 검진 운영센터
- 교사용 현황판
- 교무실/관리자 현황판
- 운영 로그
- 운영 보고서
- 운영 분석
- 학교 설정
- Supabase Realtime 지원
- localStorage fallback 유지

## 4. 커밋 메시지 규칙

커밋 메시지는 변경 목적이 드러나도록 짧고 명확하게 작성합니다.

권장 형식:

```text
Add <feature or document>
Update <area>
Fix <issue>
Refine <workflow>
Document <topic>
```

예시:

```text
Add release checklist and deployment guide
Fix operation state fallback handling
Update teacher dashboard share message
Document GitHub workflow
```

Sprint 단위 작업은 다음처럼 작성할 수 있습니다.

```text
Complete Sprint 20 teacher dashboard sharing
Complete Sprint 23 printable operation report
```

## 5. 태그 작성 규칙

정식 릴리스는 Git 태그를 생성합니다.

```bash
git tag v3.0.0
git push origin v3.0.0
```

사전 릴리스는 접미사를 붙입니다.

```bash
git tag v3.0.0-beta.1
git push origin v3.0.0-beta.1
```

태그를 만들기 전에는 다음을 확인합니다.

- `npm run build` 통과
- 릴리스 체크리스트 완료
- CHANGELOG 업데이트
- 릴리스 노트 작성
- Vercel 배포 확인

## 6. GitHub Release 작성 규칙

GitHub Release 제목은 태그와 릴리스명을 함께 적습니다.

예시:

```text
v3.0.0 - School Health Hub stable release
```

본문에는 다음을 포함합니다.

- 릴리스 개요
- 주요 기능
- 변경 사항
- 배포 확인 결과
- 알려진 제한사항
- 다음 개선 예정

## 7. 문서 버전 관리

문서만 수정한 경우에도 PATCH 릴리스 후보가 될 수 있습니다.
다만 단순 오탈자 수정은 별도 릴리스 없이 다음 릴리스에 포함할 수 있습니다.

문서 변경 시 함께 확인할 파일:

- `README.md`
- `docs/CHANGELOG.md`
- `docs/RELEASE_PLAN.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/DEPLOYMENT_GUIDE.md`

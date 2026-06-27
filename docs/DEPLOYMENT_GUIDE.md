# Deployment Guide

School Health Hub를 로컬에서 실행하고 GitHub, Vercel, Supabase와 함께 배포하는 절차입니다.

## 1. 로컬 실행 방법

저장소를 받은 뒤 의존성을 설치합니다.

```bash
npm install
```

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 Vite가 안내하는 로컬 주소를 엽니다.
일반적으로 `http://localhost:5173` 또는 사용 가능한 다음 포트가 사용됩니다.

배포 전 빌드를 확인합니다.

```bash
npm run build
```

## 2. GitHub commit / push

변경 사항을 확인합니다.

```bash
git status
```

변경 파일을 스테이징합니다.

```bash
git add <files>
```

커밋합니다.

```bash
git commit -m "Describe the release change"
```

원격 저장소에 푸시합니다.

```bash
git push origin master
```

## 3. Vercel 자동 배포 흐름

School Health Hub는 GitHub 저장소와 Vercel 프로젝트가 연결되어 있으면 push 이후 자동으로 배포됩니다.

기본 흐름:

1. `master` 브랜치에 push합니다.
2. Vercel이 GitHub 변경 사항을 감지합니다.
3. Vercel이 `npm install`과 `npm run build`를 실행합니다.
4. 빌드가 성공하면 Production 배포가 갱신됩니다.
5. 배포 URL에서 새 버전을 확인합니다.

## 4. Vercel 환경변수 설정

Vercel 프로젝트의 Settings > Environment Variables에서 필요한 값을 설정합니다.

권장 환경:

- Production
- Preview
- Development

환경변수를 수정한 뒤에는 새 배포를 실행해야 반영됩니다.

## 5. Supabase 환경변수 설정

Supabase 모드를 사용하려면 다음 환경변수를 설정합니다.

```text
VITE_SUPABASE_URL=<Supabase project URL>
VITE_SUPABASE_ANON_KEY=<Supabase anon key>
```

환경변수가 없거나 연결에 실패하면 앱은 localStorage fallback 모드로 동작해야 합니다.
따라서 Supabase 설정이 없어도 첫 화면과 기존 localStorage 기능은 정상적으로 열려야 합니다.

## 6. 배포 후 확인할 화면

배포가 끝난 뒤 다음 화면을 확인합니다.

- 첫 화면: 검사 유형 선택 화면이 먼저 표시되는지 확인합니다.
- 스케줄러: 소변검사와 결핵검진 화면 진입을 확인합니다.
- 세션 관리: 세션 생성과 선택을 확인합니다.
- 명렬표 관리: 업로드 후 학생 목록 표시를 확인합니다.
- 검진 운영센터: 현재/다음/완료/미도착 상태 변경을 확인합니다.
- 교사용 현황판: 모바일에서 핵심 정보가 잘 보이는지 확인합니다.
- 관리자 현황판: 진행률과 최근 로그가 표시되는지 확인합니다.
- 운영 보고서: 인쇄 버튼과 PDF 저장 안내가 표시되는지 확인합니다.
- 학교 설정: 설정 저장과 초기화를 확인합니다.
- 저장소 설정: localStorage / Supabase 모드 안내를 확인합니다.

## 7. Realtime 확인

Supabase Realtime이 활성화되어 있으면 다음을 확인합니다.

- Operation Center에서 현재 검사 학급을 바꾸면 Teacher Dashboard에 반영됩니다.
- 학생 상태를 변경하면 Admin Dashboard와 Report의 요약이 갱신됩니다.
- 운영 로그를 추가하면 최근 로그 영역이 갱신됩니다.

Realtime이 비활성화되어도 앱은 멈추지 않아야 합니다.

## 8. 문제가 생겼을 때 되돌리는 방법

### Vercel에서 이전 배포로 되돌리기

1. Vercel 프로젝트의 Deployments 탭으로 이동합니다.
2. 정상 동작하던 이전 배포를 선택합니다.
3. Promote to Production 또는 Rollback 기능으로 Production을 되돌립니다.

### Git에서 이전 커밋으로 복구하기

긴급 복구가 필요한 경우 새 revert 커밋을 만듭니다.

```bash
git revert <commit-sha>
git push origin master
```

공유 저장소에서는 `git reset --hard` 후 강제 push를 사용하지 않습니다.

### Supabase 문제 대응

- 환경변수가 잘못된 경우 Vercel 환경변수를 수정하고 재배포합니다.
- Supabase 장애 또는 권한 오류가 있는 경우 localStorage fallback으로 앱이 열리는지 확인합니다.
- 스키마 변경 문제가 의심되면 `docs/DATABASE_SCHEMA.md`와 실제 테이블 구조를 비교합니다.

## 9. 배포 후 기록

배포가 완료되면 다음을 기록합니다.

- 배포 일시
- 배포 커밋
- 배포 URL
- 확인한 주요 화면
- 알려진 제한사항
- 후속 작업

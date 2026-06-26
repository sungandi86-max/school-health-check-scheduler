# Supabase 설정 안내

School Health Hub는 현재 브라우저 `localStorage` 기반으로 동작합니다. 이번 단계에서는 Supabase 클라이언트와 환경변수 구조만 준비하며, 실제 데이터 저장/동기화는 아직 localStorage fallback을 사용합니다.

## 1. Supabase 프로젝트 생성

1. Supabase 대시보드에서 새 프로젝트를 생성합니다.
2. 프로젝트가 준비되면 Project Settings > API 메뉴로 이동합니다.
3. Project URL과 anon public key를 확인합니다.

## 2. 로컬 환경변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 다음 값을 입력합니다.

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`.env.local`은 Git에 커밋하지 않습니다. 예시는 `.env.example`을 참고합니다.

## 3. Vercel 환경변수 등록

Vercel 프로젝트의 Settings > Environment Variables에 다음 값을 등록합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

등록 후 다시 배포해야 브라우저 앱에서 환경변수를 읽을 수 있습니다.

## 4. 현재 동작 방식

- Supabase 환경변수가 없으면 앱은 정상 실행되며 `localStorage`를 사용합니다.
- Supabase 환경변수가 있어도 이번 Sprint에서는 데이터 저장소가 자동으로 Supabase로 전환되지 않습니다.
- 세션, 학생 명렬표, 운영 상태, 로그, 보고서 메모는 기존 localStorage adapter를 통해 저장됩니다.
- 저장소 선택 구조는 `local` / `supabase` 모드를 지원하도록 준비되어 있지만, 기본값은 `local`입니다.
- `SupabaseStorageAdapter`는 아직 테이블별 실제 읽기/쓰기 매핑을 수행하지 않으며 TODO 기반의 교체 지점만 제공합니다.

## 5. 다음 단계

- Supabase 테이블 스키마 설계
- `SupabaseStorageAdapter` 구현
- localStorage 데이터 마이그레이션
- 교사용/관리자 현황판 실시간 구독 연결

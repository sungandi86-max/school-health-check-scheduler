# Release Checklist

School Health Hub를 안정적으로 배포하기 전에 확인하는 릴리스 체크리스트입니다.
릴리스 담당자는 아래 항목을 순서대로 확인한 뒤 GitHub Release를 작성합니다.

## 1. 릴리스 전 확인사항

- 릴리스 대상 브랜치가 최신 `master`인지 확인합니다.
- 작업 트리에 의도하지 않은 변경 사항이 없는지 확인합니다.
- 이번 릴리스에 포함할 변경 사항이 README, CHANGELOG, RELEASE_NOTES에 반영되었는지 확인합니다.
- Supabase 스키마 변경이 있는 경우 `docs/DATABASE_SCHEMA.md`와 운영 DB 적용 여부를 확인합니다.
- 배포 후 되돌릴 기준 커밋 또는 이전 태그를 확인합니다.

## 2. 의존성 확인

```bash
npm install
```

- `package-lock.json`이 변경되는 경우 변경 사유를 확인합니다.
- 새 패키지가 추가된 경우 라이선스와 번들 크기 영향을 확인합니다.

## 3. 빌드 확인

```bash
npm run build
```

확인 항목:

- TypeScript 오류가 없어야 합니다.
- Vite 빌드가 성공해야 합니다.
- 경고가 있는 경우 기존 경고인지, 새로 발생한 경고인지 확인합니다.

## 4. 주요 화면 수동 테스트

다음 화면이 열리고 기본 동작이 유지되는지 확인합니다.

- 스케줄러
- 세션 관리
- 명렬표 관리
- 검진 운영센터
- 교사용 현황판
- 교무실/관리자 현황판
- 운영 로그
- 운영 보고서
- 운영 분석
- 학교 설정
- 저장소 설정

## 5. localStorage 모드 테스트

- Supabase 환경변수가 없는 상태에서도 앱이 실행되는지 확인합니다.
- 세션 생성, 명렬표 업로드, 운영상태 변경, 로그 기록이 localStorage에 저장되는지 확인합니다.
- 브라우저 새로고침 후 데이터가 유지되는지 확인합니다.
- 저장 데이터 초기화 기능이 정상 동작하는지 확인합니다.

## 6. Supabase 모드 테스트

- Vercel 또는 로컬 `.env`에 Supabase 환경변수가 설정되어 있는지 확인합니다.
- 세션, 학생 명렬표, 운영상태, 운영 로그가 Supabase에 저장되는지 확인합니다.
- Supabase 연결 실패 시 앱이 중단되지 않고 localStorage fallback 안내가 표시되는지 확인합니다.
- Realtime이 활성화된 경우 Operation Center 변경이 Teacher Dashboard와 Admin Dashboard에 반영되는지 확인합니다.

## 7. 공유 화면 테스트

- 교사용 현황판 링크가 열리는지 확인합니다.
- 교무실/관리자 현황판 링크가 열리는지 확인합니다.
- 리로스쿨 발송문 복사 버튼이 정상 동작하는지 확인합니다.
- 교사용 화면에서 학생 이름 전체 목록이 기본 노출되지 않는지 확인합니다.

## 8. Vercel 배포 확인

- GitHub push 후 Vercel 배포가 자동으로 시작되는지 확인합니다.
- Vercel 빌드 로그에 오류가 없는지 확인합니다.
- 배포 완료 후 Production URL에서 첫 화면이 정상 표시되는지 확인합니다.
- 시크릿 창 또는 새 브라우저에서 검사 유형 선택 화면이 먼저 표시되는지 확인합니다.

## 9. 문서 확인

릴리스 전에 다음 문서를 확인합니다.

- `README.md`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES_v3.0.0.md` 또는 해당 버전 릴리스 노트
- `docs/DEPLOYMENT_GUIDE.md`
- `docs/VERSIONING.md`

## 10. GitHub Release 작성 확인

GitHub Release에는 다음을 포함합니다.

- 릴리스 태그
- 릴리스 제목
- 주요 변경 사항
- 사용자에게 영향이 있는 변경 사항
- 알려진 제한사항
- 배포 확인 결과

## 11. 최종 체크리스트

- [ ] `npm install` 확인
- [ ] `npm run build` 통과
- [ ] TypeScript 오류 없음
- [ ] 주요 화면 수동 테스트 완료
- [ ] localStorage 모드 테스트 완료
- [ ] Supabase 모드 테스트 완료
- [ ] Vercel 배포 확인 완료
- [ ] README / CHANGELOG / RELEASE_NOTES 업데이트 확인
- [ ] GitHub Release 작성 완료

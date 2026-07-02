# School Health Hub

## 프로젝트 소개

School Health Hub는
보건교사의 반복 업무를 디지털화하기 위한 업무 플랫폼입니다.

현재 MVP에서는
학교 별도검사(결핵검진, 소변검사) 운영을 지원하는
별도검사 Workspace를 개발하고 있습니다.

---

## 현재 버전

v1.0 MVP

---

## 현재 구현

Workspace

- 별도검사 운영

지원 기능

- 운영 대시보드
- 학교 설정
- 검사 조건
- 대상 학급
- 시간표 생성
- 현장 모드
- 현황판
- 운영 보고서

---

## 프로젝트 구조

School Health Hub

├─ Workspace
│
│ ├─ 별도검사 운영
│ ├─ 교직원 건강검진 (예정)
│ ├─ 보건교육 (예정)
│ └─ ...

├─ Shared Services
│
├─ 온라인 보건실
├─ AI 업무도우미
└─ ...

---

## 핵심 설계 문서

PROJECT.md
프로젝트 개요와 문서 시작점

docs/VISION.md
장기 비전

docs/PRODUCT_ROADMAP.md
제품 로드맵

WORKSPACE_GUIDE.md
Workspace 설계 원칙

FIELD_MODE.md
현장 모드 설계

SECURITY.md
보안 정책

SECURITY_AUDIT.md
릴리즈 전 보안 점검

docs/DATABASE_SCHEMA.md
데이터 구조

docs/UX_GUIDE.md
UX 원칙

docs/RELEASE_PLAN.md
릴리즈 계획

docs/RELEASE_CHECKLIST.md
릴리즈 체크리스트

---

## 개발 원칙

- Workspace 중심 설계
- 실제 학교 업무 흐름 우선
- 개인정보 최소 노출
- PC / 모바일 / 태블릿 역할 분리
- 작은 단위 Commit
- 문서 먼저, 구현은 이후

---

## 현재 개발 우선순위

1. Field Mode 개선
2. 소변검사 현장 운영
3. Supabase 실시간 동기화
4. School Health Hub 통합
5. 실제 학교 운영 테스트

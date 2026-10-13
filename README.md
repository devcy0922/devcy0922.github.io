# devcy0922.github.io

10년차 Backend & AI Platform Engineer의 대표 시스템, 설계 판단, 공개 데모를 담은 VitePress 포트폴리오입니다.

- Site: https://devcy0922.github.io
- Language: Korean first
- Runtime: 정적 사이트. 콘솔(`/playground`)만 사용자가 실행할 때 공개 relay를 호출합니다.
- Deploy: GitHub Pages

## Local development

```bash
pnpm install
pnpm docs:dev
```

Production build:

```bash
pnpm docs:build
pnpm docs:preview
```

`pnpm docs:build`는 배포 전 렌더링과 내부 dead-link 검증까지 통과해야 합니다.

## 기록 작성

`docs/posts/<slug>.md`를 추가합니다.

```yaml
---
title: "기록 제목"
date: 2026-08-26
description: "목록에 표시할 한 문장"
tags:
  - Backend
  - Architecture
---
```

`docs/posts.data.js`가 글 목록을 자동으로 생성하며, production build에서는 `rss.xml`도 생성합니다.

프로젝트 목록은 `scripts/sync-projects.mjs`가 GitHub의 공개 레포를 빌드 시점에 동기화합니다. Pages 배포 워크플로는 15분마다 실행되므로 새 공개 레포와 기본 브랜치(`main` 또는 `master`)의 최근 변경이 자동으로 사이트에 반영됩니다.

## Information architecture

- `/` — 직무와 경력, 대표 시스템, 설계 기준, 기술 기록
- `/playground` — 콘솔. 질문 하나가 GoVail Gateway를 거쳐 도구 호출과 모델 응답으로 처리되는 과정을 실행 증적과 함께 확인하는 라이브 데모 (`/live-console`·`/runner`·`/audit`은 이 주소로 이동)
- `/posts/` — 기록 아카이브
- `/projects/` — 프로젝트 사례
- `/about` — 경험과 현재 관심사

디자인 및 콘텐츠 원칙은 [DESIGN.md](./DESIGN.md), 구조는 [architecture.md](./architecture.md)를 기준으로 유지합니다.

# devcy0922.github.io

개인 개발 기록과 선택한 프로젝트 사례를 위한 VitePress 사이트입니다.

- Site: https://devcy0922.github.io
- Language: Korean first
- Runtime: static only
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

- `/` — 개발자 홈, 최근 기록, 선택한 작업
- `/posts/` — 기록 아카이브
- `/projects/` — 프로젝트 사례
- `/about` — 경험과 현재 관심사

디자인 및 콘텐츠 원칙은 [DESIGN.md](./DESIGN.md), 구조는 [architecture.md](./architecture.md)를 기준으로 유지합니다.

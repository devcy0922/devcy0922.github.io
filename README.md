# devcy0922.github.io

개인 기술 블로그와 선택한 프로젝트 기록을 위한 VitePress 사이트입니다.

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

## Write a post

`docs/posts/<slug>.md`를 추가합니다.

```yaml
---
title: "글 제목"
date: 2026-08-26
description: "목록에 표시할 한 문장"
tags:
  - Backend
  - Architecture
---
```

`docs/posts.data.js`가 글 목록을 자동으로 생성하며, production build에서는 `rss.xml`도 생성합니다.

## Information architecture

- `/` — 개발자 홈, 최근 글, 선택한 작업
- `/posts/` — 글 아카이브
- `/projects/` — 프로젝트 사례
- `/about` — 경험과 현재 관심사

디자인 및 콘텐츠 원칙은 [DESIGN.md](./DESIGN.md), 구조는 [architecture.md](./architecture.md)를 기준으로 유지합니다.

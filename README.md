# devcy0922.github.io

devcy0922가 만드는 제품 목록과 공개 데모를 담은 VitePress 사이트입니다.

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

## 작업 추가

1. `docs/lab-projects.ts`에 항목을 추가한다(`status`: `live` · `prototype` · `design`, 실제 구현 범위와 같아야 함).
2. `docs/lab/<id>.md`를 만들고 frontmatter에 `lab: <id>`를 넣는다. 헤더와 이전/다음 작업 링크는 자동으로 붙는다.
3. 브라우저 프로토타입은 `docs/.vitepress/theme/lab/`에 Vue 컴포넌트로 두고 `theme/index.ts`에 등록한다.

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

- `/` — 브랜드 문장과 실제 제품 화면, 한 줄에 하나씩 보이는 제품 목록(자세히 보기 팝업), 함께 쓰는 기반, 만든 사람
- `/lab/` — 제품 목록과 제품별 페이지(데모·핵심 기능·동작 방식·로드맵). 목록 데이터는 `docs/lab-projects.ts` 하나만 수정
- `/playground` — 콘솔. 질문 하나가 GoVail Gateway를 거쳐 도구 호출과 모델 응답으로 처리되는 과정을 실행 증적과 함께 확인하는 라이브 데모 (`/live-console`·`/runner`·`/audit`은 이 주소로 이동)
- `/posts/` — 기록 아카이브
- `/projects/` — 운영 중인 플랫폼 사례
- `/about` — 경험과 현재 관심사

디자인 및 콘텐츠 원칙은 [DESIGN.md](./DESIGN.md), 구조는 [architecture.md](./architecture.md)를 기준으로 유지합니다.

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

1. `docs/lab-projects.ts`에 항목을 추가한다(`status`: `live` · `prototype` · `design`, 실제 구현 범위와 같아야 함). 홈에 보이려면 `featured: true`(최대 3개).
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

프로젝트 목록은 `scripts/sync-projects.mjs`가 GitHub의 공개 레포를 빌드 시점에 동기화합니다. Pages 배포는 `main` 푸시(와 수동 실행) 때만 돌며, 테스트(`pnpm test`)를 통과해야 배포됩니다. 새 공개 레포를 바로 반영하려면 Actions에서 배포 워크플로를 수동 실행합니다.

폰트(Pretendard, JetBrains Mono)는 npm 패키지에서 번들하며 런타임에 외부 CDN을 부르지 않습니다.

## Information architecture

- `/` — 브랜드 문장과 실제 제품 화면(배경: 인터랙티브 점 격자), 대표 제품 3개, 함께 쓰는 기반, 만든 사람
- `/lab/` — 전체 제품 목록(상태 필터, `?status=prototype`처럼 주소로 거르기)과 제품별 페이지. 목록 데이터는 `docs/lab-projects.ts` 하나만 수정하며, 순서는 `운영 중 → 미리 써보기 → 준비 중`으로 자동 정렬된다
- `/lab/page-builder` — 소개만 둔다. 편집기는 [page-builder](https://github.com/devcy0922/page-builder) 저장소가 소유하고 `/page-builder/`에 따로 배포한다
- `/playground` — 콘솔. 질문 하나가 GoVail Gateway를 거쳐 도구 호출과 모델 응답으로 처리되는 과정을 실행 증적과 함께 확인하는 라이브 데모 (`/live-console`·`/runner`·`/audit`은 이 주소로 이동)
- `/posts/` — 기록 아카이브
- `/projects/` — 운영 중인 플랫폼 사례
- `/about` — 경험과 현재 관심사 (`/experience`는 이 주소로 이동)

디자인 및 콘텐츠 원칙은 [DESIGN.md](./DESIGN.md), 구조는 [architecture.md](./architecture.md)를 기준으로 유지합니다.

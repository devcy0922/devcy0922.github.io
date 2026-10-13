# devcy0922.github.io 아키텍처

## 목표

이 저장소는 `devcy0922.github.io`에 배포되는 Backend & AI Platform Engineer 포트폴리오다. 기술 글은 프로젝트의 판단 근거로 연결한다.

## 포트폴리오 개편 · 2026-09

- 홈: 경력과 직무 → 대표 시스템 → 실행 가능한 데모 → 설계 원칙 → 기록.
- 대표 프로젝트 데이터는 `docs/selected-projects.js`에서 문제, 결정, 확인 경로를 함께 관리한다.
- `/playground`는 `govail/thinker`에 실제 요청을 보내는 대화형 클라이언트다. 선택한 도구의 입력과 relay가 반환한 결과만 표시한다.
- 내부 chain-of-thought나 사설 노드 정보는 노출하지 않는다. 관찰 가능한 SSE 이벤트와 도구 결과만 증적으로 남긴다.
- 라이브 콘솔은 빈 세션으로 시작한다. 네트워크 오류는 오류로 표시하며 초기 운영 수치 fixture를 넣지 않는다.
- 비공개 프로젝트는 로컬 문서의 공개 가능한 책임 경계만 설명한다. 인증정보, 업무 데이터, 내부 주소는 데모에 복제하지 않는다.

```mermaid
flowchart LR
    Home[직무와 대표 시스템] --> Cases[프로젝트별 문제와 설계 결정]
    Home --> Lab[공개 브라우저 데모]
    Lab --> Tools[도구 입력·결과]
    Lab --> Live[명시적 전송 · GoVail relay]
    Cases --> Notes[관련 기술 기록]
```

제품 문서와 개인 기록을 분리한다. GoVail을 포함한 프로젝트는 글과 프로젝트 사례 중 하나일 뿐이며 사이트의 전역 내비게이션, 번역 체계, 런타임 의존성으로 연결하지 않는다.

## 정보 구조

```mermaid
flowchart LR
    Home["/ · 개발자 홈"] --> Posts["/posts/ · 기술 글"]
    Home --> Projects["/projects/ · 선택한 작업"]
    Home --> About["/about · 경험과 관심사"]
    Posts --> Article["/posts/* · 개별 글"]
    Projects --> Case["/projects/* · 프로젝트 사례"]
```

### `/`

첫 화면에서 다음 세 가지가 보여야 한다.

1. 어떤 개발자인가
2. 어떤 시스템을 설계하고 구현했는가
3. 어디에서 설계와 동작을 확인할 수 있는가

### `/posts/`

날짜순 기술 글 아카이브다. `docs/posts.data.js`가 Markdown frontmatter를 읽어 목록을 생성한다.

새 글은 다음 형식을 따른다.

```yaml
---
title: "글 제목"
date: 2026-08-26
description: "목록과 검색 결과에서 사용할 한 문장"
tags:
  - AI Platform
  - Architecture
---
```

### `/projects/`

프로젝트 개수보다 문제, 책임 경계, 보장 범위를 우선한다. 공개 레포가 실험/데모 목적이면 해당 페이지에서 명시한다.

### `/about`

이력서 복제가 아니라 어떤 문제를 다뤄왔고 지금 어디에 집중하는지 설명한다.

## Build

- VitePress 1.6.x
- Markdown source: `docs/`
- Custom theme extension: `docs/.vitepress/theme`
- Mermaid: `vitepress-plugin-mermaid`
- Search: VitePress local search
- Sitemap: VitePress sitemap
- RSS: `buildEnd`에서 `createContentLoader`로 생성
- Deploy: GitHub Actions → GitHub Pages

## 유지 원칙

- 글 작성에 별도 CMS가 필요 없어야 한다.
- 홈 목록은 글을 추가하면 자동 갱신되어야 한다.
- 빌드 시점 외 네트워크나 서버 런타임을 요구하지 않는다.
- 클라이언트에서 번역 JSON이나 데모 API를 로드하지 않는다.
- 사이트 기능보다 콘텐츠 작성 비용을 낮추는 것을 우선한다.

## 2026-09 UI 개편

홈은 방문자가 가장 먼저 확인해야 할 순서에 맞춰 `소개 → 대표 작업 → 공개 데모 → 설계 기준 → 기록`으로 구성한다.
대표 작업은 `selected-projects.js`의 앞선 세 사례만 홈에 노출하고, 전체 목록과 실험은 `/projects/`에서 계속 제공한다. 화면의 정보 밀도는 얇은 구분선과 여백으로 조절하며, 프로젝트 내용을 임의의 성과 수치나 장식용 카드로 바꾸지 않는다.

```mermaid
flowchart TB
    Hero[한국어 소개와 직무] --> Work[대표 작업 3건]
    Work --> Demo[공개 브라우저 데모]
    Demo --> Principles[문제·경계·실행·검증·운영]
    Principles --> Notes[Engineering Notes]
```

기본 폰트는 한국어 본문 가독성을 위해 Noto Sans KR을 사용하고, IBM Plex Mono는 날짜·상태·코드처럼 실제 유틸리티 정보에만 사용한다. 전체 톤은 기존 `Paper / Ink / Cobalt` 토큰을 유지한다.

## 공개 라이브 콘솔

`/playground`와 `/live-console`은 같은 `Playground.vue`를 사용한다. 사용자가 전송할 때만 `https://api.govail.cloud/v1/model-routing/stream`을 호출하고, 모델은 `govail/thinker`, reasoning effort는 `low`로 고정한다. 브라우저 세션 저장과 relay 서버의 처리 범위는 구분한다. 운영 데이터 fixture나 실패 시 성공 응답으로 바꾸는 폴백은 없다.

클라이언트 진행 패널은 관찰 가능한 이벤트를 표시하며 서버 내부 실행 전체나 추론 과정을 나타내지 않는다. relay의 배포·인증·운영 설정은 이 저장소의 변경 범위 밖이다.

## Gateway 스트림 클라이언트

`/playground`·`/live-console`(`Playground.vue`), `/runner`(`ProcessRunner.vue`), 사용되지 않는 `AuditInspector.vue`가 같은 relay를 호출한다. 화면마다 fetch·SSE 파싱·오류 문구를 따로 구현하면 청크 경계 처리와 실패 표시가 어긋나므로, 요청과 실패 분류는 `docs/gateway-client.js`의 `streamGateway` 하나만 소유한다. 화면은 이벤트를 받아 표시하는 일만 한다.

```mermaid
flowchart LR
    UI["Playground · ProcessRunner · AuditInspector"] -->|"body, signal, onEvent"| GC["gateway-client.js<br/>streamGateway"]
    GC -->|POST| Relay["GoVail relay /v1/model-routing/stream"]
    Relay -->|SSE| P["stream-events.js<br/>createEventParser"]
    P -->|"event, data"| GC
    GC -->|"onEvent(event, data)"| UI
    GC -.->|"GatewayError(kind, status, retryable)"| UI
```

| kind | 의미 | 화면 표시 |
|---|---|---|
| `http` | relay가 상태 코드로 응답 | 상태 코드를 담은 한국어 문구. 응답 본문(HTML 오류 페이지 등)은 싣지 않는다 |
| `network` | 연결 실패 | 브라우저는 DNS·TLS·CORS 헤더 없는 게이트웨이 장애(502 등)를 구분하지 못하므로 한 문구로 안내한다 |
| `incomplete` | 완료 이벤트(`done`·`error`·`[DONE]`) 없이 스트림 종료 | 시간 제한이나 중간 프록시 차단 가능성을 안내한다. 성공으로 마감하지 않는다 |
| `aborted` | 사용자 중단 | 오류가 아닌 중단으로 표시한다 |

규칙: 깨진 JSON 프레임은 스트림을 끊지 않고 건너뛰며 건너뛴 수를 결과로 돌려준다. `onEvent`에서 던진 예외는 화면 코드의 문제이므로 `GatewayError`로 감싸지 않는다. 실패한 실행은 로그 탭이 아닌 화면 상단 배너에 사유를 먼저 보여 주고, `error` 이벤트로 끝난 실행을 "정상 완료"로 기록하지 않는다. 새 화면이 relay를 호출할 때도 `fetch`를 직접 쓰지 않는다.

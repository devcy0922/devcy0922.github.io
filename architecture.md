# devcy0922.github.io 아키텍처

## 목표

이 저장소는 `devcy0922.github.io`에 배포되는 Backend & AI Platform Engineer 포트폴리오다. 기술 글은 프로젝트의 판단 근거로 연결한다.

## 포트폴리오 개편 · 2026-09

- 홈: 경력과 직무 → 대표 시스템 → 실행 가능한 데모 → 설계 원칙 → 기록.
- 대표 프로젝트 데이터는 `docs/selected-projects.js`에서 문제, 결정, 확인 경로를 함께 관리한다.
- `/playground`는 `govail/thinker`에 실제 요청을 보내는 콘솔 화면이다. 선택한 도구의 입력과 relay가 반환한 결과만 표시한다.
- 내부 chain-of-thought나 사설 노드 정보는 노출하지 않는다. 관찰 가능한 SSE 이벤트와 도구 결과만 증적으로 남긴다.
- 라이브 콘솔은 빈 작업 기록으로 시작한다. 네트워크 오류는 오류로 표시하며 초기 운영 수치 fixture를 넣지 않는다.
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

`/playground`가 단일 콘솔 화면(`Workbench`)이다. 사용자가 실행할 때만 `https://api.govail.cloud/v1/model-routing/stream`을 호출하고, 모델은 `govail/thinker`, reasoning effort는 `low`로 고정한다. 브라우저 기록과 relay 서버의 처리 범위는 구분한다. 운영 데이터 fixture나 실패 시 성공 응답으로 바꾸는 폴백은 없다. `/live-console`·`/runner`·`/audit`은 예전 주소를 위한 이동 안내 페이지다.

클라이언트 진행 표시는 관찰 가능한 이벤트만 반영하며 서버 내부 실행 전체나 추론 과정을 나타내지 않는다. relay의 배포·인증·운영 설정은 이 저장소의 변경 범위 밖이다.

## Gateway 스트림 클라이언트

relay 호출은 화면 수와 무관하게 `docs/gateway-client.js`의 `streamGateway` 하나만 소유한다. 화면마다 fetch·SSE 파싱·오류 문구를 따로 구현하면 청크 경계 처리와 실패 표시가 어긋나므로(실제로 Runner에서 이벤트가 유실되었다), 화면은 이벤트를 받아 표시하는 일만 한다.

```mermaid
flowchart LR
    UI["Workbench"] -->|"body, signal, onEvent"| GC["gateway-client.js<br/>streamGateway"]
    GC -->|POST| Relay["GoVail relay /v1/model-routing/stream"]
    Relay -->|SSE| P["stream-events.js<br/>createEventParser"]
    P -->|"event, data"| GC
    GC -->|"onEvent(event, data)"| UI
    GC -.->|"GatewayError(kind, status, retryable)"| UI
```

| kind | 의미 | 화면 표시 |
|---|---|---|
| `http` | relay가 상태 코드로 응답 | 상태 코드를 담은 한국어 문구. 응답 본문(HTML 오류 페이지 등)은 싣지 않는다 |
| `network` | 연결 실패 | 브라우저는 서버 다운·DNS·TLS와 CORS 차단을 같은 오류로 보고한다. 그래서 응답을 읽지 않는 `no-cors` GET 하나로 서버에 닿는지만 따로 확인해, `detail`을 `unreachable`(서버에 닿지 못함)과 `blocked`(닿지만 응답을 읽지 못함: CORS 설정·앞단 프록시 오류)로 가른다. 사용자가 중단한 경우에는 진단하지 않는다 |
| `incomplete` | 완료 이벤트(`done`·`error`·`[DONE]`) 없이 스트림 종료 | 시간 제한이나 중간 프록시 차단 가능성을 안내한다. 성공으로 마감하지 않는다 |
| `aborted` | 사용자 중단 | 오류가 아닌 중단으로 표시한다 |

규칙: 깨진 JSON 프레임은 스트림을 끊지 않고 건너뛰며 건너뛴 수를 결과로 돌려준다. `onEvent`에서 던진 예외는 화면 코드의 문제이므로 `GatewayError`로 감싸지 않는다. 실패한 실행은 사유와 다음 행동(다시 시도·질문 수정)을 결과 영역에 먼저 보여 주고, `error` 이벤트로 끝난 실행을 성공으로 기록하지 않는다. 새 화면이 relay를 호출할 때도 `fetch`를 직접 쓰지 않는다.

## 콘솔 화면 구조 (Workbench)

### 왜 합쳤나

Playground(대화형)와 Runner(작업형)는 같은 relay에 같은 도구를 호출하는 화면이었다. 방문자는 "무엇을 하는 곳인지, 지금 무엇을 해야 하는지"를 두 화면 모두에서 알 수 없었다. 원인은 세 가지였다.

- 첫 화면에 선택지가 한꺼번에 나왔다(도구 칩 5개, 예시 칩 5개, 모델 배지, 저장 안내).
- 대화처럼 보이지만 질문마다 독립 요청이었다. 이전 내용은 요약본이 붙을 때만 전달되었다.
- 실제 이벤트에서 나오지 않은 값(승인 해시, 증거 파일명, 고정된 단계 지연)이 섞여 있었다.

### 모델: 작업(Run) 하나 = 질문 → 증적 → 답변

한 번의 실행을 `Run`으로 다룬다. `Run`은 질문, 요청한 도구, 도구 호출(입력·결과·시간), 답변, 상태(`running · done · error · aborted`), 실패 사유를 가진다. 후속 질문은 새 `Run`이다. 이전 내용을 요약해 덧붙이는 동작은 하지 않는다.

[adm-dashboard-preview](https://github.com/devcy0922/adm-dashboard-preview)에서 가져온 패턴: 목록은 "업무 항목"처럼 `Run` 기록으로, 한 줄 설명과 단 하나의 주 동작(+ 새 작업), 빈 상태가 다음 행동을 알려 주는 안내, 실패는 원인·재시도·수정 경로를 갖는 오류 화면, 좁은 화면에서는 표 대신 한 열 카드.

```mermaid
flowchart TB
    subgraph Page["/playground · Workbench"]
        Head["머리말: 목적 한 줄 + 새 작업"] --> Next["다음 행동 안내 (상태에 따라 한 줄)"]
        Next --> Composer["질문 입력 + 도구 선택 + 실행"]
        Composer --> Body{"선택한 Run"}
        Body -->|없음| Start["예시 실행 카드"]
        Body -->|있음| RunView["상태 · 단계 · 답변 · 오류와 재시도"]
        Rail["작업 기록 (Run 목록)"]
        Evidence["실행 증적: 전송한 요청 · 도구 입력/결과"]
    end
    Composer -->|streamGateway| GC["gateway-client.js"]
    GC -->|"이벤트"| Core["workbench-core.js<br/>reduceStreamEvent"]
    Core --> RunView
    Core --> Evidence
    Core -->|"직렬화"| Store[("localStorage · 이 브라우저만")]
```

### 규칙

- 순수 로직(도구 결정, 이벤트 → `Run` 변환, 단계 표시, 다음 행동 문구, 저장·이전 형식 변환)은 `docs/workbench-core.js`가 소유하고 `node --test`로 검증한다. Vue 컴포넌트는 상태를 그리기만 한다.
- 단계 표시는 실제로 받은 이벤트에서만 계산한다. 이벤트가 없으면 완료로 표시하지 않고, 실행 중이던 기록이 새로고침으로 끊기면 `실패(중단됨)`로 복원한다.
- 예시 카드는 요청할 도구를 명시한다. 자동 선택일 때도 실제로 전송할 도구를 입력창 아래에 미리 보여 준다.
- 입력창은 항상 맨 위에 둔다. 결과는 그 아래에 쌓이고, 도구 입력·결과는 오른쪽 증적(좁은 화면에서는 아래)에 둔다.
- 열 구성은 폭으로 정한다: 1280px 이상은 기록 | 결과 | 증적 세 열, 900~1279px는 결과 | 증적 두 열(기록은 결과 아래), 그 아래는 한 열. 가운데(결과) 열이 560px(세 열)·480px(두 열) 아래로 줄지 않게 한다. 패널 자체에는 높이 제한과 스크롤을 걸지 않는다(패널 테두리가 끊겨 보인다). 긴 목록(기록·검색 결과)만 패널 안에서 스크롤한다.
- 예전 주소 `/live-console`·`/runner`·`/audit`은 `/playground`로 이동시킨다. 예전 `govail_playground_browser_cache_v5` 기록은 첫 로드에 `Run`으로 변환해 가져온다.
- 지원하지 않는 것: 승인 게이트 연출, 증거 캡처 파일명·해시 같은 시뮬레이션 값, 대화 요약 덧붙이기.

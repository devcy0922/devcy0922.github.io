# devcy0922.github.io — Design Direction

## Subject

- **Subject:** 한 명의 개발자가 직접 만들고 운영하며 배운 것을 남기는 기술 블로그
- **Audience:** 동료 개발자, 채용 담당자, 프로젝트를 함께할 사람
- **Single job:** 방문자가 최근 글 하나를 읽고, 작성자의 문제 해결 방식과 현재 관심사를 이해하게 한다.

이 사이트는 제품 문서나 GoVail의 서브 사이트가 아니다. 특정 프로젝트보다 **devcy0922라는 개발자의 기록**이 먼저 보인다.

## Visual direction

### Palette

| Token | Value | Role |
|---|---:|---|
| Paper | `#F5F7FB` | 기본 배경 |
| Ink | `#172033` | 본문과 제목 |
| Cobalt | `#2F5BEA` | 유일한 강한 강조 |
| Mist | `#E7ECF6` | 경계와 약한 면 |
| Slate | `#687386` | 보조 텍스트 |
| Terminal | `#101827` | 코드 블록 |

다크 모드는 같은 위계를 유지하되 반전한다. 장식용 그라데이션은 사용하지 않는다.

### Type

- **Display / Korean:** IBM Plex Sans KR 700
- **Body:** IBM Plex Sans KR 400–600
- **Utility / code:** IBM Plex Mono 400–600

본문보다 제목의 폭과 행간을 공격적으로 조절하고, utility text는 실제 메타데이터에만 사용한다.

### Layout

```text
┌──────────────────────────────────────────────┐
│ devcy0922                         글 프로젝트 │
├──────────────────────────────────────────────┤
│ engineering log                              │
│                                              │
│ 만들고, 운영하고,                            │
│ 왜 그렇게 했는지 기록합니다.                 │
│                                              │
│ [글 읽기] [GitHub]                           │
│                                              │
│ problem ─ boundary ─ build ─ operate ─ write │  ← signature
├──────────────────────────────────────────────┤
│ 최근 기록                                    │
│ date  tag     title + description        →   │
│ date  tag     title + description        →   │
├──────────────────────────────────────────────┤
│ 선택한 작업                                  │
│ type  project + why it matters           ↗   │
└──────────────────────────────────────────────┘
```

## Signature

**Trace rail** 하나만 기억에 남게 한다.

`problem → boundary → build → operate → write`

분산 시스템의 trace처럼 보이지만 장식이 아니라 실제 작업 순서를 표현한다. 나머지 UI는 조용하게 유지한다.

## Content rules

- 튜토리얼을 위한 튜토리얼보다 **실제 판단과 실패 경로**를 기록한다.
- 제품명보다 문제를 먼저 쓴다.
- 구현하지 않은 기능이나 검증하지 않은 수치를 현재 성과처럼 쓰지 않는다.
- 공개 프로젝트가 실험/데모 목적이면 그 범위를 명시한다.
- 한국어를 기본으로 하고 영어는 기술명, 코드, 짧은 utility label에만 쓴다.
- 홈에서 특정 프로젝트를 사이트 정체성으로 만들지 않는다.

## Avoid

- 그라데이션 히어로
- 3열 KPI 카드
- 의미 없는 `01 / 02 / 03`
- 과도한 pill badge
- 프로젝트 하나를 전체 사이트의 브랜드로 확장
- 다국어 UI를 위한 상시 상태/번역 런타임
- 애니메이션을 여러 곳에 분산

## Motion

홈 진입 시 trace rail의 선 하나만 짧게 나타난다. `prefers-reduced-motion`에서는 애니메이션을 완전히 제거한다.

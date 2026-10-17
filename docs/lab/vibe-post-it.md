---
title: "vibe-post-it"
description: "사업보고서 버전 비교, Slack 레거시 메시지 변환처럼 반복 업무를 하나씩 떼어낸 작은 도구 모음."
lab: vibe-post-it
layout: page
pageClass: product-page
---

<div class="product-body vp-doc">

<ProductFeatures />

## 사업보고서 두 버전 비교

공시 문서는 매년 비슷한 문장에 숫자만 조금씩 바뀝니다. 사람이 두 파일을 나란히 놓고 찾던 일을 항목 단위로 나눠 비교하고, 바뀐 숫자를 따로 뽑아 요약합니다. 비교는 [jsdiff](https://github.com/kpdecker/jsdiff)로 하되, `1,820억원` 같은 숫자가 쉼표에서 쪼개지지 않도록 공백 단위로 자른 토큰을 비교합니다.

<ReportDiff />

### 어떻게 나누고 요약하나

1. `1.`, `Ⅱ.`, `가.`, `##` 같은 제목 줄로 문서를 항목으로 자릅니다.
2. 같은 제목끼리 짝을 지어 공백 단위 토큰으로 비교합니다. 한쪽에만 있는 항목은 신설·삭제로 표시합니다.
3. 삭제 바로 뒤에 추가가 오고 둘 다 숫자를 담고 있으면 **수치 변경**으로 묶고, 앞 단어 두 개를 문맥으로 붙입니다.
4. 요약은 이 목록으로만 만듭니다. LLM을 붙여 문장으로 다듬더라도 목록에 없는 변경은 쓰지 못하게 합니다.

다음 단계는 OpenDART에서 같은 회사의 두 해 보고서를 받아 자동으로 넣는 것입니다. 이 데이터는 [공개자료 챗봇](/lab/genians-rag)과 같이 씁니다.

## Slack 레거시 메시지 변환

오래된 알림 코드는 아직 `attachments`의 `color`, `fields`, `footer`를 씁니다. Slack은 이 형식을 레거시로 분류하고 Block Kit을 권장합니다. 붙여넣으면 Block Kit으로 바꾸고, 바꾼 메시지를 보내는 코드를 언어별로 만들어 줍니다.

<SlackBlocks />

### 변환 규칙

| 레거시 필드 | Block Kit |
|---|---|
| `pretext` | 맨 위 `section` |
| `author_name`, `author_icon` | `context` (이미지 + 텍스트) |
| `title`, `title_link`, `text` | `section` mrkdwn, `thumb_url`은 accessory 이미지 |
| `fields` | `section.fields` 10개씩 나눔 |
| `image_url` | `image` |
| `actions` 버튼 | `actions` + `button` |
| `footer`, `ts` | `context`, 시간은 `<!date^...>`로 보는 사람의 시간대에 맞춤 |
| `color` | Block Kit에는 없음. 옵션을 켜면 `attachments[].blocks`로 감싸 막대를 유지 |

### 코드를 못 바꾸는 시스템이라면: 변환 릴레이

레거시 시스템의 웹훅 주소만 바꿔 끼우면 되는 작은 서버입니다. 받은 메시지를 같은 규칙으로 바꿔 진짜 Slack 웹훅으로 넘깁니다.

```js
// relay/server.mjs — Node 20+, 의존성 없음
import { createServer } from 'node:http'
import { toBlocks } from './convert.mjs' // 위 변환기와 같은 규칙

const routes = JSON.parse(process.env.RELAY_ROUTES) // { "deploy": "https://hooks.slack.com/..." }

createServer(async (req, res) => {
  const name = req.url.split('/').pop()
  if (req.method !== 'POST' || !routes[name]) return res.writeHead(404).end()
  const legacy = JSON.parse(await new Response(req).text())
  const out = await fetch(routes[name], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toBlocks(legacy, { keepColor: true })),
  })
  res.writeHead(out.status).end(await out.text())
}).listen(8787)
```

웹훅 주소는 환경변수로만 받고, 로그에는 경로 이름과 응답 코드만 남깁니다.

## 저장소 구조 {#how}

포스트잇처럼 떠오를 때마다 하나씩 붙이는 도구 모음입니다. 각 도구는 **입력 하나, 결과 하나**로 끝나는 크기로 만들고, 쓸 만해지면 별도 서비스로 떼어냅니다. 아래 두 개는 이 페이지에서 바로 써볼 수 있습니다.

```text
vibe-post-it/
├── Makefile                 # make dev / test / new NAME=...
├── tools/
│   ├── report-diff/         # 사업보고서 버전 비교 + 변경 요약
│   ├── slack-blocks/        # 레거시 attachment → Block Kit 변환
│   └── _template/           # 새 도구 뼈대
├── relay/                   # 선택: 레거시 웹훅을 받아 변환 후 전달하는 작은 서버
└── packages/ui/             # 공통 입력창·결과 프레임
```

## 로드맵

1. OpenDART 연동으로 보고서 두 버전 자동 불러오기
2. 표(재무제표) 셀 단위 비교
3. 변환 릴레이를 Docker 이미지로 배포
4. 새 도구 후보: 회의록 액션 아이템 추출, 견적서 버전 비교

</div>

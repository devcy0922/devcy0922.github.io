<script setup>
import { computed, ref } from 'vue'

const SAMPLE = JSON.stringify(
  {
    text: '배포가 끝났습니다',
    attachments: [
      {
        fallback: 'api-server v2.4.1 production 배포 완료',
        color: '#36a64f',
        pretext: '배포가 끝났습니다',
        author_name: 'deploy-bot',
        title: 'api-server v2.4.1',
        title_link: 'https://example.com/releases/2.4.1',
        text: '변경 12건, 마이그레이션 1건이 포함되었습니다.',
        fields: [
          { title: '환경', value: 'production', short: true },
          { title: '소요 시간', value: '3분 42초', short: true },
          { title: '승인자', value: '@ops-lead', short: true },
        ],
        actions: [{ type: 'button', text: '릴리스 노트', url: 'https://example.com/releases/2.4.1' }],
        footer: 'GitHub Actions',
        ts: 1760659200,
      },
    ],
  },
  null,
  2,
)

const input = ref(SAMPLE)
const keepColor = ref(true)
const lang = ref('curl')

const LIMITS = { sectionText: 3000, fields: 10, fieldText: 2000, blocks: 50 }

function mrkdwn(text) {
  return { type: 'mrkdwn', text }
}

function convertAttachment(a, warnings) {
  const blocks = []
  if (a.author_name) {
    const elements = []
    if (a.author_icon) elements.push({ type: 'image', image_url: a.author_icon, alt_text: a.author_name })
    elements.push(mrkdwn(a.author_link ? `<${a.author_link}|${a.author_name}>` : a.author_name))
    blocks.push({ type: 'context', elements })
  }
  const head = []
  if (a.title) head.push(a.title_link ? `*<${a.title_link}|${a.title}>*` : `*${a.title}*`)
  if (a.text) head.push(a.text)
  if (head.length) {
    const text = head.join('\n')
    if (text.length > LIMITS.sectionText) warnings.push(`section 텍스트가 ${LIMITS.sectionText}자를 넘습니다.`)
    const section = { type: 'section', text: mrkdwn(text) }
    if (a.thumb_url) section.accessory = { type: 'image', image_url: a.thumb_url, alt_text: a.title || 'thumbnail' }
    blocks.push(section)
  }
  if (Array.isArray(a.fields) && a.fields.length) {
    // short:false 필드는 Block Kit에 대응 개념이 없어 2열 fields로 함께 넣는다.
    if (a.fields.some((f) => f.short === false)) warnings.push('short: false 필드는 Block Kit에서 2열로 표시됩니다.')
    for (let i = 0; i < a.fields.length; i += LIMITS.fields) {
      blocks.push({
        type: 'section',
        fields: a.fields.slice(i, i + LIMITS.fields).map((f) => mrkdwn(`*${f.title ?? ''}*\n${f.value ?? ''}`.slice(0, LIMITS.fieldText))),
      })
    }
  }
  if (a.image_url) blocks.push({ type: 'image', image_url: a.image_url, alt_text: a.title || 'image' })
  const buttons = (a.actions ?? []).filter((x) => x.type === 'button' && x.text)
  if (buttons.length) {
    blocks.push({
      type: 'actions',
      elements: buttons.map((b, i) => ({
        type: 'button',
        text: { type: 'plain_text', text: b.text },
        ...(b.url ? { url: b.url } : { value: b.value ?? String(i) }),
        ...(b.style === 'primary' || b.style === 'danger' ? { style: b.style } : {}),
        action_id: b.name ? `${b.name}_${i}` : `action_${i}`,
      })),
    })
  }
  const foot = []
  if (a.footer) foot.push(a.footer)
  if (a.ts) foot.push(`<!date^${Math.floor(Number(a.ts))}^{date_short_pretty} {time}|${new Date(Number(a.ts) * 1000).toISOString()}>`)
  if (foot.length) blocks.push({ type: 'context', elements: [mrkdwn(foot.join('  |  '))] })
  return blocks
}

const converted = computed(() => {
  let src
  try {
    src = JSON.parse(input.value)
  } catch (e) {
    return { error: `JSON을 읽지 못했습니다: ${e.message}` }
  }
  const atts = Array.isArray(src.attachments) ? src.attachments : []
  if (!atts.length) return { error: 'attachments 배열이 없습니다. 레거시 attachment 형식의 메시지를 붙여넣어 주세요.' }
  const warnings = []
  const out = { text: src.text || atts[0].fallback || atts[0].pretext || '알림' }
  const top = atts.map((a) => a.pretext).filter(Boolean)
  if (keepColor.value) {
    if (top.length) out.blocks = [{ type: 'section', text: mrkdwn(top.join('\n')) }]
    out.attachments = atts.map((a) => ({ ...(a.color ? { color: a.color } : {}), blocks: convertAttachment(a, warnings) }))
  } else {
    out.blocks = [...(top.length ? [{ type: 'section', text: mrkdwn(top.join('\n')) }] : [])]
    atts.forEach((a, i) => {
      if (i > 0) out.blocks.push({ type: 'divider' })
      out.blocks.push(...convertAttachment(a, warnings))
    })
    if (atts.some((a) => a.color)) warnings.push('색상 막대는 attachments 안에서만 표시됩니다. 유지하려면 옵션을 켜세요.')
  }
  const count = (out.blocks?.length ?? 0) + (out.attachments ?? []).reduce((n, a) => n + a.blocks.length, 0)
  if (count > LIMITS.blocks) warnings.push(`블록이 ${count}개로 한 메시지 한도 ${LIMITS.blocks}개를 넘습니다.`)
  return { payload: out, json: JSON.stringify(out, null, 2), warnings, count }
})

const compact = computed(() => (converted.value.payload ? JSON.stringify(converted.value.payload) : ''))

const LANGS = ['curl', 'Node.js', 'Python', 'Go', 'PHP']
const snippet = computed(() => {
  const body = compact.value
  const pretty = converted.value.json ?? ''
  switch (lang.value) {
    case 'curl':
      return `curl -X POST "$SLACK_WEBHOOK_URL" \\\n  -H 'Content-Type: application/json' \\\n  -d '${body.replaceAll("'", "'\\''")}'`
    case 'Node.js':
      return `// Node 18+ (fetch 내장)\nconst payload = ${pretty}\n\nconst res = await fetch(process.env.SLACK_WEBHOOK_URL, {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify(payload),\n})\nif (!res.ok) throw new Error(\`Slack \${res.status}: \${await res.text()}\`)`
    case 'Python':
      return `import json, os, urllib.request\n\npayload = json.loads(r'''${body}''')\n\nreq = urllib.request.Request(\n    os.environ["SLACK_WEBHOOK_URL"],\n    data=json.dumps(payload).encode(),\n    headers={"Content-Type": "application/json"},\n)\nwith urllib.request.urlopen(req, timeout=5) as res:\n    assert res.status == 200, res.read()`
    case 'Go':
      return `package main\n\nimport (\n\t"bytes"\n\t"fmt"\n\t"net/http"\n\t"os"\n)\n\nconst payload = \`${body.replaceAll('`', '` + "`" + `')}\`\n\nfunc main() {\n\tres, err := http.Post(os.Getenv("SLACK_WEBHOOK_URL"), "application/json", bytes.NewBufferString(payload))\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tdefer res.Body.Close()\n\tif res.StatusCode != http.StatusOK {\n\t\tpanic(fmt.Sprintf("slack %d", res.StatusCode))\n\t}\n}`
    case 'PHP':
      return `<?php\n$payload = <<<'JSON'\n${pretty}\nJSON;\n\n$ch = curl_init(getenv('SLACK_WEBHOOK_URL'));\ncurl_setopt_array($ch, [\n    CURLOPT_POST => true,\n    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],\n    CURLOPT_POSTFIELDS => $payload,\n    CURLOPT_RETURNTRANSFER => true,\n    CURLOPT_TIMEOUT => 5,\n]);\n$body = curl_exec($ch);\nif (curl_getinfo($ch, CURLINFO_HTTP_CODE) !== 200) {\n    throw new RuntimeException("Slack: $body");\n}`
  }
  return ''
})

const copied = ref('')
async function copy(text, what) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = what
    setTimeout(() => (copied.value = ''), 1500)
  } catch {
    copied.value = '복사 실패: 직접 선택해 주세요'
  }
}

// 미리보기: Slack 화면을 흉내 낸 단순 렌더러 (mrkdwn 일부만 처리)
function md(text) {
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/&lt;!date\^\d+\^[^|]*\|([^&]+)&gt;/g, (_, f) => new Date(f).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }))
    .replace(/&lt;(https?:[^|&]+)\|([^&]+)&gt;/g, '<a href="$1" target="_blank" rel="noopener">$2</a>')
    .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>')
}
const preview = computed(() => {
  const p = converted.value.payload
  if (!p) return []
  const groups = []
  if (p.blocks?.length) groups.push({ color: null, blocks: p.blocks })
  for (const a of p.attachments ?? []) groups.push({ color: a.color ?? '#dddddd', blocks: a.blocks })
  return groups
})
</script>

<template>
  <div class="proto proto--wide" id="slack-blocks">
    <div class="proto__bar">
      <strong>Slack 레거시 attachment → Block Kit</strong>
      <span>변환과 미리보기는 브라우저에서만 일어나고, 메시지를 보내지 않습니다.</span>
    </div>
    <div class="proto__body grid">
      <div>
        <label class="lbl" for="slack-in">레거시 메시지 JSON</label>
        <textarea id="slack-in" v-model="input" class="field mono" rows="18" spellcheck="false" />
        <div class="row">
          <label class="check"><input v-model="keepColor" type="checkbox" /> 색상 막대 유지 (attachments 안에 blocks)</label>
          <button type="button" class="btn" @click="input = SAMPLE">예시로 되돌리기</button>
        </div>
      </div>

      <div>
        <p class="lbl">Slack에서 보이는 모습</p>
        <p v-if="converted.error" class="error">{{ converted.error }}</p>
        <div v-else class="slack">
          <div class="slack__avatar" aria-hidden="true">D</div>
          <div class="slack__msg">
            <p class="slack__name">deploy-bot <span>앱</span></p>
            <div v-for="(g, gi) in preview" :key="gi" :class="['slack__group', g.color && 'slack__group--bar']" :style="g.color ? { borderColor: g.color } : null">
              <template v-for="(b, bi) in g.blocks" :key="bi">
                <p v-if="b.type === 'section' && b.text" class="b-section" v-html="md(b.text.text)" />
                <div v-if="b.type === 'section' && b.fields" class="b-fields">
                  <p v-for="(f, fi) in b.fields" :key="fi" v-html="md(f.text)" />
                </div>
                <p v-if="b.type === 'context'" class="b-context" v-html="b.elements.filter((e) => e.text).map((e) => md(e.text)).join(' ')" />
                <div v-if="b.type === 'actions'" class="b-actions"><span v-for="(e, ei) in b.elements" :key="ei">{{ e.text.text }}</span></div>
                <hr v-if="b.type === 'divider'" />
              </template>
            </div>
          </div>
        </div>
        <ul v-if="converted.warnings?.length" class="warn">
          <li v-for="w in converted.warnings" :key="w">{{ w }}</li>
        </ul>
      </div>
    </div>

    <div v-if="!converted.error" class="proto__body out">
      <div class="out__head">
        <div class="tabs" role="tablist" aria-label="결과 형식">
          <button type="button" role="tab" :aria-selected="lang === 'json'" @click="lang = 'json'">Block Kit JSON</button>
          <button v-for="l in LANGS" :key="l" type="button" role="tab" :aria-selected="lang === l" @click="lang = l">{{ l }}</button>
        </div>
        <button type="button" class="btn" @click="copy(lang === 'json' ? converted.json : snippet, lang)">{{ copied ? `${copied} 복사됨` : '복사' }}</button>
      </div>
      <pre class="code"><code>{{ lang === 'json' ? converted.json : snippet }}</code></pre>
      <p class="hint">웹훅 주소는 코드에 넣지 않고 <code>SLACK_WEBHOOK_URL</code> 환경변수로 받습니다. 블록 {{ converted.count }}개.</p>
    </div>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.lbl { display: block; margin: 0 0 6px; color: var(--ink); font-size: 14px; font-weight: 650; }
.field.mono { font-size: 12px; line-height: 1.6; }
.row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px; }
.check { display: inline-flex; align-items: center; gap: 8px; color: var(--ink-soft); font-size: 14px; }
.check input { width: 16px; height: 16px; accent-color: var(--ink); }
.error { margin: 0; padding: 12px 14px; border-radius: 8px; background: #fff0f0; color: #a12c2c; font-size: 14px; }
.slack { display: flex; gap: 10px; padding: 16px; border: 1px solid var(--mist-strong); border-radius: 10px; font-family: -apple-system, "Segoe UI", "Pretendard Variable", sans-serif; }
.slack__avatar { flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 6px; background: #4a154b; color: #fff; font-weight: 700; }
.slack__msg { min-width: 0; flex: 1; }
.slack__name { margin: 0 0 4px !important; color: #1d1c1d; font-size: 15px !important; font-weight: 800; }
.slack__name span { margin-left: 4px; padding: 0 4px; border-radius: 3px; background: #e8e8e8; color: #616061; font-size: 10px; font-weight: 700; }
.slack__group { margin-top: 4px; }
.slack__group--bar { padding-left: 12px; border-left: 4px solid; border-radius: 2px; }
.b-section, .b-fields p { margin: 4px 0 !important; color: #1d1c1d; font-size: 15px !important; line-height: 1.47 !important; word-break: break-word; }
.b-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin: 6px 0; }
.b-context { margin: 6px 0 !important; color: #616061; font-size: 12px !important; }
.b-actions { display: flex; gap: 8px; margin: 8px 0; }
.b-actions span { padding: 4px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; font-weight: 700; color: #1d1c1d; }
.slack :deep(a) { color: #1264a3; text-decoration: none; }
.warn { margin: 10px 0 0; padding: 10px 14px 10px 30px; border-radius: 8px; background: var(--marker-soft); }
.warn li { color: var(--ink); font-size: 13px !important; }
.out { border-top: 1px solid var(--mist); }
.out__head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.tabs { display: flex; flex-wrap: wrap; gap: 4px; }
.tabs button { height: 32px; padding: 0 12px; border-radius: 8px; color: var(--ink-soft); font-size: 13px; font-weight: 600; cursor: pointer; }
.tabs button:hover { background: var(--wash); }
.tabs button[aria-selected="true"] { background: var(--ink); color: #fff; }
.code { max-height: 360px; margin: 12px 0 0; padding: 16px; overflow: auto; border-radius: 10px; background: var(--wash); }
.code code { font-family: var(--vp-font-family-mono); font-size: 12px; line-height: 1.6; color: var(--ink); white-space: pre; }
.hint { margin: 8px 0 0 !important; color: var(--slate); font-size: 13px !important; }
@media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
</style>

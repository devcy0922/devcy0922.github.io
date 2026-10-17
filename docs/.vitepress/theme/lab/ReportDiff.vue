<script setup>
import { computed, ref } from 'vue'
import { diffArrays } from 'diff'

// 가상의 회사 예시. 실제 공시 문서가 아니다.
const SAMPLE_BEFORE = `1. 사업의 개요
예시전자(가상)는 산업용 센서와 관제 소프트웨어를 개발합니다. 국내 매출 비중은 82%이며 해외 법인은 2곳입니다.

2. 주요 제품
주력 제품은 온도·진동 센서 S-200과 관제 플랫폼 Watch입니다. Watch는 연간 구독 방식으로 판매합니다.

3. 매출 및 수주상황
당기 매출액은 1,820억원으로 전기 대비 6.1% 증가했습니다. 수주잔고는 640억원입니다.

4. 연구개발활동
연구개발비는 매출액의 11.2%인 204억원이며, 연구 인력은 138명입니다.`

const SAMPLE_AFTER = `1. 사업의 개요
예시전자(가상)는 산업용 센서와 관제 소프트웨어를 개발합니다. 국내 매출 비중은 74%이며 해외 법인은 3곳입니다.

2. 주요 제품
주력 제품은 온도·진동 센서 S-300과 관제 플랫폼 Watch입니다. Watch는 연간 구독 방식으로 판매하며, 올해부터 AI 이상 탐지 기능을 유료 옵션으로 제공합니다.

3. 매출 및 수주상황
당기 매출액은 2,140억원으로 전기 대비 17.6% 증가했습니다. 수주잔고는 910억원입니다.

4. 연구개발활동
연구개발비는 매출액의 10.4%인 223억원이며, 연구 인력은 151명입니다.

5. 위험 요인
해외 매출 확대에 따라 환율 변동 위험이 커졌습니다.`

const before = ref(SAMPLE_BEFORE)
const after = ref(SAMPLE_AFTER)
const view = ref('inline')

const HEADING = /^\s*(?:#{1,3}\s+|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\.\s*|\d{1,2}\.\s+|[가-하]\.\s+)/

function sections(text) {
  const out = []
  let cur = { title: '머리말', body: [] }
  for (const line of text.replace(/\r/g, '').split('\n')) {
    if (HEADING.test(line) && line.trim().length < 60) {
      if (cur.body.join('').trim() || cur.title !== '머리말') out.push(cur)
      cur = { title: line.trim(), body: [] }
    } else cur.body.push(line)
  }
  out.push(cur)
  return out.map((s) => ({ title: s.title, text: s.body.join('\n').trim() }))
}

const NUM = /\d[\d,]*(?:\.\d+)?(?:%|억원|만원|원|명|곳|개|건|배)?/g

// 공백 단위로 자른다. 기본 단어 분리는 1,820 같은 숫자를 쉼표에서 쪼갠다.
const tokens = (text) => text.split(/(\s+)/).filter(Boolean)
const diffTokens = (a, b) => diffArrays(tokens(a), tokens(b)).map((p) => ({ added: p.added, removed: p.removed, value: p.value.join('') }))
const key = (title) => title.replace(HEADING, '').trim()

function numberChanges(parts) {
  const changes = []
  for (let i = 0; i < parts.length - 1; i++) {
    const a = parts[i]
    const b = parts[i + 1]
    if (!a.removed || !b.added) continue
    const x = a.value.match(NUM)
    const y = b.value.match(NUM)
    if (!x || !y) continue
    const ctx = (parts[i - 1] && !parts[i - 1].added && !parts[i - 1].removed ? parts[i - 1].value : '').split(/[.!?]\s+/).pop().trim().split(/\s+/).slice(-2).join(' ')
    for (let k = 0; k < Math.min(x.length, y.length); k++) {
      if (x[k] !== y[k]) changes.push({ context: k === 0 ? ctx : '', from: x[k], to: y[k] })
    }
  }
  return changes
}

const result = computed(() => {
  const a = sections(before.value)
  const b = sections(after.value)
  const titles = [...new Set([...a.map((s) => key(s.title)), ...b.map((s) => key(s.title))])]
  return titles.map((t) => {
    const prev = a.find((s) => key(s.title) === t)
    const next = b.find((s) => key(s.title) === t)
    const title = (next ?? prev).title
    if (!prev) return { title, kind: 'added', parts: [{ added: true, value: next.text }], nums: [], plus: next.text.length, minus: 0 }
    if (!next) return { title, kind: 'removed', parts: [{ removed: true, value: prev.text }], nums: [], plus: 0, minus: prev.text.length }
    const parts = diffTokens(prev.text, next.text)
    const plus = parts.filter((p) => p.added).reduce((n, p) => n + p.value.trim().length, 0)
    const minus = parts.filter((p) => p.removed).reduce((n, p) => n + p.value.trim().length, 0)
    return { title, kind: plus || minus ? 'changed' : 'same', parts, nums: numberChanges(parts), plus, minus }
  })
})

const summary = computed(() => {
  const r = result.value
  const lines = []
  for (const s of r) {
    if (s.kind === 'added') lines.push(`${key(s.title)} 항목이 새로 생겼습니다.`)
    else if (s.kind === 'removed') lines.push(`${key(s.title)} 항목이 빠졌습니다.`)
    else if (s.kind === 'changed') {
      const nums = s.nums.map((n) => `${n.context ? n.context + ' ' : ''}${n.from} → ${n.to}`)
      const textOnly = s.plus - s.nums.reduce((n, x) => n + x.to.length, 0)
      const bits = []
      if (nums.length) bits.push(`수치 ${nums.length}건 변경 (${nums.join(', ')})`)
      if (textOnly > 12) bits.push('문장 추가·수정')
      lines.push(`${key(s.title)}: ${bits.join(', ') || '표현 수정'}`)
    }
  }
  return lines
})

const totals = computed(() => ({
  changed: result.value.filter((s) => s.kind !== 'same').length,
  all: result.value.length,
  nums: result.value.reduce((n, s) => n + s.nums.length, 0),
}))

function swap() {
  ;[before.value, after.value] = [after.value, before.value]
}
function reset() {
  before.value = SAMPLE_BEFORE
  after.value = SAMPLE_AFTER
}
</script>

<template>
  <div class="proto proto--wide" id="report-diff">
    <div class="proto__bar">
      <strong>사업보고서 두 버전 비교</strong>
      <span>예시는 가상의 회사입니다. 입력은 브라우저 안에서만 처리합니다.</span>
    </div>
    <div class="proto__body">
      <div class="inputs">
        <label>
          <span>이전 버전</span>
          <textarea v-model="before" class="field" rows="10" spellcheck="false" />
        </label>
        <label>
          <span>현재 버전</span>
          <textarea v-model="after" class="field" rows="10" spellcheck="false" />
        </label>
      </div>
      <div class="actions">
        <button type="button" class="btn" @click="swap">이전·현재 바꾸기</button>
        <button type="button" class="btn" @click="reset">예시로 되돌리기</button>
        <div class="seg" role="group" aria-label="보기 방식">
          <button type="button" :aria-pressed="view === 'inline'" @click="view = 'inline'">한 줄로 보기</button>
          <button type="button" :aria-pressed="view === 'summary'" @click="view = 'summary'">요약만 보기</button>
        </div>
      </div>

      <div class="totals">
        <span><b>{{ totals.changed }}</b> / {{ totals.all }}개 항목 변경</span>
        <span><b>{{ totals.nums }}</b>건 수치 변경</span>
        <span class="legend"><i class="ins">추가</i><i class="del">삭제</i></span>
      </div>

      <section class="summary" aria-label="변경 요약">
        <h4>변경 요약</h4>
        <ul v-if="summary.length">
          <li v-for="line in summary" :key="line">{{ line }}</li>
        </ul>
        <p v-else>두 버전이 같습니다.</p>
        <p class="note">규칙으로 만든 요약입니다. LLM 요약을 붙일 때도 이 목록만 근거로 쓰게 해서 없는 변경을 지어내지 않도록 합니다.</p>
      </section>

      <div v-if="view === 'inline'" class="sections">
        <article v-for="s in result" :key="s.title" :class="['sec', `sec--${s.kind}`]">
          <header>
            <h4>{{ s.title }}</h4>
            <span v-if="s.kind === 'added'" class="tag tag--add">신설</span>
            <span v-else-if="s.kind === 'removed'" class="tag tag--del">삭제</span>
            <span v-else-if="s.kind === 'changed'" class="count">+{{ s.plus }} −{{ s.minus }}</span>
            <span v-else class="count">변경 없음</span>
          </header>
          <p class="diff-text"><template v-for="(p, i) in s.parts" :key="i"><ins v-if="p.added">{{ p.value }}</ins><del v-else-if="p.removed">{{ p.value }}</del><span v-else>{{ p.value }}</span></template></p>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.inputs label > span { display: block; margin-bottom: 6px; color: var(--ink); font-size: 14px; font-weight: 650; }
.inputs textarea { font-size: 13px; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
.seg { display: inline-flex; margin-left: auto; border: 1px solid var(--mist-strong); border-radius: 8px; overflow: hidden; }
.seg button { padding: 0 12px; height: 34px; background: var(--paper); color: var(--ink-soft); font-size: 13px; font-weight: 600; cursor: pointer; }
.seg button + button { border-left: 1px solid var(--mist-strong); }
.seg button[aria-pressed="true"] { background: var(--ink); color: #fff; }
.totals { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--mist); color: var(--slate); font-size: 14px; }
.totals b { color: var(--ink); font-size: 18px; }
.legend { margin-left: auto; display: flex; gap: 10px; }
.legend i { font-style: normal; font-size: 13px; padding: 0 6px; border-radius: 3px; }
.legend .ins, ins { background: var(--marker); text-decoration: none; }
.legend .del, del { background: #ffe1e1; color: #a12c2c; }
.summary { margin-top: 16px; padding: 16px 18px; border-radius: 10px; background: var(--marker-soft); }
.summary h4 { color: var(--ink); font-size: 14px; }
.summary ul { margin: 8px 0 0; padding-left: 18px; }
.summary li { color: var(--ink); }
.summary .note { margin: 10px 0 0; color: var(--slate); font-size: 13px !important; }
.sections { display: grid; gap: 10px; margin-top: 16px; }
.sec { padding: 14px 16px; border: 1px solid var(--mist); border-radius: 10px; }
.sec--same { opacity: .62; }
.sec--added { border-color: #f0d64a; }
.sec--removed { border-color: #f3b7b7; }
.sec header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.sec h4 { color: var(--ink); font-size: 15px; }
.count { color: var(--slate); font-size: 13px; font-variant-numeric: tabular-nums; }
.tag { padding: 1px 8px; border-radius: 4px; font-size: 12px; font-weight: 650; }
.tag--add { background: var(--marker); color: var(--ink); }
.tag--del { background: #ffe1e1; color: #a12c2c; }
.diff-text { margin: 8px 0 0; white-space: pre-wrap; color: var(--ink-soft); }
del { text-decoration: line-through; text-decoration-thickness: 1px; }
@media (max-width: 760px) { .inputs { grid-template-columns: 1fr; } .seg { margin-left: 0; } .legend { margin-left: 0; } }
</style>

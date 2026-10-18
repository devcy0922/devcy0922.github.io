<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { streamGateway } from '../../../gateway-client.js'
import { MAX_SOURCE, buildTranslateRequest, checkTranslation, cleanOutput, restoreTerms } from '../../../lingo-core.js'

// 네트워크 보안 업계의 일반 용어. general은 도메인을 모르는 번역기가 흔히 내는 번역.
const GLOSSARY = [
  { ko: '네트워크 접근 제어', en: 'Network Access Control (NAC)' },
  { ko: '비인가 단말', en: 'unauthorized endpoint', general: 'unlicensed terminal' },
  { ko: '단말', en: 'endpoint', general: 'terminal' },
  { ko: '에이전트리스', en: 'agentless' },
  { ko: '에이전트', en: 'agent' },
  { ko: '정책 서버', en: 'policy server' },
  { ko: '정책', en: 'policy' },
  { ko: '센서', en: 'sensor' },
  { ko: '격리', en: 'quarantine', general: 'isolation' },
  { ko: '차단', en: 'block', general: 'cut off' },
  { ko: '허용', en: 'allow', general: 'permit' },
  { ko: 'IP 충돌', en: 'IP conflict' },
  { ko: 'IP 관리', en: 'IP address management (IPAM)' },
  { ko: 'MAC 주소', en: 'MAC address' },
  { ko: '802.1X', en: '802.1X' },
  { ko: 'RADIUS', en: 'RADIUS' },
  { ko: '인증', en: 'authentication', general: 'certification' },
  { ko: '자산 식별', en: 'asset identification' },
  { ko: '자산', en: 'asset', general: 'property' },
  { ko: '취약점', en: 'vulnerability' },
  { ko: '패치', en: 'patch' },
  { ko: '컴플라이언스', en: 'compliance' },
  { ko: '제로 트러스트', en: 'Zero Trust' },
  { ko: 'ZTNA', en: 'ZTNA' },
  { ko: 'EDR', en: 'EDR' },
  { ko: '위협 탐지', en: 'threat detection' },
  { ko: '이상 행위', en: 'anomalous behavior', general: 'strange act' },
  { ko: '가시성', en: 'visibility' },
  { ko: '망분리', en: 'network separation', general: 'net division' },
  { ko: '내부망', en: 'internal network' },
  { ko: '외부망', en: 'external network' },
  { ko: '게스트', en: 'guest' },
  { ko: 'VLAN', en: 'VLAN' },
  { ko: '스위치 포트', en: 'switch port' },
  { ko: '관제 화면', en: 'monitoring console', general: 'control screen' },
  { ko: '관제', en: 'security monitoring', general: 'control' },
  { ko: '랜섬웨어', en: 'ransomware' },
  { ko: '이벤트', en: 'event' },
].sort((a, b) => b.ko.length - a.ko.length)

const TM = [
  { ko: '비인가 단말이 내부망에 접속하면 정책 서버가 해당 단말을 격리합니다.', en: 'When an unauthorized endpoint connects to the internal network, the policy server quarantines it.' },
  { ko: '에이전트 없이 네트워크에 연결된 모든 자산을 식별합니다.', en: 'Identifies every asset connected to the network without an agent.' },
  { ko: '취약점이 발견된 단말은 패치가 끝날 때까지 접속을 차단합니다.', en: 'Endpoints with known vulnerabilities are blocked until they are patched.' },
]

const SAMPLES = [
  { label: '보안 제품 문장', text: '비인가 단말이 내부망에 접속하면 정책 서버가 해당 단말을 격리하고 관제 화면에 이벤트를 남깁니다.' },
  { label: '약어가 섞인 문장', text: '에이전트리스 방식으로 자산을 식별하고, IP 충돌이 생기면 XDR 연동 없이도 스위치 포트 단위로 차단합니다.' },
  { label: '일반 문장', text: '오늘 점심은 회사 근처 국밥집에서 먹었고, 오후에는 회의가 두 번 있습니다.' },
]

const text = ref(SAMPLES[0].text)

const KNOWN = new Set(GLOSSARY.map((g) => g.ko))

function scan(src) {
  const hits = []
  const taken = new Array(src.length).fill(false)
  for (const g of GLOSSARY) {
    let from = 0
    while (true) {
      const i = src.indexOf(g.ko, from)
      if (i < 0) break
      const end = i + g.ko.length
      if (!taken.slice(i, end).some(Boolean)) {
        hits.push({ start: i, end, ...g })
        for (let k = i; k < end; k++) taken[k] = true
      }
      from = end
    }
  }
  return hits.sort((a, b) => a.start - b.start)
}

function similarity(a, b) {
  const m = a.length
  const n = b.length
  if (!m || !n) return 0
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return 1 - prev[n] / Math.max(m, n)
}

const result = computed(() => {
  const src = text.value
  const hits = scan(src)
  const segments = []
  let at = 0
  for (const h of hits) {
    if (h.start > at) segments.push({ text: src.slice(at, h.start) })
    segments.push({ text: src.slice(h.start, h.end), term: h })
    at = h.end
  }
  if (at < src.length) segments.push({ text: src.slice(at) })

  const distinct = [...new Map(hits.map((h) => [h.ko, h])).values()]
  const letters = (src.match(/[가-힣A-Za-z0-9]/g) ?? []).length
  const termLetters = hits.reduce((n, h) => n + (h.ko.match(/[가-힣A-Za-z0-9]/g) ?? []).length, 0)
  const density = letters ? termLetters / letters : 0
  const verdict = distinct.length >= 3 || density >= 0.2 ? 'domain' : distinct.length ? 'partial' : 'general'

  // 용어집에 없는 약어는 추가 후보로 올린다.
  const candidates = [...new Set((src.match(/\b[A-Z][A-Z0-9-]{1,9}\b/g) ?? []).filter((w) => !KNOWN.has(w)))]

  // 자리표시자 번호마다 어떤 용어인지 남겨 번역 뒤 되돌릴 때 쓴다.
  const slots = segments.filter((s) => s.term).map((s) => s.term)
  let n = 0
  const masked = segments.map((s) => (s.term ? `⟦T${++n}⟧` : s.text)).join('')
  const locks = distinct.map((d) => ({ ko: d.ko, en: d.en }))

  const tm = TM.map((e) => ({ ...e, score: similarity(src, e.ko) })).sort((a, b) => b.score - a.score)[0]

  return { segments, distinct, density, verdict, candidates, masked, slots, locks, tm }
})

// LLM 번역은 버튼을 누를 때만 한 번 부른다. 문장을 고치면 이전 결과는 지운다.
const llm = ref({ state: 'idle', raw: '', error: '' })
let controller = null

const llmResult = computed(() => {
  if (llm.value.state !== 'done') return null
  const raw = cleanOutput(llm.value.raw)
  const { masked, slots } = result.value
  return { raw, restored: restoreTerms(raw, slots), qa: checkTranslation({ masked, raw, slots }) }
})

async function translate() {
  if (llm.value.state === 'running' || !text.value.trim()) return
  controller = new AbortController()
  llm.value = { state: 'running', raw: '', error: '' }
  try {
    await streamGateway({
      body: buildTranslateRequest(result.value.masked),
      signal: controller.signal,
      onEvent: (event, data) => {
        if (event === 'token' && data?.delta) llm.value.raw += String(data.delta)
        if (event === 'error') llm.value.error = String(data?.message || '응답 스트림이 중단되었습니다.')
      },
    })
    llm.value.state = llm.value.error ? 'error' : llm.value.raw.trim() ? 'done' : 'error'
    if (llm.value.state === 'error' && !llm.value.error) llm.value.error = '번역 결과가 비어 있습니다.'
  } catch (err) {
    llm.value = { state: err?.kind === 'aborted' ? 'idle' : 'error', raw: '', error: err?.message || '번역 요청이 실패했습니다.' }
  } finally {
    controller = null
  }
}

watch(text, () => {
  controller?.abort()
  llm.value = { state: 'idle', raw: '', error: '' }
})
onBeforeUnmount(() => controller?.abort())

const VERDICT = {
  domain: { title: '보안 도메인 문장', note: '용어집을 고정하고 도메인 번역 규칙을 적용합니다.' },
  partial: { title: '도메인 용어가 일부 섞인 문장', note: '찾은 용어만 고정하고 나머지는 일반 번역으로 처리합니다.' },
  general: { title: '일반 문장', note: '도메인 규칙을 적용하지 않습니다. 용어집이 엉뚱한 단어를 바꾸지 않도록 막습니다.' },
}
</script>

<template>
  <div class="proto proto--wide" id="checker">
    <div class="proto__bar">
      <strong>도메인 용어 검사</strong>
      <span>판정·용어 고정·번역 메모리는 규칙(용어집 {{ GLOSSARY.length }}개, 메모리 {{ TM.length }}건)으로 처리합니다. LLM은 번역 버튼을 누를 때 한 번만 부릅니다.</span>
    </div>
    <div class="proto__body">
      <div class="samples" role="group" aria-label="예시 문장">
        <button v-for="s in SAMPLES" :key="s.label" type="button" class="btn" @click="text = s.text">{{ s.label }}</button>
      </div>
      <label class="lbl" for="domain-in">번역할 문장</label>
      <textarea id="domain-in" v-model="text" class="field" rows="3" :maxlength="MAX_SOURCE" />

      <div class="verdict" :class="`verdict--${result.verdict}`">
        <strong>{{ VERDICT[result.verdict].title }}</strong>
        <span>용어 {{ result.distinct.length }}종, 용어 밀도 {{ Math.round(result.density * 100) }}%</span>
        <p>{{ VERDICT[result.verdict].note }}</p>
      </div>

      <p class="highlighted"><template v-for="(s, i) in result.segments" :key="i"><mark v-if="s.term" :title="s.term.en">{{ s.text }}</mark><span v-else>{{ s.text }}</span></template></p>

      <div class="cols">
        <section>
          <h4>고정할 용어</h4>
          <table v-if="result.distinct.length">
            <thead><tr><th>원문</th><th>도메인 번역</th><th>일반 번역기라면</th></tr></thead>
            <tbody>
              <tr v-for="d in result.distinct" :key="d.ko">
                <td>{{ d.ko }}</td>
                <td><b>{{ d.en }}</b></td>
                <td :class="{ wrong: d.general }">{{ d.general ?? '같음' }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="muted">고정할 용어가 없습니다.</p>
          <p v-if="result.candidates.length" class="cand">용어집에 없는 약어: <b v-for="c in result.candidates" :key="c">{{ c }}</b> — 검토 후 용어집에 추가합니다.</p>
        </section>
        <section>
          <h4>번역기에 넘기는 문장</h4>
          <p class="masked mono">{{ result.masked }}</p>
          <p class="muted">고정 용어를 자리표시자로 바꿔 번역 엔진이 손대지 못하게 하고, 번역 뒤에 위 표의 도메인 번역으로 되돌립니다.</p>
          <h4 class="tm-title">번역 메모리</h4>
          <p v-if="result.tm.score >= 0.98" class="tm"><b>그대로 재사용</b> {{ result.tm.en }}</p>
          <p v-else-if="result.tm.score >= 0.6" class="tm"><b>{{ Math.round(result.tm.score * 100) }}% 유사</b> {{ result.tm.en }}</p>
          <p v-else class="muted">비슷한 기존 번역이 없습니다. 새로 번역하고 메모리에 추가합니다.</p>
        </section>
      </div>

      <section class="llm" aria-live="polite">
        <div class="llm__head">
          <h4>LLM 번역</h4>
          <span class="muted">자리표시자 문장만 보냅니다 · GoVail Gateway · 한 번 호출</span>
          <button type="button" class="btn btn--primary" :disabled="llm.state === 'running' || !text.trim()" @click="translate">
            {{ llm.state === 'running' ? '번역 중…' : llm.state === 'done' ? '다시 번역' : 'LLM으로 번역' }}
          </button>
        </div>
        <p v-if="llm.state === 'running'" class="masked mono">{{ llm.raw || '응답 기다리는 중…' }}</p>
        <template v-else-if="llmResult">
          <dl class="llm__out">
            <dt>LLM 출력</dt><dd class="mono">{{ llmResult.raw }}</dd>
            <dt>용어 복원</dt><dd class="restored">{{ llmResult.restored }}</dd>
          </dl>
          <p :class="['qa', llmResult.qa.ok ? 'qa--ok' : 'qa--bad']">
            <b>{{ llmResult.qa.ok ? '규칙 QA 통과' : '규칙 QA 실패' }}</b>
            <template v-if="llmResult.qa.ok">자리표시자 {{ result.slots.length }}개와 숫자가 모두 남았습니다. 승인하면 번역 메모리에 넣습니다.</template>
            <template v-else>
              <span v-if="llmResult.qa.missing.length">빠진 용어 {{ llmResult.qa.missing.join(' ') }}</span>
              <span v-if="llmResult.qa.extra.length">중복·모르는 자리표시자 {{ llmResult.qa.extra.join(' ') }}</span>
              <span v-if="llmResult.qa.missingNumbers.length">빠진 숫자 {{ llmResult.qa.missingNumbers.join(', ') }}</span>
              — 메모리에 넣지 않고 사람이 검토합니다.
            </template>
          </p>
        </template>
        <p v-else-if="llm.state === 'error'" class="qa qa--bad"><b>번역하지 못했습니다</b> {{ llm.error }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.samples { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.lbl { display: block; margin-bottom: 6px; color: var(--ink); font-size: 14px; font-weight: 650; }
.verdict { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; margin-top: 16px; padding: 14px 16px; border-radius: 10px; border: 1px solid var(--mist-strong); }
.verdict strong { color: var(--ink); font-size: 16px; }
.verdict span { color: var(--slate); font-size: 14px; }
.verdict p { flex-basis: 100%; margin: 2px 0 0 !important; color: var(--ink-soft); font-size: 14px !important; }
.verdict--domain { border-color: var(--ink); }
.verdict--general { background: var(--wash); }
.highlighted { margin: 16px 0 0 !important; color: var(--ink); font-size: 18px !important; line-height: 1.9 !important; }
mark { background: linear-gradient(transparent 52%, var(--marker) 52%, var(--marker) 94%, transparent 94%); color: inherit; cursor: help; }
.cols { display: grid; grid-template-columns: 1.1fr 1fr; gap: 28px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--mist); }
h4 { margin: 0 0 8px !important; color: var(--ink); font-size: 14px; }
table { display: table !important; width: 100%; margin: 0 !important; font-size: 13px !important; }
th, td { padding: 6px 10px !important; border: 1px solid var(--mist) !important; }
td.wrong { color: #a12c2c; text-decoration: line-through; text-decoration-thickness: 1px; }
.muted { margin: 6px 0 0 !important; color: var(--slate); font-size: 13px !important; }
.cand { margin: 10px 0 0 !important; font-size: 13px !important; }
.cand b { margin-right: 6px; padding: 1px 6px; border-radius: 4px; background: var(--wash); }
.masked { margin: 0 !important; padding: 10px 12px; border-radius: 8px; background: var(--wash); color: var(--ink); line-height: 1.7 !important; }
.tm-title { margin-top: 18px !important; }
.tm { margin: 0 !important; font-size: 14px !important; }
.tm b { margin-right: 8px; }
.llm { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--mist); }
.llm__head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin-bottom: 10px; }
.llm__head h4 { margin: 0 !important; }
.llm__head .muted { margin: 0 !important; }
.llm__head .btn { margin-left: auto; }
.llm__out { display: grid; grid-template-columns: 76px 1fr; gap: 6px 12px; margin: 0; font-size: 14px; }
.llm__out dt { color: var(--slate); font-size: 13px; }
.llm__out dd { margin: 0; color: var(--ink); }
.restored { font-size: 16px; font-weight: 600; }
.qa { margin: 12px 0 0 !important; padding: 10px 12px; border-radius: 8px; font-size: 13px !important; }
.qa b { margin-right: 8px; }
.qa span { margin-right: 8px; }
.qa--ok { background: var(--wash); }
.qa--bad { background: #fff3f3; }
@media (max-width: 860px) { .cols { grid-template-columns: 1fr; } }
</style>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import products from '../../../lab-projects'
import { ask, buildIndex, parseCustomSources } from '../../../rag-engine.js'
import { CUSTOM_GUARDS, CUSTOM_SAMPLE, POLICY_DOMAIN, SECURITY_DOMAIN, siteDomain } from '../../../rag-domains.js'

// 데모 도메인 3개 + 직접 넣기. 모든 처리는 브라우저 안에서 끝나고 입력은 어디에도 보내지 않는다.
const DEMOS = [POLICY_DOMAIN, SECURITY_DOMAIN, siteDomain(products)]
const tab = ref(DEMOS[0].id)

const customTitle = ref('팀 위키')
const customText = ref(CUSTOM_SAMPLE)

const domain = computed(() => {
  const demo = DEMOS.find((d) => d.id === tab.value)
  if (demo) return demo
  const sources = parseCustomSources(customText.value)
  return {
    id: 'custom',
    title: customTitle.value.trim() || '이름 없는 도메인',
    org: '직접 입력',
    note: '붙여 넣은 글은 이 브라우저 안에서만 색인합니다. 문서는 --- 줄로 나누고 첫 줄을 제목으로 씁니다.',
    sources,
    guards: CUSTOM_GUARDS,
    synonyms: [],
    samples: sources.map((x) => `${x.title} 알려줘`).slice(0, 3),
  }
})

const index = computed(() => buildIndex(domain.value))

// 만드는 과정을 단계별로 드러낸다. 도메인을 바꾸면 처음부터 다시 쌓는다.
const STEPS = ['sources', 'normalize', 'chunk', 'index', 'guard']
const shown = ref(STEPS.length)
let timer = null
function replay() {
  clearInterval(timer)
  // 서버 렌더링(빌드)에서는 타이머를 걸지 않고 완성된 상태로 그린다.
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    shown.value = STEPS.length
    return
  }
  shown.value = 0
  timer = setInterval(() => {
    shown.value += 1
    if (shown.value >= STEPS.length) clearInterval(timer)
  }, 260)
}
onBeforeUnmount(() => clearInterval(timer))

const activeDoc = ref('')
const doc = computed(() => index.value.docs.find((d) => d.id === activeDoc.value) ?? index.value.docs[0])
const docChunks = computed(() => index.value.chunks.filter((c) => c.docId === doc.value?.id))

const q = ref('')
const turn = ref(null)

function run(text) {
  const query = (text ?? q.value).trim()
  if (!query) return
  q.value = query
  turn.value = ask(index.value, query)
}

function pick(id) {
  tab.value = id
}

watch(tab, () => {
  activeDoc.value = ''
  replay()
  const first = domain.value.samples[0]
  q.value = ''
  turn.value = first ? ask(index.value, first) : null
  if (first) q.value = first
}, { immediate: true })

// 직접 넣기에서 글을 고치면 질문 결과도 새 색인으로 다시 계산한다.
watch(index, () => {
  if (turn.value) turn.value = ask(index.value, turn.value.query)
})

const citeNo = (id) => (turn.value?.hits.findIndex((h) => h.chunk.id === id) ?? -1) + 1
const KIND = {
  answered: '답변',
  empty: '근거 없음',
  refused: '답하지 않음',
}
</script>

<template>
  <div class="proto proto--wide" id="rag">
    <div class="proto__bar">
      <strong>{{ domain.title }} RAG</strong>
      <span>LLM 없이 브라우저 안에서 색인합니다. 답변 문장은 원문에서 그대로 뽑아 출처를 붙입니다.</span>
    </div>

    <div class="tabs" role="tablist" aria-label="도메인">
      <button
        v-for="d in DEMOS"
        :key="d.id"
        type="button"
        role="tab"
        :aria-selected="tab === d.id"
        :class="['tab', { on: tab === d.id }]"
        @click="pick(d.id)"
      >{{ d.title }}<small>{{ d.org }}</small></button>
      <button type="button" role="tab" :aria-selected="tab === 'custom'" :class="['tab', { on: tab === 'custom' }]" @click="pick('custom')">
        직접 넣기<small>내 도메인</small>
      </button>
    </div>
    <p class="note">{{ domain.note }}</p>

    <div v-if="tab === 'custom'" class="custom">
      <label class="lbl" for="rag-title">RAG 이름(도메인)</label>
      <input id="rag-title" v-model="customTitle" class="field" maxlength="30" />
      <label class="lbl" for="rag-docs">문서</label>
      <textarea id="rag-docs" v-model="customText" class="field mono" rows="7" />
    </div>

    <div class="layout">
      <section class="build" aria-label="RAG를 만드는 과정">
        <div class="build__head">
          <h4>만드는 과정</h4>
          <button type="button" class="btn btn--sm" @click="replay">다시 만들기</button>
        </div>
        <ol class="steps">
          <li :class="{ on: shown > 0 }">
            <details open>
              <summary><b>1. 출처 등록</b><span>{{ index.stats.docs }}건 색인 · {{ index.stats.skipped }}건 제외</span></summary>
              <ul class="sources">
                <li v-for="s in index.sources" :key="s.id" :class="`src--${s.status}`">
                  <button v-if="s.status === 'indexed'" type="button" :class="{ cur: doc?.id === s.id }" @click="activeDoc = s.id">{{ s.title }}</button>
                  <span v-else>{{ s.title }}</span>
                  <em>{{ s.status === 'indexed' ? s.url : `제외: ${s.reason}` }}</em>
                </li>
              </ul>
            </details>
          </li>
          <li :class="{ on: shown > 1 }">
            <details>
              <summary><b>2. 정규화</b><span>{{ index.stats.chars.toLocaleString() }}자 · 제목과 문단만 남김</span></summary>
              <pre v-if="doc" class="mono">{{ doc.normalized }}</pre>
            </details>
          </li>
          <li :class="{ on: shown > 2 }">
            <details>
              <summary><b>3. 청킹</b><span>조각 {{ index.stats.chunks }}개 · 문단 경계, 240자 이하</span></summary>
              <ol v-if="doc" class="chunks">
                <li v-for="c in docChunks" :key="c.id"><code>{{ c.id }}</code><i v-if="c.section">{{ c.section }}</i>{{ c.text }}</li>
              </ol>
            </details>
          </li>
          <li :class="{ on: shown > 3 }">
            <details>
              <summary><b>4. 색인</b><span>BM25 어휘 {{ index.stats.vocab }}개 · 한글은 2글자 단위</span></summary>
              <p class="terms"><span v-for="t in index.topTerms" :key="t.term">{{ t.term }}<sub>{{ t.n }}</sub></span></p>
              <p v-if="domain.synonyms.length" class="muted">동의어: <template v-for="([a, b], i) in domain.synonyms" :key="a">{{ i ? ' · ' : '' }}{{ a }} ↔ {{ b }}</template></p>
            </details>
          </li>
          <li :class="{ on: shown > 4 }">
            <details>
              <summary><b>5. 범위 가드</b><span>검색 전에 거르는 규칙 {{ domain.guards.length }}개</span></summary>
              <ul class="guards"><li v-for="g in domain.guards" :key="g.why">{{ g.why }}</li></ul>
            </details>
          </li>
        </ol>
      </section>

      <section class="ask" aria-label="질문하기">
        <h4>질문하기</h4>
        <div class="samples">
          <button v-for="s in domain.samples" :key="s" type="button" class="btn btn--sm" @click="run(s)">{{ s }}</button>
        </div>
        <form class="ask__form" @submit.prevent="run()">
          <input v-model="q" class="field" :placeholder="`${domain.title}에 대해 묻기`" aria-label="질문" maxlength="120" />
          <button type="submit" class="btn btn--primary" :disabled="!q.trim()">묻기</button>
        </form>

        <div v-if="turn" class="trace" aria-live="polite">
          <p :class="['row', turn.rule ? 'stop' : 'ok']"><b>범위 가드</b><span>{{ turn.rule ? turn.rule.why : '통과' }}</span></p>
          <template v-if="!turn.rule">
            <p v-if="turn.expanded?.added.length" class="row ok"><b>동의어</b><span>{{ turn.expanded.added.join(', ') }} 를 붙여 검색</span></p>
            <p :class="['row', turn.hits.length ? 'ok' : 'stop']"><b>검색</b><span>상위 {{ turn.hits.length }}개 조각</span></p>
            <ol v-if="turn.hits.length" class="hits">
              <li v-for="(h, i) in turn.hits" :key="h.chunk.id">
                <span class="no">{{ i + 1 }}</span>
                <div><b>{{ h.chunk.title }}<template v-if="h.chunk.section"> · {{ h.chunk.section }}</template></b><code>{{ h.score.toFixed(2) }}</code><p>{{ h.chunk.text }}</p></div>
              </li>
            </ol>
            <p :class="['row', turn.sentences.length ? 'ok' : 'stop']">
              <b>인용 검증</b>
              <span>{{ turn.sentences.length ? `문장 ${turn.sentences.length}개 모두 원문과 일치` : '질문과 충분히 겹치는 문장이 없음' }}</span>
            </p>
          </template>

          <div :class="['answer', `answer--${turn.kind}`]">
            <strong>{{ KIND[turn.kind] }}</strong>
            <p v-if="turn.kind === 'answered'"><template v-for="s in turn.sentences" :key="s.text">{{ s.text }}<sup>[{{ citeNo(s.cite) }}]</sup> </template></p>
            <p v-else-if="turn.kind === 'refused'">{{ turn.rule.why }} {{ domain.title }} 자료로 확인할 수 있는 질문을 해 주세요.</p>
            <p v-else>등록한 자료에서 근거를 찾지 못했습니다. 근거 없이 지어내지 않도록 여기서 멈춥니다.</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tabs { display: flex; flex-wrap: wrap; gap: 6px; padding: 16px 20px 0; }
.tab { display: flex; flex-direction: column; align-items: flex-start; padding: 8px 14px; border: 1px solid var(--mist-strong); border-radius: 10px; background: var(--paper); color: var(--ink); font-size: 14px; font-weight: 650; cursor: pointer; }
.tab small { color: var(--slate); font-size: 12px; font-weight: 500; }
.tab.on { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
.note { margin: 10px 20px 0 !important; color: var(--slate); font-size: 13px !important; }
.custom { display: grid; gap: 6px; padding: 14px 20px 0; }
.lbl { color: var(--ink); font-size: 13px; font-weight: 650; }
.custom textarea { font-size: 13px; line-height: 1.6; }

.layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); margin-top: 16px; border-top: 1px solid var(--mist); }
.build { padding: 18px 20px; border-right: 1px solid var(--mist); background: var(--wash); }
.build__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
h4 { margin: 0 !important; color: var(--ink); font-size: 14px; }
.btn--sm { min-height: 30px; padding: 0 10px; font-size: 13px; font-weight: 500; }

.steps { margin: 0; padding: 0; list-style: none; }
.steps > li { margin: 0 !important; border-bottom: 1px solid var(--mist-strong); opacity: 0.25; transition: opacity 200ms ease; }
.steps > li.on { opacity: 1; }
summary { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; padding: 10px 0; cursor: pointer; list-style: none; }
summary::-webkit-details-marker { display: none; }
summary::before { content: "▸"; color: var(--slate); font-size: 11px; }
details[open] > summary::before { content: "▾"; }
summary b { color: var(--ink); font-size: 14px; }
summary span { color: var(--slate); font-size: 13px; }
details > :not(summary) { margin: 0 0 12px !important; }

.sources, .guards { margin: 0; padding: 0; list-style: none; }
.sources li, .guards li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 10px; margin: 0 !important; padding: 5px 0; font-size: 13px !important; }
.sources button { padding: 0; border: 0; background: none; color: var(--ink); font: inherit; font-weight: 600; text-align: left; cursor: pointer; text-decoration: underline; text-decoration-color: var(--mist-strong); text-underline-offset: 3px; }
.sources button.cur { text-decoration-color: var(--ink); }
.sources em { color: var(--slate); font-style: normal; }
.src--skipped span { color: var(--slate); text-decoration: line-through; }
.src--skipped em { color: #a12c2c; }
.guards li::before { content: "✕"; margin-right: 6px; color: #a12c2c; }
.guards li { justify-content: flex-start; }
pre { max-height: 220px; padding: 10px 12px; border-radius: 8px; background: var(--paper); color: var(--ink); font-size: 12.5px; line-height: 1.6; white-space: pre-wrap; overflow: auto; }
.chunks { margin: 0; padding: 0; list-style: none; }
.chunks li { margin: 0 0 6px !important; padding: 8px 10px; border-radius: 8px; background: var(--paper); font-size: 13px !important; line-height: 1.6 !important; }
.chunks code, .hits code { margin-right: 6px; font-size: 12px; }
.chunks i { margin-right: 6px; padding: 0 6px; border-radius: 4px; background: var(--wash); color: var(--slate); font-size: 12px; font-style: normal; }
.terms { display: flex; flex-wrap: wrap; gap: 4px; }
.terms span { padding: 1px 8px; border-radius: 999px; background: var(--paper); font-size: 13px; }
.terms sub { margin-left: 2px; color: var(--slate); font-size: 10px; }
.muted { color: var(--slate); font-size: 13px !important; }

.ask { padding: 18px 20px; }
.samples { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
.ask__form { display: flex; gap: 8px; }
.ask__form .field { padding: 8px 12px; }
.trace { margin-top: 16px; }
.row { display: grid; grid-template-columns: 14px 76px 1fr; gap: 8px; align-items: baseline; margin: 0 !important; padding: 4px 0; font-size: 13px !important; }
.row::before { width: 8px; height: 8px; border-radius: 50%; content: ""; align-self: center; }
.row.ok::before { background: var(--live); }
.row.stop::before { background: #c53030; }
.row b { color: var(--ink); }
.row span { color: var(--slate); }
.hits { margin: 4px 0 8px 22px; padding: 0; list-style: none; }
.hits li { display: flex; gap: 8px; margin: 0 !important; padding: 8px 0; border-top: 1px dashed var(--mist-strong); }
.hits .no { flex: none; width: 20px; height: 20px; border-radius: 50%; background: var(--ink); color: #fff; font-size: 11px; font-weight: 700; line-height: 20px; text-align: center; }
.hits b { margin-right: 8px; color: var(--ink); font-size: 13px; }
.hits p { margin: 2px 0 0 !important; color: var(--ink-soft); font-size: 13px !important; line-height: 1.6 !important; }
.answer { margin-top: 12px; padding: 12px 14px; border-radius: 10px; background: var(--wash); }
.answer strong { color: var(--ink); font-size: 13px; }
.answer p { margin: 4px 0 0 !important; color: var(--ink); font-size: 15px !important; }
.answer sup { margin-left: 1px; color: var(--cobalt); font-weight: 700; }
.answer--answered { border: 1px solid var(--ink); background: var(--paper); }
.answer--refused { background: #fff3f3; }

@media (max-width: 860px) {
  .layout { grid-template-columns: 1fr; }
  .build { border-right: 0; border-bottom: 1px solid var(--mist); }
}
</style>

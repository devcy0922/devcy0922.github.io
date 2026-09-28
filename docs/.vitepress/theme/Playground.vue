<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

type StepState = 'ok' | 'warn' | 'blocked' | 'fail'

type Step = {
  name: string
  detail: string
  latency?: string
  state: StepState
}

type Scenario = {
  id: string
  lab: 'agent' | 'routing' | 'serving'
  eyebrow: string
  title: string
  description: string
  request: string
  outcome: string
  steps: Step[]
  evidence: { label: string; value: string }[]
  note: string
  live?: boolean
  promptId?: 'routing-failover' | 'routing-timeout'
}

const scenarios: Scenario[] = [
  {
    id: 'agent-approval',
    lab: 'agent',
    eyebrow: 'Agent Execution',
    title: 'Write action with approval',
    description: '쓰기 작업을 정책 경계에서 멈추고 승인 이후에만 실행하는 흐름입니다.',
    request: 'Create a GitHub issue from a verified finding',
    outcome: 'approved · executed · verified',
    steps: [
      { name: 'Request', detail: 'ActionRequest accepted', latency: '4 ms', state: 'ok' },
      { name: 'Policy', detail: 'write scope requires approval', latency: '9 ms', state: 'warn' },
      { name: 'Grant', detail: 'human approval received', latency: '—', state: 'ok' },
      { name: 'Executor', detail: 'tool call executed', latency: '183 ms', state: 'ok' },
      { name: 'Verifier', detail: 'read-back matched intent', latency: '42 ms', state: 'ok' },
      { name: 'Receipt', detail: 'audit receipt emitted', latency: '3 ms', state: 'ok' },
    ],
    evidence: [
      { label: 'policy', value: 'approval_required' },
      { label: 'surface', value: 'HTTP_API' },
      { label: 'verification', value: 'passed' },
      { label: 'receipt', value: 'rcpt_demo_01' },
    ],
    note: '실제 외부 시스템에 쓰지 않습니다. 공개용 trace fixture를 재생합니다.',
  },
  {
    id: 'agent-denied',
    lab: 'agent',
    eyebrow: 'Agent Execution',
    title: 'Policy denied action',
    description: '허용되지 않은 권한 또는 범위를 가진 작업이 실행 경계에서 차단되는 흐름입니다.',
    request: 'Execute an ungranted administrative action',
    outcome: 'blocked before execution',
    steps: [
      { name: 'Request', detail: 'ActionRequest accepted', latency: '3 ms', state: 'ok' },
      { name: 'Policy', detail: 'scope is not granted', latency: '7 ms', state: 'blocked' },
      { name: 'Grant', detail: 'no grant issued', latency: '—', state: 'blocked' },
      { name: 'Executor', detail: 'not invoked', latency: '—', state: 'blocked' },
      { name: 'Verifier', detail: 'execution absent as expected', latency: '2 ms', state: 'ok' },
      { name: 'Receipt', detail: 'denial receipt emitted', latency: '2 ms', state: 'ok' },
    ],
    evidence: [
      { label: 'policy', value: 'deny' },
      { label: 'executor_calls', value: '0' },
      { label: 'fail_closed', value: 'true' },
      { label: 'receipt', value: 'rcpt_demo_02' },
    ],
    note: '정책 거부 시 executor 호출이 발생하지 않는 것을 보여주는 replay입니다.',
  },
  {
    id: 'routing-failover',
    lab: 'routing',
    live: true,
    promptId: 'routing-failover',
    eyebrow: 'Model Routing',
    title: 'Local-first failover',
    description: '로컬 백엔드를 우선 선택하고, 상태 이상 시 다음 후보로 안전하게 전환하는 흐름입니다.',
    request: 'POST /v1/chat/completions · policy=local-first',
    outcome: 'backend-b selected after failover',
    steps: [
      { name: 'Gateway', detail: 'request normalized', latency: '6 ms', state: 'ok' },
      { name: 'Health', detail: 'backend-a marked busy', latency: '2 ms', state: 'warn' },
      { name: 'Router', detail: 'backend-b selected', latency: '5 ms', state: 'ok' },
      { name: 'Prefill', detail: 'prompt accepted', latency: '318 ms', state: 'ok' },
      { name: 'Decode', detail: 'stream completed', latency: '31.4 tok/s', state: 'ok' },
      { name: 'Trace', detail: 'route decision recorded', latency: '2 ms', state: 'ok' },
    ],
    evidence: [
      { label: 'policy', value: 'local-first' },
      { label: 'requested', value: 'qwen-local' },
      { label: 'selected', value: 'backend-b' },
      { label: 'failover', value: '1' },
    ],
    note: '호스트명과 실제 endpoint는 제거된 공개용 routing trace입니다.',
  },
  {
    id: 'routing-timeout',
    lab: 'routing',
    live: true,
    promptId: 'routing-timeout',
    eyebrow: 'Model Routing',
    title: 'Backend timeout recovery',
    description: '추론 백엔드 timeout을 감지하고 circuit 상태를 반영해 대체 경로로 전환합니다.',
    request: 'Completion request · backend-a timeout injected',
    outcome: 'recovered in 1.38 s',
    steps: [
      { name: 'Gateway', detail: 'request accepted', latency: '5 ms', state: 'ok' },
      { name: 'Backend A', detail: 'timeout', latency: '1000 ms', state: 'fail' },
      { name: 'Circuit', detail: 'backend-a opened', latency: '4 ms', state: 'warn' },
      { name: 'Backend B', detail: 'retry accepted', latency: '71 ms', state: 'ok' },
      { name: 'Decode', detail: 'stream completed', latency: '29.8 tok/s', state: 'ok' },
      { name: 'Trace', detail: 'recovery recorded', latency: '3 ms', state: 'ok' },
    ],
    evidence: [
      { label: 'fault', value: 'timeout' },
      { label: 'circuit', value: 'open' },
      { label: 'retry', value: '1' },
      { label: 'recovery', value: '1.38 s' },
    ],
    note: '장애 주입 결과를 재생하는 fixture이며 실제 추론 서버를 공격하거나 호출하지 않습니다.',
  },
  {
    id: 'serving-concurrency',
    lab: 'serving',
    eyebrow: 'Serving Lab',
    title: 'Concurrency trade-off',
    description: '동시성 증가에 따라 요청당 decode 성능과 aggregate throughput이 어떻게 달라지는지 비교합니다.',
    request: 'Qwen MoE · 128K profile · KV Q8 · parallel 4',
    outcome: 'aggregate throughput peaks at concurrency 4',
    steps: [
      { name: 'C=1', detail: 'request decode', latency: '42.4 tok/s', state: 'ok' },
      { name: 'C=1 agg', detail: 'aggregate', latency: '36.1 tok/s', state: 'ok' },
      { name: 'C=2', detail: 'request decode', latency: '26.3 tok/s', state: 'warn' },
      { name: 'C=2 agg', detail: 'aggregate', latency: '46.8 tok/s', state: 'ok' },
      { name: 'C=4', detail: 'request decode', latency: '15.5 tok/s', state: 'warn' },
      { name: 'C=4 agg', detail: 'aggregate', latency: '54.4 tok/s', state: 'ok' },
    ],
    evidence: [
      { label: 'kv_cache', value: 'Q8' },
      { label: 'context', value: '128K × 4' },
      { label: 'parallel', value: '4' },
      { label: 'peak_agg', value: '54.4 tok/s' },
    ],
    note: '공개 가능한 실측 요약만 포함합니다. 장비 식별자와 원본 로그는 포함하지 않습니다.',
  },
]

const tabs = [
  { id: 'agent', label: 'Agent Execution', meta: 'policy · approval · verification' },
  { id: 'routing', label: 'Model Routing', meta: 'health · failover · trace' },
  { id: 'serving', label: 'Serving Lab', meta: 'latency · throughput · concurrency' },
] as const

const activeLab = ref<(typeof tabs)[number]['id']>('agent')
const activeScenarioId = ref('agent-approval')
const activeStep = ref(-1)
const running = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

// Live mode: exactly two Model Routing scenarios make one real request per
// run to a relay in front of GoVail Gateway. See architecture.md "예외:
// Playground · Model Routing 라이브 데모" — Agent Execution and Serving Lab
// stay pure replay.
const RELAY_URL = 'https://playground-relay.govail.cloud/v1/model-routing/run'
const LIVE_CLIENT_TIMEOUT_MS = 15_000

type LiveState = 'idle' | 'running' | 'locked' | 'rate_limited' | 'disabled' | 'error' | 'done'
type LiveResult = { outputText: string; latencyMs: number; tokensPerSec: number }

const liveState = ref<LiveState>('idle')
const liveResult = ref<LiveResult | null>(null)
let liveAbort: AbortController | undefined
let liveFallbackTimer: ReturnType<typeof setTimeout> | undefined

const labScenarios = computed(() => scenarios.filter((scenario) => scenario.lab === activeLab.value))
const scenario = computed(() => scenarios.find((item) => item.id === activeScenarioId.value) ?? labScenarios.value[0])

const runButtonLabel = computed(() => {
  if (running.value || liveState.value === 'running') return 'RUNNING'
  return scenario.value.live ? 'RUN' : 'RUN REPLAY'
})

const liveStatusClass = computed(() => {
  if (!scenario.value.live) return ''
  if (liveState.value === 'done') return 'live-ok'
  if (liveState.value === 'locked' || liveState.value === 'rate_limited') return 'live-warn'
  if (liveState.value === 'error' || liveState.value === 'disabled') return 'live-bad'
  return ''
})

const displayedOutcome = computed(() => {
  const s = scenario.value
  if (!s.live) return s.outcome
  if (liveState.value === 'done' && liveResult.value) {
    return `live run — ${liveResult.value.latencyMs}ms · ${liveResult.value.tokensPerSec.toFixed(1)} tok/s`
  }
  if (liveState.value === 'locked') return 'locked — another visitor is running this'
  if (liveState.value === 'rate_limited') return 'rate limited — try again shortly'
  if (liveState.value === 'disabled') return 'live mode disabled — showing replay'
  if (liveState.value === 'error') return 'live demo unavailable — showing replay'
  return s.outcome
})

const displayedSteps = computed(() => {
  const s = scenario.value
  if (!s.live || (liveState.value !== 'running' && liveState.value !== 'done')) {
    return s.steps
  }
  // Never fabricate per-hop numbers for a real call: only the two terminal
  // rows carry relay-measured values, everything else drops its canned
  // latency and stays qualitative (state icon only).
  return s.steps.map((step, index) => {
    if (liveState.value === 'done' && liveResult.value) {
      if (index === s.steps.length - 2) {
        return { ...step, latency: `${liveResult.value.tokensPerSec.toFixed(1)} tok/s` }
      }
      if (index === s.steps.length - 1) {
        return { ...step, detail: 'live trace recorded', latency: `${liveResult.value.latencyMs} ms` }
      }
    }
    return { ...step, latency: undefined }
  })
})

const displayedNote = computed(() => {
  const s = scenario.value
  if (s.live && liveState.value === 'done') {
    return '방문자당 1회, GoVail Gateway에 실제로 보낸 요청입니다. 백엔드 호스트명이나 내부 endpoint는 노출하지 않습니다.'
  }
  return s.note
})

function setLab(lab: (typeof tabs)[number]['id']) {
  stopReplay()
  activeLab.value = lab
  activeScenarioId.value = scenarios.find((item) => item.lab === lab)?.id ?? scenarios[0].id
  activeStep.value = -1
}

function setScenario(id: string) {
  stopReplay()
  activeScenarioId.value = id
  activeStep.value = -1
}

function stopReplay() {
  if (timer) clearInterval(timer)
  timer = undefined
  running.value = false
  if (liveFallbackTimer) clearTimeout(liveFallbackTimer)
  liveFallbackTimer = undefined
  liveAbort?.abort()
  liveAbort = undefined
  liveState.value = 'idle'
  liveResult.value = null
}

function replay() {
  stopReplay()
  activeStep.value = 0
  running.value = true

  timer = setInterval(() => {
    if (activeStep.value >= scenario.value.steps.length - 1) {
      stopReplay()
      return
    }
    activeStep.value += 1
  }, 520)
}

async function runLive() {
  const promptId = scenario.value.promptId
  if (!promptId) return

  stopReplay()
  liveState.value = 'running'
  running.value = true
  activeStep.value = 0

  // Animate through the trace for visual continuity while the real request
  // is in flight; hold just before the terminal step until real data (or a
  // failure) arrives, rather than reaching it on a fixed fake schedule.
  timer = setInterval(() => {
    if (activeStep.value >= scenario.value.steps.length - 2) return
    activeStep.value += 1
  }, 420)

  liveAbort = new AbortController()
  const clientTimeout = setTimeout(() => liveAbort?.abort(), LIVE_CLIENT_TIMEOUT_MS)

  try {
    const response = await fetch(RELAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptId }),
      signal: liveAbort.signal,
    })
    const payload = await response.json()

    if (payload.status === 'ok') {
      liveResult.value = {
        outputText: payload.outputText,
        latencyMs: payload.latencyMs,
        tokensPerSec: payload.tokensPerSec,
      }
      liveState.value = 'done'
      activeStep.value = scenario.value.steps.length - 1
      if (timer) clearInterval(timer)
      timer = undefined
      running.value = false
      return
    }

    liveState.value =
      payload.status === 'locked' || payload.status === 'rate_limited' || payload.status === 'disabled'
        ? payload.status
        : 'error'
  } catch {
    liveState.value = 'error'
  } finally {
    clearTimeout(clientTimeout)
    if (liveState.value !== 'done') {
      if (timer) clearInterval(timer)
      timer = undefined
      running.value = false
      activeStep.value = -1
      // Graceful fallback: let the visitor see the status for a moment,
      // then fall back to the existing fixture replay so the page still
      // shows something working — this is also how the kill switch and any
      // upstream failure resolve, with no separate machinery.
      const fallbackState = liveState.value
      liveFallbackTimer = setTimeout(() => {
        if (liveState.value === fallbackState) replay()
      }, 1600)
    }
  }
}

function handleRun() {
  if (scenario.value.live) {
    runLive()
  } else {
    replay()
  }
}

onBeforeUnmount(stopReplay)
</script>

<template>
  <main class="playground-shell">
    <header class="playground-hero">
      <p class="utility-label"><span class="status-dot"></span>AI Systems Playground</p>
      <h1>시스템이 어떻게 판단하고<br><em>실행되는지</em> 보여줍니다.</h1>
      <p class="pg-lead">
        정책 경계, 모델 라우팅, 장애 복구와 서빙 의사결정을 실제 실행 순서 그대로 재생합니다.
        Model Routing의 두 시나리오는 방문자당 1회 실제 Gateway 요청을 보내고, 나머지는 공개 가능한
        execution trace를 재생합니다 — 각 시나리오 하단에 어느 쪽인지 표시됩니다.
      </p>
    </header>

    <section class="pg-console" aria-label="Systems playground console">
      <aside class="pg-sidebar">
        <div class="pg-panel-label">LABS</div>
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="pg-lab-button"
          :class="{ active: activeLab === tab.id }"
          type="button"
          @click="setLab(tab.id)"
        >
          <span>{{ tab.label }}</span>
          <small>{{ tab.meta }}</small>
        </button>

        <div class="pg-sidebar-note">
          <span class="status-dot"></span>
          <div>
            <strong>Execution boundary</strong>
            <p>외부 계정, shell, MCP, private API에 직접 연결하지 않습니다. Model Routing 두 시나리오만 별도 relay를 거쳐 Gateway에 방문자당 1회 요청합니다.</p>
          </div>
        </div>
      </aside>

      <div class="pg-main">
        <div class="pg-toolbar">
          <div>
            <span class="pg-panel-label">SCENARIO</span>
            <div class="pg-scenario-tabs">
              <button
                v-for="item in labScenarios"
                :key="item.id"
                :class="{ active: item.id === scenario.id }"
                type="button"
                @click="setScenario(item.id)"
              >
                {{ item.title }}
              </button>
            </div>
          </div>
          <button class="pg-run" type="button" :disabled="running || liveState === 'running'" @click="handleRun">
            <span>{{ runButtonLabel }}</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div class="pg-request-card">
          <div>
            <span class="pg-panel-label">{{ scenario.eyebrow }}</span>
            <h2>{{ scenario.title }}</h2>
            <p>{{ scenario.description }}</p>
          </div>
          <div class="pg-request-code">
            <span>request</span>
            <code>{{ scenario.request }}</code>
          </div>
        </div>

        <div v-if="scenario.live && liveState === 'done' && liveResult" class="pg-live-output">
          <span>live output</span>
          <code>{{ liveResult.outputText }}</code>
        </div>

        <div class="pg-trace-head">
          <span class="pg-panel-label">EXECUTION TRACE</span>
          <span :class="liveStatusClass">{{ displayedOutcome }}</span>
        </div>

        <ol class="pg-trace-list">
          <li
            v-for="(step, index) in displayedSteps"
            :key="`${scenario.id}-${step.name}`"
            :class="[
              `state-${step.state}`,
              { reached: activeStep >= index, current: activeStep === index },
            ]"
          >
            <div class="pg-step-index">{{ String(index + 1).padStart(2, '0') }}</div>
            <div class="pg-step-copy">
              <strong>{{ step.name }}</strong>
              <span>{{ step.detail }}</span>
            </div>
            <code>{{ step.latency ?? '—' }}</code>
            <div class="pg-step-state">{{ step.state }}</div>
          </li>
        </ol>
      </div>

      <aside class="pg-evidence">
        <div class="pg-panel-label">EVIDENCE</div>
        <dl>
          <div v-for="item in scenario.evidence" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>

        <div class="pg-receipt">
          <span class="pg-panel-label">PUBLICATION BOUNDARY</span>
          <p>{{ displayedNote }}</p>
        </div>

        <div class="pg-integrity">
          <span>{{ scenario.live ? 'execution mode' : 'fixture integrity' }}</span>
          <strong>{{ scenario.live ? 'LIVE · 1 CONCURRENT' : 'REPLAY' }}</strong>
        </div>
      </aside>
    </section>

    <section class="pg-explain">
      <div>
        <p class="pg-panel-label">How this is exposed</p>
        <h2>코드를 전부 공개하지 않아도<br>설계와 실행 품질은 증명할 수 있습니다.</h2>
      </div>
      <div class="pg-principles">
        <article>
          <h3>Execution evidence</h3>
          <p>README 설명보다 실제 실행 단계, 상태 전이, 검증 결과를 우선해서 보여줍니다.</p>
        </article>
        <article>
          <h3>Security boundary</h3>
          <p>credential, 내부 endpoint, 운영 로그와 원본 prompt는 공개 surface에 포함하지 않습니다.</p>
        </article>
        <article>
          <h3>Replaceable fixtures</h3>
          <p>향후 private CI가 생성한 sanitized JSON bundle로 동일 UI를 그대로 갱신할 수 있습니다.</p>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.playground-shell {
  width: min(1400px, calc(100% - 48px));
  margin: 0 auto;
  padding: 72px 0 112px;
  color: var(--ink);
}

.playground-hero {
  padding: 28px 0 54px;
}

.pg-panel-label {
  margin: 0;
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.playground-hero .status-dot { margin-bottom: 2px; }

.playground-hero h1 {
  max-width: 920px;
  margin: 20px 0 0;
  color: var(--ink);
  font-size: clamp(44px, 6vw, 76px);
  font-weight: 700;
  letter-spacing: -.065em;
  line-height: 1.08;
}

.playground-hero h1 em {
  color: var(--cobalt);
  font-style: normal;
}

.pg-lead {
  max-width: 760px;
  margin: 25px 0 0;
  color: var(--ink-soft);
  font-size: 16px;
  line-height: 1.85;
  word-break: keep-all;
}

.pg-console {
  display: grid;
  grid-template-columns: 220px minmax(500px, 1fr) 250px;
  min-height: 680px;
  overflow: hidden;
  border: 1px solid var(--mist-strong);
  border-radius: 6px;
  background: var(--paper-raised);
  box-shadow: 0 18px 52px color-mix(in srgb, var(--ink) 7%, transparent);
}

.pg-sidebar,
.pg-evidence {
  padding: 22px 18px;
  background: color-mix(in srgb, var(--paper) 72%, var(--paper-raised));
}

.pg-sidebar { border-right: 1px solid var(--mist-strong); }
.pg-evidence { border-left: 1px solid var(--mist-strong); }

.pg-lab-button {
  width: 100%;
  margin-top: 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  padding: 12px 11px;
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
}

.pg-lab-button span,
.pg-lab-button small { display: block; }
.pg-lab-button span { font-size: 12px; font-weight: 650; }
.pg-lab-button small { margin-top: 4px; color: var(--slate); font-family: var(--vp-font-family-mono); font-size: 9px; line-height: 1.5; }
.pg-lab-button:hover { background: var(--paper-raised); }
.pg-lab-button.active { border-color: color-mix(in srgb, var(--cobalt) 30%, var(--mist-strong)); background: var(--cobalt-soft); color: var(--cobalt); }

.pg-sidebar-note {
  display: flex;
  gap: 10px;
  margin-top: 32px;
  border-top: 1px solid var(--mist-strong);
  padding: 20px 9px 0;
}

.pg-sidebar-note .status-dot { flex: 0 0 auto; margin-top: 6px; }
.pg-sidebar-note strong { color: var(--ink); font-family: var(--vp-font-family-mono); font-size: 11px; }
.pg-sidebar-note p { margin: 5px 0 0; color: var(--slate); font-size: 11px; line-height: 1.6; }

.pg-main { min-width: 0; padding: 22px 24px 28px; }
.pg-toolbar { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
.pg-scenario-tabs { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 9px; }
.pg-scenario-tabs button {
  border: 1px solid var(--mist-strong);
  border-radius: 3px;
  background: transparent;
  padding: 7px 9px;
  color: var(--slate);
  font-size: 10px;
  cursor: pointer;
}
.pg-scenario-tabs button:hover { border-color: var(--cobalt); color: var(--cobalt); }
.pg-scenario-tabs button.active { border-color: var(--cobalt); background: var(--cobalt-soft); color: var(--cobalt); font-weight: 650; }

.pg-run {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-width: 132px;
  border: 1px solid var(--cobalt);
  border-radius: 3px;
  background: var(--cobalt);
  padding: 9px 11px;
  color: #fff;
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: .05em;
  cursor: pointer;
}
.pg-run:disabled { opacity: .72; cursor: default; }

.pg-request-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, .7fr);
  gap: 28px;
  margin-top: 34px;
  border: 1px solid var(--mist-strong);
  border-radius: 4px;
  background: color-mix(in srgb, var(--paper) 56%, transparent);
  padding: 20px;
}
.pg-request-card h2 { margin: 7px 0 0; border: 0; padding: 0; color: var(--ink); font-size: 22px; letter-spacing: -.035em; }
.pg-request-card p { margin: 8px 0 0; color: var(--ink-soft); font-size: 12px; line-height: 1.7; }
.pg-request-code { align-self: stretch; border-left: 2px solid var(--cobalt); background: var(--terminal); padding: 13px 14px; }
.pg-request-code span { display: block; color: #7f8da4; font-family: var(--vp-font-family-mono); font-size: 9px; text-transform: uppercase; }
.pg-request-code code { display: block; margin-top: 8px; color: #e7eefb; font-family: var(--vp-font-family-mono); font-size: 10px; line-height: 1.65; white-space: normal; }

.pg-live-output { margin-top: 16px; border-left: 2px solid var(--cobalt); background: var(--terminal); padding: 13px 14px; }
.pg-live-output span { display: block; color: var(--slate); font-family: var(--vp-font-family-mono); font-size: 10px; text-transform: uppercase; }
.pg-live-output code { display: block; margin-top: 8px; color: #e7eefb; font-family: var(--vp-font-family-mono); font-size: 11px; line-height: 1.7; white-space: pre-wrap; }

.pg-trace-head { display: flex; justify-content: space-between; gap: 20px; margin: 34px 0 10px; }
.pg-trace-head > span:last-child { color: var(--slate); font-family: var(--vp-font-family-mono); font-size: 10px; }
.pg-trace-head > span.live-ok,
.pg-trace-head > span.live-warn,
.pg-trace-head > span.live-bad { color: var(--ink); font-weight: 650; }
.pg-trace-list { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--mist-strong); }
.pg-trace-list li {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 96px 64px;
  gap: 12px;
  align-items: center;
  min-height: 66px;
  border-bottom: 1px solid var(--mist-strong);
  padding: 8px 8px 8px 0;
  opacity: .42;
  transition: opacity 180ms ease, background 180ms ease, transform 180ms ease;
}
.pg-trace-list li.reached { opacity: 1; }
.pg-trace-list li.current { background: color-mix(in srgb, var(--cobalt-soft) 55%, transparent); transform: translateX(4px); }
.pg-step-index { color: var(--slate); font-family: var(--vp-font-family-mono); font-size: 10px; }
.pg-step-copy strong { display: block; color: var(--ink); font-size: 12px; }
.pg-step-copy span { display: block; margin-top: 3px; color: var(--slate); font-size: 10px; }
.pg-trace-list code { color: var(--ink-soft); font-family: var(--vp-font-family-mono); font-size: 10px; text-align: right; }
.pg-step-state { color: var(--slate); font-family: var(--vp-font-family-mono); font-size: 9px; font-weight: 650; letter-spacing: .04em; text-align: right; text-transform: uppercase; }
.state-blocked .pg-step-state,
.state-fail .pg-step-state { color: var(--ink); }

.pg-evidence dl { margin: 14px 0 0; }
.pg-evidence dl > div { border-top: 1px solid var(--mist-strong); padding: 13px 0; }
.pg-evidence dt { color: var(--slate); font-family: var(--vp-font-family-mono); font-size: 10px; }
.pg-evidence dd { margin: 5px 0 0; color: var(--ink); font-family: var(--vp-font-family-mono); font-size: 11px; font-weight: 600; word-break: break-word; }
.pg-receipt { margin-top: 24px; border-top: 1px solid var(--mist-strong); padding-top: 18px; }
.pg-receipt p { margin: 9px 0 0; color: var(--ink-soft); font-size: 11px; line-height: 1.7; }
.pg-integrity { display: flex; justify-content: space-between; gap: 10px; margin-top: 28px; border: 1px solid var(--mist-strong); border-radius: 3px; background: var(--cobalt-soft); padding: 9px; font-family: var(--vp-font-family-mono); font-size: 9px; }
.pg-integrity span { color: var(--slate); }
.pg-integrity strong { color: var(--cobalt); }

.pg-explain { display: grid; grid-template-columns: minmax(280px, .8fr) minmax(0, 1.2fr); gap: 72px; padding-top: 96px; }
.pg-explain h2 { margin: 11px 0 0; color: var(--ink); font-size: clamp(28px, 3vw, 38px); letter-spacing: -.045em; line-height: 1.35; }
.pg-principles { border-top: 1px solid var(--mist-strong); }
.pg-principles article { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 18px; border-bottom: 1px solid var(--mist-strong); padding: 20px 0; }
.pg-principles h3 { margin: 0; color: var(--ink); font-size: 13px; }
.pg-principles p { margin: 0; color: var(--ink-soft); font-size: 11px; line-height: 1.7; }

@media (max-width: 1100px) {
  .pg-console { grid-template-columns: 190px minmax(0, 1fr); }
  .pg-evidence { grid-column: 1 / -1; border-top: 1px solid var(--mist-strong); border-left: 0; }
  .pg-evidence dl { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0 18px; }
  .pg-receipt { max-width: 620px; }
}

@media (max-width: 760px) {
  .playground-shell { width: min(100% - 28px, 1400px); padding-top: 42px; }
  .playground-hero h1 { font-size: clamp(39px, 12vw, 58px); }
  .pg-console { display: block; }
  .pg-sidebar { border-right: 0; border-bottom: 1px solid var(--mist-strong); }
  .pg-lab-button { display: inline-block; width: auto; margin-right: 5px; }
  .pg-sidebar-note { display: none; }
  .pg-toolbar { display: block; }
  .pg-run { margin-top: 18px; }
  .pg-request-card { grid-template-columns: 1fr; }
  .pg-request-code { border-left: 0; border-top: 2px solid var(--cobalt); }
  .pg-trace-list li { grid-template-columns: 30px minmax(0, 1fr) 64px; }
  .pg-step-state { display: none; }
  .pg-evidence dl { grid-template-columns: repeat(2, 1fr); }
  .pg-explain { grid-template-columns: 1fr; gap: 34px; padding-top: 72px; }
  .pg-principles article { grid-template-columns: minmax(0, 1fr); }
}
</style>

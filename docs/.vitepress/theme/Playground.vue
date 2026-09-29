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
    id: 'routing-live',
    lab: 'routing',
    live: true,
    eyebrow: 'Model Routing · Live Engine',
    title: '실제 프롬프트 처리 & 라우팅',
    description: '원하는 질문이나 지시를 직접 입력하면 GoVail Gateway가 실제 모델로 라우팅하고 생성 응답과 실행 지표를 반환합니다.',
    request: 'POST /v1/model-routing/run · engine=GoVail Gateway',
    outcome: '실행 대기 중 (프롬프트 입력 후 실행)',
    steps: [
      { name: 'Gateway', detail: 'request normalized & rate-limit check', latency: '3 ms', state: 'ok' },
      { name: 'Policy', detail: 'safety guard & origin verified', latency: '4 ms', state: 'ok' },
      { name: 'Router', detail: 'backend model routed', latency: '—', state: 'ok' },
      { name: 'Inference', detail: 'LLM prefill & token decode', latency: '—', state: 'ok' },
      { name: 'Trace', detail: 'live execution metrics emitted', latency: '—', state: 'ok' },
    ],
    evidence: [
      { label: 'engine', value: 'GoVail Gateway' },
      { label: 'model', value: 'govail/worker' },
      { label: 'mode', value: 'live inference' },
      { label: 'policy', value: 'rate_limited · single_lock' },
    ],
    note: '방문자가 입력한 프롬프트를 GoVail Gateway에서 실제로 처리한 결과입니다.',
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
  { id: 'routing', label: 'Model Routing (Live)', meta: '실제 프롬프트 처리 · 모델 라우팅' },
  { id: 'agent', label: 'Agent Policy (Replay)', meta: '정책 검증 · 승인 흐름 시연' },
  { id: 'serving', label: 'Serving Bench (Replay)', meta: '동시성 · Throughput 벤치마크' },
] as const

const activeLab = ref<(typeof tabs)[number]['id']>('routing')
const activeScenarioId = ref('routing-live')
const activeStep = ref(-1)
const running = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

// Live mode: exactly two Model Routing scenarios make one real request per
// run to a relay in front of GoVail Gateway. See architecture.md "예외:
// Playground · Model Routing 라이브 데모" — Agent Execution and Serving Lab
// stay pure replay.
const RELAY_URL = 'https://api.govail.cloud/v1/model-routing/run'
const LIVE_CLIENT_TIMEOUT_MS = 15_000

type LiveState = 'idle' | 'running' | 'locked' | 'rate_limited' | 'disabled' | 'error' | 'done'
type LiveResult = {
  outputText: string
  latencyMs: number
  tokensPerSec: number
  model?: string
  usage?: { promptTokens?: number | null; completionTokens?: number | null }
}

const userPrompt = ref('분산 시스템에서 멱등성(Idempotency)을 보장하는 방법 2가지를 설명해줘.')

const promptPresets = [
  { label: '멱등성 보장 기법', text: '분산 시스템에서 멱등성(Idempotency)을 보장하는 방법 2가지를 설명해줘.' },
  { label: '서킷 브레이커 원리', text: 'API 게이트웨이에서 서킷 브레이커(Circuit Breaker)의 상태 전이와 복구 기준은?' },
  { label: 'LLM 하이브리드 라우팅', text: '로컬 경량 LLM과 클라우드 고성능 LLM 간의 비용 최적화 라우팅 기준은?' },
  { label: '페일오버 동작 방식', text: '주 추론 백엔드가 응답 불가(Timeout)일 때 게이트웨이의 무중단 전환 원리를 설명해줘.' },
]

function setPreset(text: string) {
  userPrompt.value = text
}

const liveState = ref<LiveState>('idle')
const liveResult = ref<LiveResult | null>(null)
let liveAbort: AbortController | undefined
let liveFallbackTimer: ReturnType<typeof setTimeout> | undefined

const labScenarios = computed(() => scenarios.filter((scenario) => scenario.lab === activeLab.value))
const scenario = computed(() => scenarios.find((item) => item.id === activeScenarioId.value) ?? labScenarios.value[0])

const runButtonLabel = computed(() => {
  if (running.value || liveState.value === 'running') return 'RUNNING...'
  return scenario.value.live ? '프롬프트 실행' : 'RUN REPLAY'
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
    return `live run — ${liveResult.value.latencyMs}ms · ${liveResult.value.tokensPerSec.toFixed(1)} tok/s · ${liveResult.value.model || 'govail/worker'}`
  }
  if (liveState.value === 'locked') return 'locked — 다른 사용자의 요청을 처리 중입니다'
  if (liveState.value === 'rate_limited') return 'rate limited — 요청 한도 초과 (잠시 후 다시 시도)'
  if (liveState.value === 'disabled') return 'live mode disabled — 라이브 비활성화 상태'
  if (liveState.value === 'error') return 'live demo unavailable — 일시적 오류'
  return s.outcome
})

const displayedSteps = computed(() => {
  const s = scenario.value
  if (!s.live || (liveState.value !== 'running' && liveState.value !== 'done')) {
    return s.steps
  }
  return s.steps.map((step, index) => {
    if (liveState.value === 'done' && liveResult.value) {
      if (index === 2) {
        return { ...step, detail: `routed to ${liveResult.value.model || 'govail/worker'}` }
      }
      if (index === s.steps.length - 2) {
        return { ...step, latency: `${liveResult.value.tokensPerSec.toFixed(1)} tok/s` }
      }
      if (index === s.steps.length - 1) {
        return { ...step, detail: 'live inference recorded', latency: `${liveResult.value.latencyMs} ms` }
      }
    }
    return { ...step, latency: undefined }
  })
})

const displayedEvidence = computed(() => {
  if (scenario.value.live && liveState.value === 'done' && liveResult.value) {
    return [
      { label: 'engine', value: 'GoVail Gateway' },
      { label: 'model', value: liveResult.value.model || 'govail/worker' },
      { label: 'latency', value: `${liveResult.value.latencyMs} ms` },
      { label: 'throughput', value: `${liveResult.value.tokensPerSec.toFixed(1)} tok/s` },
      { label: 'prompt_tokens', value: `${liveResult.value.usage?.promptTokens ?? '-'}` },
      { label: 'output_tokens', value: `${liveResult.value.usage?.completionTokens ?? '-'}` },
    ]
  }
  return scenario.value.evidence
})

const displayedNote = computed(() => {
  const s = scenario.value
  if (s.live && liveState.value === 'done') {
    return '방문자가 입력한 프롬프트를 GoVail Gateway에 실제로 전송하여 실시간 생성된 응답입니다.'
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
  if (id === 'routing-failover') {
    userPrompt.value = '장애 발생 시 로컬 백엔드에서 백업 백엔드로 전환되는 페일오버 원리를 2문장으로 설명해줘.'
  } else if (id === 'routing-timeout') {
    userPrompt.value = '추론 백엔드 타임아웃 발생 시 게이트웨이가 서킷을 열고 대체 경로로 복구하는 방식을 2문장으로 설명해줘.'
  } else if (id === 'routing-live') {
    userPrompt.value = '분산 시스템에서 멱등성(Idempotency)을 보장하는 방법 2가지를 설명해줘.'
  }
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
  const promptToSend = userPrompt.value.trim()
  if (!promptToSend) {
    return
  }

  stopReplay()
  liveState.value = 'running'
  running.value = true
  activeStep.value = 0

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
      body: JSON.stringify({ prompt: promptToSend }),
      signal: liveAbort.signal,
    })
    const payload = await response.json()

    if (payload.status === 'ok') {
      liveResult.value = {
        outputText: payload.outputText,
        latencyMs: payload.latencyMs,
        tokensPerSec: payload.tokensPerSec,
        model: payload.model,
        usage: payload.usage,
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
        원하는 프롬프트를 직접 입력해 GoVail Gateway를 통한 실시간 모델 라우팅 및 추론 결과를 확인할 수 있습니다.
        정책 경계 및 서빙 벤치마크 랩에서는 실제 환경의 trace 증적과 성능 지표를 함께 비교합니다.
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
            <p>Model Routing은 GoVail Gateway를 통해 실제 실시간 추론을 수행합니다. Agent 및 Serving 랩은 안전한 trace 증적으로 시연됩니다.</p>
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

        <div class="pg-request-card" :class="{ 'is-live-card': scenario.live }">
          <div class="pg-scenario-info">
            <span class="pg-panel-label">{{ scenario.eyebrow }}</span>
            <h2>{{ scenario.title }}</h2>
            <p>{{ scenario.description }}</p>
          </div>

          <div v-if="scenario.live" class="pg-prompt-box">
            <div class="pg-prompt-head">
              <label for="prompt-input" class="pg-prompt-label">실제 프롬프트 입력 (LIVE PROMPT)</label>
              <span class="pg-char-count">{{ userPrompt.length }} / 400</span>
            </div>
            <textarea
              id="prompt-input"
              v-model="userPrompt"
              class="pg-prompt-textarea"
              rows="3"
              maxlength="400"
              placeholder="실제 처리할 프롬프트를 입력하세요... (Ctrl+Enter로 실행)"
              :disabled="running || liveState === 'running'"
              @keydown.ctrl.enter="handleRun"
              @keydown.meta.enter="handleRun"
            ></textarea>
            <div class="pg-preset-chips">
              <span class="pg-chip-lead">추천 질문:</span>
              <button
                v-for="preset in promptPresets"
                :key="preset.label"
                type="button"
                class="pg-chip-btn"
                :disabled="running || liveState === 'running'"
                @click="setPreset(preset.text)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>

          <div v-else class="pg-request-code">
            <span>request</span>
            <code>{{ scenario.request }}</code>
          </div>
        </div>

        <div v-if="scenario.live && liveState === 'done' && liveResult" class="pg-live-output">
          <div class="pg-output-header">
            <div class="pg-output-tag-group">
              <span class="status-dot"></span>
              <span class="pg-output-title">LIVE MODEL RESPONSE</span>
              <span class="pg-output-model">{{ liveResult.model || 'govail/worker' }}</span>
            </div>
            <div class="pg-output-metrics">
              <span>⏱ {{ liveResult.latencyMs }}ms</span>
              <span>⚡ {{ liveResult.tokensPerSec.toFixed(1) }} tok/s</span>
              <span v-if="liveResult.usage?.completionTokens">🔤 {{ liveResult.usage.completionTokens }} tok</span>
            </div>
          </div>
          <div class="pg-output-body">{{ liveResult.outputText }}</div>
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
          <div v-for="item in displayedEvidence" :key="item.label">
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
.pg-request-card.is-live-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.pg-request-card h2 { margin: 7px 0 0; border: 0; padding: 0; color: var(--ink); font-size: 22px; letter-spacing: -.035em; }
.pg-request-card p { margin: 8px 0 0; color: var(--ink-soft); font-size: 12px; line-height: 1.7; }
.pg-request-code { align-self: stretch; border-left: 2px solid var(--cobalt); background: var(--terminal); padding: 13px 14px; }
.pg-request-code span { display: block; color: #7f8da4; font-family: var(--vp-font-family-mono); font-size: 9px; text-transform: uppercase; }
.pg-request-code code { display: block; margin-top: 8px; color: #e7eefb; font-family: var(--vp-font-family-mono); font-size: 10px; line-height: 1.65; white-space: normal; }

.pg-prompt-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.pg-prompt-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pg-prompt-label {
  color: var(--cobalt);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: .05em;
  text-transform: uppercase;
}
.pg-char-count {
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
}
.pg-prompt-textarea {
  width: 100%;
  min-height: 84px;
  padding: 12px 14px;
  border: 1px solid var(--mist-strong);
  border-radius: 4px;
  background: var(--paper-raised);
  color: var(--ink);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  box-sizing: border-box;
}
.pg-prompt-textarea:focus {
  outline: none;
  border-color: var(--cobalt);
  box-shadow: 0 0 0 2px var(--cobalt-soft);
}
.pg-prompt-textarea:disabled {
  opacity: 0.65;
  background: color-mix(in srgb, var(--paper) 80%, var(--mist-strong));
  cursor: not-allowed;
}
.pg-preset-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.pg-chip-lead {
  color: var(--slate);
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
}
.pg-chip-btn {
  border: 1px solid var(--mist-strong);
  border-radius: 12px;
  background: var(--paper-raised);
  padding: 4px 11px;
  color: var(--ink-soft);
  font-size: 11px;
  cursor: pointer;
  transition: all 150ms ease;
}
.pg-chip-btn:hover:not(:disabled) {
  border-color: var(--cobalt);
  color: var(--cobalt);
  background: var(--cobalt-soft);
}
.pg-chip-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pg-live-output {
  margin-top: 20px;
  border-left: 3px solid var(--cobalt);
  background: var(--terminal);
  border-radius: 4px;
  padding: 16px 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
.pg-output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.pg-output-tag-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pg-output-title {
  color: #fff;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .06em;
}
.pg-output-model {
  background: rgba(47, 91, 234, 0.3);
  color: #a5b4fc;
  border: 1px solid rgba(47, 91, 234, 0.5);
  border-radius: 3px;
  padding: 2px 7px;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
}
.pg-output-metrics {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #94a3b8;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}
.pg-output-body {
  margin-top: 14px;
  color: #f1f5f9;
  font-size: 13px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

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

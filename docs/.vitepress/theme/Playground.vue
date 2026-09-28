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

const labScenarios = computed(() => scenarios.filter((scenario) => scenario.lab === activeLab.value))
const scenario = computed(() => scenarios.find((item) => item.id === activeScenarioId.value) ?? labScenarios.value[0])

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

onBeforeUnmount(stopReplay)
</script>

<template>
  <main class="playground-shell">
    <header class="playground-hero">
      <div>
        <p class="pg-kicker"><span></span> AI SYSTEMS PLAYGROUND</p>
        <h1>시스템이 어떻게 판단하고<br><em>실행되는지</em> 보여줍니다.</h1>
        <p class="pg-lead">
          실제 운영 소스 대신 공개 가능한 execution trace와 benchmark fixture를 재생합니다.
          정책 경계, 라우팅, 장애 복구와 서빙 의사결정을 한 화면에서 확인할 수 있습니다.
        </p>
      </div>
      <div class="pg-badges" aria-label="playground mode">
        <span>REPLAY</span>
        <span>SANITIZED</span>
        <span>NO LIVE WRITE</span>
      </div>
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
          <span class="pg-status-dot"></span>
          <div>
            <strong>Safe replay mode</strong>
            <p>외부 계정, shell, MCP, private API에 연결하지 않습니다.</p>
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
          <button class="pg-run" type="button" :disabled="running" @click="replay">
            <span>{{ running ? 'RUNNING' : 'RUN REPLAY' }}</span>
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

        <div class="pg-trace-head">
          <span class="pg-panel-label">EXECUTION TRACE</span>
          <span>{{ scenario.outcome }}</span>
        </div>

        <ol class="pg-trace-list">
          <li
            v-for="(step, index) in scenario.steps"
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
          <p>{{ scenario.note }}</p>
        </div>

        <div class="pg-integrity">
          <span>fixture integrity</span>
          <strong>PUBLIC SAFE</strong>
        </div>
      </aside>
    </section>

    <section class="pg-explain">
      <div>
        <p class="pg-panel-label">WHY REPLAY</p>
        <h2>코드를 전부 공개하지 않아도<br>설계와 실행 품질은 증명할 수 있습니다.</h2>
      </div>
      <div class="pg-principles">
        <article>
          <span>01</span>
          <h3>Execution evidence</h3>
          <p>README 설명보다 실제 실행 단계, 상태 전이, 검증 결과를 우선해서 보여줍니다.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Security boundary</h3>
          <p>credential, 내부 endpoint, 운영 로그와 원본 prompt는 공개 surface에 포함하지 않습니다.</p>
        </article>
        <article>
          <span>03</span>
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 48px;
  align-items: end;
  padding: 28px 0 54px;
}

.pg-kicker,
.pg-panel-label {
  margin: 0;
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.pg-kicker span {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin: 0 9px 1px 0;
  border-radius: 2px;
  background: var(--cobalt);
  box-shadow: 0 0 0 4px var(--cobalt-soft);
}

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

.pg-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
  padding-bottom: 7px;
}

.pg-badges span {
  border: 1px solid var(--mist-strong);
  border-radius: 3px;
  background: var(--paper-raised);
  padding: 7px 9px;
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: .06em;
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

.pg-status-dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  margin-top: 5px;
  border-radius: 50%;
  background: #38a169;
  box-shadow: 0 0 0 3px color-mix(in srgb, #38a169 14%, transparent);
}

.pg-sidebar-note strong { color: var(--ink); font-family: var(--vp-font-family-mono); font-size: 10px; }
.pg-sidebar-note p { margin: 5px 0 0; color: var(--slate); font-size: 10px; line-height: 1.6; }

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

.pg-trace-head { display: flex; justify-content: space-between; gap: 20px; margin: 34px 0 10px; }
.pg-trace-head > span:last-child { color: var(--slate); font-family: var(--vp-font-family-mono); font-size: 9px; }
.pg-trace-list { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--mist-strong); }
.pg-trace-list li {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 96px 58px;
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
.pg-step-index { color: var(--slate); font-family: var(--vp-font-family-mono); font-size: 9px; }
.pg-step-copy strong { display: block; color: var(--ink); font-size: 12px; }
.pg-step-copy span { display: block; margin-top: 3px; color: var(--slate); font-size: 10px; }
.pg-trace-list code { color: var(--ink-soft); font-family: var(--vp-font-family-mono); font-size: 9px; text-align: right; }
.pg-step-state { font-family: var(--vp-font-family-mono); font-size: 8px; font-weight: 650; letter-spacing: .04em; text-align: right; text-transform: uppercase; }
.state-ok .pg-step-state { color: #2f855a; }
.state-warn .pg-step-state { color: #b7791f; }
.state-blocked .pg-step-state,
.state-fail .pg-step-state { color: #c53030; }

.pg-evidence dl { margin: 14px 0 0; }
.pg-evidence dl > div { border-top: 1px solid var(--mist-strong); padding: 13px 0; }
.pg-evidence dt { color: var(--slate); font-family: var(--vp-font-family-mono); font-size: 9px; }
.pg-evidence dd { margin: 5px 0 0; color: var(--ink); font-family: var(--vp-font-family-mono); font-size: 10px; font-weight: 600; word-break: break-word; }
.pg-receipt { margin-top: 24px; border-top: 1px solid var(--mist-strong); padding-top: 18px; }
.pg-receipt p { margin: 9px 0 0; color: var(--ink-soft); font-size: 10px; line-height: 1.7; }
.pg-integrity { display: flex; justify-content: space-between; gap: 10px; margin-top: 28px; border: 1px solid color-mix(in srgb, #38a169 30%, var(--mist-strong)); border-radius: 3px; background: color-mix(in srgb, #38a169 7%, transparent); padding: 9px; font-family: var(--vp-font-family-mono); font-size: 8px; }
.pg-integrity span { color: var(--slate); }
.pg-integrity strong { color: #2f855a; }

.pg-explain { display: grid; grid-template-columns: minmax(280px, .8fr) minmax(0, 1.2fr); gap: 72px; padding-top: 96px; }
.pg-explain h2 { margin: 11px 0 0; color: var(--ink); font-size: clamp(28px, 3vw, 38px); letter-spacing: -.045em; line-height: 1.35; }
.pg-principles { border-top: 1px solid var(--mist-strong); }
.pg-principles article { display: grid; grid-template-columns: 38px 150px minmax(0, 1fr); gap: 18px; border-bottom: 1px solid var(--mist-strong); padding: 20px 0; }
.pg-principles article > span { color: var(--cobalt); font-family: var(--vp-font-family-mono); font-size: 9px; }
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
  .playground-hero { grid-template-columns: 1fr; gap: 24px; }
  .playground-hero h1 { font-size: clamp(39px, 12vw, 58px); }
  .pg-badges { justify-content: flex-start; }
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
  .pg-principles article { grid-template-columns: 30px minmax(0, 1fr); }
  .pg-principles p { grid-column: 2; }
}
</style>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

const API_BASE_URL = 'https://local-llm-gateway-d8ikelzd.an.gateway.dev'
const DEMO_KEY = import.meta.env.VITE_PORTFOLIO_DEMO_KEY as string | undefined
const MAX_PROMPT_CHARS = 1600
const RESPONSE_GUARDRAIL = '입력에 없는 구현 방식, 수치, SLO 또는 장애 원인을 사실처럼 만들지 않는다. 정보가 부족하면 확인 필요 또는 가정으로 구분한다. 답변은 10개 항목 이내의 일반 텍스트로 작성한다.'
const IDENTITY_GUARDRAIL = '모델 이름, 벤더, 버전과 비공개 인프라 식별자는 공개하지 않는다. 모델 정체성 질문에는 "이 데모의 AI 어시스턴트입니다"라고만 답한다.'

type DemoStatus = 'checking' | 'online' | 'offline'
type ScenarioId = 'architecture' | 'incident' | 'security'
type RuntimeId = 'edge' | 'policy' | 'routing' | 'inference' | 'audit'
type RequestStage = 'ready' | RuntimeId | 'complete' | 'failed'

interface Scenario {
  id: ScenarioId
  label: string
  title: string
  summary: string
  prompt: string
  system: string
}

interface RuntimeNode {
  id: RuntimeId
  step: string
  eyebrow: string
  title: string
  summary: string
  responsibility: string
  contract: string
  failure: string
  signal: string
}

const runtimeNodes: RuntimeNode[] = [
  {
    id: 'edge',
    step: '01',
    eyebrow: 'PUBLIC EDGE',
    title: 'API Gateway',
    summary: '공개 요청의 단일 진입점',
    responsibility: '브라우저 요청을 공개 Endpoint에서 수신하고 허용된 Origin과 메서드만 내부 경계로 전달합니다.',
    contract: 'HTTPS · CORS · OpenAI-compatible request',
    failure: '잘못된 Origin, 요청 형식 또는 공개 경로 오류는 내부 Runtime에 도달하기 전에 종료됩니다.',
    signal: 'HTTP status · request start · edge latency',
  },
  {
    id: 'policy',
    step: '02',
    eyebrow: 'ZERO TRUST',
    title: 'Identity & Policy',
    summary: 'Project 범위와 정책 검사',
    responsibility: '체험용 Key Hash를 프로젝트에 매핑하고 요청 빈도, 허용 모델, 입력 크기와 DLP 정책을 검사합니다.',
    contract: 'portfolio-demo · role=demo · model=auto',
    failure: '인증 실패, 정책 위반과 자원 상한 초과는 명시적인 4xx 응답으로 차단됩니다.',
    signal: 'project · policy result · rejection reason',
  },
  {
    id: 'routing',
    step: '03',
    eyebrow: 'CONTROL PLANE',
    title: 'Model Routing',
    summary: '공개 별칭을 실행 대상에 매핑',
    responsibility: '공개 화면에는 단일 auto 별칭만 노출하고 내부 모델 선택과 장애 전환 책임을 Gateway 뒤에 둡니다.',
    contract: 'public alias → policy-approved target',
    failure: '허용되지 않은 모델 직접 지정과 내부 Model ID 탐색을 차단합니다.',
    signal: 'route alias · upstream class · retry outcome',
  },
  {
    id: 'inference',
    step: '04',
    eyebrow: 'PRIVATE DATA PLANE',
    title: 'LLM Runtime',
    summary: '사설 추론과 응답 생성',
    responsibility: '정책을 통과한 요청만 사설 추론 Runtime에서 처리합니다. 긴 추론 동안에도 Reasoning 원문은 공개하지 않습니다.',
    contract: 'bounded prompt · guarded system context',
    failure: 'Timeout과 Upstream 오류는 공개 가능한 메시지로 치환되고 비공개 구성은 응답에서 제거됩니다.',
    signal: 'inference state · usage when available · timeout',
  },
  {
    id: 'audit',
    step: '05',
    eyebrow: 'OBSERVABILITY',
    title: 'Audit & Response',
    summary: '응답 반환과 운영 감사',
    responsibility: '최종 응답을 브라우저에 반환하고 상태, 지연과 정책 결과를 프로젝트 단위 감사 이벤트로 남깁니다.',
    contract: 'buffered response · metadata-only audit',
    failure: '프롬프트, 답변 원문과 Authorization 값은 포트폴리오 분석 로그에 저장하지 않습니다.',
    signal: 'status · latency · project · trace metadata',
  },
]

const scenarios: Scenario[] = [
  {
    id: 'architecture',
    label: 'SYSTEM DESIGN',
    title: 'Architecture Review',
    summary: '설계 경계와 검증 순서를 확인합니다.',
    prompt: '팀별로 서로 다른 모델을 사용하는 사내 AI 플랫폼을 준비하고 있습니다. 인증, 비용 통제, 장애 대응까지 고려할 때 초기 설계에서 먼저 결정해야 할 사항을 검토해 주세요.',
    system: `당신은 시니어 AI 플랫폼 아키텍트다. 요구사항, 설계 경계, 트레이드오프, 검증 계획 순서로 답한다. ${RESPONSE_GUARDRAIL} ${IDENTITY_GUARDRAIL}`,
  },
  {
    id: 'incident',
    label: 'PRODUCTION OPS',
    title: 'Incident Triage',
    summary: '관측 신호에서 조치 순서를 만듭니다.',
    prompt: 'LLM API의 응답 지연과 429 오류가 동시에 증가했습니다. 배포 변경은 없지만 요청 대기열과 GPU 사용률이 평소보다 높습니다. 먼저 확인할 가설과 즉시 조치를 정리해 주세요.',
    system: `당신은 시니어 SRE이자 AI 추론 플랫폼 엔지니어다. 관측 사실, 원인 가설과 반증 조건, 안전한 즉시 조치, 재발 방지 순서로 답한다. ${RESPONSE_GUARDRAIL} ${IDENTITY_GUARDRAIL}`,
  },
  {
    id: 'security',
    label: 'CHANGE SAFETY',
    title: 'Security Review',
    summary: '보안·격리 회귀 위험을 찾습니다.',
    prompt: 'API 인증 결과를 메모리에 캐시해 응답 지연을 줄이려고 합니다. 인증 저장소 장애 시에는 만료된 캐시를 임시로 허용하는 방안도 포함되어 있습니다. 보안과 테넌트 격리 관점에서 위험을 검토해 주세요.',
    system: `당신은 보안과 신뢰성을 담당하는 시니어 리뷰어다. 승인 판단, 보안·격리 위험, 필수 테스트, 안전한 대안 순서로 답한다. ${RESPONSE_GUARDRAIL} ${IDENTITY_GUARDRAIL}`,
  },
]

const selectedScenarioId = ref<ScenarioId>('architecture')
const selectedNodeId = ref<RuntimeId>('edge')
const prompt = ref(scenarios[0].prompt)
const responseText = ref('')
const errorMessage = ref('')
const status = ref<DemoStatus>('checking')
const requestStage = ref<RequestStage>('ready')
const isSubmitting = ref(false)
const tracePanel = ref<HTMLElement | null>(null)
let stageTimers: ReturnType<typeof setTimeout>[] = []

const selectedScenario = computed(() =>
  scenarios.find((scenario) => scenario.id === selectedScenarioId.value) ?? scenarios[0],
)
const selectedNode = computed(() =>
  runtimeNodes.find((node) => node.id === selectedNodeId.value) ?? runtimeNodes[0],
)
const remainingChars = computed(() => MAX_PROMPT_CHARS - prompt.value.length)
const canSubmit = computed(() =>
  Boolean(DEMO_KEY) && status.value === 'online' && !isSubmitting.value && prompt.value.trim().length > 0,
)
const stageLabel = computed(() => ({
  ready: '실행 준비',
  edge: '공개 요청 수신',
  policy: '인증·정책 검사',
  routing: '실행 경로 선택',
  inference: '사설 Runtime 추론',
  audit: '응답·감사 처리',
  complete: '요청 완료',
  failed: '요청 종료',
})[requestStage.value])
const submitLabel = computed(() => {
  if (!DEMO_KEY) return '배포 환경에서 실행 가능'
  if (status.value === 'checking') return 'Runtime 확인 중'
  if (status.value === 'offline') return 'Runtime 연결 지연'
  if (isSubmitting.value) return stageLabel.value
  return '런타임 요청 실행'
})

onMounted(checkHealth)

function selectScenario(scenario: Scenario) {
  if (isSubmitting.value) return
  selectedScenarioId.value = scenario.id
  prompt.value = scenario.prompt
  responseText.value = ''
  errorMessage.value = ''
  requestStage.value = 'ready'
}

function selectRuntimeNode(node: RuntimeNode) {
  selectedNodeId.value = node.id
}

function nodeState(node: RuntimeNode) {
  if (requestStage.value === 'ready' || requestStage.value === 'failed') return 'idle'
  if (requestStage.value === 'complete') return 'complete'
  const activeIndex = runtimeNodes.findIndex((item) => item.id === requestStage.value)
  const nodeIndex = runtimeNodes.findIndex((item) => item.id === node.id)
  if (nodeIndex < activeIndex) return 'complete'
  if (nodeIndex === activeIndex) return 'active'
  return 'pending'
}

async function checkHealth() {
  status.value = 'checking'
  try {
    const result = await fetch(`${API_BASE_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    })
    status.value = result.ok ? 'online' : 'offline'
  } catch {
    status.value = 'offline'
  }
}

function beginWalkthrough() {
  clearStageTimers()
  requestStage.value = 'edge'
  selectedNodeId.value = 'edge'
  const schedule = (delay: number, stage: RuntimeId) => {
    stageTimers.push(setTimeout(() => {
      if (!isSubmitting.value || requestStage.value === 'failed') return
      requestStage.value = stage
      selectedNodeId.value = stage
    }, delay))
  }
  schedule(500, 'policy')
  schedule(1_200, 'routing')
  schedule(2_000, 'inference')
}

function clearStageTimers() {
  stageTimers.forEach(clearTimeout)
  stageTimers = []
}

async function submitPrompt() {
  if (!canSubmit.value || !DEMO_KEY) return

  isSubmitting.value = true
  responseText.value = ''
  errorMessage.value = ''
  beginWalkthrough()
  await nextTick()
  tracePanel.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

  try {
    const result = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DEMO_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'auto',
        messages: [
          { role: 'system', content: selectedScenario.value.system },
          { role: 'user', content: prompt.value.trim() },
        ],
        stream: true,
        temperature: 0.5,
        top_p: 0.9,
      }),
      signal: AbortSignal.timeout(180_000),
    })

    if (!result.ok) {
      const data = await result.json().catch(() => null)
      throw new Error(publicErrorMessage(result.status, data))
    }

    requestStage.value = 'inference'
    selectedNodeId.value = 'inference'
    const content = await consumeResponse(result)
    if (!content.trim()) throw new Error('최종 응답이 비어 있습니다. 입력을 더 구체적으로 바꿔 주세요.')

    responseText.value = content.trim()
    requestStage.value = 'audit'
    selectedNodeId.value = 'audit'
    await nextTick()
    requestStage.value = 'complete'
  } catch (error) {
    requestStage.value = 'failed'
    errorMessage.value = error instanceof Error
      ? error.message
      : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    clearStageTimers()
    isSubmitting.value = false
  }
}

async function consumeResponse(result: Response) {
  const contentType = result.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const payload = await result.json()
    return payload?.choices?.[0]?.message?.content ?? ''
  }
  if (!result.body) throw new Error('응답 스트림을 시작하지 못했습니다.')

  const reader = result.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    if (done && buffer.trim()) buffer += '\n\n'
    const frames = buffer.split(/\r?\n\r?\n/)
    buffer = frames.pop() ?? ''

    for (const frame of frames) {
      const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n')
      if (!data || data === '[DONE]') continue

      const event = JSON.parse(data)
      if (event?.error) throw new Error(publicErrorMessage(502, event))
      const delta = event?.choices?.[0]?.delta
      if (typeof delta?.content === 'string' && delta.content) {
        fullContent += delta.content
        responseText.value = fullContent
      }
    }
    if (done) break
  }
  return fullContent
}

function publicErrorMessage(statusCode: number, data: any) {
  if (statusCode === 401) return '체험용 인증 경계를 통과하지 못했습니다.'
  if (statusCode === 429) return '현재 체험 요청이 많습니다. 잠시 후 다시 시도해 주세요.'
  if (statusCode >= 500) return '사설 Runtime 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
  const upstream = data?.error?.message ?? data?.error
  return typeof upstream === 'string' && upstream.length <= 160
    ? upstream
    : 'Gateway 정책에 의해 요청이 종료되었습니다.'
}
</script>

<template>
  <section class="live-demo" aria-labelledby="live-demo-title">
    <header class="live-demo__header">
      <div class="live-demo__heading">
        <p class="live-demo__eyebrow">AI PLATFORM · RUNTIME WALKTHROUGH</p>
        <h2 id="live-demo-title">요청이 사설 LLM에 도달하기까지</h2>
        <p>노드를 눌러 실행 경계를 살펴본 뒤, 실제 요청으로 정책 검사부터 최종 응답까지 확인할 수 있습니다.</p>
      </div>
      <button class="live-demo__status" type="button" :data-state="status" :aria-label="`Runtime 상태: ${status}`" @click="checkHealth">
        <span aria-hidden="true" />
        <strong>{{ status === 'online' ? 'Runtime online' : status === 'checking' ? 'Checking runtime' : 'Runtime delayed' }}</strong>
        <small>새로 확인</small>
      </button>
    </header>

    <div class="runtime-architecture">
      <div class="runtime-architecture__bar">
        <div>
          <span>RUNTIME ARCHITECTURE</span>
          <strong>5개의 실행 경계 · 노드를 선택해 상세 확인</strong>
        </div>
        <span>Client → Private Runtime → Observability</span>
      </div>

      <div class="runtime-nodes" aria-label="런타임 아키텍처 단계">
        <button
          v-for="node in runtimeNodes"
          :key="node.id"
          type="button"
          :class="{ 'is-selected': selectedNodeId === node.id }"
          :data-run-state="nodeState(node)"
          :aria-pressed="selectedNodeId === node.id"
          @click="selectRuntimeNode(node)"
        >
          <span class="runtime-node__index">{{ node.step }}</span>
          <span class="runtime-node__copy">
            <small>{{ node.eyebrow }}</small>
            <strong>{{ node.title }}</strong>
            <span>{{ node.summary }}</span>
          </span>
          <span class="runtime-node__state" aria-hidden="true" />
        </button>
      </div>

      <article class="runtime-detail" aria-live="polite">
        <div class="runtime-detail__lead">
          <span>{{ selectedNode.step }} · {{ selectedNode.eyebrow }}</span>
          <h3>{{ selectedNode.title }}</h3>
          <p>{{ selectedNode.responsibility }}</p>
        </div>
        <dl>
          <div>
            <dt>Interface contract</dt>
            <dd>{{ selectedNode.contract }}</dd>
          </div>
          <div>
            <dt>Failure boundary</dt>
            <dd>{{ selectedNode.failure }}</dd>
          </div>
          <div>
            <dt>Observable signal</dt>
            <dd>{{ selectedNode.signal }}</dd>
          </div>
        </dl>
      </article>
    </div>

    <div class="live-workbench">
      <div class="live-workbench__input">
        <div class="workbench-label">
          <span>01 · REVIEW SCENARIO</span>
          <small>예제를 고르면 입력이 즉시 준비됩니다.</small>
        </div>
        <div class="scenario-switcher" aria-label="검토 시나리오">
          <button
            v-for="scenario in scenarios"
            :key="scenario.id"
            type="button"
            :class="{ 'is-selected': selectedScenarioId === scenario.id }"
            :aria-pressed="selectedScenarioId === scenario.id"
            :disabled="isSubmitting"
            @click="selectScenario(scenario)"
          >
            <small>{{ scenario.label }}</small>
            <strong>{{ scenario.title }}</strong>
            <span>{{ scenario.summary }}</span>
          </button>
        </div>

        <form class="prompt-console" @submit.prevent="submitPrompt">
          <div class="prompt-console__head">
            <label for="live-demo-prompt">검토할 컨텍스트</label>
            <span>{{ remainingChars.toLocaleString() }}자 남음</span>
          </div>
          <textarea id="live-demo-prompt" v-model="prompt" :maxlength="MAX_PROMPT_CHARS" rows="6" autocomplete="off" spellcheck="true" />
          <div class="prompt-console__action">
            <p>실제 응답은 Runtime 상태에 따라 최대 3분 정도 걸릴 수 있습니다.</p>
            <button type="submit" :disabled="!canSubmit">{{ submitLabel }}</button>
          </div>
        </form>
      </div>

      <div ref="tracePanel" class="request-trace" aria-live="polite">
        <div class="workbench-label">
          <span>02 · REQUEST TRACE</span>
          <small>브라우저 관찰 상태 · 서버 내부 Trace 비공개</small>
        </div>

        <div class="request-trace__status" :data-stage="requestStage">
          <div>
            <span class="request-trace__pulse" aria-hidden="true" />
            <div>
              <small>CURRENT STATE</small>
              <strong>{{ stageLabel }}</strong>
            </div>
          </div>
          <span>{{ isSubmitting ? '요청 처리 중' : requestStage === 'complete' ? '완료' : '대기' }}</span>
        </div>

        <ol class="trace-steps">
          <li v-for="node in runtimeNodes" :key="node.id" :data-state="nodeState(node)">
            <span>{{ node.step }}</span>
            <div>
              <strong>{{ node.title }}</strong>
              <small>{{ node.summary }}</small>
            </div>
            <b>{{ nodeState(node) === 'complete' ? 'PASS' : nodeState(node) === 'active' ? 'ACTIVE' : 'WAIT' }}</b>
          </li>
        </ol>

        <div v-if="errorMessage" class="request-result request-result--error" role="alert">
          <span>REQUEST TERMINATED</span>
          <strong>{{ errorMessage }}</strong>
        </div>
        <article v-else-if="responseText" class="request-result">
          <div>
            <span>FINAL RESPONSE</span>
            <strong>{{ selectedScenario.title }}</strong>
          </div>
          <pre>{{ responseText }}</pre>
        </article>
        <div v-else class="request-trace__empty">
          <strong>실행 전에도 아키텍처를 검토할 수 있습니다.</strong>
          <p>상단 노드를 선택하면 각 단계의 계약, 실패 경계와 관측 신호가 표시됩니다.</p>
        </div>
      </div>
    </div>

    <footer class="live-demo__footer">
      <div>
        <span>PUBLIC DEMO BOUNDARY</span>
        <strong>원문 비저장 · 모델 식별자 비공개 · Project 단위 자원 제한</strong>
      </div>
      <nav aria-label="관련 프로젝트">
        <a href="/projects/govail-gateway">Gateway 구현 근거</a>
        <a href="/projects/agentsecops-playground">보안 회귀 검증</a>
      </nav>
    </footer>
  </section>
</template>

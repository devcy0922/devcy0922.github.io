<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

const API_BASE_URL = 'https://local-llm-gateway-d8ikelzd.an.gateway.dev'
const DEMO_KEY = import.meta.env.VITE_PORTFOLIO_DEMO_KEY as string | undefined
const MAX_PROMPT_CHARS = 2000
const RESPONSE_GUARDRAIL = '입력에 명시되지 않은 구현 방식, 수치, SLO 또는 장애 원인을 사실처럼 만들지 않는다. 정보가 부족하면 반드시 확인 필요 또는 가정으로 구분한다. 답변은 전체 12개 항목 이내의 번호형 일반 텍스트로 작성한다.'

type DemoStatus = 'checking' | 'online' | 'offline'
type ScenarioId = 'architecture' | 'incident' | 'security' | 'custom'
type StreamStage = 'idle' | 'policy' | 'reasoning' | 'answer' | 'done'

interface Scenario {
  id: ScenarioId
  eyebrow: string
  title: string
  summary: string
  prompt: string
  placeholder: string
  system: string
}

const scenarios: Scenario[] = [
  {
    id: 'architecture',
    eyebrow: 'SYSTEM DESIGN',
    title: 'Architecture Review',
    summary: '설계 결정과 검증 경계를 정리합니다.',
    prompt: '팀별로 서로 다른 모델을 사용하는 사내 AI 플랫폼을 준비하고 있습니다. 인증, 비용 통제, 장애 대응까지 고려할 때 초기 설계에서 먼저 결정해야 할 사항을 검토해 주세요.',
    placeholder: '설계하려는 시스템과 중요 제약을 입력해 주세요.',
    system: `당신은 시니어 AI 플랫폼 아키텍트다. 1) 입력에서 확인된 요구사항 2) 우선 결정할 설계 경계 3) 주요 트레이드오프와 확인 필요 사항 4) 검증 계획 순서로 답한다. ${RESPONSE_GUARDRAIL}`,
  },
  {
    id: 'incident',
    eyebrow: 'PRODUCTION OPS',
    title: 'Incident Triage',
    summary: '관측 신호에서 조치 순서를 만듭니다.',
    prompt: 'LLM API의 응답 지연과 429 오류가 동시에 증가했습니다. 배포 변경은 없었지만 요청 대기열과 GPU 사용률이 평소보다 높습니다. 먼저 확인할 가설과 즉시 조치를 정리해 주세요.',
    placeholder: '증상, 변경 사항, 주요 메트릭을 입력해 주세요.',
    system: `당신은 시니어 SRE이자 AI 추론 플랫폼 엔지니어다. 1) 확인된 관측 사실 2) 근거와 반증 조건이 있는 원인 가설 3) 안전한 즉시 조치 4) 추가 확인 메트릭과 재발 방지 순서로 답한다. 확인되지 않은 원인은 단정하지 않는다. ${RESPONSE_GUARDRAIL}`,
  },
  {
    id: 'security',
    eyebrow: 'CHANGE SAFETY',
    title: 'Security Review',
    summary: '보안·격리 회귀 위험을 찾습니다.',
    prompt: 'API 인증 결과를 메모리에 캐시해 응답 지연을 줄이려고 합니다. 인증 저장소 장애 시에는 만료된 캐시를 임시로 허용하는 방안도 포함되어 있습니다. 보안과 테넌트 격리 관점에서 위험을 검토해 주세요.',
    placeholder: '검토할 변경 내용과 보안 경계를 입력해 주세요.',
    system: `당신은 보안과 신뢰성을 담당하는 시니어 코드 리뷰어다. 1) 승인 판단과 근거 2) 차단해야 할 보안·격리 위험 3) 머지 전 필수 테스트 4) 더 안전한 대안 순서로 답한다. 자격 증명 수명주기와 멀티테넌트 격리를 우선한다. ${RESPONSE_GUARDRAIL}`,
  },
  {
    id: 'custom',
    eyebrow: 'YOUR CONTEXT',
    title: 'Custom Review',
    summary: '직접 입력한 문제를 검토합니다.',
    prompt: '',
    placeholder: '검토받고 싶은 AI 플랫폼·운영·보안 문제를 자유롭게 입력해 주세요.',
    system: `당신은 AI 플랫폼, SRE, 보안을 함께 검토하는 시니어 엔지니어다. 질문 의도를 먼저 파악하고 1) 현재 판단 2) 판단 근거 3) 가장 큰 위험 또는 확인 필요 사항 4) 다음 실행 단계 순서로 답한다. ${RESPONSE_GUARDRAIL}`,
  },
]

const selectedId = ref<ScenarioId>('architecture')
const selectedScenario = computed(() =>
  scenarios.find((scenario) => scenario.id === selectedId.value) ?? scenarios[0],
)
const prompt = ref(scenarios[0].prompt)
const responseText = ref('')
const errorMessage = ref('')
const status = ref<DemoStatus>('checking')
const isSubmitting = ref(false)
const streamStage = ref<StreamStage>('idle')
const outputPanel = ref<HTMLElement | null>(null)
let outputRevealed = false

const remainingChars = computed(() => MAX_PROMPT_CHARS - prompt.value.length)
const canSubmit = computed(() =>
  Boolean(DEMO_KEY) &&
  status.value === 'online' &&
  !isSubmitting.value &&
  prompt.value.trim().length > 0 &&
  remainingChars.value >= 0,
)
const streamStageLabel = computed(() => ({
  idle: 'Ready',
  policy: '요청 정책 확인 중',
  reasoning: '모델 분석 중',
  answer: '답변 생성 중',
  done: '분석 완료',
})[streamStage.value])

onMounted(checkHealth)

function selectScenario(scenario: Scenario) {
  selectedId.value = scenario.id
  prompt.value = scenario.prompt
  responseText.value = ''
  errorMessage.value = ''
  streamStage.value = 'idle'
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

async function submitPrompt() {
  if (!canSubmit.value || !DEMO_KEY) return

  isSubmitting.value = true
  responseText.value = ''
  errorMessage.value = ''
  streamStage.value = 'policy'
  outputRevealed = false

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
        reasoning_effort: 'medium',
        stream: true,
        temperature: 0.6,
        top_p: 0.95,
      }),
      signal: AbortSignal.timeout(180_000),
    })

    if (!result.ok) {
      const data = await result.json().catch(() => null)
      throw new Error(publicErrorMessage(result.status, data))
    }
    if (!result.body) {
      throw new Error('스트리밍 응답을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }

    streamStage.value = 'reasoning'
    await revealOutput()
    const content = await consumeEventStream(result.body)
    if (!content.trim()) {
      throw new Error('모델이 최종 답변을 만들지 못했습니다. 입력을 더 구체적으로 바꿔 주세요.')
    }
    responseText.value = content.trim()
    streamStage.value = 'done'
  } catch (error) {
    streamStage.value = 'idle'
    errorMessage.value = error instanceof Error
      ? error.message
      : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    await revealOutput()
  } finally {
    isSubmitting.value = false
  }
}

async function consumeEventStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader()
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
      if (event?.error) {
        throw new Error(publicErrorMessage(502, event))
      }

      const delta = event?.choices?.[0]?.delta
      const reasoning = delta?.reasoning_content ?? delta?.reasoning
      if (typeof reasoning === 'string' && reasoning) {
        streamStage.value = 'reasoning'
      }
      if (typeof delta?.content === 'string' && delta.content) {
        streamStage.value = 'answer'
        fullContent += delta.content
        responseText.value = fullContent
      }
    }

    if (done) break
  }

  return fullContent
}

async function revealOutput() {
  if (outputRevealed) return
  outputRevealed = true
  await nextTick()
  outputPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function publicErrorMessage(statusCode: number, data: any) {
  if (statusCode === 401) return '체험용 인증 키가 만료되었거나 비활성화되었습니다.'
  if (statusCode === 429) return '현재 체험 요청이 많습니다. 잠시 후 다시 시도해 주세요.'
  if (statusCode >= 500) return '현재 사설 LLM 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
  const upstream = data?.error?.message ?? data?.error
  return typeof upstream === 'string' && upstream.length <= 160
    ? upstream
    : 'Gateway 정책에 의해 요청이 거절되었습니다.'
}
</script>

<template>
  <section class="live-demo" aria-labelledby="live-demo-title">
    <header class="live-demo__header">
      <div>
        <p class="live-demo__eyebrow">AI PLATFORM · LIVE LAB</p>
        <h2 id="live-demo-title">실제 엔지니어링 판단을 실행해 보세요.</h2>
        <p>
          대표 분석 모드를 선택하거나 직접 질문을 입력하면
          실제 사설 LLM과 정책 Gateway가 업무형 분석을 수행합니다.
        </p>
      </div>
      <button
        class="live-demo__status"
        type="button"
        :data-state="status"
        :aria-label="`LLM 상태: ${status}`"
        @click="checkHealth"
      >
        <span aria-hidden="true" />
        {{ status === 'online' ? 'Live' : status === 'checking' ? 'Checking' : 'Offline' }}
      </button>
    </header>

    <div class="live-demo__route" aria-label="요청 처리 경로">
      <span>Portfolio</span><b>→</b><span>GCP API Gateway</span><b>→</b><span>Auth · Policy</span><b>→</b><span>Private LLM</span><b>→</b><span>Audit</span>
    </div>

    <div class="live-demo__scenarios" role="tablist" aria-label="라이브 분석 시나리오">
      <button
        v-for="scenario in scenarios"
        :key="scenario.id"
        type="button"
        role="tab"
        :aria-selected="selectedId === scenario.id"
        :class="{ 'is-selected': selectedId === scenario.id }"
        @click="selectScenario(scenario)"
      >
        <span>{{ scenario.eyebrow }}</span>
        <strong>{{ scenario.title }}</strong>
        <small>{{ scenario.summary }}</small>
      </button>
    </div>

    <div v-if="!DEMO_KEY" class="live-demo__notice" role="status">
      배포 환경에 체험용 Key가 설정되지 않았습니다.
    </div>

    <div class="live-demo__workspace">
      <form class="live-demo__form" @submit.prevent="submitPrompt">
        <div class="live-demo__form-title">
          <label for="live-demo-prompt">분석할 컨텍스트</label>
          <span>{{ selectedScenario.title }}</span>
        </div>
        <textarea
          id="live-demo-prompt"
          v-model="prompt"
          :maxlength="MAX_PROMPT_CHARS"
          :placeholder="selectedScenario.placeholder"
          rows="6"
          autocomplete="off"
          spellcheck="true"
        />
        <div class="live-demo__controls">
          <span :class="{ 'is-over': remainingChars < 0 }">{{ remainingChars.toLocaleString() }}자 남음</span>
          <button type="submit" :disabled="!canSubmit">
            {{ isSubmitting ? streamStageLabel : 'Live Analysis 실행' }}
          </button>
        </div>
      </form>

      <aside
        ref="outputPanel"
        class="live-demo__output"
        aria-label="분석 결과"
        aria-live="polite"
      >
        <div v-if="errorMessage" class="live-demo__error" role="alert">
          <strong>요청 실패</strong>
          <p>{{ errorMessage }}</p>
        </div>

        <article v-else-if="isSubmitting || responseText" class="live-demo__response">
          <div class="live-demo__response-head">
            <strong>{{ selectedScenario.title }} · Result</strong>
            <span :data-stage="streamStage">{{ streamStageLabel }}</span>
          </div>
          <div v-if="isSubmitting && !responseText" class="live-demo__progress">
            <span aria-hidden="true" />
            <div>
              <strong>{{ streamStageLabel }}</strong>
              <small>분석 과정은 모델 내부에서 처리하고 최종 답변만 표시합니다.</small>
            </div>
          </div>
          <pre v-if="responseText">{{ responseText }}</pre>
        </article>

        <div v-else class="live-demo__proof">
          <p>WHAT THIS PROVES</p>
          <ul>
            <li><strong>Zero-trust</strong><span>전용 Key와 최소 권한</span></li>
            <li><strong>Policy routing</strong><span>모델·요청·입력 경계</span></li>
            <li><strong>Private inference</strong><span>사설 모델 실행 경로</span></li>
            <li><strong>Observable</strong><span>상태·지연·감사 이벤트</span></li>
          </ul>
        </div>
      </aside>
    </div>

    <footer class="live-demo__footer">
      <span>프롬프트·응답 원문 비저장</span>
      <a href="/live-demo">작동 방식 보기 →</a>
    </footer>
  </section>
</template>

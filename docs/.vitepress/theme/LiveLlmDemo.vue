<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const API_BASE_URL = 'https://local-llm-gateway-d8ikelzd.an.gateway.dev'
const DEMO_KEY = import.meta.env.VITE_PORTFOLIO_DEMO_KEY as string | undefined
const MAX_PROMPT_CHARS = 2000
const MAX_TOKENS = 512

type DemoStatus = 'checking' | 'online' | 'offline'
type ScenarioId = 'architecture' | 'incident' | 'pr-risk'

interface Scenario {
  id: ScenarioId
  eyebrow: string
  title: string
  summary: string
  prompt: string
  system: string
}

const scenarios: Scenario[] = [
  {
    id: 'architecture',
    eyebrow: 'SYSTEM DESIGN',
    title: 'Architecture Review',
    summary: '요구사항을 운영 가능한 경계와 검증 항목으로 바꿉니다.',
    prompt: '월 5천만 건의 요청을 처리하는 멀티테넌트 AI API를 설계한다. 프로젝트별 모델과 RPM이 다르고, 프롬프트 원문은 저장할 수 없다. 장애 시 사설 vLLM에서 MLX로 전환해야 한다.',
    system: '당신은 시니어 AI 플랫폼 아키텍트다. 입력 요구사항을 검토하고 반드시 1) 핵심 설계 결정 2) 가장 큰 운영 리스크 3) 검증 가능한 테스트 또는 SLO 순서로 500토큰 이내에서 간결하게 답한다. 추상적인 조언보다 구체적인 경계와 트레이드오프를 제시한다. Markdown 표, 제목, 강조 기호 없이 번호형 일반 텍스트만 사용한다.',
  },
  {
    id: 'incident',
    eyebrow: 'PRODUCTION OPS',
    title: 'Incident Triage',
    summary: '운영 신호를 원인 가설, 즉시 조치, 재발 방지로 정리합니다.',
    prompt: '14:02부터 LLM API p95가 12초에서 47초로 상승했다. Gateway 5xx는 2%이고 vLLM 429가 증가했으며 queue depth는 18에서 240으로 늘었다. GPU 사용률은 96%, KV cache hit rate는 41%다. 최근 모델 배포는 없었다.',
    system: '당신은 시니어 SRE이자 AI 추론 플랫폼 엔지니어다. 관측값만 근거로 반드시 1) 우선순위가 있는 원인 가설 2) 15분 내 즉시 조치 3) 추가 확인 메트릭 4) 재발 방지 항목 순서로 500토큰 이내에서 답한다. 확인되지 않은 사실은 단정하지 않는다. Markdown 표, 제목, 강조 기호 없이 번호형 일반 텍스트만 사용한다.',
  },
  {
    id: 'pr-risk',
    eyebrow: 'CHANGE SAFETY',
    title: 'PR Risk Review',
    summary: '변경 설명에서 보안·격리·운영 회귀 위험을 찾아냅니다.',
    prompt: 'PR 요약: Gateway 인증 결과를 5분간 메모리 캐시하도록 변경했다. 캐시 키는 API Key의 앞 8글자이고, SurrealDB 장애 시 만료된 캐시도 허용한다. 목표는 인증 지연 감소와 DB 장애 전파 차단이다.',
    system: '당신은 보안과 신뢰성을 담당하는 시니어 코드 리뷰어다. 변경 설명을 검토하고 반드시 1) 위험도와 승인 판단 2) 치명적 회귀 가능성 3) 머지 전 필수 테스트 4) 더 안전한 대안 순서로 500토큰 이내에서 답한다. 멀티테넌트 격리와 자격 증명 수명주기를 우선한다. Markdown 표, 제목, 강조 기호 없이 번호형 일반 텍스트만 사용한다.',
  },
]

const selectedId = ref<ScenarioId>('architecture')
const selectedScenario = computed(() =>
  scenarios.find((scenario) => scenario.id === selectedId.value) ?? scenarios[0],
)
const prompt = ref(scenarios[0].prompt)
const responseText = ref('')
const traceId = ref('')
const latencyMs = ref<number | null>(null)
const totalTokens = ref<number | null>(null)
const errorMessage = ref('')
const status = ref<DemoStatus>('checking')
const isSubmitting = ref(false)

const remainingChars = computed(() => MAX_PROMPT_CHARS - prompt.value.length)
const canSubmit = computed(() =>
  Boolean(DEMO_KEY) &&
  status.value === 'online' &&
  !isSubmitting.value &&
  prompt.value.trim().length > 0 &&
  remainingChars.value >= 0,
)

onMounted(checkHealth)

function selectScenario(scenario: Scenario) {
  selectedId.value = scenario.id
  prompt.value = scenario.prompt
  responseText.value = ''
  errorMessage.value = ''
  traceId.value = ''
  latencyMs.value = null
  totalTokens.value = null
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
  traceId.value = ''
  latencyMs.value = null
  totalTokens.value = null
  errorMessage.value = ''
  const startedAt = performance.now()

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
        extra_body: {
          chat_template_kwargs: { enable_thinking: false },
        },
        max_tokens: MAX_TOKENS,
        stream: false,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(180_000),
    })
    const data = await result.json().catch(() => null)
    latencyMs.value = Math.round(performance.now() - startedAt)
    traceId.value = result.headers.get('x-govail-trace-id')
      ?? result.headers.get('x-trace-id')
      ?? data?.trace_id
      ?? ''

    if (!result.ok) {
      throw new Error(publicErrorMessage(result.status, data))
    }

    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('모델이 최종 답변을 만들기 전에 출력 한도에 도달했습니다. 입력을 더 짧게 바꿔 주세요.')
    }

    responseText.value = content.trim()
    totalTokens.value = Number.isFinite(data?.usage?.total_tokens)
      ? data.usage.total_tokens
      : null
  } catch (error) {
    latencyMs.value = latencyMs.value ?? Math.round(performance.now() - startedAt)
    errorMessage.value = error instanceof Error
      ? error.message
      : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    isSubmitting.value = false
  }
}

function publicErrorMessage(statusCode: number, data: any) {
  if (statusCode === 401) return '체험용 인증 키가 만료되었거나 비활성화되었습니다.'
  if (statusCode === 429) return '분당 체험 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
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
          일반 채팅이 아닙니다. 아키텍처, 운영 장애, 변경 안전성 중 하나를 선택하면
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
      <span>Portfolio</span><b>→</b><span>GCP API Gateway</span><b>→</b><span>Auth · RPM · Policy</span><b>→</b><span>Private LLM</span><b>→</b><span>Loki Audit</span>
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
          rows="7"
          autocomplete="off"
          spellcheck="true"
        />
        <div class="live-demo__controls">
          <span :class="{ 'is-over': remainingChars < 0 }">{{ remainingChars.toLocaleString() }}자 남음</span>
          <button type="submit" :disabled="!canSubmit">
            {{ isSubmitting ? 'Private LLM 분석 중…' : 'Live Analysis 실행' }}
          </button>
        </div>
      </form>

      <aside class="live-demo__proof" aria-label="이 데모가 증명하는 것">
        <p>WHAT THIS PROVES</p>
        <ul>
          <li><strong>Zero-trust</strong><span>전용 Key와 최소 권한</span></li>
          <li><strong>Policy routing</strong><span>모델·RPM·입력 경계</span></li>
          <li><strong>Private inference</strong><span>사설 모델 실행 경로</span></li>
          <li><strong>Observable</strong><span>Trace·지연·토큰 감사</span></li>
        </ul>
      </aside>
    </div>

    <div v-if="errorMessage" class="live-demo__error" role="alert">
      <strong>요청 실패</strong>
      <p>{{ errorMessage }}</p>
    </div>

    <article v-if="responseText" class="live-demo__response" aria-live="polite">
      <div class="live-demo__response-head">
        <strong>{{ selectedScenario.title }} · Result</strong>
        <span>private model / auto route</span>
      </div>
      <pre>{{ responseText }}</pre>
      <dl>
        <div v-if="latencyMs !== null"><dt>Latency</dt><dd>{{ latencyMs.toLocaleString() }} ms</dd></div>
        <div v-if="totalTokens !== null"><dt>Tokens</dt><dd>{{ totalTokens }}</dd></div>
        <div v-if="traceId"><dt>Trace</dt><dd>{{ traceId }}</dd></div>
      </dl>
    </article>

    <footer class="live-demo__footer">
      <span>실제 GCP HTTPS 경로</span>
      <span>분당 4회</span>
      <span>최대 512 tokens</span>
      <span>프롬프트·응답 원문 비저장</span>
      <a href="/live-demo">작동 방식 보기 →</a>
    </footer>
  </section>
</template>

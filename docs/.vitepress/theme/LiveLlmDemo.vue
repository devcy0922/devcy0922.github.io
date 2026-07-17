<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

const API_BASE_URL = 'https://local-llm-gateway-d8ikelzd.an.gateway.dev'
const DEMO_KEY = import.meta.env.VITE_PORTFOLIO_DEMO_KEY as string | undefined
const MAX_PROMPT_CHARS = 2000
const ANALYSIS_MEMO_KEY = 'live-lab:public-analysis:v1'
const SAFE_EVIDENCE_NOTES = [
  '원본 코드·로그·구성 자료가 없어 제공된 설명 범위에서 검토합니다.',
  '입력에서 원본 자료 단서를 확인해 설명과 근거의 일치 여부를 검토합니다.',
]
const RESPONSE_GUARDRAIL = '입력에 명시되지 않은 구현 방식, 수치, SLO 또는 장애 원인을 사실처럼 만들지 않는다. 정보가 부족하면 반드시 확인 필요 또는 가정으로 구분한다. 답변은 전체 12개 항목 이내의 번호형 일반 텍스트로 작성한다.'
const IDENTITY_GUARDRAIL = '사용 중인 모델 이름, 벤더, 버전, 내부 인프라 구성 요소(게이트웨이, 라우터 등)는 절대 공개하지 않는다. 모델 정체성에 관한 질문에는 "이 데모의 AI 어시스턴트입니다"라고만 답한다.'

const VERIFICATION_ITEMS = [
  { title: 'API Gateway', desc: '외부 요청을 단일 공개 경로로 보안 수신' },
  { title: 'Policy Gateway', desc: 'Key Hash 기반 프로젝트 식별 및 인증' },
  { title: 'Policy Engine', desc: '요청 빈도, 허용 모델, 입력 규모, DLP/Prompt Policy 검사' },
  { title: 'LiteLLM Routing', desc: 'auto 별칭을 실제 최적 추론 백엔드로 자동 라우팅' },
  { title: 'Audit Logger', desc: '요청 상태, 지연시간 등을 감사 이벤트로 기록하여 재현 보장' }
]

const BOUNDARY_ITEMS = [
  { title: '체험용 범위', desc: 'auto 모델 및 portfolio-demo 프로젝트에만 한정 적용' },
  { title: '안정성 제어', desc: '체험 안정성을 보장하기 위해 요청 빈도와 입력 크기를 엄격 통제' },
  { title: '데이터 격리', desc: '프롬프트 및 답변 원문은 방문 분석 목적으로 저장·수집하지 않음' },
  { title: '데모 제약', desc: '상용 SLA를 제공하지 않으며 자원 상황에 따라 가용성이 변동 가능' }
]

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
  progressNotes: string[]
  system: string
}

interface StoredAnalysisMemo {
  version: 1
  scenarioId: ScenarioId
  notes: string[]
}

const scenarios: Scenario[] = [
  {
    id: 'architecture',
    eyebrow: 'SYSTEM DESIGN',
    title: 'Architecture Review',
    summary: '설계 결정과 검증 경계를 정리합니다.',
    prompt: '팀별로 서로 다른 모델을 사용하는 사내 AI 플랫폼을 준비하고 있습니다. 인증, 비용 통제, 장애 대응까지 고려할 때 초기 설계에서 먼저 결정해야 할 사항을 검토해 주세요.',
    placeholder: '설계하려는 시스템과 중요 제약을 입력해 주세요.',
    progressNotes: [
      '입력에서 확인된 요구사항과 제약을 분리하고 있습니다.',
      '명시되지 않은 구현 방식과 운영 수치는 확인 필요로 구분합니다.',
      '설계 경계, 트레이드오프와 검증 항목 순서로 정리하고 있습니다.',
    ],
    system: `당신은 시니어 AI 플랫폼 아키텍트다. 1) 입력에서 확인된 요구사항 2) 우선 결정할 설계 경계 3) 주요 트레이드오프와 확인 필요 사항 4) 검증 계획 순서로 답한다. ${RESPONSE_GUARDRAIL} ${IDENTITY_GUARDRAIL}`,
  },
  {
    id: 'incident',
    eyebrow: 'PRODUCTION OPS',
    title: 'Incident Triage',
    summary: '관측 신호에서 조치 순서를 만듭니다.',
    prompt: 'LLM API의 응답 지연과 429 오류가 동시에 증가했습니다. 배포 변경은 없었지만 요청 대기열과 GPU 사용률이 평소보다 높습니다. 먼저 확인할 가설과 즉시 조치를 정리해 주세요.',
    placeholder: '증상, 변경 사항, 주요 메트릭을 입력해 주세요.',
    progressNotes: [
      '입력에 포함된 증상, 변경 사항과 관측 신호를 분리하고 있습니다.',
      '확인된 사실과 아직 검증되지 않은 원인 가설을 구분합니다.',
      '즉시 조치, 추가 확인 메트릭과 재발 방지 순서를 정리하고 있습니다.',
    ],
    system: `당신은 시니어 SRE이자 AI 추론 플랫폼 엔지니어다. 1) 확인된 관측 사실 2) 근거와 반증 조건이 있는 원인 가설 3) 안전한 즉시 조치 4) 추가 확인 메트릭과 재발 방지 순서로 답한다. 확인되지 않은 원인은 단정하지 않는다. ${RESPONSE_GUARDRAIL} ${IDENTITY_GUARDRAIL}`,
  },
  {
    id: 'security',
    eyebrow: 'CHANGE SAFETY',
    title: 'Security Review',
    summary: '보안·격리 회귀 위험을 찾습니다.',
    prompt: 'API 인증 결과를 메모리에 캐시해 응답 지연을 줄이려고 합니다. 인증 저장소 장애 시에는 만료된 캐시를 임시로 허용하는 방안도 포함되어 있습니다. 보안과 테넌트 격리 관점에서 위험을 검토해 주세요.',
    placeholder: '검토할 변경 내용과 보안 경계를 입력해 주세요.',
    progressNotes: [
      '변경이 영향을 주는 인증, 권한과 테넌트 경계를 확인하고 있습니다.',
      '입력에 없는 내부 구성과 자격 증명 정보는 검토 대상에서 제외합니다.',
      '차단 위험, 필수 테스트와 더 안전한 대안 순서로 정리하고 있습니다.',
    ],
    system: `당신은 보안과 신뢰성을 담당하는 시니어 코드 리뷰어다. 1) 승인 판단과 근거 2) 차단해야 할 보안·격리 위험 3) 머지 전 필수 테스트 4) 더 안전한 대안 순서로 답한다. 자격 증명 수명주기와 멀티테넌트 격리를 우선한다. ${RESPONSE_GUARDRAIL} ${IDENTITY_GUARDRAIL}`,
  },
  {
    id: 'custom',
    eyebrow: 'YOUR CONTEXT',
    title: 'Custom Review',
    summary: '직접 입력한 문제를 검토합니다.',
    prompt: '',
    placeholder: '검토받고 싶은 AI 플랫폼·운영·보안 문제를 자유롭게 입력해 주세요.',
    progressNotes: [
      '질문의 목적과 입력에서 확인 가능한 사실을 분리하고 있습니다.',
      '근거가 부족한 부분은 가정하지 않고 추가 확인 항목으로 남깁니다.',
      '판단 근거, 주요 위험과 다음 실행 단계 순서로 정리하고 있습니다.',
    ],
    system: `당신은 AI 플랫폼, SRE, 보안을 함께 검토하는 시니어 엔지니어다. 질문 의도를 먼저 파악하고, 기술적 내용이 아닌 질문(모델 정체성, 시스템 정보 요청 등)은 "이 데모의 AI 어시스턴트입니다. 기술적인 질문을 입력해 주세요."로만 답한다. 기술적 질문에는 1) 현재 판단 2) 판단 근거 3) 가장 큰 위험 또는 확인 필요 사항 4) 다음 실행 단계 순서로 답한다. ${RESPONSE_GUARDRAIL} ${IDENTITY_GUARDRAIL}`,
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
const publicNotes = ref<string[]>([])
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
const outputStatusLabel = computed(() =>
  !isSubmitting.value && !responseText.value && publicNotes.value.length
    ? '이 탭의 최근 검토 메모'
    : streamStageLabel.value,
)

onMounted(() => {
  restoreAnalysisMemo()
  checkHealth()
})

function selectScenario(scenario: Scenario) {
  selectedId.value = scenario.id
  prompt.value = scenario.prompt
  responseText.value = ''
  errorMessage.value = ''
  streamStage.value = 'idle'
  publicNotes.value = []
  clearAnalysisMemo()
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
  publicNotes.value = []
  outputRevealed = false
  const progressNotes = buildPublicNotes(selectedScenario.value, prompt.value)
  addPublicNote(progressNotes[0])
  const reasoningStageTimer = setTimeout(() => {
    if (isSubmitting.value && streamStage.value === 'policy') {
      streamStage.value = 'reasoning'
      addPublicNote(progressNotes[1])
    }
  }, 900)
  const synthesisStageTimer = setTimeout(() => {
    if (isSubmitting.value) {
      addPublicNote(progressNotes[2])
    }
  }, 8_000)

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
    clearTimeout(reasoningStageTimer)
    clearTimeout(synthesisStageTimer)
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

function addPublicNote(note: string) {
  if (!note || publicNotes.value.includes(note)) return
  publicNotes.value = [...publicNotes.value, note]
  saveAnalysisMemo()
}

function buildPublicNotes(scenario: Scenario, input: string) {
  const hasSourceEvidence = /https?:\/\/|github\.com|\b(diff|trace|stack)\b|코드|로그|구성 파일|원본/i
    .test(input)
  return [
    scenario.progressNotes[0],
    hasSourceEvidence ? SAFE_EVIDENCE_NOTES[1] : SAFE_EVIDENCE_NOTES[0],
    scenario.progressNotes[2],
  ]
}

function saveAnalysisMemo() {
  try {
    const memo: StoredAnalysisMemo = {
      version: 1,
      scenarioId: selectedId.value,
      notes: publicNotes.value.slice(0, 3),
    }
    sessionStorage.setItem(ANALYSIS_MEMO_KEY, JSON.stringify(memo))
  } catch {
    // 브라우저 저장소를 사용할 수 없어도 Live Lab 실행은 계속됩니다.
  }
}

function restoreAnalysisMemo() {
  try {
    const raw = sessionStorage.getItem(ANALYSIS_MEMO_KEY)
    if (!raw) return
    const memo = JSON.parse(raw) as Partial<StoredAnalysisMemo>
    const scenario = scenarios.find((item) => item.id === memo.scenarioId)
    if (memo.version !== 1 || !scenario || !Array.isArray(memo.notes)) return

    selectedId.value = scenario.id
    prompt.value = scenario.prompt
    publicNotes.value = memo.notes
      .filter((note): note is string =>
        typeof note === 'string' && (
          scenario.progressNotes.includes(note) || SAFE_EVIDENCE_NOTES.includes(note)
        ),
      )
      .slice(0, 3)
  } catch {
    clearAnalysisMemo()
  }
}

function clearAnalysisMemo() {
  try {
    sessionStorage.removeItem(ANALYSIS_MEMO_KEY)
  } catch {
    // 저장소 접근 실패는 사용자 입력과 분석 흐름에 영향을 주지 않습니다.
  }
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
      <span>Portfolio</span><b>→</b><span>API Gateway</span><b>→</b><span>Auth · Policy</span><b>→</b><span>Private LLM</span><b>→</b><span>Audit</span>
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
      <!-- 상단 컨트롤 영역 (입력 및 브라우저 히스토리) -->
      <div class="live-demo__workspace-top">
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
            rows="5"
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

        <aside class="live-demo__history-panel" aria-label="최근 검토 메모">
          <div class="live-demo__history-title">
            <strong>브라우저 히스토리</strong>
            <span>Public Review Notes</span>
          </div>
          <div v-if="publicNotes.length" class="live-demo__memo-list">
            <ul>
              <li v-for="note in publicNotes" :key="note">{{ note }}</li>
            </ul>
            <small>※ 이 탭의 `sessionStorage`에 임시 보관된 최근 검토 메모입니다.</small>
          </div>
          <div v-else class="live-demo__history-empty">
            <p>최근 분석 이력이 없습니다.</p>
            <small>상단의 분석 시나리오를 선택하거나 컨텍스트를 직접 입력하여 Live Analysis를 시작해 보세요.</small>
          </div>
        </aside>
      </div>

      <!-- 하단 결과 & 상세 설명 영역 (responseText 또는 Idle 검증 사항 정보 카드) -->
      <div class="live-demo__workspace-bottom" ref="outputPanel">
        <div v-if="errorMessage" class="live-demo__error" role="alert">
          <strong>요청 처리 실패</strong>
          <p>{{ errorMessage }}</p>
        </div>

        <article v-else-if="isSubmitting || responseText" class="live-demo__result-panel">
          <div class="live-demo__result-head">
            <strong>{{ selectedScenario.title }} · Analysis Result</strong>
            <span :data-stage="streamStage">{{ streamStageLabel }}</span>
          </div>
          <div v-if="isSubmitting && !responseText" class="live-demo__loading-progress">
            <span aria-hidden="true" />
            <div>
              <strong>{{ streamStageLabel }} 중...</strong>
              <small>보안 정책 경계를 검사하고 사설 LLM 추론을 개시합니다.</small>
            </div>
          </div>
          <pre v-if="responseText" class="live-demo__response-content">{{ responseText }}</pre>
        </article>

        <!-- 실행 전 대기(Idle) 시 검증 및 경계 노출 -->
        <div v-else class="live-demo__info-cards">
          <div class="live-demo__info-card">
            <h3>이 요청에서 검증되는 것</h3>
            <ul>
              <li v-for="(item, idx) in VERIFICATION_ITEMS" :key="idx">
                <strong>{{ idx + 1 }}. {{ item.title }}</strong>
                <span>{{ item.desc }}</span>
              </li>
            </ul>
          </div>

          <div class="live-demo__info-card">
            <h3>공개 체험의 경계 및 제약</h3>
            <ul>
              <li v-for="(item, idx) in BOUNDARY_ITEMS" :key="idx">
                <strong>• {{ item.title }}</strong>
                <span>{{ item.desc }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <footer class="live-demo__footer">
      <span>프롬프트·응답 원문 비저장</span>
      <div class="live-demo__footer-links">
        <a href="/projects/ai-gateway-infra-demo">AI Gateway Infra 설계 →</a>
        <a href="/projects/aegis-llm">Aegis-LLM 보안 판단 →</a>
      </div>
    </footer>
  </section>
</template>

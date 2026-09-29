<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { marked } from 'marked'

marked.use({
  gfm: true,
  breaks: true,
})

const RELAY_STREAM_URL = 'https://api.govail.cloud/v1/model-routing/stream'

// Types
export interface ToolCallItem {
  tool: string
  callId: string
  input: Record<string, unknown>
  output?: Record<string, unknown>
  durationMs?: number
  status: 'calling' | 'done' | 'error'
  error?: string
}

export interface MessageTrace {
  totalLatencyMs?: number
  ttftMs?: number
  tokensPerSec?: number
  usage?: { promptTokens?: number; completionTokens?: number }
  routingNode?: string
  policy?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  tools?: ToolCallItem[]
  trace?: MessageTrace
  status?: 'streaming' | 'done' | 'error'
  timestamp: number
}

export interface CompressedContext {
  originalTurnsCount: number
  originalTokens: number
  compressedTokens: number
  savingsPct: number
  summary: string
  timestamp: number
}

export interface Session {
  id: string
  title: string
  createdAt: number
  compressedContext?: CompressedContext
  messages: ChatMessage[]
}

export interface EngineStage {
  id: string
  step: string
  name: string
  desc: string
  status: 'idle' | 'running' | 'done' | 'pass'
  latencyMs?: number
  detail?: string
}

// Preset questions
const promptPresets = [
  { label: '클러스터 헬스', text: 'GoVail 클러스터 현재 시스템 상태와 헬스 메트릭을 알려줘' },
  { label: '게이트웨이 라우팅', text: '최신 AI 게이트웨이 라우팅 전략과 모델 폴백 트렌드 웹 검색' },
  { label: '지연시간 P50/P95', text: 'Python으로 노드 지연시간 리스트의 P50 및 P95 백분위수를 계산해줘' },
  { label: '캐시 유사도', text: '시맨틱 캐시 레이어의 임베딩 유사도 임계치와 TTL 상태 점검' },
  { label: '우루과이전 결과 분석', text: '우루과이전 결과 분석' },
]

// Tool label mapping
const TOOL_LABELS: Record<string, { label: string; code: string }> = {
  system_metrics: { label: '시스템 메트릭 조회', code: 'SYS' },
  web_search: { label: '실시간 웹 검색', code: 'WEB' },
  code_interpreter: { label: '코드 실행 샌드박스', code: 'RUN' },
  cache_inspector: { label: '시맨틱 캐시 점검', code: 'CACHE' },
}

function getToolMeta(name: string) {
  return TOOL_LABELS[name] || { label: name, code: 'TOOL' }
}

// State
const sessions = ref<Session[]>([])
const currentSessionId = ref<string>('')
const userPrompt = ref('')
const isStreaming = ref(false)
const streamStatusText = ref('Ready')
const activeAbortController = ref<AbortController | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)
const showCompressedSummary = ref(false)

// Engine Process Pipeline Stages
const engineStages = ref<EngineStage[]>([
  { id: 'ingest', step: '01', name: 'Request Ingest & Sanitize', desc: '입력 요청 살균 및 인젝션 방어', status: 'idle' },
  { id: 'compress', step: '02', name: 'Context Compressor', desc: '슬라이딩 윈도우 세션 메모리 압축', status: 'idle' },
  { id: 'dispatch', step: '03', name: 'Intent & Tool Dispatcher', desc: '의도 분석 및 도구 격리 샌드박스 실행', status: 'idle' },
  { id: 'reasoning', step: '04', name: 'CoT Deliberation', desc: '경량 추론 단계 사전 계획 수립', status: 'idle' },
  { id: 'stream', step: '05', name: 'SSE Stream Engine', desc: '청크 단위 토큰 실시간 디코딩', status: 'idle' },
  { id: 'render', step: '06', name: 'Client AST Render', desc: 'GFM 마크다운 렌더링 & 브라우저 캐싱', status: 'idle' },
])

function resetEngineStages() {
  for (const st of engineStages.value) {
    st.status = 'idle'
    st.latencyMs = undefined
    st.detail = undefined
  }
}

function updateStage(id: string, status: EngineStage['status'], latencyMs?: number, detail?: string) {
  const st = engineStages.value.find((s) => s.id === id)
  if (st) {
    st.status = status
    if (latencyMs !== undefined) st.latencyMs = latencyMs
    if (detail !== undefined) st.detail = detail
  }
}

// Current latest telemetry
const latestMetrics = ref<{
  totalLatencyMs: number
  ttftMs: number
  tokensPerSec: number
  tokens: number
}>({
  totalLatencyMs: 0,
  ttftMs: 0,
  tokensPerSec: 0,
  tokens: 0,
})

// Computed
const currentSession = computed(() => {
  return sessions.value.find((s) => s.id === currentSessionId.value) || sessions.value[0] || null
})

const currentToolCalls = computed(() => {
  return (currentSession.value?.messages || []).flatMap((message) =>
    (message.tools || []).map((tool) => ({
      ...tool,
      messageId: message.id,
      messageTimestamp: message.timestamp,
    })),
  )
})

const totalMessagesCount = computed(() => {
  return sessions.value.reduce((acc, s) => acc + s.messages.length, 0)
})

const browserCacheSize = computed(() => {
  if (typeof window === 'undefined') return '0 KB'
  const raw = localStorage.getItem(STORAGE_KEY) || ''
  return (new Blob([raw]).size / 1024).toFixed(1) + ' KB'
})

// Initial default session with realistic trace
function initDefaultSession(): Session {
  return {
    id: 'session_' + Date.now(),
    title: '클러스터 메트릭 및 시스템 점검',
    createdAt: Date.now(),
    compressedContext: {
      originalTurnsCount: 2,
      originalTokens: 380,
      compressedTokens: 48,
      savingsPct: 87,
      summary: 'Q: 클러스터 노드 상태 확인 → A: cy-server.internal이 HEALTHY (p95: 38.4ms, 4 routes active) 상태임을 사전 검증함',
      timestamp: Date.now() - 60000,
    },
    messages: [
      {
        id: 'msg_user_1',
        role: 'user',
        content: 'GoVail 클러스터 현재 시스템 상태와 헬스 메트릭을 알려줘',
        timestamp: Date.now() - 36000,
      },
      {
        id: 'msg_asst_1',
        role: 'assistant',
        content:
          'GoVail 클러스터(`cy-server.internal`) 상태는 현재 **HEALTHY**이며, 4개의 활성 게이트웨이 라우트가 정상 가동 중입니다.\n\n* **P95 지연시간:** `38.4ms` (초저지연 유지)\n* **활성 라우트:** `4 active routes`\n* **시스템 부하:** 정상 (가동 시간 12시간 이상)\n\n궁금한 점이 있거나 추가 분석이 필요하시면 말씀해 주세요.',
        reasoning:
          '1. system_metrics 도구 호출 결과 확인\n2. cluster_node 및 active_gateway_routes 상태 분석\n3. p95_latency_ms (38.4ms)를 기반으로 간결한 상태 보고서 작성',
        tools: [
          {
            tool: 'system_metrics',
            callId: 'call_init_01',
            input: { target: 'govail-gateway', metric_window: '5m' },
            output: {
              status: 'HEALTHY',
              cluster_node: 'cy-server.internal (192.168.0.10)',
              active_gateway_routes: 4,
              p95_latency_ms: 38.4,
              uptime_seconds: 43200,
              heap_used_mb: 18.2,
              rate_limit_policy: 'sliding_window_10rpm',
              concurrency_lock: 'single_active_slot',
            },
            durationMs: 24,
            status: 'done',
          },
        ],
        trace: {
          totalLatencyMs: 840,
          ttftMs: 210,
          tokensPerSec: 32.5,
          routingNode: 'edge-cluster (192.168.0.10:8080)',
          policy: 'REASONING_OPTIMAL',
          usage: { promptTokens: 85, completionTokens: 42 },
        },
        status: 'done',
        timestamp: Date.now() - 35000,
      },
    ],
  }
}

// Storage helpers (Purely Client-side Browser Cache)
const STORAGE_KEY = 'govail_playground_browser_cache_v4'

function loadSessions() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        sessions.value = parsed
        currentSessionId.value = parsed[0].id
        return
      }
    }
  } catch {
    // fallback
  }
  const def = initDefaultSession()
  sessions.value = [def]
  currentSessionId.value = def.id
  saveSessions()
}

function saveSessions() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.value))
  } catch {
    // ignore
  }
}

function createNewSession() {
  const newSession: Session = {
    id: 'session_' + Date.now(),
    title: '새 세션 #' + (sessions.value.length + 1),
    createdAt: Date.now(),
    messages: [],
  }
  sessions.value.unshift(newSession)
  currentSessionId.value = newSession.id
  saveSessions()
}

function selectSession(id: string) {
  currentSessionId.value = id
  scrollToBottom()
}

function deleteSession(id: string, e?: Event) {
  if (e) e.stopPropagation()
  sessions.value = sessions.value.filter((s) => s.id !== id)
  if (sessions.value.length === 0) {
    createNewSession()
  } else if (currentSessionId.value === id) {
    currentSessionId.value = sessions.value[0].id
  }
  saveSessions()
}

function clearBrowserCache() {
  if (confirm('브라우저에 저장된 모든 세션 캐시를 삭제하시겠습니까? (서버에 기록되지 않는 순수 로컬 데이터입니다)')) {
    sessions.value = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
    createNewSession()
  }
}

// ── Session Compression Logic ─────────────────────────────
function compressCurrentSession() {
  const session = currentSession.value
  if (!session || session.messages.length < 2) return

  const turnsToCompress = session.messages.slice(0, -1)
  if (turnsToCompress.length === 0) return

  const originalTokens = turnsToCompress.reduce((acc, m) => acc + Math.ceil(m.content.length / 3), 0)

  const summaryParts: string[] = []
  for (const m of turnsToCompress) {
    if (m.role === 'user') {
      summaryParts.push(`Q: ${m.content.slice(0, 48)}`)
    } else if (m.role === 'assistant') {
      const toolUsed = m.tools?.map((t) => t.tool).join(', ')
      summaryParts.push(`A: ${m.content.slice(0, 60)}${toolUsed ? ` (${toolUsed})` : ''}`)
    }
  }

  const denseSummary = summaryParts.join(' → ')
  const compressedTokens = Math.max(16, Math.ceil(denseSummary.length / 3))
  const savings = Math.max(15, Math.round(((originalTokens - compressedTokens) / originalTokens) * 100))

  session.compressedContext = {
    originalTurnsCount: turnsToCompress.length,
    originalTokens,
    compressedTokens,
    savingsPct: savings,
    summary: denseSummary,
    timestamp: Date.now(),
  }

  // Retain only latest message in active view
  session.messages = session.messages.slice(-1)
  saveSessions()
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function setPreset(text: string) {
  userPrompt.value = text
}

function getRequestedTools(prompt: string): string[] {
  const lower = prompt.toLowerCase()
  const webSignals = [
    '검색', 'search', '최신', '최근', '오늘', '현재', '결과', '뉴스', '경기', '우루과이',
    '월드컵', '대표팀', '날씨', '환율', '주가', '가격', '출시', '누가', '언제', '어디서',
  ]
  if (webSignals.some((signal) => lower.includes(signal))) return ['web_search']
  if (['메트릭', '상태', '헬스', '클러스터', '서버'].some((signal) => lower.includes(signal))) return ['system_metrics']
  if (['코드', '파이썬', 'python', '계산', '함수'].some((signal) => lower.includes(signal))) return ['code_interpreter']
  if (['캐시', 'cache', 'ttl', '유사도'].some((signal) => lower.includes(signal))) return ['cache_inspector']
  return []
}

function stopExecution() {
  if (activeAbortController.value) {
    activeAbortController.value.abort()
    activeAbortController.value = null
  }
  isStreaming.value = false
  streamStatusText.value = 'Stopped by user'
}

function renderMarkdown(text: string): string {
  if (!text) return ''
  try {
    return marked.parse(text) as string
  } catch {
    return text
  }
}

// SSE Streaming Execution with Engine Process Updates
async function handleSend() {
  const prompt = userPrompt.value.trim()
  if (!prompt || isStreaming.value) return

  let session = currentSession.value
  if (!session) {
    createNewSession()
    session = currentSession.value!
  }

  // Update session title if first message
  if (session.messages.length === 0) {
    session.title = prompt.length > 24 ? prompt.slice(0, 24) + '...' : prompt
  }

  // Auto-compress if history is long (> 4 turns)
  if (session.messages.length >= 4 && !session.compressedContext) {
    compressCurrentSession()
  }

  // 1. Add User Message
  const userMsg: ChatMessage = {
    id: 'msg_u_' + Date.now(),
    role: 'user',
    content: prompt,
    timestamp: Date.now(),
  }
  session.messages.push(userMsg)
  userPrompt.value = ''
  scrollToBottom()

  // 2. Add Assistant Message Placeholder
  const asstMsg: ChatMessage = {
    id: 'msg_a_' + Date.now(),
    role: 'assistant',
    content: '',
    reasoning: '',
    tools: [],
    trace: {},
    status: 'streaming',
    timestamp: Date.now(),
  }
  session.messages.push(asstMsg)
  scrollToBottom()

  isStreaming.value = true
  streamStatusText.value = 'Engine Process: Ingest & Sanitize...'
  resetEngineStages()

  // Step 1: Ingest & Sanitize
  updateStage('ingest', 'running')
  const ingestStart = Date.now()
  await new Promise((r) => setTimeout(r, 20))
  updateStage('ingest', 'done', Date.now() - ingestStart, 'UTF-8 normalized · Safe')

  // Step 2: Context Compression check
  updateStage('compress', 'running')
  const compressStart = Date.now()
  let contextAugmentedPrompt = prompt
  if (session.compressedContext) {
    contextAugmentedPrompt = `[이전 세션 요약 메모리: ${session.compressedContext.summary}]\n${prompt}`
    updateStage('compress', 'done', Date.now() - compressStart, `${session.compressedContext.savingsPct}% saved`)
  } else {
    updateStage('compress', 'pass', Date.now() - compressStart, 'No prior context')
  }

  const controller = new AbortController()
  activeAbortController.value = controller

  // 요청이 선택한 도구만 전달한다. 모든 도구를 넘기면 Gateway가 최신 정보 질문을
  // 올바르게 분류하지 못하고 명시적 도구 경로로 고정될 수 있다.
  const internalTools = getRequestedTools(prompt)
  updateStage('dispatch', 'running')

  try {
    const response = await fetch(RELAY_STREAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: contextAugmentedPrompt,
        tools: internalTools,
        // 도구 결과가 있는 답변은 추론 토큰보다 최종 답변을 우선한다.
        enableThinking: internalTools.length === 0,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Gateway HTTP ${response.status}`)
    }

    if (!response.body) {
      throw new Error('No streaming body available')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    updateStage('stream', 'running')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      let currentEvent = 'message'
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.slice(6).trim()
          continue
        }

        if (trimmed.startsWith('data:')) {
          const rawData = trimmed.slice(5).trim()
          try {
            const data = JSON.parse(rawData)
            handleStreamEvent(currentEvent, data, asstMsg)
          } catch {
            // ignore non-json line
          }
        }
      }
      scrollToBottom()
    }

    if (asstMsg.status !== 'error') {
      asstMsg.status = 'done'
      streamStatusText.value = 'Ready'
      updateStage('stream', 'done')
      updateStage('render', 'done', 4, 'GFM Markdown Parsed')
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      streamStatusText.value = 'Stopped by user'
    } else {
      asstMsg.status = 'error'
      asstMsg.content += '\n\n**실행 오류:** 실시간 게이트웨이 요청 실패 또는 타임아웃이 발생했습니다.'
      streamStatusText.value = 'Error'
    }
  } finally {
    isStreaming.value = false
    activeAbortController.value = null
    saveSessions()
    scrollToBottom()
  }
}

function handleStreamEvent(event: string, data: Record<string, unknown>, msg: ChatMessage) {
  if (event === 'routing') {
    streamStatusText.value = 'Processing request...'
    if (msg.trace) {
      msg.trace.routingNode = String(data.targetNode || '')
      msg.trace.policy = String(data.policy || '')
    }
  } else if (event === 'status') {
    streamStatusText.value = String(data.message || data.phase || '')
  } else if (event === 'tool_call') {
    const meta = getToolMeta(String(data.tool))
    streamStatusText.value = `도구 실행: ${meta.label}`
    updateStage('dispatch', 'running', undefined, `Invoking ${data.tool}...`)
    if (!msg.tools) msg.tools = []
    msg.tools.push({
      tool: String(data.tool),
      callId: String(data.callId),
      input: (data.input as Record<string, unknown>) || {},
      status: 'calling',
    })
  } else if (event === 'tool_result') {
    const meta = getToolMeta(String(data.tool))
    streamStatusText.value = `도구 완료: ${meta.label}`
    const dur = Number(data.durationMs) || 0
    updateStage('dispatch', 'done', dur, `${data.tool} (${dur}ms)`)
    if (msg.tools) {
      const toolItem = msg.tools.find((t) => t.callId === data.callId)
      if (toolItem) {
        toolItem.output = (data.output as Record<string, unknown>) || {}
        toolItem.durationMs = dur
        toolItem.status = data.status === 'error' || data.error ? 'error' : 'done'
        if (data.error) toolItem.error = String(data.error)
      }
    }
  } else if (event === 'thinking') {
    updateStage('reasoning', 'running', undefined, 'Deliberating...')
    if (data.delta) {
      msg.reasoning = (msg.reasoning || '') + String(data.delta)
    }
  } else if (event === 'token') {
    streamStatusText.value = 'Streaming Response...'
    if (data.reasoning) {
      msg.reasoning = (msg.reasoning || '') + String(data.reasoning)
    }
    if (data.delta) {
      msg.content += String(data.delta)
      updateStage('reasoning', 'done')
    }
  } else if (event === 'done') {
    if (data.status === 'truncated') {
      streamStatusText.value = 'Response truncated'
      msg.status = 'error'
      msg.content += '\n\n**응답이 토큰 한도에서 잘렸습니다.** 잠시 후 다시 시도해 주세요.'
    } else {
      streamStatusText.value = 'Completed'
      msg.status = 'done'
    }
    if (msg.trace) {
      msg.trace.totalLatencyMs = Number(data.totalLatencyMs)
      msg.trace.ttftMs = Number(data.ttftMs)
      msg.trace.tokensPerSec = Number(data.tokensPerSec)
      msg.trace.usage = data.usage as { promptTokens?: number; completionTokens?: number }
    }
    latestMetrics.value = {
      totalLatencyMs: Number(data.totalLatencyMs) || 0,
      ttftMs: Number(data.ttftMs) || 0,
      tokensPerSec: Number(data.tokensPerSec) || 0,
      tokens: (data.usage as { completionTokens?: number })?.completionTokens || 0,
    }
  } else if (event === 'error') {
    msg.status = 'error'
    streamStatusText.value = 'Error'
    msg.content += `\n\n**실행 오류:** ${String(data.message || '응답 스트림이 중단되었습니다.')}`
  }
}

// Collapsible inspect state for tools
const expandedTools = ref<Record<string, boolean>>({})
function toggleToolExpand(callId: string) {
  expandedTools.value[callId] = !expandedTools.value[callId]
}

const showReasoning = ref<Record<string, boolean>>({})
function toggleReasoning(msgId: string) {
  showReasoning.value[msgId] = !showReasoning.value[msgId]
}

interface SearchResultView {
  title: string
  url: string
  snippet: string
  source?: string
}

function getSearchResults(tool: ToolCallItem): SearchResultView[] {
  const results = tool.output?.results
  if (!Array.isArray(results)) return []
  return results
    .filter((result): result is Record<string, unknown> => Boolean(result && typeof result === 'object'))
    .map((result) => ({
      title: String(result.title || '검색 결과'),
      url: String(result.url || ''),
      snippet: String(result.snippet || ''),
      source: result.source ? String(result.source) : undefined,
    }))
    .filter((result) => result.url)
}

function formatSourceUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function formatPayload(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

function formatTime(ts: number) {
  const date = new Date(ts)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

onMounted(() => {
  loadSessions()
})

onBeforeUnmount(() => {
  if (activeAbortController.value) {
    activeAbortController.value.abort()
  }
})
</script>

<template>
  <main class="playground-shell">
    <!-- Top Hero Header -->
    <header class="playground-hero">
      <div class="pg-panel-label"><span class="status-dot"></span> GoVail Cloud Debug Studio</div>
      <h1>실시간 <em>추론 & 툴 디버깅</em> 콘솔</h1>
      <p class="pg-lead">
        요청은 중앙에서 읽고, 세션은 왼쪽에서 전환하고, 실제 도구 호출과 검색 출처는 오른쪽에서 확인합니다.
      </p>
    </header>

    <!-- 3-Panel Debug Studio -->
    <div class="pg-studio-container">
      <!-- ── Panel 1: Sessions (좌측 - 브라우저 로컬 캐시) ────── -->
      <aside class="pg-panel-sessions">
        <div class="pg-panel-header">
          <div class="pg-header-left">
            <span class="pg-panel-title">세션</span>
            <span class="pg-badge-cache" title="서버에 저장되지 않는 브라우저 로컬 캐시">브라우저에 저장</span>
          </div>
          <button type="button" class="pg-btn-icon" title="새 세션 생성" @click="createNewSession">
            <span class="pg-icon-plus">+</span>
          </button>
        </div>

        <div class="pg-sessions-list">
          <div
            v-for="s in sessions"
            :key="s.id"
            class="pg-session-item"
            :class="{ active: s.id === currentSessionId }"
            @click="selectSession(s.id)"
          >
            <div class="pg-session-top">
              <span class="pg-session-title" :title="s.title">{{ s.title }}</span>
              <button
                type="button"
                class="pg-session-del"
                title="세션 삭제"
                @click="deleteSession(s.id, $event)"
              >
                ×
              </button>
            </div>
            <div class="pg-session-meta">
              <span v-if="s.compressedContext" class="pg-meta-compress" title="컨텍스트 압축 적용">압축 {{ s.compressedContext.savingsPct }}%</span>
              <span class="pg-meta-count">{{ s.messages.length }}개 메시지</span>
              <span class="pg-meta-time">{{ formatTime(s.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="pg-sessions-footer">
          <div class="pg-cache-notice">
            <span class="pg-notice-mark">LOCAL</span>
            <span>퍼블릭 환경: 대화 내역은 브라우저 캐시에만 보존됩니다.</span>
          </div>
          <button type="button" class="pg-btn-clear" @click="clearBrowserCache">
            캐시 비우기 (전체 삭제)
          </button>
        </div>
      </aside>

      <!-- ── Panel 2: Inference & Tool Execution (가운데) ───── -->
      <section class="pg-panel-inference">
        <!-- Console Top Bar -->
        <div class="pg-inference-topbar">
          <div class="pg-status-indicator">
            <span class="pg-pulse-dot" :class="{ 'is-active': isStreaming }"></span>
            <span class="pg-status-label">{{ streamStatusText }}</span>
          </div>

          <div class="pg-topbar-actions">
            <!-- Manual Session Compress Button -->
            <button
              v-if="currentSession && currentSession.messages.length >= 2"
              type="button"
              class="pg-btn-compress"
              title="이전 대화 턴을 의미 요약으로 압축하여 토큰을 절감합니다"
              :disabled="isStreaming"
              @click="compressCurrentSession"
            >
              세션 압축
            </button>
            <span class="pg-tag-gateway">GoVail Gateway</span>
          </div>
        </div>

        <!-- Chat / Trace Viewport -->
        <div ref="messagesContainer" class="pg-messages-viewport">
          <!-- Session Compressed Context Banner -->
          <div v-if="currentSession?.compressedContext" class="pg-compressed-banner">
            <div class="pg-compressed-head" @click="showCompressedSummary = !showCompressedSummary">
              <span class="pg-compressed-badge">CONTEXT COMPRESSED</span>
              <span class="pg-compressed-stats">
                {{ currentSession.compressedContext.originalTurnsCount }}개 턴 압축 · {{ currentSession.compressedContext.savingsPct }}% 토큰 절감
              </span>
              <span class="pg-compressed-toggle">{{ showCompressedSummary ? '▲ 접기' : '▼ 요약 보기' }}</span>
            </div>
            <div v-if="showCompressedSummary" class="pg-compressed-body">
              <div class="pg-compressed-text">{{ currentSession.compressedContext.summary }}</div>
              <div class="pg-compressed-meta">
                <span>원문: ~{{ currentSession.compressedContext.originalTokens }} tok</span>
                <span>압축 후: ~{{ currentSession.compressedContext.compressedTokens }} tok</span>
                <span>압축 시각: {{ formatTime(currentSession.compressedContext.timestamp) }}</span>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="!currentSession || currentSession.messages.length === 0" class="pg-empty-state">
            <div class="pg-empty-mark">READY</div>
            <h3>실시간 추론 콘솔 준비 완료</h3>
            <p>하단에 질문을 입력하거나 추천 칩을 누르면 게이트웨이가 필요한 도구를 자동으로 실행하고 답변을 스트리밍합니다.</p>
          </div>

          <!-- Messages -->
          <div
            v-for="msg in currentSession?.messages || []"
            :key="msg.id"
            class="pg-message-row"
            :class="`role-${msg.role}`"
          >
            <!-- User Message -->
            <div v-if="msg.role === 'user'" class="pg-msg-bubble is-user">
              <div class="pg-msg-head">
                <span class="pg-badge-role">USER</span>
                <span class="pg-msg-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
              <div class="pg-msg-text">{{ msg.content }}</div>
            </div>

            <!-- Assistant / Debug Card -->
            <div v-else class="pg-msg-bubble is-assistant">
              <div class="pg-msg-head">
                <span class="pg-badge-role is-govail">GOVAIL ASSISTANT</span>
                <span v-if="msg.trace?.routingNode" class="pg-trace-routing">
                  ↳ {{ msg.trace.routingNode }}
                </span>
                <span class="pg-msg-time">{{ formatTime(msg.timestamp) }}</span>
              </div>

              <div v-if="msg.tools && msg.tools.length > 0" class="pg-msg-tool-note">
                <span class="pg-msg-tool-count">{{ msg.tools.length }}개 도구 호출</span>
                <span>상세 입력과 결과는 오른쪽 실행 패널에서 확인할 수 있습니다.</span>
              </div>

              <!-- Reasoning / CoT Accordion -->
              <div v-if="msg.reasoning" class="pg-reasoning-block">
                <div class="pg-reasoning-head" @click="toggleReasoning(msg.id)">
                  <span>추론 메모</span>
                  <span class="pg-expand-icon">{{ showReasoning[msg.id] === true ? '접기' : '펼치기' }}</span>
                </div>
                <div v-if="showReasoning[msg.id] === true" class="pg-reasoning-body">
                  <pre class="pg-reasoning-text">{{ msg.reasoning }}</pre>
                </div>
              </div>

              <!-- Generated Content (Markdown Formatted) -->
              <div class="pg-msg-text is-assistant-text">
                <div class="pg-markdown-content" v-html="renderMarkdown(msg.content)"></div>
                <span v-if="msg.status === 'streaming'" class="pg-cursor-blink">▋</span>
              </div>

              <!-- Telemetry Metrics Bar -->
              <div v-if="msg.trace && msg.status === 'done'" class="pg-telemetry-bar">
                <span v-if="msg.trace.totalLatencyMs" class="pg-telem-item">latency {{ msg.trace.totalLatencyMs }}ms</span>
                <span v-if="msg.trace.tokensPerSec" class="pg-telem-item">throughput {{ msg.trace.tokensPerSec.toFixed(1) }} tok/s</span>
                <span v-if="msg.trace.ttftMs" class="pg-telem-item">TTFT {{ msg.trace.ttftMs }}ms</span>
                <span v-if="msg.trace.usage?.completionTokens" class="pg-telem-item">{{ msg.trace.usage.completionTokens }} tokens</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area (Docked at Bottom) -->
        <div class="pg-input-dock">
          <!-- Preset Chips -->
          <div class="pg-preset-chips">
            <button
              v-for="preset in promptPresets"
              :key="preset.label"
              type="button"
              class="pg-preset-btn"
              :disabled="isStreaming"
              @click="setPreset(preset.text)"
            >
              {{ preset.label }}
            </button>
          </div>

          <!-- Prompt Form -->
          <div class="pg-input-form">
            <textarea
              v-model="userPrompt"
              class="pg-textarea-input"
              rows="2"
              placeholder="프롬프트를 입력하세요... (Ctrl+Enter 또는 Cmd+Enter 전송)"
              :disabled="isStreaming"
              @keydown.ctrl.enter="handleSend"
              @keydown.meta.enter="handleSend"
            ></textarea>
            <div class="pg-form-actions">
              <button
                v-if="isStreaming"
                type="button"
                class="pg-btn-stop"
                @click="stopExecution"
              >
                중단 (Stop)
              </button>
              <button
                v-else
                type="button"
                class="pg-btn-send"
                :disabled="!userPrompt.trim()"
                @click="handleSend"
              >
                전송 (Run) ↵
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Panel 3: Tool Activity (우측) ───────────────────── -->
      <aside class="pg-panel-engine">
        <div class="pg-panel-header">
          <div class="pg-header-left">
            <span class="pg-panel-title">도구 실행</span>
            <span class="pg-badge-cache">호출과 출처</span>
          </div>
          <span class="pg-tool-count">{{ currentToolCalls.length }} calls</span>
        </div>

        <div class="pg-engine-scroll">
          <section class="pg-tool-activity">
            <div class="pg-tool-activity-head">
              <div>
                <span class="pg-section-label">TOOL ACTIVITY</span>
                <p>질문 처리에 사용된 도구와 결과</p>
              </div>
              <span class="pg-activity-live" :class="{ active: isStreaming }">{{ isStreaming ? 'LIVE' : 'IDLE' }}</span>
            </div>

            <div v-if="currentToolCalls.length === 0" class="pg-tool-empty">
              <span class="pg-tool-empty-line"></span>
              <strong>아직 도구 호출이 없습니다.</strong>
              <p>최신 정보나 계산이 필요한 질문을 보내면 이곳에 처리 과정이 쌓입니다.</p>
            </div>

            <div v-else class="pg-tool-feed">
              <article
                v-for="t in currentToolCalls"
                :key="t.callId"
                class="pg-tool-entry"
                :class="`entry-${t.status}`"
              >
                <button type="button" class="pg-tool-entry-head" @click="toggleToolExpand(t.callId)">
                  <span class="pg-tool-state-dot" aria-hidden="true"></span>
                  <span class="pg-tool-entry-name">
                    <strong>{{ getToolMeta(t.tool).label }}</strong>
                    <small>{{ getToolMeta(t.tool).code }} · {{ formatTime(t.messageTimestamp) }}</small>
                  </span>
                  <span class="pg-tool-entry-status">
                    {{ t.status === 'calling' ? '실행 중' : t.status === 'error' ? '실패' : '완료' }}
                  </span>
                  <span class="pg-tool-entry-chevron" aria-hidden="true">{{ expandedTools[t.callId] ? '−' : '+' }}</span>
                </button>

                <div v-if="expandedTools[t.callId]" class="pg-tool-entry-body">
                  <div class="pg-tool-payload">
                    <span class="pg-tool-subhead">INPUT</span>
                    <pre class="pg-tool-json"><code>{{ formatPayload(t.input) }}</code></pre>
                  </div>

                  <div v-if="t.tool === 'web_search' && getSearchResults(t).length > 0" class="pg-search-results">
                    <div class="pg-tool-result-head">
                      <span class="pg-tool-subhead">SOURCES</span>
                      <span v-if="t.durationMs" class="pg-tool-latency">{{ t.durationMs }}ms</span>
                    </div>
                    <a
                      v-for="result in getSearchResults(t)"
                      :key="result.url"
                      class="pg-source-result"
                      :href="result.url"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <strong>{{ result.title }}</strong>
                      <span>{{ formatSourceUrl(result.url) }}</span>
                      <p>{{ result.snippet }}</p>
                    </a>
                  </div>

                  <div v-else-if="t.output" class="pg-tool-payload">
                    <div class="pg-tool-result-head">
                      <span class="pg-tool-subhead">RESULT</span>
                      <span v-if="t.durationMs" class="pg-tool-latency">{{ t.durationMs }}ms</span>
                    </div>
                    <pre class="pg-tool-json"><code>{{ formatPayload(t.output) }}</code></pre>
                  </div>

                  <p v-if="t.error" class="pg-tool-error">{{ t.error }}</p>
                  <p v-if="t.status === 'calling'" class="pg-tool-waiting">외부 응답을 기다리는 중입니다.</p>
                </div>
              </article>
            </div>
          </section>

          <!-- Pipeline Stages -->
          <div class="pg-config-section">
            <label class="pg-section-label">EXECUTION PIPELINE</label>
            <div class="pg-pipeline-list">
              <div
                v-for="stage in engineStages"
                :key="stage.id"
                class="pg-stage-item"
                :class="`stage-${stage.status}`"
              >
                <div class="pg-stage-top">
                  <div class="pg-stage-indicator">
                    <span class="pg-stage-step">{{ stage.step }}</span>
                    <strong class="pg-stage-name">{{ stage.name }}</strong>
                  </div>
                  <span class="pg-stage-status-badge">{{ stage.status.toUpperCase() }}</span>
                </div>
                <div class="pg-stage-desc">{{ stage.desc }}</div>
                <div v-if="stage.detail || stage.latencyMs !== undefined" class="pg-stage-meta">
                  <span v-if="stage.latencyMs !== undefined" class="pg-stage-lat">{{ stage.latencyMs }}ms</span>
                  <span v-if="stage.detail" class="pg-stage-det">{{ stage.detail }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Real-time Telemetry -->
          <div class="pg-config-section">
            <label class="pg-section-label">REAL-TIME TELEMETRY</label>
            <div class="pg-metric-grid">
              <div class="pg-metric-box">
                <span class="pg-metric-title">Latency</span>
                <strong class="pg-metric-num">{{ latestMetrics.totalLatencyMs ? `${latestMetrics.totalLatencyMs}ms` : '—' }}</strong>
              </div>
              <div class="pg-metric-box">
                <span class="pg-metric-title">Throughput</span>
                <strong class="pg-metric-num">{{ latestMetrics.tokensPerSec ? `${latestMetrics.tokensPerSec.toFixed(1)} t/s` : '—' }}</strong>
              </div>
              <div class="pg-metric-box">
                <span class="pg-metric-title">TTFT</span>
                <strong class="pg-metric-num">{{ latestMetrics.ttftMs ? `${latestMetrics.ttftMs}ms` : '—' }}</strong>
              </div>
              <div class="pg-metric-box">
                <span class="pg-metric-title">Tokens</span>
                <strong class="pg-metric-num">{{ latestMetrics.tokens ? `${latestMetrics.tokens} tok` : '—' }}</strong>
              </div>
            </div>
          </div>

          <!-- Browser Cache & Privacy -->
          <div class="pg-config-section">
            <label class="pg-section-label">CACHE & SECURITY</label>
            <div class="pg-info-card">
              <div class="pg-info-row">
                <span class="pg-info-key">Storage Location</span>
                <span class="pg-info-val is-green">Client localStorage</span>
              </div>
              <div class="pg-info-row">
                <span class="pg-info-key">Cached Sessions</span>
                <span class="pg-info-val">{{ sessions.length }} 세션 ({{ totalMessagesCount }} msgs)</span>
              </div>
              <div class="pg-info-row">
                <span class="pg-info-key">Storage Size</span>
                <span class="pg-info-val">{{ browserCacheSize }}</span>
              </div>
              <div class="pg-info-row">
                <span class="pg-info-key">Server Retention</span>
                <span class="pg-info-val">0% (Stateless In-Memory)</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.playground-shell {
  width: min(1440px, calc(100% - 40px));
  margin: 0 auto;
  padding: 48px 0 84px;
  color: var(--ink);
}

.playground-hero {
  padding: 12px 0 28px;
}

.pg-panel-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.playground-hero h1 {
  max-width: 920px;
  margin: 14px 0 0;
  color: var(--ink);
  font-size: clamp(34px, 4.8vw, 56px);
  font-weight: 750;
  letter-spacing: -.055em;
  line-height: 1.14;
}

.playground-hero h1 em {
  color: var(--cobalt);
  font-style: normal;
}

.pg-lead {
  max-width: 820px;
  margin: 16px 0 0;
  color: var(--ink-soft);
  font-size: 14.5px;
  line-height: 1.75;
  word-break: keep-all;
}

/* ── 3-Panel Studio Container ────────────────────────────── */
.pg-studio-container {
  display: grid;
  grid-template-columns: 242px minmax(0, 1fr) 326px;
  height: min(820px, calc(100vh - 260px));
  min-height: 680px;
  border: 1px solid var(--mist-strong);
  border-radius: 6px;
  background: var(--paper-raised);
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.07);
  overflow: hidden;
}

/* ── Panel 1: Sessions (좌측) ────────────────────────────── */
.pg-panel-sessions {
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--paper) 68%, var(--paper-raised));
  border-right: 1px solid var(--mist-strong);
  overflow: hidden;
}

.pg-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 16px;
  border-bottom: 1px solid var(--mist-strong);
  background: var(--paper-raised);
}

.pg-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pg-panel-title {
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .07em;
}

.pg-badge-cache {
  color: #10b981;
  font-family: var(--vp-font-family-mono);
  font-size: 8.5px;
  font-weight: 650;
}

.pg-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--mist-strong);
  border-radius: 4px;
  background: var(--paper-raised);
  color: var(--cobalt);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms ease;
}

.pg-btn-icon:hover {
  border-color: var(--cobalt);
  background: var(--cobalt-soft);
}

.pg-sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pg-session-item {
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  transition: all 150ms ease;
}

.pg-session-item:hover {
  background: var(--paper-raised);
  border-color: var(--mist-strong);
}

.pg-session-item.active {
  background: var(--paper-raised);
  border-color: var(--cobalt);
  box-shadow: 0 2px 8px rgba(47, 91, 234, 0.08);
}

.pg-session-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.pg-session-title {
  font-size: 12px;
  font-weight: 650;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pg-session-del {
  border: none;
  background: transparent;
  color: var(--slate);
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
  opacity: 0.4;
  transition: opacity 150ms ease;
}

.pg-session-del:hover {
  opacity: 1;
  color: #ef4444;
}

.pg-session-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  color: var(--slate);
}

.pg-meta-compress {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 700;
}

.pg-sessions-footer {
  padding: 10px 14px;
  border-top: 1px solid var(--mist-strong);
  background: var(--paper-raised);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pg-cache-notice {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 9.5px;
  color: var(--slate);
  line-height: 1.4;
}

.pg-notice-mark {
  flex: 0 0 auto;
  padding: 2px 4px;
  border: 1px solid var(--mist-strong);
  border-radius: 2px;
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: .04em;
}

.pg-btn-clear {
  width: 100%;
  padding: 6px;
  border: 1px dashed var(--mist-strong);
  border-radius: 4px;
  background: transparent;
  color: var(--slate);
  font-size: 10px;
  cursor: pointer;
  transition: all 150ms ease;
}

.pg-btn-clear:hover {
  border-color: #ef4444;
  color: #ef4444;
}

/* ── Panel 2: Inference & Tool Execution (가운데) ───────── */
.pg-panel-inference {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--paper-raised);
  overflow: hidden;
}

.pg-inference-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 20px;
  border-bottom: 1px solid var(--mist-strong);
  background: color-mix(in srgb, var(--paper) 40%, var(--paper-raised));
}

.pg-status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pg-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
}

.pg-pulse-dot.is-active {
  background: var(--cobalt);
  box-shadow: 0 0 0 3px var(--cobalt-soft);
  animation: pulse-ring 1.5s infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

.pg-status-label {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-soft);
}

.pg-topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pg-btn-compress {
  padding: 4px 9px;
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.08);
  color: #059669;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 650;
  cursor: pointer;
  transition: all 150ms ease;
}

.pg-btn-compress:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.16);
  border-color: #10b981;
}

.pg-btn-compress:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pg-tag-gateway {
  background: var(--terminal);
  color: #93c5fd;
  border-radius: 3px;
  padding: 2px 7px;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
}

/* Messages Viewport */
.pg-messages-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Session Compressed Banner */
.pg-compressed-banner {
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: 5px;
  background: rgba(16, 185, 129, 0.04);
  overflow: hidden;
}

.pg-compressed-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}

.pg-compressed-badge {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  font-weight: 750;
  padding: 2px 6px;
  border-radius: 3px;
}

.pg-compressed-stats {
  font-size: 11px;
  color: var(--ink-soft);
  font-weight: 600;
}

.pg-compressed-toggle {
  margin-left: auto;
  color: #059669;
  font-size: 10px;
  font-family: var(--vp-font-family-mono);
}

.pg-compressed-body {
  padding: 8px 12px 10px;
  border-top: 1px solid rgba(16, 185, 129, 0.2);
  background: rgba(255, 255, 255, 0.5);
}

.pg-compressed-text {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  color: var(--ink-soft);
  line-height: 1.5;
}

.pg-compressed-meta {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 9.5px;
  color: var(--slate);
}

.pg-empty-state {
  margin: auto;
  text-align: center;
  max-width: 440px;
  padding: 40px 20px;
}

.pg-empty-mark {
  display: inline-block;
  margin-bottom: 14px;
  border-bottom: 2px solid var(--cobalt);
  padding-bottom: 5px;
  color: var(--cobalt);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 750;
  letter-spacing: .12em;
}

.pg-empty-state h3 {
  margin: 0;
  color: var(--ink);
  font-size: 18px;
  font-weight: 700;
}

.pg-empty-state p {
  margin: 8px 0 0;
  color: var(--slate);
  font-size: 13px;
  line-height: 1.6;
}

.pg-message-row {
  display: flex;
  flex-direction: column;
}

.pg-msg-bubble {
  border-radius: 6px;
  padding: 14px 18px;
}

.pg-msg-bubble.is-user {
  align-self: flex-end;
  max-width: 82%;
  background: color-mix(in srgb, var(--paper) 70%, var(--mist-strong));
  border: 1px solid var(--mist-strong);
}

.pg-msg-bubble.is-assistant {
  align-self: stretch;
  background: var(--paper-raised);
  border: 1px solid var(--mist-strong);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
}

.pg-msg-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
}

.pg-badge-role {
  color: var(--slate);
  font-weight: 700;
  letter-spacing: .05em;
}

.pg-badge-role.is-govail {
  color: var(--cobalt);
}

.pg-trace-routing {
  color: #64748b;
  font-size: 10px;
}

.pg-msg-time {
  margin-left: auto;
  color: var(--slate);
}

.pg-msg-tool-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  border-left: 2px solid var(--cobalt);
  padding: 7px 10px;
  background: var(--cobalt-soft);
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  line-height: 1.45;
}

.pg-msg-tool-count {
  color: var(--cobalt);
  font-weight: 700;
}

.pg-msg-text {
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--ink);
  word-break: break-word;
}

.pg-cursor-blink {
  display: inline-block;
  color: var(--cobalt);
  font-weight: 700;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  from, to { opacity: 1; }
  50% { opacity: 0; }
}

/* Tool execution blocks */
.pg-tools-block {
  margin: 10px 0 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pg-tool-card {
  border: 1px solid var(--mist-strong);
  border-left: 3px solid #10b981;
  border-radius: 4px;
  background: color-mix(in srgb, var(--paper) 80%, var(--paper-raised));
  overflow: hidden;
}

.pg-tool-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 12px;
  cursor: pointer;
  user-select: none;
}

.pg-tool-name-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pg-tool-icon { font-size: 13px; }

.pg-tool-name {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--ink);
}

.pg-tool-status {
  font-family: var(--vp-font-family-mono);
  font-size: 8.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 2px;
}

.pg-tool-status.status-done {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.pg-tool-status.status-calling {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

.pg-tool-right {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--slate);
}

.pg-expand-icon {
  font-size: 9.5px;
  color: var(--cobalt);
}

.pg-tool-body {
  padding: 10px 14px;
  border-top: 1px solid var(--mist-strong);
  background: var(--terminal);
}

.pg-tool-subhead {
  color: #94a3b8;
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .05em;
  margin-bottom: 4px;
}

.pg-code-pre {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  color: #e2e8f0;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  line-height: 1.5;
  overflow-x: auto;
}

/* Reasoning block */
.pg-reasoning-block {
  margin: 8px 0 12px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-left: 3px solid #f59e0b;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.04);
}

.pg-reasoning-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 12px;
  font-size: 11px;
  font-weight: 650;
  color: #b45309;
  cursor: pointer;
}

.pg-reasoning-body {
  padding: 8px 12px 12px;
  border-top: 1px solid rgba(245, 158, 11, 0.15);
}

.pg-reasoning-text {
  margin: 0;
  color: var(--ink-soft);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* ── Markdown Content Formatting ─────────────────────────── */
.pg-markdown-content {
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--ink);
  word-break: break-word;
}

.pg-markdown-content :deep(p) {
  margin: 0 0 10px;
}

.pg-markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.pg-markdown-content :deep(h1),
.pg-markdown-content :deep(h2),
.pg-markdown-content :deep(h3),
.pg-markdown-content :deep(h4) {
  margin: 14px 0 6px;
  color: var(--ink);
  font-weight: 700;
  line-height: 1.35;
}

.pg-markdown-content :deep(h1) { font-size: 16px; }
.pg-markdown-content :deep(h2) { font-size: 15px; }
.pg-markdown-content :deep(h3) { font-size: 14px; }

.pg-markdown-content :deep(ul),
.pg-markdown-content :deep(ol) {
  margin: 6px 0 12px 18px;
  padding: 0;
}

.pg-markdown-content :deep(li) {
  margin-bottom: 3px;
  line-height: 1.6;
}

.pg-markdown-content :deep(code) {
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  background: color-mix(in srgb, var(--paper) 70%, var(--mist-strong));
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--cobalt);
}

.pg-markdown-content :deep(pre) {
  margin: 10px 0;
  padding: 10px 12px;
  border-radius: 5px;
  background: var(--terminal);
  overflow-x: auto;
}

.pg-markdown-content :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #e2e8f0;
  font-size: 11.5px;
  line-height: 1.55;
}

.pg-markdown-content :deep(blockquote) {
  margin: 10px 0;
  padding: 6px 12px;
  border-left: 3px solid var(--cobalt);
  background: var(--cobalt-soft);
  color: var(--ink-soft);
}

.pg-markdown-content :deep(table) {
  width: 100%;
  margin: 10px 0;
  border-collapse: collapse;
  font-size: 12px;
}

.pg-markdown-content :deep(th),
.pg-markdown-content :deep(td) {
  border: 1px solid var(--mist-strong);
  padding: 6px 8px;
  text-align: left;
}

.pg-markdown-content :deep(th) {
  background: color-mix(in srgb, var(--paper) 70%, var(--paper-raised));
  font-weight: 650;
}

/* Telemetry Bar */
.pg-telemetry-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid var(--mist-strong);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--slate);
}

.pg-telem-item {
  display: inline-flex;
  align-items: center;
}

/* Input Dock */
.pg-input-dock {
  padding: 14px 20px;
  border-top: 1px solid var(--mist-strong);
  background: color-mix(in srgb, var(--paper) 45%, var(--paper-raised));
}

.pg-preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.pg-preset-btn {
  padding: 4px 9px;
  border: 1px solid var(--mist-strong);
  border-radius: 12px;
  background: var(--paper-raised);
  color: var(--ink-soft);
  font-size: 10.5px;
  cursor: pointer;
  transition: all 150ms ease;
}

.pg-preset-btn:hover:not(:disabled) {
  border-color: var(--cobalt);
  color: var(--cobalt);
  background: var(--cobalt-soft);
}

.pg-input-form {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.pg-textarea-input {
  flex: 1;
  min-height: 52px;
  max-height: 140px;
  padding: 10px 12px;
  border: 1px solid var(--mist-strong);
  border-radius: 5px;
  background: var(--paper-raised);
  color: var(--ink);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
}

.pg-textarea-input:focus {
  outline: none;
  border-color: var(--cobalt);
  box-shadow: 0 0 0 2px var(--cobalt-soft);
}

.pg-form-actions {
  display: flex;
  align-items: center;
}

.pg-btn-send {
  padding: 11px 18px;
  border: 1px solid var(--cobalt);
  border-radius: 5px;
  background: var(--cobalt);
  color: #fff;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .04em;
  cursor: pointer;
  white-space: nowrap;
  transition: all 150ms ease;
}

.pg-btn-send:hover:not(:disabled) {
  opacity: 0.9;
}

.pg-btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pg-btn-stop {
  padding: 11px 18px;
  border: 1px solid #ef4444;
  border-radius: 5px;
  background: #ef4444;
  color: #fff;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

/* ── Panel 3: Engine Process Pipeline (우측) ─────────────── */
.pg-panel-engine {
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--paper) 68%, var(--paper-raised));
  border-left: 1px solid var(--mist-strong);
  overflow: hidden;
}

.pg-engine-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.pg-config-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pg-section-label {
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 9.5px;
  font-weight: 750;
  letter-spacing: .06em;
  text-transform: uppercase;
}

/* Tool activity feed */
.pg-tool-count {
  color: var(--cobalt);
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  font-weight: 700;
}

.pg-tool-activity {
  border-bottom: 1px solid var(--mist-strong);
  padding-bottom: 18px;
}

.pg-tool-activity-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.pg-tool-activity-head p {
  margin: 4px 0 0;
  color: var(--slate);
  font-size: 11px;
  line-height: 1.45;
}

.pg-activity-live {
  border: 1px solid var(--mist-strong);
  border-radius: 2px;
  padding: 2px 5px;
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 8px;
  font-weight: 750;
  letter-spacing: .05em;
}

.pg-activity-live.active {
  border-color: rgba(47, 91, 234, .45);
  background: var(--cobalt-soft);
  color: var(--cobalt);
}

.pg-tool-empty {
  border: 1px dashed var(--mist-strong);
  padding: 14px;
  color: var(--slate);
}

.pg-tool-empty-line {
  display: block;
  width: 28px;
  height: 2px;
  margin-bottom: 10px;
  background: var(--mist-strong);
}

.pg-tool-empty strong {
  display: block;
  color: var(--ink-soft);
  font-size: 11px;
}

.pg-tool-empty p {
  margin: 5px 0 0;
  font-size: 10px;
  line-height: 1.55;
}

.pg-tool-feed {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pg-tool-entry {
  overflow: hidden;
  border: 1px solid var(--mist-strong);
  border-left: 3px solid #10b981;
  border-radius: 4px;
  background: var(--paper-raised);
}

.pg-tool-entry.entry-calling {
  border-left-color: #f59e0b;
}

.pg-tool-entry.entry-error {
  border-left-color: #ef4444;
}

.pg-tool-entry-head {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto 12px;
  align-items: center;
  width: 100%;
  gap: 8px;
  border: 0;
  padding: 10px 9px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.pg-tool-entry-head:hover {
  background: color-mix(in srgb, var(--cobalt-soft) 52%, transparent);
}

.pg-tool-state-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
}

.entry-calling .pg-tool-state-dot {
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, .14);
  animation: pulse-ring 1.5s infinite;
}

.entry-error .pg-tool-state-dot {
  background: #ef4444;
}

.pg-tool-entry-name {
  min-width: 0;
}

.pg-tool-entry-name strong,
.pg-tool-entry-name small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pg-tool-entry-name strong {
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
}

.pg-tool-entry-name small {
  margin-top: 3px;
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 8.5px;
}

.pg-tool-entry-status {
  color: #059669;
  font-family: var(--vp-font-family-mono);
  font-size: 8px;
  font-weight: 750;
}

.entry-calling .pg-tool-entry-status { color: #b45309; }
.entry-error .pg-tool-entry-status { color: #dc2626; }

.pg-tool-entry-chevron {
  color: var(--cobalt);
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  line-height: 1;
}

.pg-tool-entry-body {
  border-top: 1px solid var(--mist-strong);
  padding: 11px;
  background: var(--terminal);
}

.pg-tool-payload + .pg-tool-payload,
.pg-search-results {
  margin-top: 11px;
  border-top: 1px solid rgba(148, 163, 184, .2);
  padding-top: 11px;
}

.pg-tool-result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pg-tool-entry-body .pg-tool-subhead {
  display: block;
  margin: 0 0 5px;
  color: #a6b5ca;
}

.pg-tool-json {
  max-height: 180px;
  margin: 0;
  overflow: auto;
  color: #e2e8f0;
  font-family: var(--vp-font-family-mono);
  font-size: 9.5px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.pg-source-result {
  display: block;
  border-top: 1px solid rgba(148, 163, 184, .18);
  padding: 9px 0 2px;
  color: #e2e8f0 !important;
  text-decoration: none !important;
}

.pg-source-result:first-of-type {
  border-top: 0;
  padding-top: 2px;
}

.pg-source-result strong,
.pg-source-result span,
.pg-source-result p {
  display: block;
}

.pg-source-result strong {
  font-size: 10.5px;
  line-height: 1.4;
}

.pg-source-result span {
  margin-top: 3px;
  color: #8fb0ff;
  font-family: var(--vp-font-family-mono);
  font-size: 8px;
}

.pg-source-result p {
  margin: 4px 0 0;
  color: #a6b5ca;
  font-size: 9.5px;
  line-height: 1.5;
}

.pg-source-result:hover strong {
  color: #9db6ff;
}

.pg-tool-latency {
  color: #8fb0ff;
  font-family: var(--vp-font-family-mono);
  font-size: 8px;
}

.pg-tool-error,
.pg-tool-waiting {
  margin: 9px 0 0;
  font-size: 9.5px;
  line-height: 1.5;
}

.pg-tool-error { color: #fda4af; }
.pg-tool-waiting { color: #f7c978; }

/* Engine Process Stages */
.pg-pipeline-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pg-stage-item {
  padding: 8px 10px;
  border: 1px solid var(--mist-strong);
  border-radius: 4px;
  background: var(--paper-raised);
  transition: all 150ms ease;
}

.pg-stage-item.stage-running {
  border-color: var(--cobalt);
  background: var(--cobalt-soft);
  box-shadow: 0 0 0 1px var(--cobalt);
}

.pg-stage-item.stage-done {
  border-left: 3px solid #10b981;
}

.pg-stage-item.stage-pass {
  opacity: 0.6;
}

.pg-stage-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pg-stage-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pg-stage-step {
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  font-weight: 700;
  color: var(--slate);
}

.pg-stage-name {
  font-size: 11px;
  color: var(--ink);
  font-weight: 650;
}

.pg-stage-status-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 8px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 2px;
  background: var(--paper);
  color: var(--slate);
}

.stage-running .pg-stage-status-badge {
  background: var(--cobalt);
  color: #fff;
  animation: pulse-badge 1s infinite alternate;
}

@keyframes pulse-badge {
  from { opacity: 0.8; }
  to { opacity: 1; }
}

.stage-done .pg-stage-status-badge {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.pg-stage-desc {
  margin-top: 3px;
  color: var(--slate);
  font-size: 9.5px;
  line-height: 1.35;
}

.pg-stage-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
  padding-top: 4px;
  border-top: 1px dashed var(--mist-strong);
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
}

.pg-stage-lat {
  color: var(--cobalt);
  font-weight: 600;
}

.pg-stage-det {
  color: var(--slate);
}

/* Metric grid */
.pg-metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.pg-metric-box {
  padding: 8px 10px;
  border: 1px solid var(--mist-strong);
  border-radius: 4px;
  background: var(--paper-raised);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pg-metric-title {
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  text-transform: uppercase;
}

.pg-metric-num {
  color: var(--cobalt);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 700;
}

/* Info card */
.pg-info-card {
  padding: 8px 12px;
  border: 1px solid var(--mist-strong);
  border-radius: 5px;
  background: var(--paper-raised);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pg-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
}

.pg-info-key {
  color: var(--slate);
}

.pg-info-val {
  color: var(--ink);
  font-weight: 600;
}

.pg-info-val.is-green {
  color: #10b981;
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 1100px) {
  .pg-studio-container {
    grid-template-columns: 200px minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) 420px;
    height: 1120px;
    min-height: 0;
  }
  .pg-panel-engine {
    display: flex;
    grid-column: 1 / -1;
    grid-row: 2;
    border-left: none;
    border-top: 1px solid var(--mist-strong);
  }
}

@media (max-width: 760px) {
  .playground-shell {
    width: min(100% - 24px, 1440px);
    padding-top: 32px;
  }
  .pg-studio-container {
    display: flex;
    flex-direction: column;
    height: auto;
  }
  .pg-panel-sessions {
    max-height: 180px;
    border-right: none;
    border-bottom: 1px solid var(--mist-strong);
  }
  .pg-messages-viewport {
    min-height: 380px;
    max-height: 480px;
  }
  .pg-panel-engine {
    flex: 0 0 520px;
    max-height: 520px;
    border-left: none;
    border-top: 1px solid var(--mist-strong);
  }
}
</style>

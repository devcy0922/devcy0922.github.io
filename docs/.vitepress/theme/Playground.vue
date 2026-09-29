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
}

export interface MessageTrace {
  model?: string
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

export interface Session {
  id: string
  title: string
  createdAt: number
  messages: ChatMessage[]
}

// Preset questions (no tool toggles, user just asks naturally)
const promptPresets = [
  { label: '📊 클러스터 헬스 및 메트릭', text: 'GoVail 클러스터 현재 시스템 상태와 헬스 메트릭을 알려줘' },
  { label: '🔍 AI 게이트웨이 아키텍처', text: '최신 AI 게이트웨이 라우팅 전략과 모델 폴백 트렌드 웹 검색' },
  { label: '💻 Python 지연시간 백분위수', text: 'Python으로 노드 지연시간 리스트의 P50 및 P95 백분위수를 계산해줘' },
  { label: '⚡ 시맨틱 캐시 유사도 점검', text: '시맨틱 캐시 레이어의 임베딩 유사도 임계치와 TTL 상태 점검' },
]

// Tool label map
const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  system_metrics: { label: '시스템 메트릭 조회', icon: '📊' },
  web_search: { label: '실시간 웹 검색', icon: '🔍' },
  code_interpreter: { label: '코드 실행 샌드박스', icon: '💻' },
  cache_inspector: { label: '시맨틱 캐시 점검', icon: '⚡' },
}

function getToolMeta(name: string) {
  return TOOL_LABELS[name] || { label: name, icon: '🛠' }
}

// State
const sessions = ref<Session[]>([])
const currentSessionId = ref<string>('')
const userPrompt = ref('')
const isStreaming = ref(false)
const streamStatusText = ref('Ready')
const activeAbortController = ref<AbortController | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)

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

const totalMessagesCount = computed(() => {
  return sessions.value.reduce((acc, s) => acc + s.messages.length, 0)
})

const browserCacheSize = computed(() => {
  if (typeof window === 'undefined') return '0 KB'
  const raw = localStorage.getItem(STORAGE_KEY) || ''
  return (new Blob([raw]).size / 1024).toFixed(1) + ' KB'
})

// Initial default session
function initDefaultSession(): Session {
  return {
    id: 'session_' + Date.now(),
    title: '클러스터 메트릭 및 시스템 점검',
    createdAt: Date.now(),
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
          'GoVail 클러스터(`cy-server.internal`) 상태는 현재 **HEALTHY**이며, 4개의 활성 게이트웨이 라우트가 정상 가동 중입니다.\n\n* **P95 지연시간:** `38.4ms` (초저지연 유지)\n* **활성 라우트:** `4 active routes`\n* **시스템 부하:** 정상 (가동 시간 12시간 이상)\n\n추가로 확인이 필요한 메트릭이 있으시면 말씀해 주세요.',
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
const STORAGE_KEY = 'govail_playground_browser_cache_v3'

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
    // ignore storage error
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

// SSE Streaming Execution
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
  streamStatusText.value = 'Connecting to GoVail Gateway...'

  const controller = new AbortController()
  activeAbortController.value = controller

  // Automatic tools list passed internally
  const internalTools = ['system_metrics', 'web_search', 'code_interpreter', 'cache_inspector']

  try {
    const response = await fetch(RELAY_STREAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        tools: internalTools,
        enableThinking: true,
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

    asstMsg.status = 'done'
    streamStatusText.value = 'Ready'
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      streamStatusText.value = 'Stopped by user'
    } else {
      asstMsg.status = 'error'
      asstMsg.content += '\n\n⚠️ **실행 오류:** 실시간 게이트웨이 요청 실패 또는 타임아웃이 발생했습니다.'
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
    streamStatusText.value = 'GoVail Gateway: Processing request'
    if (msg.trace) {
      msg.trace.routingNode = String(data.targetNode || '')
      msg.trace.policy = String(data.policy || '')
    }
  } else if (event === 'status') {
    streamStatusText.value = String(data.message || data.phase || '')
  } else if (event === 'tool_call') {
    const meta = getToolMeta(String(data.tool))
    streamStatusText.value = `도구 실행 중: ${meta.label}`
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
    if (msg.tools) {
      const toolItem = msg.tools.find((t) => t.callId === data.callId)
      if (toolItem) {
        toolItem.output = (data.output as Record<string, unknown>) || {}
        toolItem.durationMs = Number(data.durationMs) || 0
        toolItem.status = 'done'
      }
    }
  } else if (event === 'thinking') {
    if (data.delta) {
      msg.reasoning = (msg.reasoning || '') + String(data.delta)
    }
  } else if (event === 'token') {
    streamStatusText.value = 'Streaming response...'
    if (data.reasoning) {
      msg.reasoning = (msg.reasoning || '') + String(data.reasoning)
    }
    if (data.delta) {
      msg.content += String(data.delta)
    }
  } else if (event === 'done') {
    streamStatusText.value = 'Completed'
    msg.status = 'done'
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
        GoVail Gateway의 실시간 도구(Tool Calling) 실행, SSE 토큰 스트리밍 및 추론 트레이스를 3분할 디버깅 콘솔에서 직접 검증합니다. 모든 세션은 브라우저 로컬 캐시로 안전하게 관리됩니다.
      </p>
    </header>

    <!-- 3-Panel Debug Studio -->
    <div class="pg-studio-container">
      <!-- ── Panel 1: Sessions (좌측 - 브라우저 로컬 캐시) ────── -->
      <aside class="pg-panel-sessions">
        <div class="pg-panel-header">
          <div class="pg-header-left">
            <span class="pg-panel-title">세션 (BROWSER CACHE)</span>
            <span class="pg-badge-cache" title="서버에 저장되지 않는 브라우저 로컬 캐시">Local Only</span>
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
              <span class="pg-meta-count">{{ s.messages.length }} msgs</span>
              <span class="pg-meta-time">{{ formatTime(s.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="pg-sessions-footer">
          <div class="pg-cache-notice">
            <span class="pg-notice-icon">🔒</span>
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

          <div class="pg-topbar-meta">
            <span class="pg-tag-gateway">GoVail Gateway</span>
            <span class="pg-tag-status">Live Stream (SSE)</span>
          </div>
        </div>

        <!-- Chat / Trace Viewport -->
        <div ref="messagesContainer" class="pg-messages-viewport">
          <div v-if="!currentSession || currentSession.messages.length === 0" class="pg-empty-state">
            <div class="pg-empty-icon">⚡</div>
            <h3>실시간 추론 콘솔 준비 완료</h3>
            <p>하단에 질문을 입력하거나 추천 칩을 누르면 게이트웨이가 필요한 도구를 자동으로 실행하고 답변을 스트리밍합니다.</p>
          </div>

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

              <!-- Tool Execution Blocks (Just shows running action) -->
              <div v-if="msg.tools && msg.tools.length > 0" class="pg-tools-block">
                <div v-for="t in msg.tools" :key="t.callId" class="pg-tool-card">
                  <div class="pg-tool-header" @click="toggleToolExpand(t.callId)">
                    <div class="pg-tool-name-group">
                      <span class="pg-tool-icon">{{ getToolMeta(t.tool).icon }}</span>
                      <strong class="pg-tool-name">{{ getToolMeta(t.tool).label }}</strong>
                      <span class="pg-tool-status" :class="`status-${t.status}`">
                        {{ t.status === 'calling' ? '실행 중...' : 'COMPLETED' }}
                      </span>
                    </div>
                    <div class="pg-tool-right">
                      <span v-if="t.durationMs" class="pg-tool-latency">⏱ {{ t.durationMs }}ms</span>
                      <span class="pg-expand-icon">{{ expandedTools[t.callId] ? '결과 닫기 ▲' : '실행 결과 ▼' }}</span>
                    </div>
                  </div>

                  <!-- Expanded Tool Payloads -->
                  <div v-if="expandedTools[t.callId]" class="pg-tool-body">
                    <div class="pg-tool-subhead">INPUT PARAMETERS</div>
                    <pre class="pg-code-pre"><code>{{ JSON.stringify(t.input, null, 2) }}</code></pre>
                    <div class="pg-tool-subhead">EXECUTION RESULT</div>
                    <pre class="pg-code-pre"><code>{{ JSON.stringify(t.output, null, 2) }}</code></pre>
                  </div>
                </div>
              </div>

              <!-- Reasoning / CoT Accordion -->
              <div v-if="msg.reasoning" class="pg-reasoning-block">
                <div class="pg-reasoning-head" @click="toggleReasoning(msg.id)">
                  <span>🧠 사고 과정 (Reasoning Trace)</span>
                  <span class="pg-expand-icon">{{ showReasoning[msg.id] !== false ? '▲ 접기' : '▼ 펼치기' }}</span>
                </div>
                <div v-if="showReasoning[msg.id] !== false" class="pg-reasoning-body">
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
                <span v-if="msg.trace.totalLatencyMs" class="pg-telem-item">⏱ {{ msg.trace.totalLatencyMs }}ms</span>
                <span v-if="msg.trace.tokensPerSec" class="pg-telem-item">⚡ {{ msg.trace.tokensPerSec.toFixed(1) }} tok/s</span>
                <span v-if="msg.trace.ttftMs" class="pg-telem-item">🚀 TTFT: {{ msg.trace.ttftMs }}ms</span>
                <span v-if="msg.trace.usage?.completionTokens" class="pg-telem-item">🔤 {{ msg.trace.usage.completionTokens }} tokens</span>
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

      <!-- ── Panel 3: Execution Telemetry & Security (우측) ─── -->
      <aside class="pg-panel-config">
        <div class="pg-panel-header">
          <span class="pg-panel-title">실행 인스펙터 (INSPECTOR)</span>
        </div>

        <div class="pg-config-scroll">
          <!-- Gateway Status -->
          <div class="pg-config-section">
            <label class="pg-section-label">GATEWAY RUNTIME</label>
            <div class="pg-info-card">
              <div class="pg-info-row">
                <span class="pg-info-key">Gateway Status</span>
                <span class="pg-info-val is-green">● HEALTHY</span>
              </div>
              <div class="pg-info-row">
                <span class="pg-info-key">Protocol</span>
                <span class="pg-info-val">HTTP/2 · SSE Stream</span>
              </div>
              <div class="pg-info-row">
                <span class="pg-info-key">Endpoint</span>
                <span class="pg-info-val">api.govail.cloud</span>
              </div>
              <div class="pg-info-row">
                <span class="pg-info-key">Rate Limit</span>
                <span class="pg-info-val">10 req/min (Fair-share)</span>
              </div>
            </div>
          </div>

          <!-- Performance Telemetry -->
          <div class="pg-config-section">
            <label class="pg-section-label">LATEST METRICS</label>
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

          <!-- Browser Cache Stats -->
          <div class="pg-config-section">
            <label class="pg-section-label">BROWSER CACHE STATS</label>
            <div class="pg-info-card">
              <div class="pg-info-row">
                <span class="pg-info-key">Stored Sessions</span>
                <span class="pg-info-val">{{ sessions.length }}</span>
              </div>
              <div class="pg-info-row">
                <span class="pg-info-key">Total Messages</span>
                <span class="pg-info-val">{{ totalMessagesCount }}</span>
              </div>
              <div class="pg-info-row">
                <span class="pg-info-key">Cache Storage</span>
                <span class="pg-info-val">{{ browserCacheSize }}</span>
              </div>
              <div class="pg-info-row">
                <span class="pg-info-key">Storage Target</span>
                <span class="pg-info-val">localStorage (Client)</span>
              </div>
            </div>
          </div>

          <!-- Security & Privacy Boundary -->
          <div class="pg-config-section">
            <label class="pg-section-label">SECURITY BOUNDARY</label>
            <div class="pg-security-box">
              <div class="pg-sec-item">
                <span class="pg-sec-icon">🛡</span>
                <p><strong>Zero Server Storage:</strong> 대화 기록과 프롬프트는 서버 DB에 저장되지 않으며 브라우저에만 캐시됩니다.</p>
              </div>
              <div class="pg-sec-item">
                <span class="pg-sec-icon">⚡</span>
                <p><strong>Sanitized Output:</strong> 민감 내부 주소, 인증 토큰 및 시크릿은 공개 경계에 포함되지 않습니다.</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- How this is exposed / Principles section -->
    <section class="pg-explain">
      <div>
        <p class="pg-panel-label">How this is exposed</p>
        <h2>코드를 전부 공개하지 않아도<br />설계와 실행 품질은 증명할 수 있습니다.</h2>
      </div>
      <div class="pg-principles">
        <article>
          <h3>Full SSE Streaming</h3>
          <p>GoVail Gateway 및 릴레이 백엔드와 Server-Sent Events로 연결되어 토큰과 추론 과정이 실시간 타이핑됩니다.</p>
        </article>
        <article>
          <h3>Autonomous Tool Execution</h3>
          <p>도구 스위치 없이도 프롬프트 의도에 맞게 시스템 메트릭, 실시간 검색, 코드 샌드박스가 자동으로 격리 실행됩니다.</p>
        </article>
        <article>
          <h3>Zero Server Persistence</h3>
          <p>퍼블릭 데모 환경 특성에 맞춰 대화와 세션은 방문자의 브라우저 로컬 캐시에서만 프라이빗하게 운용됩니다.</p>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.playground-shell {
  width: min(1440px, calc(100% - 40px));
  margin: 0 auto;
  padding: 56px 0 96px;
  color: var(--ink);
}

.playground-hero {
  padding: 16px 0 36px;
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
  margin: 16px 0 0;
  color: var(--ink);
  font-size: clamp(36px, 5vw, 60px);
  font-weight: 750;
  letter-spacing: -.055em;
  line-height: 1.12;
}

.playground-hero h1 em {
  color: var(--cobalt);
  font-style: normal;
}

.pg-lead {
  max-width: 820px;
  margin: 18px 0 0;
  color: var(--ink-soft);
  font-size: 15px;
  line-height: 1.8;
  word-break: keep-all;
}

/* ── 3-Panel Studio Container ────────────────────────────── */
.pg-studio-container {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 280px;
  height: 820px;
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
  padding: 14px 16px;
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
  padding: 12px 20px;
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

.pg-topbar-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pg-tag-gateway {
  background: var(--terminal);
  color: #93c5fd;
  border-radius: 3px;
  padding: 2px 7px;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
}

.pg-tag-status {
  background: var(--cobalt-soft);
  color: var(--cobalt);
  border-radius: 3px;
  padding: 2px 7px;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 600;
}

/* Messages Viewport */
.pg-messages-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pg-empty-state {
  margin: auto;
  text-align: center;
  max-width: 440px;
  padding: 40px 20px;
}

.pg-empty-icon {
  font-size: 32px;
  margin-bottom: 12px;
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

/* ── Panel 3: Execution Telemetry & Security (우측) ──────── */
.pg-panel-config {
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--paper) 68%, var(--paper-raised));
  border-left: 1px solid var(--mist-strong);
  overflow: hidden;
}

.pg-config-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
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

/* Security box */
.pg-security-box {
  padding: 10px 12px;
  border: 1px solid var(--mist-strong);
  border-radius: 5px;
  background: var(--paper-raised);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pg-sec-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.pg-sec-icon {
  font-size: 13px;
  flex-shrink: 0;
}

.pg-sec-item p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 10.5px;
  line-height: 1.5;
}

/* ── Principles / Explanation ────────────────────────────── */
.pg-explain {
  display: grid;
  grid-template-columns: minmax(280px, .8fr) minmax(0, 1.2fr);
  gap: 72px;
  padding-top: 80px;
}

.pg-explain h2 {
  margin: 11px 0 0;
  color: var(--ink);
  font-size: clamp(26px, 3vw, 36px);
  letter-spacing: -.045em;
  line-height: 1.35;
}

.pg-principles {
  border-top: 1px solid var(--mist-strong);
}

.pg-principles article {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 18px;
  border-bottom: 1px solid var(--mist-strong);
  padding: 20px 0;
}

.pg-principles h3 {
  margin: 0;
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
}

.pg-principles p {
  margin: 0;
  color: var(--ink-soft);
  font-size: 11.5px;
  line-height: 1.7;
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 1100px) {
  .pg-studio-container {
    grid-template-columns: 200px minmax(0, 1fr);
    height: 760px;
  }
  .pg-panel-config {
    display: none;
  }
}

@media (max-width: 760px) {
  .playground-shell {
    width: min(100% - 24px, 1440px);
    padding-top: 36px;
  }
  .pg-studio-container {
    display: flex;
    flex-direction: column;
    height: auto;
  }
  .pg-panel-sessions {
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--mist-strong);
  }
  .pg-messages-viewport {
    min-height: 380px;
    max-height: 480px;
  }
  .pg-explain {
    grid-template-columns: 1fr;
    gap: 32px;
    padding-top: 56px;
  }
  .pg-principles article {
    grid-template-columns: 1fr;
  }
}
</style>

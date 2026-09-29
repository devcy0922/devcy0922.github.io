<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const RELAY_STREAM_URL = 'https://api.govail.cloud/v1/model-routing/stream'
const RELAY_RUN_URL = 'https://api.govail.cloud/v1/model-routing/run'

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
  model: string
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
  model: string
  messages: ChatMessage[]
}

export interface AvailableTool {
  id: string
  name: string
  label: string
  icon: string
  desc: string
  enabled: boolean
}

// Fixed Model & Reasoning
const selectedModel = ref('govail/thinker')
const reasoningEffort = ref('low')

// Tool configuration
const tools = ref<AvailableTool[]>([
  {
    id: 'system_metrics',
    name: 'system_metrics',
    label: '시스템 메트릭 조회',
    icon: '📊',
    desc: '클러스터 노드 헬스, 활성 커넥션, P95 지연시간',
    enabled: true,
  },
  {
    id: 'web_search',
    name: 'web_search',
    label: '실시간 웹 검색',
    icon: '🔍',
    desc: '최신 아키텍처 문서 및 엔지니어링 벤치마크',
    enabled: true,
  },
  {
    id: 'code_interpreter',
    name: 'code_interpreter',
    label: '코드 실행 샌드박스',
    icon: '💻',
    desc: 'Python/JS 통계 연산 및 백분위수 계산',
    enabled: true,
  },
  {
    id: 'cache_inspector',
    name: 'cache_inspector',
    label: '시맨틱 캐시 점검',
    icon: '⚡',
    desc: 'GoVail Semantic Cache 적중률 및 TTL 분석',
    enabled: false,
  },
])

// Routing parameters
const routingPolicy = ref('LOWEST_LATENCY')
const temperature = ref(0.5)
const maxTokens = ref(400)
const enableThinking = ref(true)
const systemPrompt = ref(
  'You are an expert AI engineer at GoVail Cloud. Provide concise, technically accurate conclusions based on verified tool executions.',
)

// Preset questions
const promptPresets = [
  { label: '📊 클러스터 메트릭 점검', text: 'GoVail 클러스터 현재 시스템 상태와 헬스 메트릭을 알려줘' },
  { label: '🔍 AI 게이트웨이 웹 검색', text: '최신 AI 게이트웨이 라우팅 전략과 모델 폴백 트렌드 웹 검색' },
  { label: '💻 Python 지연시간 연산', text: 'Python으로 노드 지연시간 리스트의 P50 및 P95 백분위수를 계산해줘' },
  { label: '⚡ 시맨틱 캐시 분석', text: '시맨틱 캐시 레이어의 임베딩 유사도 임계치와 TTL 상태 점검' },
]

// Sessions state
const sessions = ref<Session[]>([])
const currentSessionId = ref<string>('')
const userPrompt = ref('')
const isStreaming = ref(false)
const streamStatusText = ref('Ready')
const activeAbortController = ref<AbortController | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)

// Computed
const currentSession = computed(() => {
  return sessions.value.find((s) => s.id === currentSessionId.value) || sessions.value[0] || null
})

const activeToolsCount = computed(() => tools.value.filter((t) => t.enabled).length)

// Initial default session setup
function initDefaultSession(): Session {
  return {
    id: 'session_' + Date.now(),
    title: '클러스터 메트릭 및 시스템 점검',
    createdAt: Date.now(),
    model: 'govail/thinker',
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
          'GoVail 클러스터(`cy-server.internal`) 상태는 현재 **HEALTHY**이며, 4개의 활성 게이트웨이 라우트가 정상 운영 중입니다. P95 응답 지연시간은 38.4ms로 초저지연 수준을 유지하고 있습니다.',
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
          model: 'govail/thinker',
          totalLatencyMs: 840,
          ttftMs: 210,
          tokensPerSec: 32.5,
          routingNode: 'thinker-node-edge-01 (192.168.0.10:8080)',
          policy: 'REASONING_OPTIMAL',
          usage: { promptTokens: 85, completionTokens: 42 },
        },
        status: 'done',
        timestamp: Date.now() - 35000,
      },
    ],
  }
}

// Storage helpers
const STORAGE_KEY = 'govail_studio_sessions_v2'
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
    model: selectedModel.value,
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

function clearAllSessions() {
  if (confirm('모든 세션 기록을 삭제하시겠습니까?')) {
    sessions.value = []
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
    trace: {
      model: selectedModel.value,
    },
    status: 'streaming',
    timestamp: Date.now(),
  }
  session.messages.push(asstMsg)
  scrollToBottom()

  isStreaming.value = true
  streamStatusText.value = 'Connecting to GoVail Gateway...'

  const controller = new AbortController()
  activeAbortController.value = controller

  const enabledToolNames = tools.value.filter((t) => t.enabled).map((t) => t.id)

  try {
    const response = await fetch(RELAY_STREAM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model: selectedModel.value,
        tools: enabledToolNames,
        temperature: temperature.value,
        maxTokens: maxTokens.value,
        enableThinking: enableThinking.value,
        systemPrompt: systemPrompt.value,
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
            // ignore non-json
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
    streamStatusText.value = `Routing: ${data.model} -> ${data.targetNode}`
    if (msg.trace) {
      msg.trace.routingNode = String(data.targetNode || '')
      msg.trace.policy = String(data.policy || '')
      if (data.model) msg.trace.model = String(data.model)
    }
  } else if (event === 'status') {
    streamStatusText.value = String(data.message || data.phase || '')
  } else if (event === 'tool_call') {
    streamStatusText.value = `Tool Call: ${data.tool}`
    if (!msg.tools) msg.tools = []
    msg.tools.push({
      tool: String(data.tool),
      callId: String(data.callId),
      input: (data.input as Record<string, unknown>) || {},
      status: 'calling',
    })
  } else if (event === 'tool_result') {
    streamStatusText.value = `Tool Result: ${data.tool}`
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
    streamStatusText.value = 'Streaming Response...'
    if (data.reasoning) {
      msg.reasoning = (msg.reasoning || '') + String(data.reasoning)
    }
    if (data.delta) {
      msg.content += String(data.delta)
    }
    if (data.model && msg.trace) {
      msg.trace.model = String(data.model)
    }
  } else if (event === 'done') {
    streamStatusText.value = 'Completed'
    msg.status = 'done'
    if (msg.trace) {
      msg.trace.model = String(data.model || msg.trace.model)
      msg.trace.totalLatencyMs = Number(data.totalLatencyMs)
      msg.trace.ttftMs = Number(data.ttftMs)
      msg.trace.tokensPerSec = Number(data.tokensPerSec)
      msg.trace.usage = data.usage as { promptTokens?: number; completionTokens?: number }
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
        GoVail Gateway의 모델 라우팅, 실시간 도구(Tool Calling) 실행, SSE 토큰 스트리밍 및 추론 트레이스를 3분할 디버깅 콘솔에서 직접 검증합니다.
      </p>
    </header>

    <!-- 3-Panel Debug Studio -->
    <div class="pg-studio-container">
      <!-- ── Panel 1: Sessions (좌측) ────────────────────────── -->
      <aside class="pg-panel-sessions">
        <div class="pg-panel-header">
          <span class="pg-panel-title">세션 (SESSIONS)</span>
          <button type="button" class="pg-btn-icon" title="새 세션" @click="createNewSession">
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
              <span class="pg-meta-badge">{{ s.model.split('/').pop() }}</span>
              <span class="pg-meta-count">{{ s.messages.length }} msgs</span>
              <span class="pg-meta-time">{{ formatTime(s.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="pg-sessions-footer">
          <button type="button" class="pg-btn-clear" @click="clearAllSessions">
            모든 세션 초기화
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

          <div v-if="currentSession" class="pg-topbar-meta">
            <span class="pg-tag-model">{{ selectedModel }}</span>
            <span class="pg-tag-tools">Tools: {{ activeToolsCount }} on</span>
          </div>
        </div>

        <!-- Chat / Trace Viewport -->
        <div ref="messagesContainer" class="pg-messages-viewport">
          <div v-if="!currentSession || currentSession.messages.length === 0" class="pg-empty-state">
            <div class="pg-empty-icon">⚡</div>
            <h3>실시간 추론 콘솔 준비 완료</h3>
            <p>하단에 프롬프트를 입력하거나 추천 질문 칩을 클릭하여 GoVail Gateway 실시간 스트리밍을 시작하세요.</p>
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
                <span class="pg-badge-role is-govail">GOVAIL GATEWAY</span>
                <span v-if="msg.trace?.routingNode" class="pg-trace-routing">
                  ↳ {{ msg.trace.routingNode }}
                </span>
                <span class="pg-msg-time">{{ formatTime(msg.timestamp) }}</span>
              </div>

              <!-- Tool Execution Cards -->
              <div v-if="msg.tools && msg.tools.length > 0" class="pg-tools-block">
                <div v-for="t in msg.tools" :key="t.callId" class="pg-tool-card">
                  <div class="pg-tool-header" @click="toggleToolExpand(t.callId)">
                    <div class="pg-tool-name-group">
                      <span class="pg-tool-icon">🛠</span>
                      <strong class="pg-tool-name">{{ t.tool }}</strong>
                      <span class="pg-tool-status" :class="`status-${t.status}`">
                        {{ t.status === 'calling' ? '실행 중...' : 'COMPLETED' }}
                      </span>
                    </div>
                    <div class="pg-tool-right">
                      <span v-if="t.durationMs" class="pg-tool-latency">⏱ {{ t.durationMs }}ms</span>
                      <span class="pg-expand-icon">{{ expandedTools[t.callId] ? '▲ 접기' : '▼ 상세' }}</span>
                    </div>
                  </div>

                  <!-- Expanded Tool Payloads -->
                  <div v-if="expandedTools[t.callId]" class="pg-tool-body">
                    <div class="pg-tool-subhead">INPUT ARGUMENTS</div>
                    <pre class="pg-code-pre"><code>{{ JSON.stringify(t.input, null, 2) }}</code></pre>
                    <div class="pg-tool-subhead">RETURN PAYLOAD</div>
                    <pre class="pg-code-pre"><code>{{ JSON.stringify(t.output, null, 2) }}</code></pre>
                  </div>
                </div>
              </div>

              <!-- Reasoning / CoT Accordion -->
              <div v-if="msg.reasoning" class="pg-reasoning-block">
                <div class="pg-reasoning-head" @click="toggleReasoning(msg.id)">
                  <span>🧠 추론 과정 (Chain of Thought)</span>
                  <span class="pg-expand-icon">{{ showReasoning[msg.id] !== false ? '▲ 접기' : '▼ 펼치기' }}</span>
                </div>
                <div v-if="showReasoning[msg.id] !== false" class="pg-reasoning-body">
                  <pre class="pg-reasoning-text">{{ msg.reasoning }}</pre>
                </div>
              </div>

              <!-- Generated Content -->
              <div class="pg-msg-text is-assistant-text">
                {{ msg.content }}
                <span v-if="msg.status === 'streaming'" class="pg-cursor-blink">▋</span>
              </div>

              <!-- Telemetry Metrics Bar -->
              <div v-if="msg.trace && msg.status === 'done'" class="pg-telemetry-bar">
                <span class="pg-telem-item">⏱ {{ msg.trace.totalLatencyMs }}ms</span>
                <span v-if="msg.trace.tokensPerSec" class="pg-telem-item">⚡ {{ msg.trace.tokensPerSec.toFixed(1) }} tok/s</span>
                <span v-if="msg.trace.ttftMs" class="pg-telem-item">🚀 TTFT: {{ msg.trace.ttftMs }}ms</span>
                <span v-if="msg.trace.usage?.completionTokens" class="pg-telem-item">🔤 {{ msg.trace.usage.completionTokens }} tokens</span>
                <span class="pg-telem-model">{{ msg.trace.model }}</span>
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
              placeholder="실시간 프롬프트를 입력하세요... (Ctrl+Enter 또는 Cmd+Enter 전송)"
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

      <!-- ── Panel 3: Model & Tools Config (우측) ──────────── -->
      <aside class="pg-panel-config">
        <div class="pg-panel-header">
          <span class="pg-panel-title">모델 & 툴 설정 (CONFIG)</span>
        </div>

        <div class="pg-config-scroll">
          <!-- Model Selection (Fixed) -->
          <div class="pg-config-section">
            <div class="pg-section-label-row">
              <label class="pg-section-label">ROUTING TARGET MODEL</label>
              <span class="pg-fixed-badge">🔒 고정</span>
            </div>
            <div class="pg-model-options">
              <div class="pg-model-card selected is-locked">
                <div class="pg-model-name-row">
                  <span class="pg-model-name">GoVail Thinker</span>
                  <span class="pg-badge-chip is-accent">govail/thinker</span>
                </div>
                <p class="pg-model-desc">
                  자체 추론(Reasoning / Chain of Thought) 전문 모델로 고정되어 운영됩니다.
                </p>
              </div>
            </div>
          </div>

          <!-- Reasoning Effort (Fixed) -->
          <div class="pg-config-section">
            <div class="pg-section-label-row">
              <label class="pg-section-label">REASONING EFFORT</label>
              <span class="pg-fixed-badge">🔒 고정</span>
            </div>
            <div class="pg-fixed-box">
              <div class="pg-fixed-val">
                <span class="pg-effort-dot"></span>
                <strong>low</strong>
                <span class="pg-effort-desc">빠르고 명확한 핵심 사고 과정 생성</span>
              </div>
            </div>
          </div>

          <!-- Routing Policy -->
          <div class="pg-config-section">
            <label class="pg-section-label">ROUTING POLICY</label>
            <div class="pg-policy-grid">
              <button
                type="button"
                class="pg-policy-btn"
                :class="{ active: routingPolicy === 'LOWEST_LATENCY' }"
                @click="routingPolicy = 'LOWEST_LATENCY'"
              >
                Lowest Latency
              </button>
              <button
                type="button"
                class="pg-policy-btn"
                :class="{ active: routingPolicy === 'COST_OPTIMAL' }"
                @click="routingPolicy = 'COST_OPTIMAL'"
              >
                Cost Optimal
              </button>
              <button
                type="button"
                class="pg-policy-btn"
                :class="{ active: routingPolicy === 'FALLBACK_STRICT' }"
                @click="routingPolicy = 'FALLBACK_STRICT'"
              >
                Strict Fallback
              </button>
            </div>
          </div>

          <!-- Tools Toggle Switches -->
          <div class="pg-config-section">
            <label class="pg-section-label">AVAILABLE TOOLS ({{ activeToolsCount }}/{{ tools.length }})</label>
            <div class="pg-tools-list">
              <div v-for="tool in tools" :key="tool.id" class="pg-tool-toggle-row">
                <div class="pg-tool-toggle-info">
                  <div class="pg-tool-toggle-title">
                    <span class="pg-tool-emoji">{{ tool.icon }}</span>
                    <strong>{{ tool.label }}</strong>
                  </div>
                  <span class="pg-tool-toggle-desc">{{ tool.desc }}</span>
                </div>
                <label class="pg-switch">
                  <input v-model="tool.enabled" type="checkbox" />
                  <span class="pg-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <!-- Hyperparameters -->
          <div class="pg-config-section">
            <label class="pg-section-label">HYPERPARAMETERS</label>

            <!-- Temperature -->
            <div class="pg-param-row">
              <div class="pg-param-head">
                <span>Temperature</span>
                <strong>{{ temperature.toFixed(1) }}</strong>
              </div>
              <input
                v-model.number="temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                class="pg-slider-range"
              />
            </div>

            <!-- Max Tokens -->
            <div class="pg-param-row">
              <div class="pg-param-head">
                <span>Max Tokens</span>
                <strong>{{ maxTokens }}</strong>
              </div>
              <input
                v-model.number="maxTokens"
                type="range"
                min="64"
                max="1000"
                step="32"
                class="pg-slider-range"
              />
            </div>

            <!-- Thinking CoT -->
            <div class="pg-toggle-option">
              <label class="pg-switch-label">
                <input v-model="enableThinking" type="checkbox" />
                <span>Chain of Thought (사고 과정 추론)</span>
              </label>
            </div>
          </div>

          <!-- System Prompt -->
          <div class="pg-config-section">
            <label class="pg-section-label">SYSTEM INSTRUCTION</label>
            <textarea
              v-model="systemPrompt"
              class="pg-system-textarea"
              rows="3"
              placeholder="시스템 지시문을 입력하세요..."
            ></textarea>
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
          <h3>Tool Execution Tracing</h3>
          <p>시스템 메트릭, 실시간 웹 검색, 파이썬 샌드박스 등의 도구 호출 파라미터와 결과 페이로드를 투명하게 노출합니다.</p>
        </article>
        <article>
          <h3>Multi-Model Routing</h3>
          <p>단일 LLM 종속 없이 GoVail Worker, Claude, GPT, Gemini 간 라우팅 정책을 즉시 교체 및 테스트할 수 있습니다.</p>
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
  grid-template-columns: 240px minmax(0, 1fr) 300px;
  height: 820px;
  border: 1px solid var(--mist-strong);
  border-radius: 6px;
  background: var(--paper-raised);
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.07);
  overflow: hidden;
}

/* ── Panel 1: Sessions ───────────────────────────────────── */
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

.pg-panel-title {
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .07em;
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

.pg-meta-badge {
  background: var(--cobalt-soft);
  color: var(--cobalt);
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 600;
}

.pg-sessions-footer {
  padding: 10px 14px;
  border-top: 1px solid var(--mist-strong);
  background: var(--paper-raised);
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
}

.pg-btn-clear:hover {
  border-color: #ef4444;
  color: #ef4444;
}

/* ── Panel 2: Inference & Tool Execution ─────────────────── */
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
  gap: 10px;
}

.pg-tag-model {
  background: var(--terminal);
  color: #93c5fd;
  border-radius: 3px;
  padding: 2px 7px;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
}

.pg-tag-tools {
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
  white-space: pre-wrap;
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
  margin: 12px 0 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  padding: 8px 12px;
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
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
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
  gap: 12px;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--slate);
}

.pg-expand-icon {
  font-size: 10px;
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
  margin: 10px 0 14px;
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

.pg-telem-model {
  margin-left: auto;
  color: var(--cobalt);
  font-weight: 600;
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

/* ── Panel 3: Model & Tools Config ───────────────────────── */
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
  gap: 20px;
}

.pg-config-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pg-section-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pg-section-label {
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 9.5px;
  font-weight: 750;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.pg-fixed-badge {
  background: var(--cobalt-soft);
  color: var(--cobalt);
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
}

.pg-fixed-box {
  padding: 10px 12px;
  border: 1px solid var(--mist-strong);
  border-radius: 5px;
  background: var(--paper-raised);
}

.pg-fixed-val {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.pg-effort-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.pg-fixed-val strong {
  color: var(--cobalt);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.pg-effort-desc {
  color: var(--slate);
  font-size: 10px;
}

.pg-badge-chip.is-accent {
  background: var(--cobalt);
  color: #fff;
}

/* Model cards */
.pg-model-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pg-model-card {
  padding: 9px 11px;
  border: 1px solid var(--mist-strong);
  border-radius: 5px;
  background: var(--paper-raised);
  cursor: pointer;
  transition: all 150ms ease;
}

.pg-model-card:hover {
  border-color: var(--cobalt);
}

.pg-model-card.selected {
  border-color: var(--cobalt);
  background: var(--cobalt-soft);
  box-shadow: 0 0 0 1px var(--cobalt);
}

.pg-model-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pg-model-name {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--ink);
}

.pg-badge-chip {
  background: rgba(0, 0, 0, 0.05);
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 8.5px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
}

.pg-model-card.selected .pg-badge-chip {
  background: var(--cobalt);
  color: #fff;
}

.pg-model-desc {
  margin: 4px 0 0;
  color: var(--slate);
  font-size: 10px;
  line-height: 1.4;
}

/* Policy grid */
.pg-policy-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 5px;
}

.pg-policy-btn {
  padding: 6px 10px;
  border: 1px solid var(--mist-strong);
  border-radius: 4px;
  background: var(--paper-raised);
  color: var(--ink-soft);
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: all 150ms ease;
}

.pg-policy-btn.active {
  border-color: var(--cobalt);
  background: var(--cobalt-soft);
  color: var(--cobalt);
}

/* Tools toggle list */
.pg-tools-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pg-tool-toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--mist-strong);
  border-radius: 5px;
  background: var(--paper-raised);
}

.pg-tool-toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pg-tool-toggle-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--ink);
}

.pg-tool-toggle-desc {
  font-size: 9.5px;
  color: var(--slate);
  line-height: 1.35;
}

/* Switches */
.pg-switch {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
  flex-shrink: 0;
}

.pg-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.pg-slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--mist-strong);
  transition: .2s;
  border-radius: 18px;
}

.pg-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .2s;
  border-radius: 50%;
}

input:checked + .pg-slider {
  background-color: var(--cobalt);
}

input:checked + .pg-slider:before {
  transform: translateX(14px);
}

/* Param rows */
.pg-param-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 0;
}

.pg-param-head {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--ink-soft);
}

.pg-param-head strong {
  font-family: var(--vp-font-family-mono);
  color: var(--cobalt);
}

.pg-slider-range {
  width: 100%;
  accent-color: var(--cobalt);
}

.pg-toggle-option {
  margin-top: 6px;
}

.pg-switch-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--ink-soft);
  cursor: pointer;
}

.pg-system-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--mist-strong);
  border-radius: 4px;
  background: var(--paper-raised);
  color: var(--ink);
  font-family: inherit;
  font-size: 10.5px;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
}

.pg-system-textarea:focus {
  outline: none;
  border-color: var(--cobalt);
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

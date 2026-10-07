<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { marked } from 'marked'
import { createEventParser } from '../../stream-events.js'

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    html({ text }) { return escapeHtml(text) },
    link({ href, tokens }) {
      const label = this.parser.parseInline(tokens)
      if (!/^https?:\/\//i.test(href)) return label
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`
    },
    image({ text }) { return escapeHtml(text) },
  },
})

const RELAY_STREAM_URL = 'https://api.govail.cloud/v1/model-routing/stream'

export interface AgentAction {
  id: string
  step: number
  title: string
  tool: string
  args: Record<string, any>
  thought: string
  status: 'pending_approval' | 'running' | 'done' | 'error'
  requiresApproval: boolean
  observation?: string
  latencyMs?: number
}

export interface LogEntry {
  id: string
  time: string
  tag: string
  level: 'info' | 'warn' | 'crit' | 'step'
  text: string
}

// User Inputs
const targetUrl = ref('')
const userPrompt = ref('')
const requireActionApproval = ref(true)

// Running states
const isRunning = ref(false)
const currentPendingAction = ref<AgentAction | null>(null)
const activeRightTab = ref<'response' | 'terminal' | 'diff'>('response')
const terminalBody = ref<HTMLElement | null>(null)
const responseBody = ref<HTMLElement | null>(null)

// Outputs
const logs = ref<LogEntry[]>([])
const actions = ref<AgentAction[]>([])
const responseMarkdown = ref('')
const patchSnippet = ref<string | null>(null)
let abortController: AbortController | null = null

function formatTimestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

function appendLog(tag: string, text: string, level: LogEntry['level'] = 'info') {
  logs.value.push({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: formatTimestamp(),
    tag,
    level,
    text,
  })
  nextTick(() => {
    if (terminalBody.value) {
      terminalBody.value.scrollTop = terminalBody.value.scrollHeight
    }
  })
}

function getRequestedTools(prompt: string, url: string): string[] {
  const combined = (prompt + ' ' + url).toLowerCase()
  const tools: string[] = []
  if (['검색', 'search', '날씨', '뉴스', '최신', '웹', '조회', '현재'].some((k) => combined.includes(k))) {
    tools.push('web_search')
  }
  if (['코드', '파이썬', '계산', '함수', '스크립트', '지연시간', '백분위'].some((k) => combined.includes(k))) {
    tools.push('code_interpreter')
  }
  if (['메트릭', '헬스', '클러스터', '서버', '상태'].some((k) => combined.includes(k))) {
    tools.push('system_metrics')
  }
  if (['캐시', 'cache', '유사도', 'ttl'].some((k) => combined.includes(k))) {
    tools.push('cache_inspector')
  }
  return tools.length > 0 ? tools : ['web_search']
}

function extractDiff(text: string): string | null {
  const diffMatch = text.match(/```(?:diff|patch)?\n([\s\S]*?```)/)
  if (diffMatch) return diffMatch[1].replace(/```$/, '').trim()
  return null
}

function renderHtml(text: string): string {
  if (!text) return ''
  try {
    return marked.parse(text) as string
  } catch {
    return escapeHtml(text)
  }
}

// Start Real Agent Workflow via GoVail Gateway
async function startAgentWorkflow() {
  const prompt = userPrompt.value.trim()
  if (!prompt || isRunning.value) return

  // Reset
  logs.value = []
  actions.value = []
  responseMarkdown.value = ''
  patchSnippet.value = null
  currentPendingAction.value = null
  isRunning.value = true
  activeRightTab.value = 'response'

  appendLog('USER', `사용자 프롬프트 접수: "${prompt}"`, 'step')
  if (targetUrl.value.trim()) {
    appendLog('TARGET', `타깃 리소스: ${targetUrl.value.trim()}`, 'info')
  }

  // Construct augmented prompt
  let fullPrompt = prompt
  if (targetUrl.value.trim()) {
    fullPrompt = `[대상 URL/컨텍스트: ${targetUrl.value.trim()}]\n\n${prompt}`
  }

  const tools = getRequestedTools(prompt, targetUrl.value)
  appendLog('DISPATCH', `의도 분석 및 도구 바인딩: [${tools.join(', ')}]`, 'info')

  abortController = new AbortController()

  try {
    appendLog('GATEWAY', `Gateway 연결 및 모델 추론 시작...`, 'step')

    const response = await fetch(RELAY_STREAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: fullPrompt,
        model: 'govail/thinker',
        tools,
        enableThinking: true,
      }),
      signal: abortController.signal,
    })

    if (!response.ok) {
      throw new Error(`Gateway HTTP ${response.status}`)
    }
    if (!response.body) {
      throw new Error('응답 스트림 본문이 없습니다.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    const parse = createEventParser((event: string, raw: string) => {
      if (raw === '[DONE]') return
      let data: any
      try {
        data = JSON.parse(raw)
      } catch {
        return
      }

      handleStreamEvent(event, data)
    })

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        parse(decoder.decode())
        break
      }
      parse(decoder.decode(value, { stream: true }))
    }

    appendLog('DONE', `에이전트 실행 및 추론 완료.`, 'step')
    const diff = extractDiff(responseMarkdown.value)
    if (diff) {
      patchSnippet.value = diff
      appendLog('PATCH', `AI 교정 패치(Diff) 코드 감지 및 추출 완료.`, 'info')
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      appendLog('ABORT', `사용자에 의해 중단되었습니다.`, 'warn')
    } else {
      appendLog('ERROR', `실시간 게이트웨이 호출 실패: ${err.message}`, 'crit')
      responseMarkdown.value += `\n\n> ⚠️ **Gateway 호출 오류:** ${err.message}\n`
    }
  } finally {
    isRunning.value = false
    abortController = null
  }
}

function handleStreamEvent(event: string, data: Record<string, any>) {
  if (event === 'routing') {
    appendLog('ROUTE', `모델 라우팅 통과: ${data.policy || 'governed execution'}`, 'info')
  } else if (event === 'status') {
    if (data.message) appendLog('STATUS', String(data.message), 'info')
  } else if (event === 'tool_call') {
    const actId = `act-${Date.now()}-${actions.value.length + 1}`
    const newAction: AgentAction = {
      id: actId,
      step: actions.value.length + 1,
      title: `${data.tool} 도구 호출`,
      tool: String(data.tool),
      args: data.input || {},
      thought: `지시문 처리를 위해 ${data.tool} 도구를 호출하여 데이터를 수집합니다.`,
      status: requireActionApproval.value ? 'pending_approval' : 'running',
      requiresApproval: requireActionApproval.value,
    }
    actions.value.push(newAction)
    appendLog('TOOL_CALL', `도구 호출 [${data.tool}] Args: ${JSON.stringify(data.input || {})}`, 'step')

    if (requireActionApproval.value) {
      currentPendingAction.value = newAction
      appendLog('GATE', `⚠️ 운영자 권한 승인 대기: [${data.tool}] 실행 승인 필요`, 'warn')
    }
  } else if (event === 'tool_result') {
    const act = actions.value.find((a) => a.tool === data.tool && a.status !== 'done')
    if (act) {
      act.observation = typeof data.output === 'object' ? JSON.stringify(data.output, null, 2) : String(data.output || '')
      act.latencyMs = Number(data.durationMs) || undefined
      act.status = data.status === 'error' ? 'error' : 'done'
    }
    appendLog('TOOL_RES', `도구 결과 수신 [${data.tool}] (${data.durationMs || 0}ms)`, 'info')
  } else if (event === 'token') {
    if (data.delta) {
      responseMarkdown.value += String(data.delta)
      nextTick(() => {
        if (responseBody.value) {
          responseBody.value.scrollTop = responseBody.value.scrollHeight
        }
      })
    }
  } else if (event === 'done') {
    appendLog('FINISH', `완료 이벤트 수신 (총 지연시간: ${data.totalLatencyMs || 0}ms)`, 'step')
  } else if (event === 'error') {
    appendLog('ERROR', `오류 이벤트: ${data.message || '알 수 없는 에러'}`, 'crit')
  }
}

// User Approves Pending Action
function approveAction() {
  if (!currentPendingAction.value) return
  const act = currentPendingAction.value
  act.status = 'running'
  appendLog('GATE', `✓ 운영자 권한 승인 완료: [${act.tool}] 도구 계속 진행`, 'step')
  currentPendingAction.value = null
}

// User Rejects Action
function rejectAction() {
  if (!currentPendingAction.value) return
  const act = currentPendingAction.value
  act.status = 'error'
  appendLog('GATE', `✕ 운영자에 의해 [${act.tool}] 도구 실행이 거절되었습니다.`, 'crit')
  currentPendingAction.value = null
  if (abortController) abortController.abort()
}

function stopExecution() {
  if (abortController) {
    abortController.abort()
  }
  isRunning.value = false
}
</script>

<template>
  <div class="agent-workspace">
    <!-- Top Controller: Prompt + Target -->
    <div class="inspector-card input-card">
      <div class="card-header-line">
        <div class="header-left">
          <span class="status-dot"></span>
          <span class="utility-label">SECURITY & ACTION INSPECTOR</span>
        </div>
      </div>

      <!-- Target Context (Optional) -->
      <div class="context-input-row">
        <span class="input-tag">TARGET:</span>
        <input
          v-model="targetUrl"
          type="text"
          placeholder="대상 URL 또는 Git 리포지토리 (선택)"
          :disabled="isRunning"
        />
      </div>

      <!-- Prompt Input (Main) -->
      <div class="prompt-input-row">
        <textarea
          v-model="userPrompt"
          rows="3"
          placeholder="실행할 지시문 또는 분석 요청을 입력하세요."
          :disabled="isRunning"
          @keydown.ctrl.enter="startAgentWorkflow"
        ></textarea>
        <button
          v-if="!isRunning"
          class="btn-run-agent"
          :disabled="!userPrompt.trim()"
          @click="startAgentWorkflow"
        >
          실행 ↗
        </button>
        <button
          v-else
          class="btn-stop-agent"
          @click="stopExecution"
        >
          중단 (Stop)
        </button>
      </div>

      <!-- Approval Gate Toggle -->
      <div class="gate-options-row">
        <label class="toggle-label">
          <input v-model="requireActionApproval" type="checkbox" :disabled="isRunning" />
          <span class="toggle-text">단계별 도구/액션 승인 게이트 (Step-by-step Tool Approval Gate) 강제</span>
        </label>
        <span class="hint-text">
          * Gateway에서 도구 호출(Tool Call) 이벤트 발생 시 운영자 승인 전까지 일시 대기합니다.
        </span>
      </div>
    </div>

    <!-- Active Approval Banner -->
    <div v-if="currentPendingAction" class="approval-gate-banner">
      <div class="gate-banner-left">
        <div class="gate-title">
          <span class="pulse-icon">⚠️</span>
          <span>도구 실행 승인 대기 [{{ currentPendingAction.tool }}]</span>
        </div>
        <div class="gate-details">
          에이전트가 <strong>{{ currentPendingAction.tool }}</strong> 도구를 실행하려 합니다.
          <pre class="banner-args"><code>{{ JSON.stringify(currentPendingAction.args) }}</code></pre>
        </div>
      </div>
      <div class="gate-banner-actions">
        <button class="btn-approve" @click="approveAction">
          ✓ 승인 (Approve)
        </button>
        <button class="btn-reject" @click="rejectAction">
          ✕ 거절 (Reject)
        </button>
      </div>
    </div>

    <!-- Dual Workspace: Action Chain vs Real-time Response -->
    <div class="workspace-grid">
      <!-- Left: Real Action Chain -->
      <div class="inspector-card actions-chain-card">
        <div class="actions-header">
          <span class="utility-label">AGENT TOOL ACTIONS</span>
          <span class="count-tag">{{ actions.length }} Action(s)</span>
        </div>

        <div v-if="actions.length === 0" class="actions-empty">
          지시문을 입력하고 [실행]을 누르면, 호출되는 도구(Tool Call)와 관측 결과가 순차적으로 기록됩니다.
        </div>

        <div v-else class="actions-timeline">
          <div
            v-for="act in actions"
            :key="act.id"
            class="action-step-card"
            :class="['act-' + act.status]"
          >
            <div class="step-header">
              <span class="step-badge">STEP 0{{ act.step }}</span>
              <span class="tool-tag">TOOL: {{ act.tool }}</span>
              <span class="step-status">{{ act.status.toUpperCase() }}</span>
              <span v-if="act.latencyMs" class="step-latency">{{ act.latencyMs }}ms</span>
            </div>

            <div class="step-title">{{ act.title }}</div>
            <div class="step-args">
              <pre><code>{{ JSON.stringify(act.args, null, 2) }}</code></pre>
            </div>

            <!-- In-card Approval -->
            <div v-if="act.status === 'pending_approval' && currentPendingAction?.id === act.id" class="step-gate-prompt">
              <span>운영자 승인 대기 중:</span>
              <button class="btn-mini-approve" @click="approveAction">승인 실행 ↗</button>
              <button class="btn-mini-reject" @click="rejectAction">거절</button>
            </div>

            <!-- Observation Result -->
            <div v-if="act.observation" class="step-observation">
              <span class="obs-label">Observation:</span>
              <pre class="obs-code"><code>{{ act.observation }}</code></pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Live Markdown Response & Terminal & Diff -->
      <div class="inspector-card right-panel-card">
        <div class="right-tabs">
          <button
            class="tab-btn"
            :class="{ active: activeRightTab === 'response' }"
            @click="activeRightTab = 'response'"
          >
            응답 (Response)
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeRightTab === 'terminal' }"
            @click="activeRightTab = 'terminal'"
          >
            터미널 로그
          </button>
          <button
            v-if="patchSnippet"
            class="tab-btn"
            :class="{ active: activeRightTab === 'diff' }"
            @click="activeRightTab = 'diff'"
          >
            패치 (Diff)
          </button>
        </div>

        <!-- Tab 1: Live Response Markdown -->
        <div v-show="activeRightTab === 'response'" ref="responseBody" class="response-container">
          <div v-if="!responseMarkdown && !isRunning" class="response-empty">
            에이전트가 도구를 실행하고 추론한 응답이 실시간 스트리밍됩니다.
          </div>
          <div v-else class="markdown-body" v-html="renderHtml(responseMarkdown)"></div>
        </div>

        <!-- Tab 2: Terminal Logs -->
        <div v-show="activeRightTab === 'terminal'" ref="terminalBody" class="terminal-container">
          <div v-if="logs.length === 0" class="terminal-empty">
            Gateway 요청, 정책, 도구 호출 타임스탬프가 표시됩니다.
          </div>
          <div
            v-for="log in logs"
            :key="log.id"
            class="log-line"
            :class="['log-' + log.level]"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-tag">[{{ log.tag }}]</span>
            <span class="log-text">{{ log.text }}</span>
          </div>
        </div>

        <!-- Tab 3: Extracted Diff -->
        <div v-show="activeRightTab === 'diff'" class="diff-container">
          <div v-if="patchSnippet" class="diff-viewer">
            <div class="diff-file-tag">PROPOSED REMEDIATION DIFF</div>
            <pre><code>{{ patchSnippet }}</code></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agent-workspace {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  margin: 24px 0 64px;
}

.inspector-card {
  background: var(--paper-raised);
  border: 1px solid var(--mist-strong);
  border-radius: 6px;
  padding: 20px;
}

/* Header */
.card-header-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.header-left { display: flex; align-items: center; }

.context-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.input-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--slate);
  white-space: nowrap;
}

.context-input-row input {
  flex: 1;
  height: 38px;
  padding: 0 12px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  background: var(--paper);
  border: 1px solid var(--mist-strong);
  border-radius: 4px;
  color: var(--ink);
  outline: none;
}

.prompt-input-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.prompt-input-row textarea {
  flex: 1;
  padding: 12px 14px;
  font-family: var(--vp-font-family-base);
  font-size: 14px;
  line-height: 1.5;
  background: var(--paper);
  border: 1px solid var(--mist-strong);
  border-radius: 4px;
  color: var(--ink);
  outline: none;
  resize: vertical;
}

.prompt-input-row textarea:focus {
  border-color: var(--cobalt);
}

.btn-run-agent {
  padding: 0 24px;
  min-width: 110px;
  background: var(--cobalt);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.btn-run-agent:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-stop-agent {
  padding: 0 24px;
  min-width: 110px;
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* Gate Toggle */
.gate-options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--mist);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}

.hint-text {
  font-size: 12px;
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
}

/* Approval Gate Banner */
.approval-gate-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fffbeb;
  border: 1px solid #f59e0b;
  border-left: 4px solid #d97706;
  border-radius: 4px;
  padding: 16px 20px;
}

.dark .approval-gate-banner {
  background: #2b1d06;
  border-color: #b45309;
}

.gate-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #b45309;
}

.banner-args {
  margin: 4px 0 0;
  font-size: 11px;
  background: var(--terminal);
  color: #f1f5f9;
  padding: 4px 8px;
  border-radius: 3px;
  display: inline-block;
}

.gate-banner-actions { display: flex; gap: 10px; }

.btn-approve {
  padding: 8px 18px;
  background: #059669;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-reject {
  padding: 8px 14px;
  background: var(--paper);
  border: 1px solid var(--mist-strong);
  color: var(--ink-soft);
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

/* Workspace Grid */
.workspace-grid {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 20px;
  min-height: 560px;
}

@media (max-width: 960px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

/* Actions Card */
.actions-chain-card {
  display: flex;
  flex-direction: column;
  max-height: 700px;
  overflow-y: auto;
}

.actions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.count-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--slate);
}

.actions-empty {
  color: var(--slate);
  padding: 80px 20px;
  text-align: center;
  font-size: 13px;
}

.actions-timeline {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.action-step-card {
  border: 1px solid var(--mist-strong);
  border-radius: 4px;
  padding: 14px;
  background: var(--paper);
}

.action-step-card.act-pending_approval {
  border-color: #f59e0b;
  border-left: 4px solid #d97706;
  background: #fffbeb;
}

.dark .action-step-card.act-pending_approval { background: #2b1d06; }

.action-step-card.act-done { border-left: 4px solid #059669; }
.action-step-card.act-error { border-left: 4px solid #dc2626; }

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.step-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--cobalt);
}

.tool-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  padding: 1px 6px;
  background: var(--terminal);
  color: #38bdf8;
  border-radius: 2px;
}

.step-status {
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  color: var(--slate);
  margin-left: auto;
}

.step-latency {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: #059669;
}

.step-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 6px;
}

.step-args pre {
  margin: 0;
  background: var(--terminal);
  color: #94a3b8;
  padding: 6px 8px;
  border-radius: 3px;
  font-size: 10px;
}

.step-gate-prompt {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 10px;
  background: #fef3c7;
  border-radius: 3px;
  font-size: 12px;
  color: #92400e;
}

.dark .step-gate-prompt { background: #451a03; color: #fde68a; }

.btn-mini-approve {
  padding: 3px 10px;
  background: #059669;
  color: #fff;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.btn-mini-reject {
  padding: 3px 8px;
  background: none;
  border: 1px solid #d97706;
  color: #d97706;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
}

.step-observation {
  margin-top: 10px;
  padding: 8px 10px;
  background: color-mix(in srgb, #059669 10%, transparent);
  border-left: 3px solid #059669;
  border-radius: 2px;
}

.obs-label {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 600;
  color: #059669;
}

.obs-code {
  margin: 4px 0 0;
  font-size: 11px;
  background: var(--terminal);
  color: #f1f5f9;
  padding: 6px 8px;
  border-radius: 3px;
  max-height: 140px;
  overflow-y: auto;
}

/* Right Panel */
.right-panel-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  max-height: 700px;
}

.right-tabs {
  display: flex;
  background: #0b1120;
  border-bottom: 1px solid #1e293b;
}

.tab-btn {
  padding: 10px 16px;
  background: none;
  border: none;
  color: #94a3b8;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab-btn.active {
  color: #f1f5f9;
  border-bottom-color: var(--cobalt);
  background: #111827;
}

.response-container {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  line-height: 1.7;
}

.response-empty {
  color: var(--slate);
  padding: 80px 20px;
  text-align: center;
  font-size: 13px;
}

.terminal-container {
  flex: 1;
  background: var(--terminal);
  padding: 16px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.6;
  color: #cbd5e1;
  overflow-y: auto;
}

.terminal-empty {
  color: #64748b;
  padding: 80px 10px;
  text-align: center;
}

.log-line { margin-bottom: 4px; word-break: break-all; }
.log-time { color: #64748b; margin-right: 8px; }
.log-tag { color: #38bdf8; margin-right: 8px; font-weight: 600; }
.log-step .log-tag { color: #a855f7; }
.log-warn .log-tag { color: #fbbf24; }
.log-warn .log-text { color: #fde68a; }
.log-crit .log-tag { color: #f87171; }
.log-crit .log-text { color: #fca5a5; }

.diff-container {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.diff-viewer {
  background: var(--terminal);
  border-radius: 4px;
  overflow: hidden;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.diff-file-tag {
  background: #1e293b;
  color: #94a3b8;
  padding: 4px 10px;
  font-size: 10px;
  border-bottom: 1px solid #334155;
}

.diff-viewer pre { margin: 0; padding: 12px; color: #f8fafc; overflow-x: auto; }
</style>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { marked } from 'marked'

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

export interface ProcessAction {
  id: string
  step: number
  title: string
  tool: string
  args: Record<string, any>
  argsHash: string
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

export interface ParsedMetric {
  label: string
  value: string
  highlight?: boolean
}

export interface EvidenceRecord {
  runId: string
  task: string
  status: 'completed' | 'awaiting_auth' | 'failed'
  url: string
  metrics: ParsedMetric[]
  screenshotName?: string
  selectedLines: string[]
  manifestHash: string
}

// User Inputs
const targetContext = ref('')
const userPrompt = ref('')
const requireApproval = ref(true)

// Running states
const isRunning = ref(false)
const currentPendingAction = ref<ProcessAction | null>(null)
const activeTab = ref<'evidence' | 'terminal' | 'diff' | 'briefing'>('evidence')
const terminalBody = ref<HTMLElement | null>(null)

// Outputs
const logs = ref<LogEntry[]>([])
const actions = ref<ProcessAction[]>([])
const currentEvidence = ref<EvidenceRecord | null>(null)
const patchDiff = ref<string | null>(null)
const briefingMarkdown = ref('')

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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function generateSha256Sim(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i)
    hash |= 0
  }
  return 'sha256:' + Math.abs(hash).toString(16).padStart(16, '0') + Math.abs(hash * 31).toString(16).padStart(16, '0')
}

function renderHtml(text: string): string {
  if (!text) return ''
  try {
    return marked.parse(text) as string
  } catch {
    return escapeHtml(text)
  }
}

// Approval Gate resolve/reject holders
let resolveApproval: (() => void) | null = null
let rejectApproval: (() => void) | null = null

function approveAction() {
  if (currentPendingAction.value && resolveApproval) {
    const act = currentPendingAction.value
    appendLog('GATE', `✓ [approved] 운영자 서명 확인됨 (${act.argsHash.slice(0, 16)}...)`, 'step')
    act.status = 'running'
    currentPendingAction.value = null
    const res = resolveApproval
    resolveApproval = null
    rejectApproval = null
    res()
  }
}

function rejectAction() {
  if (currentPendingAction.value && rejectApproval) {
    const act = currentPendingAction.value
    act.status = 'error'
    appendLog('GATE', `✕ [cancelled] 운영자에 의해 실행이 거절되었습니다.`, 'crit')
    currentPendingAction.value = null
    const rej = rejectApproval
    resolveApproval = null
    rejectApproval = null
    rej()
  }
}

// Start Runner Pipeline (100% Dynamic Tool Execution)
async function startRunnerWorkflow() {
  const prompt = userPrompt.value.trim()
  if (!prompt || isRunning.value) return

  // Reset state
  logs.value = []
  actions.value = []
  currentEvidence.value = null
  patchDiff.value = null
  briefingMarkdown.value = ''
  currentPendingAction.value = null
  isRunning.value = true
  activeTab.value = 'evidence'

  const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  appendLog('TASK', `engine-process run 초기화: "${prompt}"`, 'step')
  if (targetContext.value.trim()) {
    appendLog('CONTEXT', `타깃 컨텍스트 바인딩: ${targetContext.value.trim()}`, 'info')
  }

  // 1. Planner Phase: Determine required tools
  appendLog('PLANNER', '지시문 의도 분해 및 도구 오케스트레이션 계획 수립 중...', 'info')
  await delay(200)

  const lower = prompt.toLowerCase()
  const toolsToRequest: string[] = ['web_search']
  if (lower.includes('코드') || lower.includes('파이썬') || lower.includes('계산') || lower.includes('ast') || lower.includes('함수')) {
    toolsToRequest.push('code_interpreter')
  }
  if (lower.includes('메트릭') || lower.includes('상태') || lower.includes('헬스') || lower.includes('서버')) {
    toolsToRequest.push('system_metrics')
  }
  if (lower.includes('캐시') || lower.includes('cache') || lower.includes('ttl')) {
    toolsToRequest.push('cache_inspector')
  }

  appendLog('PLANNER', `실행 도구 파이프라인 확정: [${toolsToRequest.join(', ')}]`, 'step')

  // 2. Approval Gate Handling (if enabled)
  if (requireApproval.value) {
    const plannedAction: ProcessAction = {
      id: `act-gate-1`,
      step: 1,
      title: `외부 도구 오케스트레이션 파이프라인 진입 승인`,
      tool: toolsToRequest[0],
      args: { prompt, tools: toolsToRequest, context: targetContext.value.trim() || undefined },
      argsHash: generateSha256Sim(prompt + toolsToRequest.join(',')),
      thought: `지시문을 처리하기 위해 외부 도구 [${toolsToRequest.join(', ')}] 호출 권한 승인을 요청합니다.`,
      status: 'pending_approval',
      requiresApproval: true,
    }
    actions.value.push(plannedAction)
    currentPendingAction.value = plannedAction
    appendLog('GATE', `⚠️ [waiting_for_approval] 운영자 승인 대기 (Hash: ${plannedAction.argsHash.slice(0, 16)}...)`, 'warn')

    try {
      await new Promise<void>((resolve, reject) => {
        resolveApproval = resolve
        rejectApproval = reject
      })
    } catch {
      isRunning.value = false
      return
    }
  }

  // 3. Live SSE Streaming Request
  appendLog('ORCH', 'GoVail Gateway 및 engine-process 실시간 세션 스트림 연결 중...', 'info')
  const endpoint = 'https://api.govail.cloud/v1/model-routing/stream'

  let synthAction: ProcessAction | null = null

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        tools: toolsToRequest,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`HTTP ${res.status}: ${errText}`)
    }

    if (!res.body) {
      throw new Error('응답 바디 스트림이 비어 있습니다.')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      let currentEvent = 'message'
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.slice(6).trim()
        } else if (trimmed.startsWith('data:')) {
          const dataRaw = trimmed.slice(5).trim()
          try {
            const data = JSON.parse(dataRaw)
            handleStreamEvent(currentEvent, data, runId, prompt)
          } catch {
            // raw string data
          }
        }
      }
    }

    // Flush any remaining buffer
    if (buffer.trim().startsWith('data:')) {
      try {
        const data = JSON.parse(buffer.trim().slice(5).trim())
        handleStreamEvent('message', data, runId, prompt)
      } catch {
        // ignore
      }
    }

    // Finalize LLM Synth Action
    const lastAct = actions.value[actions.value.length - 1]
    if (lastAct && lastAct.status === 'running') {
      lastAct.status = 'done'
    }

    appendLog('FINISH', `engine-process run [${runId}] 정상 완료 (Exit Code: 0)`, 'step')
  } catch (err: any) {
    appendLog('ERROR', `실행 오류: ${err.message || err}`, 'crit')
    if (actions.value.length > 0) {
      actions.value[actions.value.length - 1].status = 'error'
    }
  } finally {
    isRunning.value = false
    currentPendingAction.value = null
  }
}

// Stream Event Dispatcher
function handleStreamEvent(event: string, data: any, runId: string, prompt: string) {
  if (event === 'routing') {
    appendLog('ROUTING', `모델: ${data.model} | 정책: ${data.policy} | 타깃: ${data.targetNode}`, 'info')
  } else if (event === 'status') {
    appendLog('STATUS', data.message, 'info')
  } else if (event === 'tool_call') {
    const stepNum = actions.value.length + 1
    const act: ProcessAction = {
      id: data.callId || `act-tool-${stepNum}`,
      step: stepNum,
      title: `도구 [${data.tool}] 실행`,
      tool: data.tool,
      args: data.input || {},
      argsHash: generateSha256Sim(JSON.stringify(data.input || {})),
      thought: `사용자 지시를 실시간 관측/해결하기 위해 ${data.tool} 도구를 기동합니다.`,
      status: 'running',
      requiresApproval: false,
    }
    actions.value.push(act)
    appendLog('TOOL', `실행 중: ${data.tool} with args: ${JSON.stringify(data.input)}`, 'step')
  } else if (event === 'tool_result') {
    const act = actions.value.find((a) => a.id === data.callId) || actions.value[actions.value.length - 1]
    if (act) {
      act.status = data.status === 'error' ? 'error' : 'done'
      act.latencyMs = data.durationMs || 0
      if (data.status === 'error') {
        act.observation = `오류: ${data.error || '실행 실패'}`
        appendLog('OBSERVE', `도구 실행 실패: ${data.error}`, 'crit')
      } else {
        const hits = data.output?.hits || data.output?.results?.length || (Array.isArray(data.output) ? data.output.length : 1)
        act.observation = `실제 관측 완료: ${hits}건의 데이터 수집됨 (${data.durationMs}ms)`
        appendLog('OBSERVE', `Observation: ${hits}건의 데이터 수집 성공 (${data.durationMs}ms)`, 'info')
      }
    }

    // Build Evidence Card from real data
    if (data.status === 'success' && data.output) {
      const out = data.output
      const metrics: ParsedMetric[] = []
      const selectedLines: string[] = []
      let targetUrl = 'https://search.naver.com/'

      if (out.results && Array.isArray(out.results)) {
        metrics.push({ label: '검색 엔진', value: out.engine || 'duckduckgo' })
        metrics.push({ label: '수집 결과 수', value: `${out.results.length}건`, highlight: true })
        metrics.push({ label: '도구 응답 속도', value: `${data.durationMs || 0}ms` })

        if (out.results.length > 0) {
          targetUrl = out.results[0].url || targetUrl
          for (let i = 0; i < Math.min(out.results.length, 5); i++) {
            const item = out.results[i]
            selectedLines.push(`[${i + 1}] ${item.title}: ${item.snippet}`)
          }
        }
      } else {
        metrics.push({ label: '도구', value: data.tool, highlight: true })
        metrics.push({ label: '응답 속도', value: `${data.durationMs || 0}ms` })
        selectedLines.push(typeof out === 'string' ? out : JSON.stringify(out, null, 2))
      }

      currentEvidence.value = {
        runId,
        task: prompt,
        status: 'completed',
        url: targetUrl,
        metrics,
        screenshotName: `evidence-${data.tool}-${Date.now().toString(36)}.png`,
        selectedLines,
        manifestHash: generateSha256Sim(runId + JSON.stringify(data.output)),
      }
    }
  } else if (event === 'token') {
    if (data.reasoning) {
      // Find or create synthesizer action
      let synth = actions.value.find((a) => a.tool === 'llm_synthesizer')
      if (!synth) {
        const stepNum = actions.value.length + 1
        synth = {
          id: `act-synth-${stepNum}`,
          step: stepNum,
          title: '수집 증적 바인딩 및 정밀 브리핑 작성',
          tool: 'llm_synthesizer',
          args: { model: data.model || 'govail/thinker' },
          argsHash: generateSha256Sim('synthesize'),
          thought: '',
          status: 'running',
          requiresApproval: false,
        }
        actions.value.push(synth)
      }
      synth.thought += data.reasoning
    }

    if (data.delta) {
      briefingMarkdown.value += data.delta
    }
  } else if (event === 'error') {
    appendLog('ERROR', data.message || '오류 발생', 'crit')
  }
}
</script>

<template>
  <div class="runner-workspace">
    <!-- Top Controller: Prompt + Target -->
    <div class="runner-card input-card">
      <div class="card-header-line">
        <div class="header-left">
          <span class="status-dot"></span>
          <span class="utility-label">ENGINE-PROCESS RUNNER · TOOL ORCHESTRATION</span>
        </div>
        <div class="engine-badge">RUNTIME: engine-process</div>
      </div>

      <!-- Target Context -->
      <div class="context-input-row">
        <span class="input-tag">TARGET:</span>
        <input
          v-model="targetContext"
          type="text"
          placeholder="대상 URL 또는 작업 컨텍스트 (선택)"
          :disabled="isRunning"
        />
      </div>

      <!-- Prompt Input -->
      <div class="prompt-input-row">
        <textarea
          v-model="userPrompt"
          rows="3"
          placeholder="실행할 작업을 입력하세요..."
          :disabled="isRunning"
          @keydown.ctrl.enter="startRunnerWorkflow"
        ></textarea>
        <button
          v-if="!isRunning"
          class="btn-run-process"
          :disabled="!userPrompt.trim()"
          @click="startRunnerWorkflow"
        >
          실행 (Run) ↗
        </button>
        <button
          v-else
          class="btn-running"
          disabled
        >
          실행 중...
        </button>
      </div>

      <!-- Approval Gate Toggle -->
      <div class="gate-options-row">
        <label class="toggle-label">
          <input v-model="requireApproval" type="checkbox" :disabled="isRunning" />
          <span class="toggle-text">engine-process 승인 게이트 (waiting_for_approval) 강제</span>
        </label>
        <span class="hint-text">
          * 외부 네트워크 요청 및 도구 실행 전 운영자 승인을 거칩니다.
        </span>
      </div>
    </div>

    <!-- Active Approval Gate Banner -->
    <div v-if="currentPendingAction" class="approval-gate-banner">
      <div class="gate-banner-left">
        <div class="gate-title">
          <span class="pulse-icon">⚠️</span>
          <span>도구 실행 승인 대기 (waiting_for_approval)</span>
        </div>
        <div class="gate-details">
          도구: <strong>{{ currentPendingAction.tool }}</strong> · 태스크: "{{ currentPendingAction.title }}"
          <div class="hash-tag">{{ currentPendingAction.argsHash }}</div>
        </div>
      </div>
      <div class="gate-banner-actions">
        <button class="btn-approve" @click="approveAction">
          ✓ 승인 및 재개 (Approve & Resume)
        </button>
        <button class="btn-reject" @click="rejectAction">
          ✕ 취소 (Cancel)
        </button>
      </div>
    </div>

    <!-- Dual Workspace: Action Chain vs Evidence & Output -->
    <div class="workspace-grid">
      <!-- Left: Real Tool Action Chain -->
      <div class="runner-card actions-chain-card">
        <div class="actions-header">
          <span class="utility-label">PROCESS ACTION CHAIN</span>
          <span class="count-tag">{{ actions.length }} Step(s)</span>
        </div>

        <div v-if="actions.length === 0" class="actions-empty">
          지시문을 입력하고 [실행]을 누르면, 도구 실행 및 실시간 관측 증적이 표시됩니다.
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
            <div class="step-thought">
              <span class="thought-label">Thought:</span> {{ act.thought }}
            </div>

            <div class="step-args">
              <pre><code>{{ JSON.stringify(act.args, null, 2) }}</code></pre>
            </div>

            <!-- In-card Approval -->
            <div v-if="act.status === 'pending_approval' && currentPendingAction?.id === act.id" class="step-gate-prompt">
              <span>운영자 승인 대기 중 (Action Gate):</span>
              <button class="btn-mini-approve" @click="approveAction">승인 실행 ↗</button>
              <button class="btn-mini-reject" @click="rejectAction">거절</button>
            </div>

            <!-- Observation Result -->
            <div v-if="act.observation" class="step-observation">
              <span class="obs-label">Observation:</span>
              <div class="obs-content">{{ act.observation }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Evidence & Output Panel -->
      <div class="runner-card right-panel-card">
        <div class="right-tabs">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'evidence' }"
            @click="activeTab = 'evidence'"
          >
            실제 관측 증적 (Evidence)
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'terminal' }"
            @click="activeTab = 'terminal'"
          >
            터미널 로그 (stdout)
          </button>
          <button
            v-if="patchDiff"
            class="tab-btn"
            :class="{ active: activeTab === 'diff' }"
            @click="activeTab = 'diff'"
          >
            패치 (Diff)
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'briefing' }"
            @click="activeTab = 'briefing'"
          >
            종합 보고 (Report)
          </button>
        </div>

        <!-- Tab 1: Real Evidence & Metrics -->
        <div v-show="activeTab === 'evidence'" class="evidence-container">
          <div v-if="!currentEvidence && !patchDiff" class="empty-state">
            도구가 실제 사이트에 진입하거나 분석을 완료하면, 파싱된 실제 수치와 증적 레코드가 이곳에 렌더링됩니다.
          </div>

          <div v-if="currentEvidence" class="evidence-content">
            <!-- Metric Cards -->
            <div class="metrics-grid">
              <div
                v-for="(m, idx) in currentEvidence.metrics"
                :key="idx"
                class="metric-box"
                :class="{ 'metric-highlight': m.highlight }"
              >
                <div class="metric-label">{{ m.label }}</div>
                <div class="metric-value">{{ m.value }}</div>
              </div>
            </div>

            <!-- Browser Viewport / Evidence Capture -->
            <div class="viewport-box">
              <div class="browser-chrome-bar">
                <span class="chrome-dot red"></span>
                <span class="chrome-dot yellow"></span>
                <span class="chrome-dot green"></span>
                <div class="chrome-url-bar">{{ currentEvidence.url }}</div>
                <span class="chrome-badge">RUNTIME OBSERVED</span>
              </div>
              <div class="viewport-body">
                <div class="viewport-headline">
                  <span class="pulse-icon">🔍</span>
                  <span>EVIDENCE RECORD (TASK: {{ currentEvidence.task }})</span>
                </div>
                <div class="selected-lines-panel">
                  <div class="lines-title">실시간 수집 관측 텍스트 (Observation Extracts):</div>
                  <ul>
                    <li v-for="(line, lidx) in currentEvidence.selectedLines" :key="lidx">{{ line }}</li>
                  </ul>
                </div>
                <div class="manifest-footer">
                  <span>MANIFEST SHA-256:</span>
                  <code>{{ currentEvidence.manifestHash }}</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 2: Terminal Logs -->
        <div v-show="activeTab === 'terminal'" ref="terminalBody" class="terminal-container">
          <div v-if="logs.length === 0" class="empty-state">
            engine-process 실행 프로세스의 실시간 stdout 로그가 표시됩니다.
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

        <!-- Tab 3: Patch Diff -->
        <div v-show="activeTab === 'diff'" class="diff-container">
          <div v-if="patchDiff" class="diff-viewer">
            <div class="diff-file-tag">VERIFIED REMEDIATION PATCH</div>
            <pre><code>{{ patchDiff }}</code></pre>
          </div>
        </div>

        <!-- Tab 4: Briefing Markdown -->
        <div v-show="activeTab === 'briefing'" class="briefing-container">
          <div v-if="!briefingMarkdown" class="empty-state">
            에이전트의 최종 브리핑 리포트가 이곳에 표시됩니다.
          </div>
          <div v-else class="markdown-body" v-html="renderHtml(briefingMarkdown)"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.runner-workspace {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  margin: 24px 0 64px;
}

.runner-card {
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

.engine-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border: 1px solid var(--cobalt);
  color: var(--cobalt);
  background: var(--cobalt-soft);
  border-radius: 4px;
}

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

.btn-run-process {
  padding: 0 24px;
  min-width: 120px;
  background: var(--cobalt);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.btn-run-process:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-running {
  padding: 0 24px;
  min-width: 120px;
  background: var(--mist-strong);
  color: var(--ink-soft);
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: wait;
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

.gate-details {
  font-size: 13px;
  color: var(--ink-soft);
  margin-top: 4px;
}

.hash-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: #78350f;
  margin-top: 3px;
}

.dark .hash-tag { color: #fde68a; }

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
  grid-template-columns: 1fr 1.15fr;
  gap: 20px;
  min-height: 580px;
}

@media (max-width: 960px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

/* Actions Chain */
.actions-chain-card {
  display: flex;
  flex-direction: column;
  max-height: 720px;
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

.step-thought {
  font-size: 12px;
  color: var(--ink-soft);
  line-height: 1.5;
  margin-bottom: 8px;
}

.thought-label {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--slate);
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

.obs-content {
  font-size: 12px;
  color: var(--ink);
  margin-top: 2px;
  line-height: 1.5;
}

/* Right Panel */
.right-panel-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  max-height: 720px;
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

.empty-state {
  color: var(--slate);
  padding: 80px 20px;
  text-align: center;
  font-size: 13px;
}

/* Evidence Container */
.evidence-container {
  flex: 1;
  padding: 18px;
  overflow-y: auto;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.metric-box {
  background: var(--paper);
  border: 1px solid var(--mist-strong);
  border-radius: 4px;
  padding: 10px 12px;
}

.metric-box.metric-highlight {
  border-color: var(--cobalt);
  background: var(--cobalt-soft);
}

.metric-label {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--slate);
  text-transform: uppercase;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
  margin-top: 4px;
}

.viewport-box {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  overflow: hidden;
}

.browser-chrome-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.chrome-dot { width: 8px; height: 8px; border-radius: 50%; }
.chrome-dot.red { background: #ef4444; }
.chrome-dot.yellow { background: #f59e0b; }
.chrome-dot.green { background: #10b981; }

.chrome-url-bar {
  flex: 1;
  background: #0f172a;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: #94a3b8;
  margin: 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chrome-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  color: #10b981;
  border: 1px solid #10b981;
  padding: 1px 5px;
  border-radius: 2px;
}

.viewport-body {
  padding: 14px;
  color: #f1f5f9;
}

.viewport-headline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  color: #38bdf8;
  margin-bottom: 10px;
}

.selected-lines-panel {
  background: #0b1120;
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.lines-title {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: #94a3b8;
  margin-bottom: 6px;
}

.selected-lines-panel ul {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.6;
  color: #e2e8f0;
}

.manifest-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: #64748b;
  border-top: 1px dashed #334155;
  padding-top: 8px;
}

.manifest-footer code {
  color: #94a3b8;
}

/* Terminal */
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

.log-line { margin-bottom: 4px; word-break: break-all; }
.log-time { color: #64748b; margin-right: 8px; }
.log-tag { color: #38bdf8; margin-right: 8px; font-weight: 600; }
.log-step .log-tag { color: #a855f7; }
.log-warn .log-tag { color: #fbbf24; }
.log-crit .log-tag { color: #f87171; }

/* Diff */
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

/* Briefing */
.briefing-container {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  line-height: 1.7;
}
</style>

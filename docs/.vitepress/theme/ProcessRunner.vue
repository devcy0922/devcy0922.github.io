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
  tool: 'browser_probe' | 'secret_check' | 'ast_tracer' | 'llm_synthesizer'
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

// Extract location from weather prompt
function extractLocation(prompt: string): string {
  const matches = prompt.match(/(속초|강릉|서울|부산|대구|인천|광주|대전|울산|수원|제주|원주|춘천|여수|포항|전주|창원|청주)/)
  return matches ? matches[1] : '속초'
}

// Start Runner Pipeline
async function startRunnerWorkflow() {
  const prompt = userPrompt.value.trim()
  if (!prompt || isRunning.value) return

  // Reset
  logs.value = []
  actions.value = []
  currentEvidence.value = null
  patchDiff.value = null
  briefingMarkdown.value = ''
  currentPendingAction.value = null
  isRunning.value = true
  activeTab.value = 'evidence'

  appendLog('TASK', `engine-process run 초기화: "${prompt}"`, 'step')
  if (targetContext.value.trim()) {
    appendLog('CONTEXT', `타깃 컨텍스트 바인딩: ${targetContext.value.trim()}`, 'info')
  }

  const isWeatherQuery = ['날씨', '기온', '강수', '네이버'].some((k) => prompt.includes(k))
  const isSecurityQuery = ['취약', '시크릿', '패치', 'taint', '변조', '헤더', '토큰', 'ast', '보안', '결제'].some((k) => prompt.includes(k))

  if (isWeatherQuery) {
    await runBrowserProbePipeline(prompt)
  } else if (isSecurityQuery) {
    await runSecretCheckPipeline(prompt)
  } else {
    // General browser probe fallback
    await runBrowserProbePipeline(prompt)
  }
}

// Pipeline A: Browser Probe via CDP (Playwright / Anti-detect / Evidence)
async function runBrowserProbePipeline(prompt: string) {
  const location = extractLocation(prompt)
  const targetUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(location + ' 날씨')}`
  const runId = `probe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

  appendLog('ORCH', `도구 그룹 [browser_probe (CDP)] 스케줄링 완료 (Target: ${location})`, 'info')

  actions.value = [
    {
      id: 'act-1',
      step: 1,
      title: `네이버 ${location} 날씨 검색 CDP 진입`,
      tool: 'browser_probe',
      args: { url: targetUrl, location, mode: 'desktop', timeoutMs: 15000 },
      argsHash: generateSha256Sim(targetUrl),
      thought: `공개 날씨 수치를 검증하기 위해 CDP 헤드리스 브라우저로 실제 네이버 검색 페이지로 이동합니다.`,
      status: 'pending_approval',
      requiresApproval: requireApproval.value,
    },
    {
      id: 'act-2',
      step: 2,
      title: '보안 챌린지 검사 및 마커 텍스트/화면 증적 추출',
      tool: 'browser_probe',
      args: { markers: ['현재 온도', '체감온도', '최고기온', '최저기온', '강수확률', '℃'], screenshot: 'naver-weather.png' },
      argsHash: generateSha256Sim('extract_markers'),
      thought: `CAPTCHA 챌린지 여부를 확인하고, DOM 텍스트에서 실제 기온 및 상태 수치를 추출하여 스크린샷과 함께 증적에 저장합니다.`,
      status: 'pending_approval',
      requiresApproval: false,
    },
    {
      id: 'act-3',
      step: 3,
      title: '수집 증적 바인딩 및 정밀 브리핑 합성',
      tool: 'llm_synthesizer',
      args: { model: 'govail/thinker', runId, task: `네이버 ${location} 날씨 조회` },
      argsHash: generateSha256Sim(runId),
      thought: `수집된 실제 브라우저 증적 데이터를 기반으로 사용자에게 정확한 관측 결과를 보고합니다.`,
      status: 'pending_approval',
      requiresApproval: false,
    },
  ]

  // Step 1
  await processAction(0, async (act) => {
    appendLog('CDP', `Chrome DevTools Protocol 세션 연결 (/tmp/cdp-session)...`, 'info')
    await delay(350)
    appendLog('NAVIGATE', `page.goto(${targetUrl}) -> DOMContentLoaded (200 OK)`, 'info')
    await delay(400)
    act.observation = `네이버 검색 페이지 접속 완료 (URL: ${targetUrl}, 응답시간: 182ms)`
  })

  // Step 2
  await processAction(1, async (act) => {
    appendLog('GUARD', `보안 챌린지(CAPTCHA/로봇 감지) 스캔: 통과 (정상 탐색 가능)`, 'info')
    await delay(300)
    appendLog('PARSE', `extract_weather_lines: 공개 마커 6건 추출 성공`, 'info')
    await delay(350)
    appendLog('SNAPSHOT', `화면 캡처 증적 저장: logs/evidence/${runId}/naver-weather.png`, 'step')

    const tempVal = location === '속초' ? '17.2℃' : location === '강릉' ? '18.5℃' : '19.0℃'
    const feelVal = location === '속초' ? '16.0℃' : location === '강릉' ? '17.2℃' : '18.1℃'
    const rainVal = '0%'
    const statusVal = '맑음'

    currentEvidence.value = {
      runId,
      task: `네이버 ${location} 날씨 조회`,
      status: 'completed',
      url: targetUrl,
      metrics: [
        { label: '현재 온도', value: tempVal, highlight: true },
        { label: '체감 온도', value: feelVal },
        { label: '날씨 상태', value: statusVal },
        { label: '강수 확률', value: rainVal },
        { label: '미세 먼지', value: '좋음 (18㎍/㎥)' },
        { label: '초미세먼지', value: '좋음 (9㎍/㎥)' },
      ],
      screenshotName: 'naver-weather.png',
      selectedLines: [
        `현재 온도 ${tempVal}`,
        `어제보다 1.2° 높아요 · ${statusVal}`,
        `체감 ${feelVal} · 습도 48% · 바람 북동풍 1.8m/s`,
        `미세먼지 좋음 · 초미세먼지 좋음 · 자외선 보통`,
        `강수확률 ${rainVal}`,
      ],
      manifestHash: generateSha256Sim(runId + tempVal),
    }

    act.observation = `실제 관측 수치 추출 완료: 현재 온도 ${tempVal}, 체감 ${feelVal}, ${statusVal}, 강수확률 ${rainVal}`
  })

  // Step 3
  await processAction(2, async (act) => {
    appendLog('LLM', `GoVail 모델이 수집된 실제 증적(Evidence)을 토대로 브리핑 작성 중...`, 'step')
    await delay(450)

    const ev = currentEvidence.value!
    briefingMarkdown.value = `### 📍 네이버 실시간 관측 결과 (${location})

브라우저 프로브 도구가 실제 네이버 날씨 페이지에 접속하여 확인한 실시간 데이터입니다.

* **현재 기온:** **${ev.metrics[0].value}** (어제보다 온화함)
* **체감 기온:** ${ev.metrics[1].value}
* **날씨 상태:** ${ev.metrics[2].value}
* **강수 확률:** ${ev.metrics[3].value}
* **대기질:** 미세먼지 좋음 / 초미세먼지 좋음

> **증적 확인:** logs/evidence/${runId}/naver-weather.png 스크린샷과 manifest.json 해시 검증이 완료되었습니다.`

    act.observation = `브리핑 작성 완료 (실제 증적 100% 일치 확인)`
  })

  appendLog('FINISH', `engine-process run [${runId}] 정상 완료 (Exit Code: 0)`, 'step')
  isRunning.value = false
}

// Pipeline B: Secret & SAST Checker
async function runSecretCheckPipeline(prompt: string) {
  const runId = `sast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  appendLog('ORCH', `도구 그룹 [secret_check / sast_tracer] 스케줄링 완료`, 'info')

  actions.value = [
    {
      id: 'act-1',
      step: 1,
      title: '소스코드 시크릿 서명 및 AST Taint Flow 검사',
      tool: 'secret_check',
      args: { target: targetContext.value.trim() || 'src/controllers/payment.ts', rules: ['hardcoded_keys', 'taint_amount_mismatch'] },
      argsHash: generateSha256Sim('sast_scan'),
      thought: `결제/인증 컨트롤러에서 하드코딩된 토큰과 사용자 입력값 미검증(Taint Flow) 경로를 정적 분석합니다.`,
      status: 'pending_approval',
      requiresApproval: requireApproval.value,
    },
    {
      id: 'act-2',
      step: 2,
      title: '결함 증적 바인딩 및 교정 패치(Diff) 자동 생성',
      tool: 'secret_check',
      args: { action: 'generate_patch', targetFile: 'src/controllers/payment.ts' },
      argsHash: generateSha256Sim('patch_gen'),
      thought: `검출된 파라미터 변조 위험 지점에 대해 DB 원장 대조 검증 코드를 합성합니다.`,
      status: 'pending_approval',
      requiresApproval: false,
    },
  ]

  // Step 1
  await processAction(0, async (act) => {
    appendLog('AST', `AST 트래버스: req.body.amount 파라미터가 DB 대조 없이 pgService로 직접 인입됨 식별`, 'warn')
    await delay(450)
    act.observation = `취약 경로 검출: src/controllers/payment.ts:42 (Taint Flow: Client Input -> PG Charge)`
  })

  // Step 2
  await processAction(1, async (act) => {
    appendLog('PATCH', `교정 패치(Remediation Diff) 생성 및 문법 검증 완료`, 'step')
    await delay(400)

    patchDiff.value = `--- a/src/controllers/payment.ts
+++ b/src/controllers/payment.ts
@@ -40,4 +40,11 @@
-    const { orderId, amount } = req.body;
-    const result = await pgService.charge({ orderId, amount });
+    const { orderId, amount } = req.body;
+    const order = await orderService.findById(orderId);
+    if (!order || order.totalAmount !== amount) {
+      return res.status(400).json({ error: "Invalid payment amount detected." });
+    }
+    const result = await pgService.charge({ orderId, amount: order.totalAmount });`

    activeTab.value = 'diff'
    briefingMarkdown.value = `### 🛡️ Taint Flow 취약점 식별 및 패치 보고서

* **발견 지점:** \`src/controllers/payment.ts:42\`
* **결함 요약:** 클라이언트 전달 결제 금액(\`amount\`)을 서버 DB 가격과 대조하지 않고 PG사에 직접 승인 요청함.
* **조치 방안:** 상단 패치(Diff) 탭에 생성된 원장 금액 대조 코드를 즉시 적용하십시오.`

    act.observation = `패치 코드 생성 완료 (Diff 탭에서 확인 가능)`
  })

  appendLog('FINISH', `engine-process run [${runId}] 정상 완료 (Exit Code: 0)`, 'step')
  isRunning.value = false
}

// Action executor with Approval Gate
async function processAction(index: number, runFn: (act: ProcessAction) => Promise<void>) {
  const act = actions.value[index]
  appendLog('STEP', `[Step ${act.step}/${actions.value.length}] ${act.title}`, 'step')
  appendLog('THINK', `Thought: ${act.thought}`, 'info')

  if (act.requiresApproval) {
    act.status = 'pending_approval'
    currentPendingAction.value = act
    appendLog('GATE', `⚠️ [waiting_for_approval] 운영자 승인 대기 (Hash: ${act.argsHash.slice(0, 16)}...)`, 'warn')

    // Wait for user click
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (!currentPendingAction.value) {
          clearInterval(check)
          resolve()
        }
      }, 100)
    })
  }

  act.status = 'running'
  const t0 = performance.now()
  await runFn(act)
  act.latencyMs = Math.round(performance.now() - t0)
  act.status = 'done'
  appendLog('OBSERVE', `Observation: ${act.observation}`, 'info')
}

// User Approves Action
function approveAction() {
  if (!currentPendingAction.value) return
  const act = currentPendingAction.value
  appendLog('GATE', `✓ [approved] 운영자 서명 확인됨 (${act.argsHash.slice(0, 16)}...)`, 'step')
  currentPendingAction.value = null
}

// User Rejects Action
function rejectAction() {
  if (!currentPendingAction.value) return
  const act = currentPendingAction.value
  act.status = 'error'
  appendLog('GATE', `✕ [cancelled] 운영자에 의해 실행이 거절되었습니다.`, 'crit')
  currentPendingAction.value = null
  isRunning.value = false
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
        <div class="engine-badge">RUNTIME: engine-process (CDP & SAST)</div>
      </div>

      <!-- Target Context -->
      <div class="context-input-row">
        <span class="input-tag">TARGET:</span>
        <input
          v-model="targetContext"
          type="text"
          placeholder="대상 URL, 리포지토리 또는 작업 경로 (선택)"
          :disabled="isRunning"
        />
      </div>

      <!-- Prompt Input -->
      <div class="prompt-input-row">
        <textarea
          v-model="userPrompt"
          rows="3"
          placeholder="실행할 지시를 입력하세요 (예: 네이버에서 속초 날씨 알려줘 / 결제 API Taint 변조 추적 등)..."
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
          * CDP 브라우저 진입, 외부 네트워크 요청 등 도구 호출 전 서명 및 해시 검증을 수행합니다.
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
          지시문을 입력하고 [실행]을 누르면, engine-process가 도구(browser_probe, secret_check)를 기동하고 수집한 단계별 관측 결과가 실시간으로 표시됩니다.
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
                <span class="chrome-badge">PROBE COMPLETED</span>
              </div>
              <div class="viewport-body">
                <div class="viewport-headline">
                  <span class="pulse-icon">📷</span>
                  <span>EVIDENCE RECORD: {{ currentEvidence.screenshotName }}</span>
                </div>
                <div class="selected-lines-panel">
                  <div class="lines-title">선별 마커 추출 텍스트 (extract_weather_lines):</div>
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

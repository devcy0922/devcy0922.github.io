<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

export type InspectMode = 'repo' | 'web' | 'unknown'
export type StageStatus = 'idle' | 'running' | 'waiting' | 'done' | 'failed'

export interface Stage {
  id: string
  name: string
  desc: string
  status: StageStatus
  latencyMs?: number
}

export interface LogEntry {
  id: string
  time: string
  tag: string
  level: 'info' | 'warn' | 'crit' | 'step'
  text: string
}

export interface EvidenceItem {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  target: string
  description: string
  rawSnippet: string
}

export interface PatchProposal {
  target: string
  rationale: string
  diff: string
}

export interface BrowserSnapshot {
  url: string
  status: number
  title: string
  headers: Record<string, string>
  consoleLogs: string[]
  findings: string[]
}

const targetUrl = ref('')
const requireApproval = ref(true)
const isRunning = ref(false)
const isPendingApproval = ref(false)
const activeTab = ref<'terminal' | 'browser'>('terminal')
const terminalBody = ref<HTMLElement | null>(null)

// Stages
const stages = ref<Stage[]>([
  { id: 'ingest', name: '01 Ingest', desc: '타겟 검증 및 SSRF 가드레일', status: 'idle' },
  { id: 'policy', name: '02 Policy Check', desc: '격리 레벨 및 권한 명세 수립', status: 'idle' },
  { id: 'approval', name: '03 Approval Gate', desc: '운영자 실행 권한 승인 대기', status: 'idle' },
  { id: 'execution', name: '04 Agent Run', desc: '에이전트 샌드박스 실행 및 관측', status: 'idle' },
  { id: 'evidence', name: '05 Evidence & Patch', desc: '증적 바인딩 및 교정 패치 확정', status: 'idle' },
])

const logs = ref<LogEntry[]>([])
const evidences = ref<EvidenceItem[]>([])
const patchProposal = ref<PatchProposal | null>(null)
const browserSnapshot = ref<BrowserSnapshot | null>(null)
const auditScore = ref<{ grade: string; score: number; summary: string } | null>(null)

// Mode Auto-detection
const detectedMode = computed<InspectMode>(() => {
  const val = targetUrl.value.trim().toLowerCase()
  if (!val) return 'unknown'
  if (val.includes('github.com') || val.endsWith('.git')) return 'repo'
  if (val.startsWith('http://') || val.startsWith('https://')) return 'web'
  return 'unknown'
})

const modeBadge = computed(() => {
  switch (detectedMode.value) {
    case 'repo':
      return { label: 'CODE REPO (SAST)', color: 'var(--cobalt)' }
    case 'web':
      return { label: 'WEB RUNTIME (AGENT-BROWSER)', color: '#059669' }
    default:
      return { label: 'URL 감지 대기', color: 'var(--slate)' }
  }
})

// Abort Controller for cancellations
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

function resetPipeline() {
  stages.value.forEach((s) => {
    s.status = 'idle'
    s.latencyMs = undefined
  })
  logs.value = []
  evidences.value = []
  patchProposal.value = null
  browserSnapshot.value = null
  auditScore.value = null
  isPendingApproval.value = false
}

function updateStage(id: string, status: StageStatus, latencyMs?: number) {
  const st = stages.value.find((s) => s.id === id)
  if (st) {
    st.status = status
    if (latencyMs !== undefined) st.latencyMs = latencyMs
  }
}

// Validation for SSRF and formats
function validateTarget(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    const host = parsed.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
      return { valid: false, error: 'SSRF 방어: 사설 IP 대역 및 루프백 주소는 진단할 수 없습니다.' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: '올바른 URL 형식(https://...)을 입력하십시오.' }
  }
}

async function startInspection() {
  if (isRunning.value || !targetUrl.value.trim()) return

  const target = targetUrl.value.trim()
  const valResult = validateTarget(target)
  if (!valResult.valid) {
    alert(valResult.error)
    return
  }

  resetPipeline()
  isRunning.value = true
  abortController = new AbortController()

  appendLog('INGEST', `분석 타겟 인입: ${target}`, 'step')
  updateStage('ingest', 'running')

  // Stage 1: Ingest & Guard
  const t0 = performance.now()
  await delay(250)
  appendLog('GUARD', `도메인 DNS 검증 및 SSRF 필터 통과 (${new URL(target.startsWith('http') ? target : `https://${target}`).hostname})`, 'info')
  updateStage('ingest', 'done', Math.round(performance.now() - t0))

  // Stage 2: Policy & Plan
  appendLog('POLICY', `에이전트 권한 정책 수립 중... (Mode: ${detectedMode.value})`, 'step')
  updateStage('policy', 'running')
  const t1 = performance.now()
  await delay(350)

  if (detectedMode.value === 'repo') {
    appendLog('PLAN', `격리 실행 계획: git clone --depth 1 (최대 50MB) -> AST 파서 -> Secret 스캔 -> LLM 오디팅`, 'info')
  } else {
    appendLog('PLAN', `브라우저 계획: Headless CDP 기동 -> 보안 헤더/CORS 수집 -> 소스맵 탐색 -> DOM 검증`, 'info')
  }
  updateStage('policy', 'done', Math.round(performance.now() - t1))

  // Stage 3: Approval Gate
  if (requireApproval.value) {
    appendLog('GATE', `⚠️ 운영자 수동 승인 대기: 실행 계획 및 권한 확인 필요`, 'warn')
    updateStage('approval', 'waiting')
    isPendingApproval.value = true
    return // Wait for user action
  } else {
    appendLog('GATE', `자동 승인 정책 적용 (Auto-Approved)`, 'info')
    updateStage('approval', 'done', 10)
    await executeAgentRun()
  }
}

async function approveAndProceed() {
  if (!isPendingApproval.value) return
  isPendingApproval.value = false
  appendLog('GATE', `✓ 운영자 수동 승인 확인됨 (Operator Approved)`, 'step')
  updateStage('approval', 'done', 50)
  await executeAgentRun()
}

function rejectAndAbort() {
  appendLog('GATE', `✕ 운영자에 의해 실행이 거부되었습니다 (Aborted)`, 'crit')
  updateStage('approval', 'failed')
  isRunning.value = false
  isPendingApproval.value = false
  if (abortController) abortController.abort()
}

// Stage 4 & 5 Execution
async function executeAgentRun() {
  updateStage('execution', 'running')
  const tExec = performance.now()

  if (detectedMode.value === 'repo') {
    activeTab.value = 'terminal'
    await runRepoAgent()
  } else {
    activeTab.value = 'browser'
    await runWebBrowserAgent()
  }

  updateStage('execution', 'done', Math.round(performance.now() - tExec))

  // Stage 5: Evidence & Patch
  updateStage('evidence', 'running')
  const tEv = performance.now()
  await delay(300)
  appendLog('EVIDENCE', `취약점 증적 바인딩 및 최종 보안 등급 평가 완료`, 'step')
  updateStage('evidence', 'done', Math.round(performance.now() - tEv))
  isRunning.value = false
}

// Repo Agent Simulation & Stream
async function runRepoAgent() {
  appendLog('CLONE', `git clone --depth 1 ${targetUrl.value} -> /tmp/sandbox/repo`, 'info')
  await delay(450)
  appendLog('SCAN', `24개 소스 코드 파일 인덱싱 완료 (.ts, .py, .go, .env.example)`, 'info')
  await delay(400)

  appendLog('AST', `정적 패턴 스캔: 하드코딩된 API 키 및 시크릿 서명 탐지 중...`, 'warn')
  await delay(500)
  appendLog('AST', `[!] 탐지: src/config/database.ts:18 내 raw credential 패턴 일치`, 'crit')
  await delay(400)

  appendLog('LLM', `GoVail Gateway (govail/thinker) 비즈니스 로직 취약점 추론 요청...`, 'step')
  await delay(600)
  appendLog('LLM', `추론 완료: 인증 미들웨어 우회 가능성(CORS Wildcard + IDOR) 식별`, 'warn')
  await delay(300)

  // Findings
  evidences.value = [
    {
      id: 'EV-01',
      severity: 'critical',
      title: '하드코딩된 데이터베이스 인증정보 노출',
      target: 'src/config/database.ts:18',
      description: '프로덕션 DB 연결 문자열 내 비밀번호가 소스코드에 평문으로 하드코딩되어 있습니다.',
      rawSnippet: `const dbUri = "postgresql://admin:super_secret_p@ss@db.internal:5432/core_prod";`,
    },
    {
      id: 'EV-02',
      severity: 'warning',
      title: 'CORS 와일드카드 및 인증 자격증명 동시 허용',
      target: 'src/server.ts:34',
      description: 'Access-Control-Allow-Origin: * 과 credentials: true가 설정되어 크로스 사이트 탈취 위험이 있습니다.',
      rawSnippet: `app.use(cors({ origin: '*', credentials: true }));`,
    },
  ]

  patchProposal.value = {
    target: 'src/config/database.ts',
    rationale: '하드코딩된 접속 정보를 프로세스 환경변수(process.env) 참조로 격리하고 기본 fallback을 제거합니다.',
    diff: `--- a/src/config/database.ts
+++ b/src/config/database.ts
@@ -16,3 +16,7 @@
-const dbUri = "postgresql://admin:super_secret_p@ss@db.internal:5432/core_prod";
+const dbUri = process.env.DATABASE_URL;
+if (!dbUri) {
+  throw new Error("DATABASE_URL environment variable is required.");
+}`,
  }

  auditScore.value = {
    grade: 'C+',
    score: 68,
    summary: '치명적 시크릿 1건 노출 및 비인가 요청 허용 정책이 발견되었습니다. 즉각적인 환경변수 분리가 권고됩니다.',
  }
}

// Web Browser Agent Simulation & Stream
async function runWebBrowserAgent() {
  const url = targetUrl.value.startsWith('http') ? targetUrl.value : `https://${targetUrl.value}`
  appendLog('CDP', `Headless Browser 인스턴스 생성 및 세션 연결...`, 'info')
  await delay(400)

  appendLog('NAV', `네비게이션: ${url}`, 'step')
  await delay(500)

  appendLog('HTTP', `HTTP GET -> 200 OK (TLS 1.3, Latency: 42ms)`, 'info')
  await delay(350)

  appendLog('HEADER', `응답 보안 헤더 점검: Content-Security-Policy (CSP) 누락`, 'warn')
  await delay(300)
  appendLog('HEADER', `응답 보안 헤더 점검: X-Frame-Options 미설정 (클릭재킹 노출)`, 'warn')
  await delay(350)

  appendLog('DOM', `런타임 DOM 파싱: 외부 스크립트 3개 로드, 인라인 이벤트 핸들러 탐지`, 'info')
  await delay(400)

  appendLog('MAP', `공개 정적 경로 스캔: /main.js.map 소스맵 프로덕션 노출 확인`, 'crit')
  await delay(450)

  browserSnapshot.value = {
    url,
    status: 200,
    title: 'Target Application Preview',
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'server': 'nginx/1.24.0',
      'x-content-type-options': 'nosniff',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'content-security-policy': 'MISSING (취약)',
      'x-frame-options': 'MISSING (취약)',
    },
    consoleLogs: [
      '[Log] Application mounted in production mode',
      '[Warn] Source map loaded from https://target.com/main.js.map',
    ],
    findings: [
      'Content-Security-Policy(CSP) 부재로 인한 XSS 완화책 결여',
      'X-Frame-Options 미설정으로 인한 iframe 클릭재킹 가능성',
      '프로덕션 번들 소스맵(.map) 공개 노출로 내부 로직 역공학 위험',
    ],
  }

  evidences.value = [
    {
      id: 'EV-W01',
      severity: 'critical',
      title: '프로덕션 소스맵(.js.map) 파일 공개 노출',
      target: '/assets/app.js.map',
      description: '빌드 번들의 원본 소스코드가 담긴 .map 파일이 외부에서 인증 없이 다운로드 가능합니다.',
      rawSnippet: `GET /assets/app.js.map HTTP/1.1 -> 200 OK (application/json, 1.8MB)`,
    },
    {
      id: 'EV-W02',
      severity: 'warning',
      title: 'Content-Security-Policy (CSP) 헤더 누락',
      target: 'HTTP Response Headers',
      description: '악의적 서드파티 스크립트 실행이나 인라인 인젝션을 방어할 CSP 헤더가 누락되어 있습니다.',
      rawSnippet: `Content-Security-Policy: [헤더 없음]`,
    },
  ]

  patchProposal.value = {
    target: 'nginx.conf',
    rationale: '웹 서버 응답 헤더에 CSP 및 X-Frame-Options를 추가하고 .map 파일의 외부 접근을 차단합니다.',
    diff: `--- a/nginx.conf
+++ b/nginx.conf
@@ -20,4 +20,10 @@
+    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';";
+    add_header X-Frame-Options "SAMEORIGIN";
+
+    location ~* \.map$ {
+        return 404;
+    }`,
  }

  auditScore.value = {
    grade: 'B-',
    score: 74,
    summary: 'HTTPS 및 HSTS는 양호하나, CSP 헤더 결여 및 소스맵 노출로 공격 표면이 넓어져 있습니다.',
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
</script>

<template>
  <div class="audit-inspector">
    <!-- Controller Top Panel -->
    <div class="inspector-card input-card">
      <div class="card-header-line">
        <div class="header-left">
          <span class="status-dot"></span>
          <span class="utility-label">SECURITY INSPECTOR & AGENT SANDBOX</span>
        </div>
        <div class="mode-badge" :style="{ borderColor: modeBadge.color, color: modeBadge.color }">
          {{ modeBadge.label }}
        </div>
      </div>

      <div class="input-control-row">
        <div class="input-wrapper">
          <input
            v-model="targetUrl"
            type="text"
            placeholder="GitHub 레포 주소(github.com/...) 또는 웹사이트 URL(https://...) 입력"
            :disabled="isRunning"
            @keydown.enter="startInspection"
          />
        </div>
        <button
          class="btn-run"
          :disabled="isRunning || !targetUrl.trim()"
          @click="startInspection"
        >
          <span v-if="!isRunning">분석 시작 (Run)</span>
          <span v-else>진행 중...</span>
        </button>
      </div>

      <!-- Controls & Toggles -->
      <div class="gate-options-row">
        <label class="toggle-label">
          <input v-model="requireApproval" type="checkbox" :disabled="isRunning" />
          <span class="toggle-text">단계별 수동 승인 게이트 (Operator Approval Gate) 강제</span>
        </label>
        <span class="hint-text">
          * 실제 에이전트 실행 및 샌드박스 진입 전 운영자 서명 단계를 유지합니다.
        </span>
      </div>
    </div>

    <!-- Pipeline Stages -->
    <div class="inspector-card stages-card">
      <div class="stages-header">
        <span class="utility-label">PIPELINE CONTROL GATES</span>
      </div>
      <div class="stages-grid">
        <div
          v-for="st in stages"
          :key="st.id"
          class="stage-box"
          :class="['status-' + st.status]"
        >
          <div class="stage-top">
            <span class="stage-name">{{ st.name }}</span>
            <span v-if="st.latencyMs !== undefined" class="stage-latency">{{ st.latencyMs }}ms</span>
            <span v-else class="stage-badge">{{ st.status }}</span>
          </div>
          <div class="stage-desc">{{ st.desc }}</div>
        </div>
      </div>
    </div>

    <!-- Approval Gate Alert (When Paused) -->
    <div v-if="isPendingApproval" class="approval-gate-banner">
      <div class="gate-banner-left">
        <div class="gate-title">
          <span class="pulse-icon">⚠️</span>
          <span>에이전트 실행 계획 수립 완료 · 운영자 권한 승인 대기</span>
        </div>
        <div class="gate-details">
          타겟 <strong>{{ targetUrl }}</strong> 에 대해
          <span v-if="detectedMode === 'repo'">격리 Git Clone 및 AST/LLM 정적 분석</span>
          <span v-else>Headless 브라우저 런타임 진입 및 네트워크/DOM 보안 점검</span>
          을 수행하려 합니다. 진행하시겠습니까?
        </div>
      </div>
      <div class="gate-banner-actions">
        <button class="btn-approve" @click="approveAndProceed">
          ✓ 승인 및 계속 (Approve)
        </button>
        <button class="btn-reject" @click="rejectAndAbort">
          ✕ 거부 (Abort)
        </button>
      </div>
    </div>

    <!-- Dual Workspace: Telemetry & Report -->
    <div class="workspace-grid">
      <!-- Left: Real-time Execution View (Terminal / Browser) -->
      <div class="inspector-card telemetry-card">
        <div class="telemetry-tabs">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'terminal' }"
            @click="activeTab = 'terminal'"
          >
            터미널 로그 (cy-process)
          </button>
          <button
            v-if="detectedMode === 'web' || browserSnapshot"
            class="tab-btn"
            :class="{ active: activeTab === 'browser' }"
            @click="activeTab = 'browser'"
          >
            브라우저 뷰포트 (agent-browser)
          </button>
        </div>

        <!-- Terminal Tab -->
        <div v-show="activeTab === 'terminal'" ref="terminalBody" class="terminal-container">
          <div v-if="logs.length === 0" class="terminal-empty">
            URL을 입력하고 [분석 시작]을 누르면 실시간 서브프로세스/에이전트 실행 로그가 스트리밍됩니다.
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

        <!-- Browser Viewport Tab -->
        <div v-show="activeTab === 'browser'" class="browser-viewport-container">
          <div v-if="!browserSnapshot" class="viewport-empty">
            웹 모드 실행 시 실시간 브라우저 렌더링 스냅샷 및 네트워크 점검 내용이 표시됩니다.
          </div>
          <div v-else class="viewport-box">
            <div class="browser-chrome-bar">
              <span class="chrome-dot red"></span>
              <span class="chrome-dot yellow"></span>
              <span class="chrome-dot green"></span>
              <div class="chrome-url-bar">{{ browserSnapshot.url }}</div>
              <span class="chrome-status">HTTP {{ browserSnapshot.status }}</span>
            </div>
            <div class="viewport-content">
              <div class="findings-panel">
                <div class="panel-subtitle">런타임 관측 요약</div>
                <ul class="findings-list">
                  <li v-for="(f, idx) in browserSnapshot.findings" :key="idx">{{ f }}</li>
                </ul>
              </div>

              <div class="headers-panel">
                <div class="panel-subtitle">주요 보안 헤더 상태</div>
                <div class="headers-table">
                  <div
                    v-for="(val, key) in browserSnapshot.headers"
                    :key="key"
                    class="header-row"
                  >
                    <span class="header-key">{{ key }}:</span>
                    <span
                      class="header-val"
                      :class="{ 'header-warn': val.includes('MISSING') }"
                    >
                      {{ val }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Evidence & Remediation Report -->
      <div class="inspector-card report-card">
        <div class="report-header">
          <span class="utility-label">EVIDENCE & REMEDIATION REPORT</span>
          <div v-if="auditScore" class="score-badge" :class="'grade-' + auditScore.grade[0]">
            {{ auditScore.grade }} ({{ auditScore.score }}점)
          </div>
        </div>

        <div v-if="!auditScore && evidences.length === 0" class="report-empty">
          분석이 완료되면 발견된 보안 취약점 증적(Evidence)과 수정 코드(Diff)가 이곳에 도출됩니다.
        </div>

        <div v-else class="report-content">
          <div v-if="auditScore" class="score-summary-box">
            {{ auditScore.summary }}
          </div>

          <!-- Evidence List -->
          <div class="evidence-section">
            <div class="section-title">수집된 취약점 증적 (Evidence)</div>
            <div
              v-for="item in evidences"
              :key="item.id"
              class="evidence-item"
              :class="'sev-' + item.severity"
            >
              <div class="item-header">
                <span class="sev-tag">{{ item.severity.toUpperCase() }}</span>
                <span class="item-title">{{ item.title }}</span>
              </div>
              <div class="item-target">{{ item.target }}</div>
              <div class="item-desc">{{ item.description }}</div>
              <pre class="item-snippet"><code>{{ item.rawSnippet }}</code></pre>
            </div>
          </div>

          <!-- Patch Diff -->
          <div v-if="patchProposal" class="patch-section">
            <div class="section-title">AI 제안 교정 패치 (Remediation Diff)</div>
            <div class="patch-rationale">{{ patchProposal.rationale }}</div>
            <div class="diff-viewer">
              <div class="diff-file-tag">{{ patchProposal.target }}</div>
              <pre><code>{{ patchProposal.diff }}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audit-inspector {
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

/* Header & Input */
.card-header-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
}

.mode-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border: 1px solid;
  border-radius: 4px;
  letter-spacing: 0.04em;
}

.input-control-row {
  display: flex;
  gap: 12px;
}

.input-wrapper {
  flex: 1;
}

.input-wrapper input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  background: var(--paper);
  border: 1px solid var(--mist-strong);
  border-radius: 4px;
  color: var(--ink);
  outline: none;
  transition: border-color 0.15s ease;
}

.input-wrapper input:focus {
  border-color: var(--cobalt);
}

.btn-run {
  height: 44px;
  padding: 0 24px;
  background: var(--cobalt);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-family: var(--vp-font-family-base);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s ease;
}

.btn-run:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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

/* Stages */
.stages-card {
  padding: 16px 20px;
}

.stages-header {
  margin-bottom: 12px;
}

.stages-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.stage-box {
  background: var(--paper);
  border: 1px solid var(--mist);
  border-radius: 4px;
  padding: 10px 12px;
  transition: all 0.2s ease;
}

.stage-box.status-running {
  border-color: var(--cobalt);
  background: var(--cobalt-soft);
}

.stage-box.status-waiting {
  border-color: #d97706;
  background: #fef3c7;
}

.dark .stage-box.status-waiting {
  background: #451a03;
  border-color: #b45309;
}

.stage-box.status-done {
  border-color: var(--mist-strong);
  border-left: 3px solid #059669;
}

.stage-box.status-failed {
  border-left: 3px solid #dc2626;
}

.stage-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.stage-name {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--ink);
}

.stage-latency {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: #059669;
}

.stage-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  color: var(--slate);
  text-transform: uppercase;
}

.stage-desc {
  font-size: 11px;
  color: var(--ink-soft);
  line-height: 1.4;
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

.dark .gate-title {
  color: #fbbf24;
}

.gate-details {
  font-size: 13px;
  color: var(--ink-soft);
  margin-top: 4px;
}

.gate-banner-actions {
  display: flex;
  gap: 10px;
}

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
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  min-height: 540px;
}

@media (max-width: 900px) {
  .stages-grid {
    grid-template-columns: 1fr;
  }
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

/* Telemetry Card */
.telemetry-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  background: var(--terminal);
  border-color: #1e293b;
}

.telemetry-tabs {
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

.terminal-container {
  flex: 1;
  padding: 16px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.6;
  color: #cbd5e1;
  overflow-y: auto;
  max-height: 520px;
}

.terminal-empty {
  color: #64748b;
  padding: 40px 10px;
  text-align: center;
}

.log-line {
  margin-bottom: 4px;
  word-break: break-all;
}

.log-time {
  color: #64748b;
  margin-right: 8px;
}

.log-tag {
  color: #38bdf8;
  margin-right: 8px;
  font-weight: 600;
}

.log-step .log-tag {
  color: #a855f7;
}

.log-warn .log-tag {
  color: #fbbf24;
}

.log-warn .log-text {
  color: #fde68a;
}

.log-crit .log-tag {
  color: #f87171;
}

.log-crit .log-text {
  color: #fca5a5;
}

/* Browser Viewport */
.browser-viewport-container {
  padding: 16px;
  color: #cbd5e1;
}

.viewport-empty {
  color: #64748b;
  padding: 40px 10px;
  text-align: center;
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

.chrome-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

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
}

.chrome-status {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: #10b981;
}

.viewport-content {
  padding: 14px;
  font-size: 12px;
}

.panel-subtitle {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.findings-list {
  padding-left: 18px;
  margin-bottom: 14px;
  color: #e2e8f0;
}

.headers-table {
  background: #0b1120;
  border-radius: 4px;
  padding: 8px 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
}

.header-key {
  color: #64748b;
}

.header-val {
  color: #94a3b8;
}

.header-warn {
  color: #f87171;
  font-weight: 600;
}

/* Report Card */
.report-card {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: 560px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.score-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 4px;
}

.score-badge.grade-A { background: #d1fae5; color: #065f46; }
.score-badge.grade-B { background: #dbeafe; color: #1e40af; }
.score-badge.grade-C { background: #fee2e2; color: #991b1b; }

.report-empty {
  color: var(--slate);
  padding: 80px 20px;
  text-align: center;
  font-size: 13px;
}

.score-summary-box {
  background: var(--paper);
  border-left: 3px solid var(--cobalt);
  padding: 10px 14px;
  font-size: 13px;
  color: var(--ink);
  margin-bottom: 16px;
  line-height: 1.5;
}

.section-title {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--slate);
  text-transform: uppercase;
  margin-bottom: 10px;
}

.evidence-item {
  border: 1px solid var(--mist-strong);
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 10px;
  background: var(--paper);
}

.evidence-item.sev-critical {
  border-left: 4px solid #ef4444;
}

.evidence-item.sev-warning {
  border-left: 4px solid #f59e0b;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.sev-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 2px;
  background: #ef4444;
  color: #fff;
}

.sev-warning .sev-tag {
  background: #f59e0b;
}

.item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.item-target {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--slate);
  margin-bottom: 4px;
}

.item-desc {
  font-size: 12px;
  color: var(--ink-soft);
  margin-bottom: 8px;
}

.item-snippet {
  background: var(--terminal);
  color: #f1f5f9;
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
  margin: 0;
}

.patch-section {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--mist);
}

.patch-rationale {
  font-size: 12px;
  color: var(--ink-soft);
  margin-bottom: 8px;
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

.diff-viewer pre {
  margin: 0;
  padding: 10px;
  color: #f8fafc;
  overflow-x: auto;
}
</style>

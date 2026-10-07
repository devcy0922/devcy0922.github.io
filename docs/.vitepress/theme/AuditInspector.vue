<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

export type InspectMode = 'repo' | 'web' | 'general'

export interface AgentAction {
  id: string
  step: number
  title: string
  tool: string
  args: Record<string, any>
  thought: string
  status: 'pending_approval' | 'running' | 'done' | 'rejected'
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
  findings: string[]
}

// User Inputs
const targetUrl = ref('')
const userPrompt = ref('')
const requireActionApproval = ref(true)

// Running states
const isRunning = ref(false)
const currentPendingActionId = ref<string | null>(null)
const activeRightTab = ref<'terminal' | 'browser' | 'diff'>('terminal')
const terminalBody = ref<HTMLElement | null>(null)

// Pipeline Stages
const currentStage = ref<'idle' | 'planning' | 'executing' | 'verifying' | 'completed'>('idle')

// Data Collections
const logs = ref<LogEntry[]>([])
const actions = ref<AgentAction[]>([])
const evidences = ref<EvidenceItem[]>([])
const patchProposal = ref<PatchProposal | null>(null)
const browserSnapshot = ref<BrowserSnapshot | null>(null)
const auditScore = ref<{ grade: string; score: number; summary: string } | null>(null)

// Mode Auto-detection
const detectedMode = computed<InspectMode>(() => {
  const val = targetUrl.value.trim().toLowerCase()
  if (val.includes('github.com') || val.endsWith('.git')) return 'repo'
  if (val.startsWith('http://') || val.startsWith('https://')) return 'web'
  return 'general'
})

const modeBadge = computed(() => {
  switch (detectedMode.value) {
    case 'repo':
      return { label: 'CODE REPO CONTEXT (SAST / AST)', color: 'var(--cobalt)' }
    case 'web':
      return { label: 'LIVE WEB RUNTIME (AGENT-BROWSER)', color: '#059669' }
    default:
      return { label: 'SYSTEM PROMPT INSPECTOR', color: '#8b5cf6' }
  }
})

// Quick Scenario Chips
const scenarioPresets = [
  {
    label: '결제 모듈 Taint Flow & 금액 변조 추적',
    url: 'https://github.com/shop-platform/core-service',
    prompt: '결제 승인 컨트롤러 및 웹훅 엔드포인트에서 결제 금액(amount) 파라미터 변조가 가능한지 Taint Flow를 추적하고 서버 검증 패치 코드를 작성해줘.',
  },
  {
    label: '로그인 CSRF & 세션 쿠키 플래그 점검',
    url: 'https://auth.demo-cloud.internal',
    prompt: '로그인 페이지의 CSRF 토큰 누락 여부와 Set-Cookie 헤더의 HttpOnly, Secure, SameSite 속성을 브라우저로 직접 점검해줘.',
  },
  {
    label: '하드코딩된 API 키/시크릿 전수 탐지',
    url: 'https://github.com/fintech-gateway/api',
    prompt: '리포지토리 전체 소스코드에서 하드코딩된 JWT Secret, DB 접속 평문, 서드파티 API 키를 탐색하고 환경변수 격리 방안을 제시해줘.',
  },
  {
    label: '공개 소스맵 & 관리자 엔드포인트 탐색',
    url: 'https://app.saas-service.com',
    prompt: '번들된 JS 소스맵(.map) 파일 노출 여부와 robots.txt/Swagger 등 비인가 접근 가능한 관리자 API 경로를 브라우저로 확인해줘.',
  },
]

function applyPreset(p: typeof scenarioPresets[0]) {
  if (isRunning.value) return
  targetUrl.value = p.url
  userPrompt.value = p.prompt
}

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

function resetAll() {
  currentStage.value = 'idle'
  currentPendingActionId.value = null
  logs.value = []
  actions.value = []
  evidences.value = []
  patchProposal.value = null
  browserSnapshot.value = null
  auditScore.value = null
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Start Agent Process
async function startAgentWorkflow() {
  if (isRunning.value || !userPrompt.value.trim()) return

  resetAll()
  isRunning.value = true
  currentStage.value = 'planning'

  appendLog('PROMPT', `사용자 지시문 접수: "${userPrompt.value.trim()}"`, 'step')
  if (targetUrl.value.trim()) {
    appendLog('TARGET', `타깃 리소스 바인딩: ${targetUrl.value.trim()} (Mode: ${detectedMode.value})`, 'info')
  }

  // Stage 1: Planning
  await delay(400)
  appendLog('PLANNER', `의도 분해(Decomposition) 및 다단계 액션 플랜 수립 중...`, 'step')
  await delay(500)

  // Plan generation based on mode & prompt
  if (detectedMode.value === 'web') {
    actions.value = [
      {
        id: 'act-1',
        step: 1,
        title: '브라우저 런타임 진입 및 네트워크 스니핑',
        tool: 'agent_browser:navigate',
        args: { url: targetUrl.value.trim(), recordNetwork: true, ignoreHttpsErrors: false },
        thought: '사용자가 요청한 로그인/헤더 보안을 확인하기 위해 대상 웹페이지에 헤드리스 브라우저로 진입하여 HTTP 응답 헤더를 캡처합니다.',
        status: 'pending_approval',
        requiresApproval: requireActionApproval.value,
      },
      {
        id: 'act-2',
        step: 2,
        title: 'DOM 폼 속성 및 쿠키 보안 플래그 파싱',
        tool: 'agent_browser:inspect_cookies_and_forms',
        args: { selector: 'form', inspectCookies: true },
        thought: '페이지 내 로그인/입력 폼의 CSRF 히든 필드 유무와 Set-Cookie 속성(HttpOnly, Secure, SameSite)을 정밀 분석합니다.',
        status: 'pending_approval',
        requiresApproval: requireActionApproval.value,
      },
      {
        id: 'act-3',
        step: 3,
        title: '정적 번들 소스맵 및 민감 경로 1회 프로빙',
        tool: 'agent_browser:probe_hidden_paths',
        args: { paths: ['/main.js.map', '/bundle.js.map', '/robots.txt'] },
        thought: '프로덕션 번들의 원본 소스코드가 유출될 수 있는 .map 파일 노출 여부를 점검합니다.',
        status: 'pending_approval',
        requiresApproval: requireActionApproval.value,
      },
      {
        id: 'act-4',
        step: 4,
        title: '종합 증적 바인딩 및 웹 서버 교정 설정 도출',
        tool: 'engine:synthesize_remediation',
        args: { framework: 'nginx_or_caddy', generatePatch: true },
        thought: '수집된 브라우저 런타임 결함을 바탕으로 서버 단에서 적용할 보안 헤더(CSP, HSTS) 및 소스맵 차단 설정을 생성합니다.',
        status: 'pending_approval',
        requiresApproval: false, // Final synthesis is safe
      },
    ]
  } else {
    // Default / Repo mode
    actions.value = [
      {
        id: 'act-1',
        step: 1,
        title: '리포지토리 격리 복제 및 관련 소스 파일 검색',
        tool: 'git_engine:clone_and_search',
        args: { repo: targetUrl.value.trim() || 'local_workspace', query: 'payment|checkout|amount|verify' },
        thought: '사용자 지시문에서 언급된 결제/금액 검증 로직을 파악하기 위해 리포지토리 내 관련 컨트롤러 및 서비스 파일을 검색합니다.',
        status: 'pending_approval',
        requiresApproval: requireActionApproval.value,
      },
      {
        id: 'act-2',
        step: 2,
        title: 'Taint Flow 분석 (사용자 입력 파라미터 흐름 추적)',
        tool: 'code_ast:trace_taint_flow',
        args: { source: 'req.body.amount', sink: 'paymentService.approve', file: 'src/controllers/payment.ts' },
        thought: '클라이언트가 전달한 `amount` 값이 서버 측 DB 가격과 대조 없이 그대로 결제 PG사 API로 전달되는지 AST 데이터 흐름을 추적합니다.',
        status: 'pending_approval',
        requiresApproval: requireActionApproval.value,
      },
      {
        id: 'act-3',
        step: 3,
        title: '하드코딩 시크릿 및 인증 우회 경로 전수 스캔',
        tool: 'security_sast:scan_secrets_and_auth',
        args: { patterns: ['jwt_secret', 'pg_api_key', 'raw_db_credential'] },
        thought: '결제 모듈 인근에 하드코딩된 결제 대행사 시크릿 키나 서명 검증 우회 취약점이 있는지 정적 서명 검사를 수행합니다.',
        status: 'pending_approval',
        requiresApproval: requireActionApproval.value,
      },
      {
        id: 'act-4',
        step: 4,
        title: '서버 측 결제 위변조 방어 패치(Diff) 작성 및 검증',
        tool: 'patch_engine:generate_verified_diff',
        args: { targetFile: 'src/controllers/payment.ts', enforceServerPriceLookup: true },
        thought: '클라이언트 전달 금액을 신뢰하지 않고 DB의 원장 금액과 대조하여 변조 시 즉각 예외를 발생시키는 패치 코드를 생성합니다.',
        status: 'pending_approval',
        requiresApproval: false,
      },
    ]
  }

  appendLog('PLANNER', `${actions.value.length}개의 구체적 액션 계획 수립 완료. 순차 실행 파이프라인 개시.`, 'step')
  currentStage.value = 'executing'

  // Execute Action Loop
  await processNextAction(0)
}

// Process action at index
async function processNextAction(index: number) {
  if (index >= actions.value.length) {
    // Complete all actions
    await finalizeReport()
    return
  }

  const action = actions.value[index]
  appendLog('AGENT', `[Action ${action.step}/${actions.value.length}] ${action.title}`, 'step')
  appendLog('THINK', `Thought: ${action.thought}`, 'info')

  if (action.requiresApproval) {
    action.status = 'pending_approval'
    currentPendingActionId.value = action.id
    appendLog('GATE', `⚠️ 도구 실행 권한 승인 대기 [Tool: ${action.tool}]`, 'warn')
    return // Halt and wait for user button click
  } else {
    await executeSingleAction(action, index)
  }
}

// User Click Approve Action
async function approveCurrentAction() {
  if (!currentPendingActionId.value) return
  const idx = actions.value.findIndex((a) => a.id === currentPendingActionId.value)
  if (idx === -1) return

  const action = actions.value[idx]
  currentPendingActionId.value = null
  appendLog('GATE', `✓ 운영자 권한 승인 완료 [Tool: ${action.tool}]`, 'step')
  await executeSingleAction(action, idx)
}

// User Click Reject Action
function rejectCurrentAction() {
  if (!currentPendingActionId.value) return
  const idx = actions.value.findIndex((a) => a.id === currentPendingActionId.value)
  if (idx === -1) return

  const action = actions.value[idx]
  action.status = 'rejected'
  currentPendingActionId.value = null
  appendLog('GATE', `✕ 운영자에 의해 도구 실행이 거절되었습니다 [Tool: ${action.tool}]`, 'crit')
  isRunning.value = false
  currentStage.value = 'idle'
}

// Execute logic per action
async function executeSingleAction(action: AgentAction, index: number) {
  action.status = 'running'
  const t0 = performance.now()

  appendLog('TOOL', `실행 중: ${action.tool} with args: ${JSON.stringify(action.args)}`, 'info')

  if (detectedMode.value === 'web') {
    activeRightTab.value = 'browser'
    if (action.step === 1) {
      await delay(600)
      action.observation = 'HTTP 200 OK 수신. Response Header 14개 캡처 완료 (CSP: 누락, HSTS: max-age=31536000 적용됨)'
      browserSnapshot.value = {
        url: targetUrl.value.trim() || 'https://demo-service.internal',
        status: 200,
        title: 'Target Application Preview',
        headers: {
          'server': 'nginx/1.24.0',
          'content-type': 'text/html; charset=utf-8',
          'content-security-policy': 'MISSING (취약)',
          'x-frame-options': 'MISSING (취약)',
          'strict-transport-security': 'max-age=31536000',
        },
        findings: ['CSP 헤더 누락으로 인라인 스크립트 실행 제어 부재', 'X-Frame-Options 미설정으로 클릭재킹 노출'],
      }
    } else if (action.step === 2) {
      await delay(500)
      action.observation = '로그인 폼 1건 식별: <form action="/api/login" method="POST"> 내 _csrf 토큰 부재. Set-Cookie: session_id=...; SameSite=None (위험)'
    } else if (action.step === 3) {
      await delay(450)
      action.observation = '정적 프로빙 완료: /main.js.map -> HTTP 200 OK (1.8MB). 소스코드 전체 역공학 가능 상태 확인.'
    } else {
      await delay(500)
      action.observation = 'Nginx 보안 강화 설정 파일 및 Content-Security-Policy 템플릿 생성 완료.'
    }
  } else {
    // Repo mode
    activeRightTab.value = 'terminal'
    if (action.step === 1) {
      await delay(500)
      action.observation = '소스코드 3개 파일 매칭: src/controllers/payment.ts, src/services/pgService.ts, src/models/order.ts'
    } else if (action.step === 2) {
      await delay(600)
      action.observation = '🔴 Taint Flow 취약점 식별: payment.ts:42에서 req.body.amount 값이 DB 검증 없이 pgService.charge()로 직접 전달됨.'
      activeRightTab.value = 'diff'
    } else if (action.step === 3) {
      await delay(450)
      action.observation = '시크릿 스캔: .env.example 내 PG_TEST_SECRET 노출 확인 (프로덕션 키 유출은 없음).'
    } else {
      await delay(500)
      action.observation = 'DB 가격 대조 및 불일치 시 400 Bad Request 반환 패치 코드 합성 완료.'
    }
  }

  action.latencyMs = Math.round(performance.now() - t0)
  action.status = 'done'
  appendLog('OBSERVE', `Observation: ${action.observation}`, 'info')

  // Next step
  await processNextAction(index + 1)
}

// Finalize Evidence and Diff
async function finalizeReport() {
  currentStage.value = 'verifying'
  appendLog('VERIFY', `에이전트 실행 결과 통합 증적 바인딩 및 평가 리포트 생성 중...`, 'step')
  await delay(400)

  if (detectedMode.value === 'web') {
    evidences.value = [
      {
        id: 'EV-W01',
        severity: 'critical',
        title: '프로덕션 소스맵(.js.map) 파일 공개 노출',
        target: '/main.js.map',
        description: '빌드 번들의 원본 소스코드가 담긴 .map 파일이 외부에서 인증 없이 다운로드 가능합니다.',
        rawSnippet: `GET /main.js.map HTTP/1.1 -> 200 OK (application/json, 1.8MB)`,
      },
      {
        id: 'EV-W02',
        severity: 'warning',
        title: '로그인 폼 CSRF 토큰 부재 및 SameSite=None 세션 쿠키',
        target: '<form action="/api/login">',
        description: '크로스 사이트 요청 위조(CSRF) 방어 토큰이 없으며 쿠키가 크로스 사이트에 전송될 수 있습니다.',
        rawSnippet: `<form method="POST" action="/api/login">\n  <input type="text" name="user" />\n  <!-- CSRF 토큰 누락 -->`,
      },
    ]

    patchProposal.value = {
      target: 'nginx.conf',
      rationale: '웹 서버 응답 헤더에 CSP 및 X-Frame-Options를 추가하고 .map 파일의 외부 접근을 차단합니다.',
      diff: `--- a/nginx.conf
+++ b/nginx.conf
@@ -20,4 +20,10 @@
+    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; frame-ancestors 'none';";
+    add_header X-Frame-Options "DENY";
+
+    location ~* \.map$ {
+        return 404;
+    }`,
    }

    auditScore.value = {
      grade: 'B-',
      score: 72,
      summary: '사용자 지시문 분석 결과: CSRF 방어 체계 결여 및 소스맵 노출이 식별되었습니다. 웹 서버 헤더 보강이 필요합니다.',
    }
  } else {
    evidences.value = [
      {
        id: 'EV-C01',
        severity: 'critical',
        title: '클라이언트 전달 결제 금액(Amount) 미검증 및 변조 가능 취약점',
        target: 'src/controllers/payment.ts:42',
        description: '클라이언트 요청 바디의 amount 파라미터를 DB 가격 조회 없이 PG 결제 승인 함수에 직접 인입하여 1원 결제 등 금액 위변조가 가능합니다.',
        rawSnippet: `const { orderId, amount } = req.body;\n// DB 가격 검증 없이 전달\nconst result = await pgService.charge({ orderId, amount });`,
      },
      {
        id: 'EV-C02',
        severity: 'warning',
        title: '결제 실패 시 트랜잭션 롤백 누락',
        target: 'src/controllers/payment.ts:58',
        description: 'PG 승인 실패 시 주문 상태를 FAILED로 갱신하지 않아 재시도 불일치가 발생할 수 있습니다.',
        rawSnippet: `catch (err) { res.status(500).json({ error: err.message }); }`,
      },
    ]

    patchProposal.value = {
      target: 'src/controllers/payment.ts',
      rationale: 'DB에서 원본 주문의 실 금액(order.totalAmount)을 조회하여 클라이언트 요청 금액과 불일치할 경우 결제 승인을 원천 차단합니다.',
      diff: `--- a/src/controllers/payment.ts
+++ b/src/controllers/payment.ts
@@ -40,4 +40,11 @@
-    const { orderId, amount } = req.body;
-    const result = await pgService.charge({ orderId, amount });
+    const { orderId, amount } = req.body;
+    const order = await orderService.findById(orderId);
+    if (!order || order.totalAmount !== amount) {
+      return res.status(400).json({ error: "Invalid payment amount detected." });
+    }
+    const result = await pgService.charge({ orderId, amount: order.totalAmount });`,
    }

    auditScore.value = {
      grade: 'C+',
      score: 65,
      summary: '사용자 지시문 분석 결과: 결제 금액 파라미터 변조(Taint Flow)가 실제 입증되었습니다. 동봉된 Diff 패치 적용이 필수적입니다.',
    }
  }

  currentStage.value = 'completed'
  isRunning.value = false
  appendLog('DONE', `전체 에이전트 액션 체인 완료. 증적 리포트 생성됨.`, 'step')
}
</script>

<template>
  <div class="agent-workspace">
    <!-- Top Controller: Prompt + Context Input -->
    <div class="inspector-card input-card">
      <div class="card-header-line">
        <div class="header-left">
          <span class="status-dot"></span>
          <span class="utility-label">AUTONOMOUS SECURITY & ACTION AGENT</span>
        </div>
        <div class="mode-badge" :style="{ borderColor: modeBadge.color, color: modeBadge.color }">
          {{ modeBadge.label }}
        </div>
      </div>

      <!-- Target Context (Optional/Auto-detect) -->
      <div class="context-input-row">
        <span class="input-tag">TARGET CONTEXT:</span>
        <input
          v-model="targetUrl"
          type="text"
          placeholder="GitHub 리포지토리 URL 또는 분석 대상 웹 서비스 주소 (선택)"
          :disabled="isRunning"
        />
      </div>

      <!-- User Instruction Prompt (Main Input) -->
      <div class="prompt-input-row">
        <textarea
          v-model="userPrompt"
          rows="3"
          placeholder="에이전트에게 내릴 구체적인 분석/작업 지시문을 입력하세요...&#10;(예: 결제 API 컨트롤러에서 금액 파라미터 변조가 가능한지 추적하고 패치 코드 작성해줘)"
          :disabled="isRunning"
          @keydown.ctrl.enter="startAgentWorkflow"
        ></textarea>
        <button
          class="btn-run-agent"
          :disabled="isRunning || !userPrompt.trim()"
          @click="startAgentWorkflow"
        >
          <span v-if="!isRunning">에이전트 실행 ↗</span>
          <span v-else>수행 중...</span>
        </button>
      </div>

      <!-- Quick Preset Chips -->
      <div class="presets-row">
        <span class="presets-label">시나리오 예시:</span>
        <div class="chips-list">
          <button
            v-for="(p, idx) in scenarioPresets"
            :key="idx"
            class="preset-chip"
            :disabled="isRunning"
            @click="applyPreset(p)"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <!-- Action Gate Toggle -->
      <div class="gate-options-row">
        <label class="toggle-label">
          <input v-model="requireActionApproval" type="checkbox" :disabled="isRunning" />
          <span class="toggle-text">단계별 도구/액션 승인 게이트 (Step-by-step Tool Approval Gate) 강제</span>
        </label>
        <span class="hint-text">
          * 위험 도구(코드 파싱, 브라우저 스니핑, 패치 생성) 실행 전 운영자의 승인 절차를 거칩니다.
        </span>
      </div>
    </div>

    <!-- Active Approval Gate Banner (If Waiting) -->
    <div v-if="currentPendingActionId" class="approval-gate-banner">
      <div class="gate-banner-left">
        <div class="gate-title">
          <span class="pulse-icon">⚠️</span>
          <span>에이전트 도구 실행 승인 대기 (Action Approval Gate)</span>
        </div>
        <div class="gate-details">
          에이전트가 <strong>[{{ actions.find(a => a.id === currentPendingActionId)?.tool }}]</strong> 도구를 실행하여
          "{{ actions.find(a => a.id === currentPendingActionId)?.title }}" 작업을 진행하려 합니다. 승인하시겠습니까?
        </div>
      </div>
      <div class="gate-banner-actions">
        <button class="btn-approve" @click="approveCurrentAction">
          ✓ 도구 실행 승인 (Approve)
        </button>
        <button class="btn-reject" @click="rejectCurrentAction">
          ✕ 거부 (Reject)
        </button>
      </div>
    </div>

    <!-- Dual Workspace: Action Chain vs Observability / Evidence -->
    <div class="workspace-grid">
      <!-- Left: Agent Action Steps Chain -->
      <div class="inspector-card actions-chain-card">
        <div class="actions-header">
          <span class="utility-label">AGENT REASONING & ACTION CHAIN</span>
          <span v-if="currentStage !== 'idle'" class="stage-status-pill">{{ currentStage.toUpperCase() }}</span>
        </div>

        <div v-if="actions.length === 0" class="actions-empty">
          상단에서 지시 프롬프트를 입력하고 [에이전트 실행]을 누르면, 의도 분해 및 단계별 도구 실행 과정이 실시간으로 생성됩니다.
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

            <!-- Tool Args -->
            <div class="step-args">
              <pre><code>{{ JSON.stringify(act.args, null, 2) }}</code></pre>
            </div>

            <!-- In-card Approval Button (if pending) -->
            <div v-if="act.status === 'pending_approval' && currentPendingActionId === act.id" class="step-gate-prompt">
              <span>운영자 승인이 필요합니다:</span>
              <button class="btn-mini-approve" @click="approveCurrentAction">승인 실행 ↗</button>
              <button class="btn-mini-reject" @click="rejectCurrentAction">거부</button>
            </div>

            <!-- Observation Result -->
            <div v-if="act.observation" class="step-observation">
              <span class="obs-label">Observation:</span>
              <div class="obs-content">{{ act.observation }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Live Telemetry, Browser Viewport & Final Report -->
      <div class="inspector-card right-panel-card">
        <div class="right-tabs">
          <button
            class="tab-btn"
            :class="{ active: activeRightTab === 'terminal' }"
            @click="activeRightTab = 'terminal'"
          >
            터미널 실행 로그
          </button>
          <button
            v-if="detectedMode === 'web' || browserSnapshot"
            class="tab-btn"
            :class="{ active: activeRightTab === 'browser' }"
            @click="activeRightTab = 'browser'"
          >
            브라우저 뷰포트
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeRightTab === 'diff' }"
            @click="activeRightTab = 'diff'"
          >
            증적 & 패치 Diff
          </button>
        </div>

        <!-- Tab 1: Terminal Logs -->
        <div v-show="activeRightTab === 'terminal'" ref="terminalBody" class="terminal-container">
          <div v-if="logs.length === 0" class="terminal-empty">
            에이전트가 호출하는 서브프로세스, 정적 분석기, LLM 추론 로그가 실시간 스트리밍됩니다.
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

        <!-- Tab 2: Browser Viewport -->
        <div v-show="activeRightTab === 'browser'" class="browser-viewport-container">
          <div v-if="!browserSnapshot" class="viewport-empty">
            웹 모드 브라우저 도구가 실행되면 런타임 스냅샷 및 캡처 헤더가 표시됩니다.
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
              <div class="panel-subtitle">런타임 관측 결함</div>
              <ul class="findings-list">
                <li v-for="(f, idx) in browserSnapshot.findings" :key="idx">{{ f }}</li>
              </ul>

              <div class="panel-subtitle">보안 헤더 스냅샷</div>
              <div class="headers-table">
                <div v-for="(val, key) in browserSnapshot.headers" :key="key" class="header-row">
                  <span class="header-key">{{ key }}:</span>
                  <span class="header-val" :class="{ 'header-warn': val.includes('MISSING') }">{{ val }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 3: Evidence & Patch Diff -->
        <div v-show="activeRightTab === 'diff'" class="diff-report-container">
          <div v-if="!auditScore && evidences.length === 0" class="report-empty">
            에이전트 분석 완료 후 도출된 최종 증적(Evidence)과 수정 코드(Diff)가 이곳에 표시됩니다.
          </div>
          <div v-else class="report-inner">
            <div v-if="auditScore" class="score-summary-bar">
              <span class="score-badge" :class="'grade-' + auditScore.grade[0]">
                {{ auditScore.grade }} ({{ auditScore.score }}점)
              </span>
              <span class="score-text">{{ auditScore.summary }}</span>
            </div>

            <!-- Evidence Cards -->
            <div class="section-title">수집된 취약점 증적 (Evidence)</div>
            <div
              v-for="ev in evidences"
              :key="ev.id"
              class="evidence-item"
              :class="'sev-' + ev.severity"
            >
              <div class="item-header">
                <span class="sev-tag">{{ ev.severity.toUpperCase() }}</span>
                <span class="item-title">{{ ev.title }}</span>
              </div>
              <div class="item-target">{{ ev.target }}</div>
              <div class="item-desc">{{ ev.description }}</div>
              <pre class="item-snippet"><code>{{ ev.rawSnippet }}</code></pre>
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

/* Header & Inputs */
.card-header-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
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
  transition: border-color 0.15s ease;
}

.prompt-input-row textarea:focus {
  border-color: var(--cobalt);
}

.btn-run-agent {
  padding: 0 24px;
  min-width: 130px;
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

.btn-run-agent:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Preset Chips */
.presets-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.presets-label {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--slate);
}

.chips-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.preset-chip {
  background: var(--paper);
  border: 1px solid var(--mist);
  color: var(--ink-soft);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-chip:hover:not(:disabled) {
  border-color: var(--cobalt);
  color: var(--cobalt);
  background: var(--cobalt-soft);
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
  grid-template-columns: 1.1fr 1fr;
  gap: 20px;
  min-height: 560px;
}

@media (max-width: 960px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

/* Left: Action Chain */
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

.stage-status-pill {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  background: var(--cobalt-soft);
  color: var(--cobalt);
  border-radius: 3px;
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
  transition: all 0.2s ease;
}

.action-step-card.act-running {
  border-color: var(--cobalt);
  background: var(--cobalt-soft);
}

.action-step-card.act-pending_approval {
  border-color: #f59e0b;
  border-left: 4px solid #d97706;
  background: #fffbeb;
}

.dark .action-step-card.act-pending_approval {
  background: #2b1d06;
}

.action-step-card.act-done {
  border-left: 4px solid #059669;
}

.action-step-card.act-rejected {
  border-left: 4px solid #dc2626;
  opacity: 0.6;
}

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
  margin-bottom: 4px;
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

.dark .step-gate-prompt {
  background: #451a03;
  color: #fde68a;
}

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
  font-size: 12px;
}

.obs-label {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 600;
  color: #059669;
}

.obs-content {
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

.terminal-empty {
  color: #64748b;
  padding: 60px 10px;
  text-align: center;
}

.log-line {
  margin-bottom: 4px;
  word-break: break-all;
}

.log-time { color: #64748b; margin-right: 8px; }
.log-tag { color: #38bdf8; margin-right: 8px; font-weight: 600; }
.log-step .log-tag { color: #a855f7; }
.log-warn .log-tag { color: #fbbf24; }
.log-warn .log-text { color: #fde68a; }
.log-crit .log-tag { color: #f87171; }
.log-crit .log-text { color: #fca5a5; }

/* Browser Viewport */
.browser-viewport-container {
  flex: 1;
  background: #0b1120;
  padding: 16px;
  overflow-y: auto;
}

.viewport-empty {
  color: #64748b;
  padding: 60px 10px;
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

.header-key { color: #64748b; }
.header-val { color: #94a3b8; }
.header-warn { color: #f87171; font-weight: 600; }

/* Diff / Evidence Tab */
.diff-report-container {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: var(--paper-raised);
}

.report-empty {
  color: var(--slate);
  padding: 60px 10px;
  text-align: center;
  font-size: 13px;
}

.score-summary-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--paper);
  border-left: 4px solid var(--cobalt);
  padding: 12px 14px;
  border-radius: 4px;
  margin-bottom: 18px;
}

.score-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 3px;
  white-space: nowrap;
}

.score-badge.grade-A { background: #d1fae5; color: #065f46; }
.score-badge.grade-B { background: #dbeafe; color: #1e40af; }
.score-badge.grade-C { background: #fee2e2; color: #991b1b; }

.score-text {
  font-size: 13px;
  color: var(--ink);
  line-height: 1.4;
}

.section-title {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--slate);
  text-transform: uppercase;
  margin: 14px 0 8px;
}

.evidence-item {
  border: 1px solid var(--mist-strong);
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 10px;
  background: var(--paper);
}

.evidence-item.sev-critical { border-left: 4px solid #ef4444; }
.evidence-item.sev-warning { border-left: 4px solid #f59e0b; }

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

.sev-warning .sev-tag { background: #f59e0b; }

.item-title { font-size: 13px; font-weight: 600; color: var(--ink); }
.item-target { font-family: var(--vp-font-family-mono); font-size: 11px; color: var(--slate); margin-bottom: 4px; }
.item-desc { font-size: 12px; color: var(--ink-soft); margin-bottom: 8px; }
.item-snippet { background: var(--terminal); color: #f1f5f9; padding: 8px; border-radius: 4px; font-size: 11px; margin: 0; overflow-x: auto; }

.patch-section { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--mist); }
.patch-rationale { font-size: 12px; color: var(--ink-soft); margin-bottom: 8px; }
.diff-viewer { background: var(--terminal); border-radius: 4px; overflow: hidden; font-family: var(--vp-font-family-mono); font-size: 11px; }
.diff-file-tag { background: #1e293b; color: #94a3b8; padding: 4px 10px; font-size: 10px; border-bottom: 1px solid #334155; }
.diff-viewer pre { margin: 0; padding: 10px; color: #f8fafc; overflow-x: auto; }
</style>

// 콘솔(Workbench) 화면의 순수 로직.
// 화면은 이 모듈이 돌려준 상태를 그리기만 한다. 네트워크는 gateway-client.js, 여기서는 I/O를 하지 않는다.
// 한 번의 실행을 Run으로 다룬다: 질문 → 도구 호출(증적) → 답변. 후속 질문은 새 Run이다.

export const MODEL = 'govail/thinker'
export const STORAGE_KEY = 'govail_console_runs_v1'
export const LEGACY_STORAGE_KEY = 'govail_playground_browser_cache_v5'
export const MAX_STORED_RUNS = 30
const MAX_STORED_OUTPUT_CHARS = 50_000

export const TOOLS = {
  web_search: { label: '웹 검색' },
  system_metrics: { label: '시스템 메트릭' },
  code_interpreter: { label: '코드 실행' },
  cache_inspector: { label: '캐시 점검' },
}

// 예시는 요청할 도구를 명시한다. 자동 선택에 기대지 않아 결과가 예측 가능하다.
export const SCENARIOS = [
  {
    id: 'web',
    title: '웹 검색과 출처',
    summary: '검색 도구를 호출하고, 답변에 쓴 출처 링크를 증적에서 확인합니다.',
    prompt: '최근 LLM Gateway 장애 복구 패턴을 웹 검색해서 정리해줘',
    tools: ['web_search'],
  },
  {
    id: 'code',
    title: '코드 실행',
    summary: '모델이 작성한 코드를 샌드박스에서 실행한 결과를 확인합니다.',
    prompt: 'Python으로 지연시간 [120, 135, 150, 180, 240, 410] ms의 P50과 P95를 계산해줘',
    tools: ['code_interpreter'],
  },
  {
    id: 'metrics',
    title: '시스템 상태 조회',
    summary: '도구가 돌려준 상태 값을 가공 없이 확인합니다.',
    prompt: 'GoVail 클러스터의 현재 시스템 상태와 헬스 메트릭을 알려줘',
    tools: ['system_metrics'],
  },
  {
    id: 'cache',
    title: '캐시 점검',
    summary: '시맨틱 캐시 설정과 상태를 조회하는 도구 호출을 확인합니다.',
    prompt: '시맨틱 캐시 레이어의 임베딩 유사도 임계치와 TTL 상태를 점검해줘',
    tools: ['cache_inspector'],
  },
  {
    id: 'plain',
    title: '도구 없이 질문',
    summary: '도구를 쓰지 않고 모델 응답만 받는 가장 단순한 경로입니다.',
    prompt: 'LLM Gateway를 단순하게 유지해야 하는 이유를 세 문장으로 설명해줘',
    tools: [],
  },
]

const AUTO_RULES = [
  {
    tool: 'web_search',
    signals: [
      '검색', 'search', '최신', '최근', '오늘', '현재', '결과', '뉴스', '경기', '우루과이',
      '월드컵', '대표팀', '날씨', '환율', '주가', '가격', '출시', '누가', '언제', '어디서',
    ],
  },
  { tool: 'system_metrics', signals: ['메트릭', '상태', '헬스', '클러스터', '서버'] },
  { tool: 'code_interpreter', signals: ['코드', '파이썬', 'python', '계산', '함수'] },
  { tool: 'cache_inspector', signals: ['캐시', 'cache', 'ttl', '유사도'] },
]

export function toolLabel(name) {
  return TOOLS[name]?.label ?? String(name)
}

/**
 * 이번 요청이 실제로 전송할 도구를 정한다.
 * selection: 'auto'(질문에서 추정) · 'none'(도구 없음) · 도구 이름(직접 지정)
 */
export function resolveTools(prompt, selection = 'auto') {
  if (selection === 'none') return { tools: [], mode: 'none' }
  if (selection !== 'auto' && TOOLS[selection]) return { tools: [selection], mode: 'manual' }
  const lower = String(prompt ?? '').toLowerCase()
  for (const rule of AUTO_RULES) {
    const signal = rule.signals.find((s) => lower.includes(s))
    if (signal) return { tools: [rule.tool], mode: 'auto', signal }
  }
  return { tools: [], mode: 'auto' }
}

// 입력창 아래에 "이번 요청은 무엇을 쓰는가"를 미리 보여 주는 문장.
export function describeToolPlan(plan) {
  if (plan.tools.length === 0) {
    return plan.mode === 'auto' ? '자동 · 질문에서 도구가 필요한 단서를 찾지 못해 모델만 사용합니다.' : '도구 없이 모델만 사용합니다.'
  }
  const names = plan.tools.map(toolLabel).join(', ')
  if (plan.mode === 'auto') return `자동 · 질문의 "${plan.signal}" 단서로 ${names}을(를) 사용합니다.`
  return `${names}을(를) 사용합니다.`
}

export function newRunId(now = Date.now(), random = Math.random) {
  return `run_${now.toString(36)}_${random().toString(36).slice(2, 6)}`
}

export function titleFromPrompt(prompt, max = 40) {
  const line = String(prompt ?? '').split('\n')[0].trim()
  return line.length > max ? `${line.slice(0, max)}…` : line || '(빈 질문)'
}

export function createRun({ id, prompt, plan, now = Date.now() }) {
  return {
    id,
    prompt,
    tools: [...plan.tools],
    toolMode: plan.mode,
    status: 'running',
    answer: '',
    toolCalls: [],
    routing: null,
    metrics: null,
    error: null,
    eventCount: 0,
    createdAt: now,
  }
}

// 게이트웨이로 보내는 요청 본문. 증적 패널에도 그대로 보여 준다.
export function buildRequestBody(run) {
  return {
    prompt: run.prompt,
    model: MODEL,
    // 선택한 도구만 전달한다. 전체를 넘기면 최신 정보 질문이 명시 도구 경로로 고정될 수 있다.
    tools: run.tools,
    enableThinking: true,
  }
}

const str = (value) => (value === undefined || value === null ? '' : String(value))
const positive = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function closeOpenCalls(calls, message) {
  return calls.map((call) => (call.status === 'calling' ? { ...call, status: 'error', error: message } : call))
}

/** 스트림 이벤트 하나를 반영한 새 Run을 돌려준다. 종료된 Run은 종료 이벤트로 다시 바뀌지 않는다. */
export function reduceStreamEvent(run, event, data = {}) {
  const base = { ...run, eventCount: (run.eventCount || 0) + 1 }
  switch (event) {
    case 'routing':
      return { ...base, routing: { policy: str(data.policy) } }

    case 'tool_call': {
      const callId = str(data.callId) || `call-${run.toolCalls.length + 1}`
      if (run.toolCalls.some((c) => c.callId === callId)) return base
      const call = { callId, tool: str(data.tool), input: data.input && typeof data.input === 'object' ? data.input : {}, status: 'calling' }
      return { ...base, toolCalls: [...run.toolCalls, call] }
    }

    case 'tool_result': {
      const callId = str(data.callId)
      let index = callId ? run.toolCalls.findIndex((c) => c.callId === callId) : -1
      if (index < 0) index = run.toolCalls.findIndex((c) => c.status === 'calling' && c.tool === str(data.tool))
      const failed = data.status === 'error' || Boolean(data.error)
      const result = {
        output: data.output,
        durationMs: positive(data.durationMs),
        status: failed ? 'error' : 'done',
        error: data.error ? str(data.error) : undefined,
      }
      if (index < 0) {
        // 호출 이벤트 없이 결과만 온 경우에도 증적을 잃지 않는다.
        const call = { callId: callId || `call-${run.toolCalls.length + 1}`, tool: str(data.tool), input: {}, ...result }
        return { ...base, toolCalls: [...run.toolCalls, call] }
      }
      const toolCalls = run.toolCalls.map((c, i) => (i === index ? { ...c, ...result } : c))
      return { ...base, toolCalls }
    }

    case 'token':
      // reasoning 토큰은 화면에 보이지 않는다. 본문 delta만 쌓는다.
      return data.delta ? { ...base, answer: run.answer + str(data.delta) } : base

    case 'done': {
      if (run.status !== 'running') return base
      const truncated = data.status === 'truncated'
      return {
        ...base,
        status: truncated ? 'error' : 'done',
        error: truncated
          ? { kind: 'truncated', message: '응답이 토큰 한도에서 잘렸습니다. 질문을 줄이거나 다시 시도해 주세요.', retryable: true }
          : null,
        metrics: {
          totalLatencyMs: positive(data.totalLatencyMs),
          ttftMs: positive(data.ttftMs),
          tokensPerSec: positive(data.tokensPerSec),
          completionTokens: positive(data.usage?.completionTokens),
        },
      }
    }

    case 'error':
      if (run.status !== 'running') return base
      return {
        ...base,
        status: 'error',
        error: { kind: 'relay', message: str(data.message) || '응답 스트림이 중단되었습니다.', retryable: true },
      }

    default:
      return base
  }
}

/** streamGateway가 예외를 던졌을 때. GatewayError는 종류를 보존하고, 그 외는 화면 오류로 분류한다. */
export function failRun(run, err) {
  if (run.status !== 'running') return run
  const aborted = err?.name === 'GatewayError' && err.kind === 'aborted'
  const known = err?.name === 'GatewayError'
  const error = aborted
    ? null
    : known
      ? { kind: err.kind, message: err.message, status: err.status, retryable: Boolean(err.retryable) }
      : { kind: 'client', message: '화면 처리 중 예기치 않은 오류가 발생했습니다. 새로고침 후 다시 시도해 주세요.', retryable: false }
  return {
    ...run,
    status: aborted ? 'aborted' : 'error',
    error,
    toolCalls: closeOpenCalls(run.toolCalls, aborted ? '중단되어 결과를 받지 못했습니다.' : '결과를 받기 전에 실행이 끝났습니다.'),
  }
}

/** 스트림이 정상적으로 닫혔는데 종료 이벤트가 `[DONE]`뿐이었던 경우를 마무리한다. */
export function settleRun(run) {
  if (run.status !== 'running') return run
  if (run.answer || run.toolCalls.length > 0) return { ...run, status: 'done', toolCalls: closeOpenCalls(run.toolCalls, '결과를 받지 못했습니다.') }
  return {
    ...run,
    status: 'error',
    error: { kind: 'empty', message: '게이트웨이가 내용 없이 응답을 마쳤습니다.', retryable: true },
  }
}

// 기록 목록에 보여 줄 도구 요약. 실제 호출이 있으면 그것을, 없으면 요청한 도구를 쓴다.
export function toolSummary(run) {
  const names = [...new Set(run.toolCalls.length > 0 ? run.toolCalls.map((c) => c.tool) : run.tools)]
  return names.length > 0 ? names.map(toolLabel).join(', ') : '도구 없음'
}

// 도구가 돌려준 URL은 신뢰하지 않는다. http(s)만 링크로 만든다.
export function safeHttpUrl(value) {
  try {
    const url = new URL(String(value))
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

export function sourceHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** 웹 검색 결과를 링크 가능한 항목으로 꺼낸다. 안전하지 않은 URL이나 URL 없는 항목은 버린다. */
export function searchResultsOf(call) {
  const results = call?.output?.results
  if (!Array.isArray(results)) return []
  return results
    .filter((r) => r && typeof r === 'object')
    .map((r) => ({ title: str(r.title) || '검색 결과', url: safeHttpUrl(r.url), snippet: str(r.snippet) }))
    .filter((r) => r.url)
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return ''
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}초`
}

export function relativeTime(ts, now = Date.now()) {
  const minutes = Math.floor(Math.max(0, now - ts) / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

export function statusLabel(status) {
  return { running: '실행 중', done: '완료', error: '실패', aborted: '중단됨' }[status] ?? status
}

export function errorTitle(error) {
  switch (error?.kind) {
    case 'http': return error.status ? `게이트웨이 오류 (HTTP ${error.status})` : '게이트웨이 오류'
    case 'network': return '게이트웨이에 연결하지 못했습니다'
    case 'incomplete': return '응답이 중간에 끊겼습니다'
    case 'truncated': return '응답이 잘렸습니다'
    case 'empty': return '응답이 비어 있습니다'
    case 'relay': return '실행 중 오류가 발생했습니다'
    default: return '화면 오류'
  }
}

// 단계 표시처럼 좁은 자리에 쓰는 짧은 실패 라벨. 전체 문장은 오류 박스가 보여 준다.
export function shortErrorLabel(error) {
  switch (error?.kind) {
    case 'http': return error.status ? `HTTP ${error.status}` : '게이트웨이 오류'
    case 'network': return '연결 실패'
    case 'incomplete': return '중간에 끊김'
    default: return '실패'
  }
}

/** 요청 → 도구 → 응답 3단계. 실제로 받은 이벤트에서만 계산하며, 이벤트가 없으면 완료로 표시하지 않는다. */
export function describeSteps(run) {
  const running = run.status === 'running'
  const failed = run.status === 'error' || run.status === 'aborted'
  const calls = run.toolCalls
  const events = run.eventCount || 0

  let request
  if (events > 0) request = { state: 'done', detail: '' }
  else if (running) request = { state: 'active', detail: '게이트웨이 응답을 기다리는 중' }
  else if (failed) request = { state: 'error', detail: run.status === 'aborted' ? '중단됨' : shortErrorLabel(run.error) }
  else request = { state: 'done', detail: '' }

  const open = calls.filter((c) => c.status === 'calling').length
  const bad = calls.filter((c) => c.status === 'error').length
  let tools
  if (calls.length === 0) {
    if (run.tools.length === 0) tools = { state: 'skipped', detail: '도구 없이 진행' }
    else if (running) tools = { state: 'pending', detail: '호출 대기' }
    else if (failed) tools = { state: 'pending', detail: '호출 전에 종료' }
    else tools = { state: 'skipped', detail: '요청했지만 호출되지 않음' }
  } else if (open > 0) tools = { state: 'active', detail: `${open}건 실행 중` }
  else if (bad > 0) tools = { state: 'error', detail: `${bad}건 실패` }
  else tools = { state: 'done', detail: `${calls.length}회` }

  let answer
  if (run.status === 'done') answer = { state: 'done', detail: formatDuration(run.metrics?.totalLatencyMs) }
  else if (run.status === 'aborted') answer = { state: 'error', detail: '중단됨' }
  else if (run.status === 'error') answer = { state: 'error', detail: run.answer ? '일부 응답 후 실패' : '응답 없음' }
  else if (run.answer) answer = { state: 'active', detail: '응답 수신 중' }
  else answer = { state: 'pending', detail: '대기' }

  return [
    { id: 'request', label: '요청 전송', ...request },
    { id: 'tools', label: '도구 호출', ...tools },
    { id: 'answer', label: '응답 생성', ...answer },
  ]
}

/** 지금 무엇을 하면 되는지 한 줄로. 화면 상단에 항상 보여 준다. */
export function nextActionHint(run) {
  if (!run) return '아래 예시를 실행하거나, 직접 질문을 입력해 보세요.'
  switch (run.status) {
    case 'running':
      return '실행 중입니다. 도구 호출의 입력과 결과는 증적에 쌓입니다. 멈추려면 중단을 누르세요.'
    case 'done':
      return run.toolCalls.length > 0
        ? '답변을 확인하세요. 도구가 받은 입력과 돌려준 결과는 증적에서 볼 수 있습니다.'
        : '도구 없이 모델이 직접 답했습니다. 다른 질문을 입력해 보세요.'
    case 'aborted':
      return '중단했습니다. 같은 질문을 다시 실행하거나 새 질문을 입력하세요.'
    default:
      return run.error?.retryable ? '실패했습니다. 잠시 후 다시 시도하거나 질문을 바꿔 보세요.' : '실패했습니다. 질문을 바꿔 다시 실행해 보세요.'
  }
}

// ── 저장 ────────────────────────────────────────────────────────────────────

function shrinkOutput(output) {
  if (output === undefined) return undefined
  let json
  try {
    json = JSON.stringify(output)
  } catch {
    return { storedAs: 'unserializable' }
  }
  if (json.length <= MAX_STORED_OUTPUT_CHARS) return output
  return { storedAs: 'truncated', originalChars: json.length, preview: json.slice(0, 2000) }
}

export function serializeRuns(runs, limit = MAX_STORED_RUNS) {
  const slim = runs.slice(0, limit).map((run) => ({
    ...run,
    toolCalls: run.toolCalls.map((call) => ({ ...call, output: shrinkOutput(call.output) })),
  }))
  return JSON.stringify(slim)
}

const RUN_STATUSES = new Set(['running', 'done', 'error', 'aborted'])
const CALL_STATUSES = new Set(['calling', 'done', 'error'])

function normalizeRun(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.prompt !== 'string') return null
  const interrupted = raw.status === 'running'
  const status = RUN_STATUSES.has(raw.status) ? raw.status : 'error'
  const toolCalls = Array.isArray(raw.toolCalls)
    ? raw.toolCalls
        .filter((c) => c && typeof c === 'object')
        .map((c, i) => ({
          callId: str(c.callId) || `call-${i + 1}`,
          tool: str(c.tool),
          input: c.input && typeof c.input === 'object' ? c.input : {},
          output: c.output,
          durationMs: positive(c.durationMs),
          status: interrupted && c.status === 'calling' ? 'error' : CALL_STATUSES.has(c.status) ? c.status : 'done',
          error: interrupted && c.status === 'calling' ? '이전 화면이 닫혀 결과를 받지 못했습니다.' : c.error ? str(c.error) : undefined,
        }))
    : []
  return {
    id: raw.id,
    prompt: raw.prompt,
    tools: Array.isArray(raw.tools) ? raw.tools.map(str) : [],
    toolMode: str(raw.toolMode) || 'auto',
    // 새로고침으로 끊긴 실행을 계속 "실행 중"으로 보이게 두지 않는다.
    status: interrupted ? 'error' : status,
    answer: str(raw.answer),
    toolCalls,
    routing: raw.routing && typeof raw.routing === 'object' ? { policy: str(raw.routing.policy) } : null,
    metrics: raw.metrics && typeof raw.metrics === 'object' ? raw.metrics : null,
    error: interrupted
      ? { kind: 'client', message: '화면이 닫혀 실행이 중단되었습니다.', retryable: true }
      : raw.error && typeof raw.error === 'object'
        ? { kind: str(raw.error.kind) || 'client', message: str(raw.error.message), status: raw.error.status, retryable: Boolean(raw.error.retryable) }
        : null,
    eventCount: Number.isFinite(raw.eventCount) ? raw.eventCount : 0,
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : 0,
  }
}

export function parseStoredRuns(raw) {
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) return []
  return parsed.map(normalizeRun).filter(Boolean).slice(0, MAX_STORED_RUNS)
}

/** 예전 Playground의 세션(대화) 기록을 Run 목록으로 바꾼다. 사용자 질문과 이어진 답변을 한 Run으로 묶는다. */
export function migrateLegacySessions(sessions) {
  if (!Array.isArray(sessions)) return []
  const runs = []
  for (const session of sessions) {
    const messages = Array.isArray(session?.messages) ? session.messages : []
    for (let i = 0; i < messages.length; i += 1) {
      const user = messages[i]
      if (!user || user.role !== 'user' || typeof user.content !== 'string') continue
      const reply = messages[i + 1]?.role === 'assistant' ? messages[i + 1] : null
      const calls = Array.isArray(reply?.tools) ? reply.tools : []
      const failed = reply?.status === 'error' || reply?.status === 'streaming' || !reply
      const trace = reply?.trace || {}
      runs.push(
        normalizeRun({
          id: `legacy_${session.id || 'session'}_${user.id || i}`,
          prompt: user.content,
          tools: [...new Set(calls.map((c) => c.tool))],
          toolMode: 'legacy',
          status: failed ? 'error' : 'done',
          answer: reply?.content || '',
          toolCalls: calls,
          metrics: trace.totalLatencyMs
            ? {
                totalLatencyMs: positive(trace.totalLatencyMs),
                ttftMs: positive(trace.ttftMs),
                tokensPerSec: positive(trace.tokensPerSec),
                completionTokens: positive(trace.usage?.completionTokens),
              }
            : null,
          error: failed ? { kind: 'client', message: '이전 화면에서 완료되지 않은 기록입니다.', retryable: true } : null,
          eventCount: reply ? 1 : 0,
          createdAt: user.timestamp,
        }),
      )
    }
  }
  return runs.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_STORED_RUNS)
}

export function loadRuns(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw) return parseStoredRuns(raw)
  } catch {
    // 손상된 기록은 무시하고 예전 기록 확인으로 넘어간다.
  }
  try {
    const legacy = storage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) return migrateLegacySessions(JSON.parse(legacy))
  } catch {
    // 이전 기록을 읽지 못해도 콘솔은 빈 목록으로 시작한다.
  }
  return []
}

/** 저장 공간이 부족하면 오래된 기록부터 줄여 가며 저장한다. 저장했으면 true. */
export function saveRuns(storage, runs) {
  let count = Math.min(runs.length, MAX_STORED_RUNS)
  while (count > 0) {
    try {
      storage.setItem(STORAGE_KEY, serializeRuns(runs, count))
      return true
    } catch {
      count = Math.floor(count / 2)
    }
  }
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // 지우기에 실패해도 화면 동작에는 영향이 없다.
  }
  return runs.length === 0
}

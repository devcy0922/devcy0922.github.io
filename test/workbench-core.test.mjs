import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LEGACY_STORAGE_KEY,
  MAX_STORED_RUNS,
  SCENARIOS,
  STORAGE_KEY,
  TOOLS,
  buildRequestBody,
  createRun,
  describeSteps,
  describeToolPlan,
  errorTitle,
  failRun,
  formatDuration,
  loadRuns,
  migrateLegacySessions,
  nextActionHint,
  parseStoredRuns,
  reduceStreamEvent,
  relativeTime,
  resolveTools,
  saveRuns,
  safeHttpUrl,
  searchResultsOf,
  serializeRuns,
  settleRun,
  sourceHost,
  titleFromPrompt,
  toolSummary,
} from '../docs/workbench-core.js'

const NOW = 1_700_000_000_000
const newRun = (prompt = '질문', tools = []) =>
  createRun({ id: 'r1', prompt, plan: { tools, mode: tools.length ? 'manual' : 'none' }, now: NOW })
const feed = (run, events) => events.reduce((acc, [event, data]) => reduceStreamEvent(acc, event, data), run)
const gatewayError = (kind, extra = {}) => Object.assign(new Error(extra.message || kind), { name: 'GatewayError', kind, ...extra })

// ── 도구 결정 ─────────────────────────────────────────────

test('자동 선택은 질문의 단서로 도구를 고르고 어떤 단서였는지 알려 준다', () => {
  assert.deepEqual(resolveTools('최근 장애 사례를 검색해줘'), { tools: ['web_search'], mode: 'auto', signal: '검색' })
  assert.deepEqual(resolveTools('서버 상태 알려줘').tools, ['system_metrics'])
  assert.deepEqual(resolveTools('파이썬 함수 짜줘').tools, ['code_interpreter'])
  assert.deepEqual(resolveTools('TTL 점검').tools, ['cache_inspector'])
})

test('단서가 없으면 도구 없이 진행하고, 직접 지정과 도구 없음은 자동 추정을 무시한다', () => {
  assert.deepEqual(resolveTools('안녕'), { tools: [], mode: 'auto' })
  assert.deepEqual(resolveTools('검색해줘', 'none'), { tools: [], mode: 'none' })
  assert.deepEqual(resolveTools('안녕', 'code_interpreter'), { tools: ['code_interpreter'], mode: 'manual' })
  assert.deepEqual(resolveTools('안녕', 'unknown_tool'), { tools: [], mode: 'auto' })
})

test('도구 계획 문장은 전송될 도구와 일치한다', () => {
  assert.match(describeToolPlan(resolveTools('안녕')), /모델만/)
  assert.match(describeToolPlan(resolveTools('검색해줘')), /"검색".*웹 검색/)
  assert.match(describeToolPlan(resolveTools('x', 'cache_inspector')), /캐시 점검/)
})

test('예시는 존재하는 도구만 명시하고 질문이 비어 있지 않다', () => {
  assert.ok(SCENARIOS.length >= 3)
  for (const scenario of SCENARIOS) {
    assert.ok(scenario.prompt.trim().length > 0, scenario.id)
    for (const tool of scenario.tools) assert.ok(TOOLS[tool], `${scenario.id}: ${tool}`)
  }
  assert.ok(SCENARIOS.some((s) => s.tools.length === 0), '도구 없는 경로 예시가 있어야 한다')
})

test('요청 본문은 선택한 도구만 담는다', () => {
  const run = newRun('질문', ['web_search'])
  assert.deepEqual(buildRequestBody(run), { prompt: '질문', model: 'govail/thinker', tools: ['web_search'], enableThinking: true })
})

// ── 이벤트 → Run ──────────────────────────────────────────

test('정상 스트림은 도구 호출·답변·지표를 가진 완료 Run이 된다', () => {
  const run = feed(newRun('q', ['web_search']), [
    ['routing', { policy: 'governed' }],
    ['tool_call', { tool: 'web_search', callId: 'c1', input: { q: 'x' } }],
    ['tool_result', { tool: 'web_search', callId: 'c1', status: 'success', durationMs: 12, output: { results: [] } }],
    ['token', { delta: '안녕' }],
    ['token', { delta: '하세요', reasoning: '숨김' }],
    ['done', { status: 'ok', totalLatencyMs: 900, ttftMs: 200, tokensPerSec: 31.5, usage: { completionTokens: 40 } }],
  ])
  assert.equal(run.status, 'done')
  assert.equal(run.answer, '안녕하세요')
  assert.equal(run.eventCount, 6)
  assert.deepEqual(run.routing, { policy: 'governed' })
  assert.equal(run.toolCalls.length, 1)
  assert.deepEqual(run.toolCalls[0], { callId: 'c1', tool: 'web_search', input: { q: 'x' }, output: { results: [] }, durationMs: 12, status: 'done', error: undefined })
  assert.deepEqual(run.metrics, { totalLatencyMs: 900, ttftMs: 200, tokensPerSec: 31.5, completionTokens: 40 })
})

test('reasoning 토큰은 답변에 섞이지 않는다', () => {
  const run = feed(newRun(), [['token', { reasoning: '속마음' }], ['token', { delta: '답' }]])
  assert.equal(run.answer, '답')
})

test('도구 결과가 오류면 호출이 실패로 표시되고 사유가 남는다', () => {
  const run = feed(newRun(), [
    ['tool_call', { tool: 'code_interpreter', callId: 'c1', input: {} }],
    ['tool_result', { tool: 'code_interpreter', callId: 'c1', status: 'error', error: '타임아웃' }],
  ])
  assert.equal(run.toolCalls[0].status, 'error')
  assert.equal(run.toolCalls[0].error, '타임아웃')
})

test('호출 이벤트 없이 결과만 와도 증적을 잃지 않고, 같은 callId 호출은 중복되지 않는다', () => {
  const orphan = feed(newRun(), [['tool_result', { tool: 'web_search', callId: 'z', output: { a: 1 } }]])
  assert.equal(orphan.toolCalls.length, 1)
  assert.equal(orphan.toolCalls[0].status, 'done')
  const dup = feed(newRun(), [
    ['tool_call', { tool: 'web_search', callId: 'c1', input: {} }],
    ['tool_call', { tool: 'web_search', callId: 'c1', input: {} }],
  ])
  assert.equal(dup.toolCalls.length, 1)
})

test('callId 없는 결과는 같은 도구의 실행 중 호출에 붙는다', () => {
  const run = feed(newRun(), [
    ['tool_call', { tool: 'web_search', callId: 'c1', input: {} }],
    ['tool_result', { tool: 'web_search', output: { ok: true } }],
  ])
  assert.equal(run.toolCalls.length, 1)
  assert.equal(run.toolCalls[0].status, 'done')
})

test('error 이벤트 뒤의 done은 실패를 성공으로 바꾸지 못한다', () => {
  const run = feed(newRun(), [['error', { message: 'upstream failed' }], ['done', { status: 'ok' }]])
  assert.equal(run.status, 'error')
  assert.equal(run.error.message, 'upstream failed')
})

test('토큰 한도로 잘린 응답은 실패로 표시하되 받은 답변은 보존한다', () => {
  const run = feed(newRun(), [['token', { delta: '부분' }], ['done', { status: 'truncated' }]])
  assert.equal(run.status, 'error')
  assert.equal(run.error.kind, 'truncated')
  assert.equal(run.answer, '부분')
})

test('알 수 없는 이벤트는 상태를 바꾸지 않고 이벤트 수만 센다', () => {
  const run = feed(newRun(), [['heartbeat', {}]])
  assert.equal(run.status, 'running')
  assert.equal(run.eventCount, 1)
})

test('reducer는 입력 Run을 변경하지 않는다', () => {
  const before = newRun()
  const snapshot = JSON.stringify(before)
  feed(before, [['tool_call', { tool: 'web_search', callId: 'c1', input: {} }], ['token', { delta: 'a' }], ['done', {}]])
  assert.equal(JSON.stringify(before), snapshot)
})

// ── 실패 처리 ─────────────────────────────────────────────

test('게이트웨이 오류는 종류·상태 코드·재시도 가능 여부를 보존한다', () => {
  const run = failRun(newRun(), gatewayError('http', { status: 502, retryable: true, message: '게이트웨이가 일시적으로 응답하지 않습니다 (HTTP 502).' }))
  assert.equal(run.status, 'error')
  assert.deepEqual(run.error, { kind: 'http', message: '게이트웨이가 일시적으로 응답하지 않습니다 (HTTP 502).', status: 502, retryable: true })
  assert.equal(errorTitle(run.error), '게이트웨이 오류 (HTTP 502)')
})

test('중단은 실패가 아니라 aborted이며 실행 중이던 호출은 닫힌다', () => {
  const running = feed(newRun(), [['tool_call', { tool: 'web_search', callId: 'c1', input: {} }]])
  const run = failRun(running, gatewayError('aborted'))
  assert.equal(run.status, 'aborted')
  assert.equal(run.error, null)
  assert.equal(run.toolCalls[0].status, 'error')
  assert.match(run.toolCalls[0].error, /중단/)
})

test('화면 코드의 예외는 상세를 노출하지 않는 일반 오류가 된다', () => {
  const run = failRun(newRun(), new RangeError('내부 상세'))
  assert.equal(run.error.kind, 'client')
  assert.equal(run.error.retryable, false)
  assert.ok(!run.error.message.includes('내부 상세'))
})

test('이미 끝난 Run에는 실패 처리를 다시 적용하지 않는다', () => {
  const done = feed(newRun(), [['token', { delta: 'a' }], ['done', {}]])
  assert.equal(failRun(done, gatewayError('network')), done)
})

test('종료 이벤트 없이 닫힌 스트림은 내용이 있을 때만 완료로 마감한다', () => {
  assert.equal(settleRun(feed(newRun(), [['token', { delta: 'a' }]])).status, 'done')
  const empty = settleRun(newRun())
  assert.equal(empty.status, 'error')
  assert.equal(empty.error.kind, 'empty')
})

// ── 단계 표시와 안내 ──────────────────────────────────────

const states = (run) => describeSteps(run).map((s) => s.state)

test('이벤트를 받기 전에는 요청 전송만 진행 중이다', () => {
  assert.deepEqual(states(newRun('q', ['web_search'])), ['active', 'pending', 'pending'])
})

test('도구 실행 중에는 도구 단계가 진행 중이다', () => {
  const run = feed(newRun('q', ['web_search']), [['tool_call', { tool: 'web_search', callId: 'c1', input: {} }]])
  assert.deepEqual(states(run), ['done', 'active', 'pending'])
})

test('완료되면 모두 끝나고, 도구가 없으면 도구 단계는 건너뜀이다', () => {
  const run = feed(newRun(), [['token', { delta: 'a' }], ['done', { totalLatencyMs: 1500 }]])
  assert.deepEqual(states(run), ['done', 'skipped', 'done'])
  assert.equal(describeSteps(run)[2].detail, '1.5초')
})

test('이벤트 없이 실패하면 요청 단계가 실패이고 사유가 보인다', () => {
  const run = failRun(newRun(), gatewayError('network', { message: '연결 실패' }))
  const steps = describeSteps(run)
  assert.deepEqual(steps.map((s) => s.state), ['error', 'skipped', 'error'])
  assert.equal(steps[0].detail, '연결 실패')
  const http = describeSteps(failRun(newRun(), gatewayError('http', { status: 502, message: '긴 안내 문장 (HTTP 502). 잠시 후 다시 시도해 주세요.' })))
  assert.equal(http[0].detail, 'HTTP 502', '전체 문장은 오류 박스에서만 보여 준다')
})

test('다음 행동 안내는 상태마다 다르다', () => {
  assert.match(nextActionHint(null), /예시를 실행/)
  assert.match(nextActionHint(newRun()), /실행 중/)
  const done = feed(newRun(), [['token', { delta: 'a' }], ['done', {}]])
  assert.match(nextActionHint(done), /도구 없이/)
  const withTool = feed(newRun(), [['tool_call', { tool: 'web_search', callId: 'c', input: {} }], ['tool_result', { tool: 'web_search', callId: 'c' }], ['done', {}]])
  assert.match(nextActionHint(withTool), /증적/)
  assert.match(nextActionHint(failRun(newRun(), gatewayError('http', { status: 502, retryable: true }))), /다시 시도/)
  assert.match(nextActionHint(failRun(newRun(), gatewayError('aborted'))), /중단/)
})

// ── 저장과 이전 ───────────────────────────────────────────

test('저장했다 읽으면 같은 Run이 복원된다', () => {
  const run = feed(newRun('q', ['web_search']), [['tool_call', { tool: 'web_search', callId: 'c1', input: { q: 1 } }], ['token', { delta: '답' }], ['done', { totalLatencyMs: 10 }]])
  const [restored] = parseStoredRuns(serializeRuns([run]))
  // JSON은 undefined 값을 저장하지 않으므로 값이 있는 필드끼리 비교한다.
  const defined = (value) => JSON.parse(JSON.stringify(value))
  assert.deepEqual(defined(restored), defined(run))
  assert.equal(restored.status, 'done')
  assert.equal(restored.toolCalls[0].input.q, 1)
})

test('새로고침으로 끊긴 실행은 계속 실행 중으로 복원되지 않는다', () => {
  const running = feed(newRun(), [['tool_call', { tool: 'web_search', callId: 'c1', input: {} }]])
  const [restored] = parseStoredRuns(JSON.stringify([running]))
  assert.equal(restored.status, 'error')
  assert.equal(restored.toolCalls[0].status, 'error')
  assert.equal(restored.error.retryable, true)
})

test('형식이 틀린 항목은 버리고 개수 상한을 지킨다', () => {
  const many = Array.from({ length: MAX_STORED_RUNS + 5 }, (_, i) => ({ ...newRun(`q${i}`), id: `r${i}` }))
  const raw = JSON.stringify([{ nope: true }, null, 'x', ...many])
  assert.equal(parseStoredRuns(raw).length, MAX_STORED_RUNS)
})

test('매우 큰 도구 결과는 미리보기만 저장하고 표시한다', () => {
  const run = feed(newRun(), [['tool_call', { tool: 'code_interpreter', callId: 'c1', input: {} }], ['tool_result', { tool: 'code_interpreter', callId: 'c1', output: { text: 'x'.repeat(60_000) } }]])
  const [restored] = parseStoredRuns(serializeRuns([run]))
  assert.equal(restored.toolCalls[0].output.storedAs, 'truncated')
  assert.ok(restored.toolCalls[0].output.originalChars > 60_000)
})

const legacySessions = [
  {
    id: 's1',
    title: '새 대화',
    createdAt: 1,
    messages: [
      { id: 'u1', role: 'user', content: '검색해줘', timestamp: 100 },
      {
        id: 'a1', role: 'assistant', content: '결과입니다', status: 'done', timestamp: 101,
        tools: [{ tool: 'web_search', callId: 'c1', input: { q: 1 }, output: { results: [] }, durationMs: 5, status: 'done' }],
        trace: { totalLatencyMs: 800, usage: { completionTokens: 12 } },
      },
      { id: 'u2', role: 'user', content: '두 번째', timestamp: 200 },
      { id: 'a2', role: 'assistant', content: '', status: 'streaming', timestamp: 201 },
      { id: 'u3', role: 'user', content: '답 없음', timestamp: 300 },
    ],
  },
]

test('예전 대화 기록은 질문과 답변 쌍마다 Run 하나로 변환된다', () => {
  const runs = migrateLegacySessions(legacySessions)
  assert.deepEqual(runs.map((r) => r.prompt), ['답 없음', '두 번째', '검색해줘'])
  const done = runs.find((r) => r.prompt === '검색해줘')
  assert.equal(done.status, 'done')
  assert.deepEqual(done.tools, ['web_search'])
  assert.equal(done.toolCalls[0].durationMs, 5)
  assert.equal(done.metrics.totalLatencyMs, 800)
  assert.equal(runs.find((r) => r.prompt === '두 번째').status, 'error')
  assert.equal(runs.find((r) => r.prompt === '답 없음').status, 'error')
})

function fakeStorage(initial = {}, { quota = Infinity } = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      if (v.length > quota) throw new Error('QuotaExceededError')
      data[k] = v
    },
    removeItem: (k) => { delete data[k] },
  }
}

test('새 기록이 있으면 그것을 쓰고, 없으면 예전 기록을, 둘 다 깨졌으면 빈 목록으로 시작한다', () => {
  const run = newRun('새 기록')
  assert.equal(loadRuns(fakeStorage({ [STORAGE_KEY]: serializeRuns([run]), [LEGACY_STORAGE_KEY]: JSON.stringify(legacySessions) }))[0].prompt, '새 기록')
  assert.equal(loadRuns(fakeStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify(legacySessions) })).length, 3)
  assert.equal(loadRuns(fakeStorage({ [STORAGE_KEY]: '{깨짐', [LEGACY_STORAGE_KEY]: '{깨짐' })).length, 0)
  assert.deepEqual(loadRuns(fakeStorage()), [])
})

test('저장 공간이 부족하면 오래된 기록부터 줄여서 저장한다', () => {
  const runs = Array.from({ length: 8 }, (_, i) => ({ ...newRun(`질문 ${i}`), id: `r${i}` }))
  const one = serializeRuns(runs, 1).length
  const storage = fakeStorage({}, { quota: one * 3 })
  assert.equal(saveRuns(storage, runs), true)
  const saved = parseStoredRuns(storage.data[STORAGE_KEY])
  assert.ok(saved.length >= 1 && saved.length < 8)
  assert.equal(saved[0].prompt, '질문 0', '가장 최근 기록이 남는다')
})

test('빈 목록을 저장하면 저장 항목을 지운다', () => {
  const storage = fakeStorage({ [STORAGE_KEY]: '[]' })
  assert.equal(saveRuns(storage, []), true)
  assert.equal(STORAGE_KEY in storage.data, false)
})

// ── 표시 형식 ─────────────────────────────────────────────

test('시간·길이·제목 표시 형식', () => {
  assert.equal(relativeTime(NOW, NOW + 20_000), '방금')
  assert.equal(relativeTime(NOW, NOW + 5 * 60_000), '5분 전')
  assert.equal(relativeTime(NOW, NOW + 3 * 3_600_000), '3시간 전')
  assert.equal(relativeTime(NOW, NOW + 50 * 3_600_000), '2일 전')
  assert.equal(formatDuration(850), '850ms')
  assert.equal(formatDuration(1500), '1.5초')
  assert.equal(formatDuration(undefined), '')
  assert.equal(titleFromPrompt('가'.repeat(50)), `${'가'.repeat(40)}…`)
  assert.equal(titleFromPrompt('첫 줄\n둘째 줄'), '첫 줄')
  assert.equal(titleFromPrompt('  '), '(빈 질문)')
})

test('검색 결과 링크는 http(s)만 허용하고 위험한 주소는 버린다', () => {
  assert.equal(safeHttpUrl('https://example.com/a?b=1'), 'https://example.com/a?b=1')
  assert.equal(safeHttpUrl('javascript:alert(1)'), '')
  assert.equal(safeHttpUrl('data:text/html,<script>1</script>'), '')
  assert.equal(safeHttpUrl('not a url'), '')
  const call = {
    output: {
      results: [
        { title: '정상', url: 'https://www.example.com/x', snippet: '요약' },
        { title: '위험', url: 'javascript:alert(1)', snippet: '' },
        { title: 'URL 없음', snippet: '' },
        null,
        { url: 'http://a.test/' },
      ],
    },
  }
  const results = searchResultsOf(call)
  assert.deepEqual(results.map((r) => r.url), ['https://www.example.com/x', 'http://a.test/'])
  assert.equal(results[1].title, '검색 결과')
  assert.deepEqual(searchResultsOf({ output: { text: 'x' } }), [])
  assert.equal(sourceHost('https://www.example.com/x'), 'example.com')
})

test('도구 요약은 실제 호출을 우선하고 없으면 요청한 도구, 둘 다 없으면 도구 없음', () => {
  assert.equal(toolSummary(newRun()), '도구 없음')
  assert.equal(toolSummary(newRun('q', ['web_search'])), '웹 검색')
  const called = feed(newRun('q', ['web_search']), [['tool_call', { tool: 'code_interpreter', callId: 'c', input: {} }]])
  assert.equal(toolSummary(called), '코드 실행')
})

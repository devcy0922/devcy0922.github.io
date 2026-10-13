import test from 'node:test'
import assert from 'node:assert/strict'
import { GatewayError, describeHttpStatus, streamGateway } from '../docs/gateway-client.js'

const enc = new TextEncoder()

function sseResponse(chunks, { status = 200, failAfter } = {}) {
  let i = 0
  const body = new ReadableStream({
    pull(controller) {
      if (failAfter !== undefined && i === failAfter) {
        controller.error(new TypeError('network error'))
        return
      }
      if (i >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(enc.encode(chunks[i++]))
    },
  })
  return new Response(body, { status })
}

const collect = () => {
  const events = []
  return { events, onEvent: (event, data) => events.push([event, data]) }
}

test('event 줄과 data 줄이 다른 청크로 나뉘어도 이벤트 이름이 유지된다', async () => {
  const { events, onEvent } = collect()
  const fetchImpl = async () => sseResponse([
    'event: tool_call\n',
    'data: {"tool":"web_search"}\n\nevent: token\n',
    'data: {"delta":"안녕"}\n\nevent: done\n',
    'data: {}\n\n',
  ])
  const result = await streamGateway({ body: {}, onEvent, fetchImpl })
  assert.deepEqual(events.map(([e]) => e), ['tool_call', 'token', 'done'])
  assert.deepEqual(result, { completed: true, droppedFrames: 0 })
})

test('HTTP 오류는 본문을 읽지 않고 상태 코드를 담은 GatewayError가 된다', async () => {
  const fetchImpl = async () => new Response('<html>Bad gateway</html>', { status: 502 })
  await assert.rejects(
    streamGateway({ body: {}, onEvent() {}, fetchImpl }),
    (err) => err instanceof GatewayError && err.kind === 'http' && err.status === 502 && err.retryable && !err.message.includes('<html>') && err.message.includes('502'),
  )
})

test('401/403/404는 재시도 대상이 아니다', async () => {
  for (const status of [401, 403, 404]) {
    const fetchImpl = async () => new Response('', { status })
    await assert.rejects(
      streamGateway({ body: {}, onEvent() {}, fetchImpl }),
      (err) => err.kind === 'http' && err.status === status && err.retryable === false,
    )
  }
})

test('연결 실패(TypeError)는 network 오류다', async () => {
  const fetchImpl = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(
    streamGateway({ body: {}, onEvent() {}, fetchImpl }),
    (err) => err.kind === 'network' && err.retryable,
  )
})

test('AbortError는 aborted로 분류되고 재시도 대상이 아니다', async () => {
  const fetchImpl = async () => { throw new DOMException('aborted', 'AbortError') }
  await assert.rejects(
    streamGateway({ body: {}, onEvent() {}, fetchImpl }),
    (err) => err.kind === 'aborted' && !err.retryable,
  )
})

test('완료 이벤트 없이 닫힌 스트림은 incomplete 오류다', async () => {
  const { onEvent } = collect()
  const fetchImpl = async () => sseResponse(['event: token\ndata: {"delta":"a"}\n\n'])
  await assert.rejects(
    streamGateway({ body: {}, onEvent, fetchImpl }),
    (err) => err.kind === 'incomplete' && err.retryable,
  )
})

test('requireTerminal=false면 완료 이벤트가 없어도 completed:false로 돌려준다', async () => {
  const fetchImpl = async () => sseResponse(['event: token\ndata: {"delta":"a"}\n\n'])
  const result = await streamGateway({ body: {}, onEvent() {}, fetchImpl, requireTerminal: false })
  assert.equal(result.completed, false)
})

test('스트림 도중 연결이 끊기면 incomplete 오류다', async () => {
  const fetchImpl = async () => sseResponse(['event: token\ndata: {"delta":"a"}\n\n'], { failAfter: 1 })
  await assert.rejects(
    streamGateway({ body: {}, onEvent() {}, fetchImpl }),
    (err) => err.kind === 'incomplete' && err.retryable,
  )
})

test('깨진 JSON 프레임은 건너뛰고 개수를 보고한다', async () => {
  const { events, onEvent } = collect()
  const fetchImpl = async () => sseResponse([
    'event: token\ndata: {broken\n\n',
    'event: token\ndata: {"delta":"ok"}\n\n',
    'event: done\ndata: {}\n\n',
  ])
  const result = await streamGateway({ body: {}, onEvent, fetchImpl })
  assert.deepEqual(events.map(([e]) => e), ['token', 'done'])
  assert.equal(result.droppedFrames, 1)
})

test('error 이벤트와 [DONE]은 종료 이벤트로 인정된다', async () => {
  const a = await streamGateway({
    body: {}, onEvent() {},
    fetchImpl: async () => sseResponse(['event: error\ndata: {"message":"x"}\n\n']),
  })
  const b = await streamGateway({
    body: {}, onEvent() {},
    fetchImpl: async () => sseResponse(['data: [DONE]\n\n']),
  })
  assert.equal(a.completed, true)
  assert.equal(b.completed, true)
})

test('onEvent의 예외는 GatewayError로 감싸지 않고 그대로 전파된다', async () => {
  const fetchImpl = async () => sseResponse(['event: token\ndata: {"delta":"a"}\n\n'])
  await assert.rejects(
    streamGateway({ body: {}, onEvent() { throw new RangeError('화면 코드 버그') }, fetchImpl }),
    (err) => err instanceof RangeError,
  )
})

test('요청 본문은 JSON으로 직렬화되어 POST로 전송된다', async () => {
  let seen
  const fetchImpl = async (url, init) => { seen = { url, init }; return sseResponse(['event: done\ndata: {}\n\n']) }
  await streamGateway({ body: { prompt: 'p' }, onEvent() {}, fetchImpl, url: 'https://example.test/stream' })
  assert.equal(seen.url, 'https://example.test/stream')
  assert.equal(seen.init.method, 'POST')
  assert.equal(seen.init.body, '{"prompt":"p"}')
})

test('상태 코드 문구는 원인을 구분한다', () => {
  assert.match(describeHttpStatus(524), /시간이 초과/)
  assert.match(describeHttpStatus(502), /일시적으로 응답하지 않습니다/)
  assert.match(describeHttpStatus(429), /너무 많습니다/)
  assert.match(describeHttpStatus(403), /거부/)
})

// GoVail Gateway 스트림 호출의 단일 진입점.
// 화면마다 fetch/SSE 파싱/오류 처리를 따로 구현하면 청크 경계 처리와 실패 표시가 서로 달라진다
// (예전 Runner는 이벤트가 유실되었다). 요청·파싱·실패 분류는 여기서만 한다.
import { createEventParser } from './stream-events.js'

export const GATEWAY_STREAM_URL = 'https://api.govail.cloud/v1/model-routing/stream'

// kind: http(상태 코드 응답) · network(연결 실패) · incomplete(완료 이벤트 없이 종료) · aborted(사용자 중단)
export class GatewayError extends Error {
  constructor(kind, message, { status, retryable = false, cause } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'GatewayError'
    this.kind = kind
    this.status = status
    this.retryable = retryable
  }
}

// 응답 본문(HTML 오류 페이지 등)은 화면에 싣지 않고 상태 코드만 사람이 읽을 문장으로 바꾼다.
export function describeHttpStatus(status) {
  if (status === 401 || status === 403) return `게이트웨이가 요청을 거부했습니다 (HTTP ${status}).`
  if (status === 429) return `요청이 너무 많습니다. 잠시 후 다시 시도해 주세요 (HTTP ${status}).`
  if (status === 524 || status === 504 || status === 408) return `게이트웨이 응답 시간이 초과되었습니다 (HTTP ${status}). 잠시 후 다시 시도해 주세요.`
  if (status >= 500) return `게이트웨이가 일시적으로 응답하지 않습니다 (HTTP ${status}). 잠시 후 다시 시도해 주세요.`
  return `게이트웨이 요청이 실패했습니다 (HTTP ${status}).`
}

function isAbort(err) {
  return err instanceof Error && err.name === 'AbortError'
}

/**
 * 게이트웨이에 요청을 보내고 SSE 이벤트를 onEvent(event, data)로 전달한다.
 * - 완료 이벤트(done/error/[DONE]) 없이 스트림이 닫히면 requireTerminal일 때 incomplete 오류다.
 * - 깨진 JSON 프레임은 스트림을 죽이지 않고 건너뛰되, 건너뛴 수를 결과로 돌려준다.
 * - onEvent가 던진 예외는 화면 코드의 문제이므로 GatewayError로 감싸지 않고 그대로 전파한다.
 */
export async function streamGateway({
  body,
  signal,
  onEvent,
  url = GATEWAY_STREAM_URL,
  fetchImpl = globalThis.fetch,
  requireTerminal = true,
}) {
  let response
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (isAbort(err)) throw new GatewayError('aborted', '사용자가 응답 수신을 중단했습니다.', { cause: err })
    // 브라우저는 DNS·TLS 실패, CORS 헤더 없는 게이트웨이 장애 응답(502 등)을 모두 같은 TypeError로 보고한다.
    throw new GatewayError('network', '게이트웨이에 연결하지 못했습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요.', { retryable: true, cause: err })
  }

  if (!response.ok) {
    throw new GatewayError('http', describeHttpStatus(response.status), {
      status: response.status,
      retryable: response.status >= 500 || response.status === 429 || response.status === 408,
    })
  }
  if (!response.body) {
    throw new GatewayError('network', '게이트웨이가 스트림 본문 없이 응답했습니다.', { retryable: true })
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let terminal = false
  let droppedFrames = 0

  const parse = createEventParser((event, raw) => {
    if (raw === '[DONE]') {
      terminal = true
      return
    }
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      droppedFrames += 1
      return
    }
    if (event === 'done' || event === 'error') terminal = true
    onEvent(event, data)
  })

  try {
    while (true) {
      let chunk
      try {
        chunk = await reader.read()
      } catch (err) {
        if (isAbort(err)) throw new GatewayError('aborted', '사용자가 응답 수신을 중단했습니다.', { cause: err })
        throw new GatewayError('incomplete', '응답을 받는 도중 연결이 끊어졌습니다.', { retryable: true, cause: err })
      }
      if (chunk.done) {
        parse(decoder.decode())
        break
      }
      parse(decoder.decode(chunk.value, { stream: true }))
    }
  } finally {
    // 오류로 빠져나올 때 남은 연결을 닫는다. 이미 닫힌 경우의 실패는 무시한다.
    reader.cancel().catch(() => {})
  }

  if (requireTerminal && !terminal) {
    throw new GatewayError('incomplete', '완료 이벤트 없이 응답이 종료되었습니다. 게이트웨이나 중간 프록시의 시간 제한일 수 있습니다.', { retryable: true })
  }
  return { completed: terminal, droppedFrames }
}

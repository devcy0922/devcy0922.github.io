// 네트워크 청크와 SSE 이벤트 경계는 같지 않다.
export function createEventParser(onEvent) {
  let buffer = ''
  let event = 'message'
  let data = []
  return (chunk) => {
    buffer += chunk
    let newline
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).replace(/\r$/, '')
      buffer = buffer.slice(newline + 1)
      if (!line) {
        if (data.length) onEvent(event, data.join('\n'))
        event = 'message'
        data = []
      } else if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
    }
  }
}

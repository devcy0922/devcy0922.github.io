import test from 'node:test'
import assert from 'node:assert/strict'
import { createEventParser } from '../docs/stream-events.js'

test('SSE 청크가 한 글자씩 나뉘어도 이벤트 이름과 데이터가 유지된다', () => {
  const events = []
  const parse = createEventParser((event, data) => events.push([event, JSON.parse(data)]))
  for (const c of 'event: token\r\ndata: {"delta":"응답"}\r\n\r\nevent: done\ndata: {}\n\n') parse(c)
  assert.deepEqual(events, [['token', { delta: '응답' }], ['done', {}]])
})
test('미완료 프레임은 완료된 이벤트로 전달하지 않는다', () => {
  const events = []
  const parse = createEventParser((event, data) => events.push([event, data]))
  parse('event: done\ndata: {}')
  assert.deepEqual(events, [])
})

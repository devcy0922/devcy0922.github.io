import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateEvidence, evaluatePolicy, transitionWork } from '../docs/demo-contracts.js'

test('인증·권한 거부는 모델 호출보다 먼저 적용된다', () => {
  assert.deepEqual(evaluatePolicy({ authorized: false, allowed: true, upstream: 'timeout' }).code, 401)
  assert.equal(evaluatePolicy({ authorized: true, allowed: false, upstream: 'ok' }).invoked, false)
  assert.equal(evaluatePolicy({ authorized: true, allowed: true, upstream: 'timeout' }).code, 504)
})
test('미실행을 성공으로 집계하지 않고 재현된 실패를 우선한다', () => {
  assert.equal(aggregateEvidence([]), 'PARTIAL')
  assert.equal(aggregateEvidence(['PASS', 'NOT_RUN']), 'PARTIAL')
  assert.equal(aggregateEvidence(['FAIL', 'NOT_RUN']), 'FAIL')
  assert.equal(aggregateEvidence(['PASS', 'PASS']), 'PASS')
})
test('승인 전·반려 후 변경과 실행 전 검증을 차단한다', () => {
  assert.equal(transitionWork('READY', 'execute'), 'READY')
  assert.equal(transitionWork('AWAITING_APPROVAL', 'execute'), 'AWAITING_APPROVAL')
  assert.equal(transitionWork('REJECTED', 'execute'), 'REJECTED')
  assert.equal(transitionWork('APPROVED', 'verify'), 'APPROVED')
  let state = 'READY'
  for (const action of ['investigate', 'approve', 'execute', 'verify']) state = transitionWork(state, action)
  assert.equal(state, 'VERIFIED')
  assert.equal(transitionWork('EXECUTED', 'mismatch'), 'FAILED')
})

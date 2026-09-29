// 공개 시나리오용 축약 계약. 원본 서비스의 구현이나 운영 데이터가 아니다.
export function evaluatePolicy({ authorized, allowed, upstream }) {
  if (!authorized) return { status: 'DENIED', code: 401, reason: '인증이 없어 모델 실행 전에 종료했습니다.', invoked: false }
  if (!allowed) return { status: 'DENIED', code: 403, reason: '모델 접근 권한이 없어 실행 전에 종료했습니다.', invoked: false }
  if (upstream === 'timeout') return { status: 'TIMEOUT', code: 504, reason: '모델 호출 시간 초과를 오류로 전달합니다.', invoked: true }
  return { status: 'ALLOWED', code: 200, reason: '정책을 통과한 공개 시나리오 요청입니다.', invoked: true }
}

export function aggregateEvidence(checks) {
  if (checks.some(check => check === 'FAIL')) return 'FAIL'
  if (!checks.length || checks.some(check => check !== 'PASS')) return 'PARTIAL'
  return 'PASS'
}

export function transitionWork(state, action) {
  const transitions = { READY: { investigate: 'AWAITING_APPROVAL' }, AWAITING_APPROVAL: { approve: 'APPROVED', reject: 'REJECTED' }, APPROVED: { execute: 'EXECUTED' }, EXECUTED: { verify: 'VERIFIED', mismatch: 'FAILED' } }
  return transitions[state]?.[action] || state
}

<script setup>
import { computed, ref } from 'vue'
import { aggregateEvidence, evaluatePolicy, transitionWork } from '../../demo-contracts.js'
const authorized = ref(true)
const allowed = ref(true)
const upstream = ref('ok')
const policy = computed(() => evaluatePolicy({ authorized: authorized.value, allowed: allowed.value, upstream: upstream.value }))
const checks = ref(['PASS', 'PASS', 'NOT_RUN'])
const verdict = computed(() => aggregateEvidence(checks.value))
const state = ref('READY')
const events = ref([])
const revision = ref('v1')
const applied = ref('v1')
const controlLog = ref('원본과 적용 버전이 같습니다.')
const labels = { READY: '조사 전', AWAITING_APPROVAL: '승인 대기', APPROVED: '승인됨', REJECTED: '반려됨', EXECUTED: '변경됨 · 확인 대기', VERIFIED: '확인 완료', FAILED: '확인 실패' }
function act(action) {
  const next = transitionWork(state.value, action)
  if (next === state.value) return
  events.value.push(`${state.value} → ${next}`)
  state.value = next
}
function reset() { state.value = 'READY'; events.value = [] }
function sync() { applied.value = revision.value; controlLog.value = `공개 예제 저장소에 ${revision.value} 적용 이벤트를 기록했습니다.` }
</script>

<template>
  <main class="systems-lab">
    <header class="lab-heading"><p class="career-line">AI Systems Playground</p><h1>실행 결과보다 먼저,<br>실행 조건을 확인합니다.</h1><p>입력을 바꾸면 정책, 승인 상태, 검증 결과가 어떻게 달라지는지 직접 확인할 수 있습니다.</p></header>
    <div class="lab-notice"><strong>공개용 시나리오 · 브라우저에서 실행</strong><p>실제 프로젝트의 책임 경계를 축약한 독립 데모입니다. 입력과 판정은 브라우저에서 계산하며 원본 백엔드를 실행하지 않습니다. 운영 데이터·내부 주소·실제 업무 변경은 포함하지 않습니다.</p></div>
    <nav class="lab-nav" aria-label="데모 선택"><a href="#control">규칙 동기화</a><a href="#gateway">모델 접근 정책</a><a href="#approval">업무 승인</a><a href="#verification">실행 증거 판정</a><a href="/live-console">라이브 모델 콘솔</a></nav>

    <section id="control" class="lab-experiment">
      <div><p class="career-line">GoVail Control</p><h2>규칙이 바뀌었을 때</h2><p>선언된 원본과 저장소에 적용된 버전을 비교합니다. 원본 변경과 배포 완료는 서로 다른 상태입니다.</p><a href="/projects/govail-control">설계와 구현 범위</a></div>
      <div class="experiment-controls"><label>원본 규칙 버전<select v-model="revision"><option>v1</option><option>v2</option></select></label><p>공개 예제 저장소의 적용 버전: <code>{{ applied }}</code></p><output aria-live="polite"><strong>{{ revision === applied ? 'IN_SYNC' : 'DRIFT' }}</strong><span>{{ revision === applied ? '원본과 적용 버전이 일치합니다.' : '원본이 변경됐지만 저장소에는 아직 적용되지 않았습니다.' }}</span></output><button @click="sync" :disabled="revision === applied">규칙 동기화</button><p class="lab-detail" aria-live="polite">{{ controlLog }}</p></div>
    </section>

    <section id="gateway" class="lab-experiment">
      <div><p class="career-line">GoVail Gateway</p><h2>모델을 호출해도 되는가</h2><p>인증과 접근 권한을 먼저 확인합니다. 정책 통과 이후 발생한 모델 오류는 성공 응답으로 바꾸지 않습니다.</p><a href="/projects/govail-gateway">설계와 구현 범위</a></div>
      <div class="experiment-controls"><label class="check-control"><input type="checkbox" v-model="authorized">인증 있음</label><label class="check-control"><input type="checkbox" v-model="allowed">요청 모델 접근 허용</label><label>모델 응답 시나리오<select v-model="upstream"><option value="ok">정상 응답</option><option value="timeout">시간 초과</option></select></label><output aria-live="polite"><strong>{{ policy.code }} / {{ policy.status }}</strong><span>{{ policy.reason }}</span></output><p class="lab-detail">시나리오 내 모델 호출: {{ policy.invoked ? '실행 경로에 진입' : '실행 전 차단' }} · 실제 네트워크 요청 없음</p></div>
    </section>

    <section id="approval" class="lab-experiment">
      <div><p class="career-line">Works Daily Agents</p><h2>조사와 변경 사이에 승인</h2><p>가상의 문의를 조사하고 담당자 변경을 제안합니다. 승인 후에만 변경할 수 있고, 다시 읽은 결과가 다르면 실패로 남깁니다.</p><a href="/projects/works-daily-agents">설계와 구현 범위</a></div>
      <div class="experiment-controls"><output aria-live="polite"><strong>{{ state }}</strong><span>{{ labels[state] }} · 예제 문의 담당자: {{ ['EXECUTED', 'VERIFIED', 'FAILED'].includes(state) ? '담당자 B (시뮬레이션)' : '담당자 A (시뮬레이션)' }}</span></output><div class="experiment-actions"><button @click="act('investigate')" :disabled="state !== 'READY'">조사하기</button><button @click="act('approve')" :disabled="state !== 'AWAITING_APPROVAL'">승인</button><button @click="act('reject')" :disabled="state !== 'AWAITING_APPROVAL'">반려</button><button @click="act('execute')" :disabled="state !== 'APPROVED'">변경 실행</button><button @click="act('verify')" :disabled="state !== 'EXECUTED'">재조회 일치</button><button @click="act('mismatch')" :disabled="state !== 'EXECUTED'">재조회 불일치</button><button @click="reset">초기화</button></div><ol class="event-list" aria-live="polite"><li v-for="(event, index) in events" :key="index">{{ event }}</li></ol><p class="lab-detail">외부 서비스는 변경하지 않습니다. 새로고침하면 상태가 초기화됩니다.</p></div>
    </section>

    <section id="verification" class="lab-experiment">
      <div><p class="career-line">PinchQ</p><h2>실행하지 않은 검사는 성공이 아니다</h2><p>아래 결과를 바꿔 집계 규칙을 확인하세요. 실패가 있으면 FAIL, 미실행이 남으면 PARTIAL, 모두 통과한 경우에만 PASS입니다.</p><a href="/projects/pinchq">설계와 구현 범위</a></div>
      <div class="experiment-controls"><label v-for="(name, index) in ['명령 실행', 'HTTP 응답', '브라우저 흐름']" :key="name">{{ name }}<select v-model="checks[index]"><option>PASS</option><option>FAIL</option><option value="NOT_RUN">미실행</option></select></label><output aria-live="polite"><strong>{{ verdict }}</strong><span>입력한 예제 증거의 집계 결과입니다. 실제 명령·HTTP·브라우저 검사를 수행한 결과가 아닙니다.</span></output></div>
    </section>
    <section class="demo-invitation"><div><h2>실제 모델 응답도 확인할 수 있습니다.</h2><p>별도 라이브 콘솔에서 요청을 전송하면 공개 relay를 통해 모델 응답을 받습니다. 서비스 제한이나 장애는 오류로 표시합니다.</p></div><a class="action-primary" href="/live-console">라이브 콘솔 열기</a></section>
  </main>
</template>

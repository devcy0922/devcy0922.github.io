<script setup>
import { nextTick, ref } from 'vue'

// 수집 대상은 누구나 접근할 수 있는 공개 채널로 한정한다. 상태는 실제 진행 상황과 같아야 한다.
const SOURCES = [
  { name: '회사 홈페이지 제품·솔루션 소개', how: '주 1회 크롤링, robots.txt 준수', state: '수집 전' },
  { name: '보도자료와 뉴스', how: '신규 글 감지 시 수집', state: '수집 전' },
  { name: 'DART 사업·분기보고서', how: 'OpenDART 공시 목록 API, 공시일 기준 버전 보관', state: '수집 전' },
  { name: 'IR 발표 자료(공개분)', how: '게시 시 수동 등록, 원본 PDF 해시 보관', state: '수집 전' },
  { name: '공개 기술 문서·백서', how: '공개 다운로드분만, 문서별 출처 URL 유지', state: '수집 전' },
]

// 공개자료로 답하면 안 되는 질문은 검색 전에 돌려보낸다.
const GUARDS = [
  { re: /연봉|급여|성과급|인사|평가|퇴사/, why: '인사·보상 정보는 공개자료 범위 밖입니다.' },
  { re: /고객사\s*(명단|목록|리스트)|어느\s*고객|계약\s*금액/, why: '공시되지 않은 고객·계약 정보는 다루지 않습니다.' },
  { re: /주가|목표가|매수|매도|오를까|떨어질까/, why: '투자 판단이나 주가 전망은 답하지 않습니다.' },
  { re: /내부|사내|비공개|소스\s*코드|취약점\s*(상세|PoC)/, why: '내부·비공개 정보는 수집 대상이 아닙니다.' },
]

const SUGGEST = ['어떤 제품을 만드는 회사인가요?', '최근 사업보고서의 매출 구성은?', 'NAC와 ZTNA는 어떻게 다른가요?', '내년 주가 오를까요?']

const STEPS = [
  { key: 'guard', label: '질문 범위 확인', detail: '공개자료로 답할 수 있는 질문인지 규칙으로 먼저 거릅니다.' },
  { key: 'scope', label: '검색 범위 고정', detail: 'project_id = genians-public 범위 밖 문서는 검색하지 않습니다.' },
  { key: 'search', label: '문서 검색', detail: '하이브리드 검색(BM25 + 벡터) 상위 8개.' },
  { key: 'cite', label: '근거 확인', detail: '답변 문장마다 출처 조각을 붙이고, 출처 없는 문장은 지웁니다.' },
  { key: 'answer', label: '답변', detail: 'GoVail Gateway의 govail/worker로 생성합니다.' },
]

// 처음 열었을 때 빈 화면 대신, 예시 질문 하나가 끝까지 처리된 모습을 보여준다(애니메이션 없음).
function settled(question) {
  const hit = GUARDS.find((g) => g.re.test(question))
  const steps = STEPS.map((s) => ({ ...s, state: 'idle', note: '' }))
  if (hit) {
    Object.assign(steps[0], { state: 'stop', note: hit.why })
    return { question, steps, kind: 'refused', answer: `${hit.why} 회사 공개자료(홈페이지, 공시, 보도자료)로 확인할 수 있는 질문을 해 주세요.` }
  }
  Object.assign(steps[0], { state: 'ok', note: '공개자료 범위의 질문' })
  Object.assign(steps[1], { state: 'ok', note: 'genians-public' })
  Object.assign(steps[2], { state: 'stop', note: '색인된 문서 0건' })
  return { question, steps, kind: 'empty', answer: '아직 공개자료 색인을 만들기 전이라 근거가 없습니다. 근거 없이는 답하지 않도록 설계했기 때문에 여기서 멈춥니다.' }
}

const q = ref('')
const log = ref([settled('최근 사업보고서의 매출 구성은?')])
const busy = ref(false)
const scroller = ref(null)

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function ask(text) {
  const question = (text ?? q.value).trim()
  if (!question || busy.value) return
  q.value = ''
  busy.value = true
  const turn = { question, steps: STEPS.map((s) => ({ ...s, state: 'idle', note: '' })), answer: '', kind: '' }
  log.value.push(turn)
  const t = log.value[log.value.length - 1]
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })

  const step = async (i, state, note, ms = 380) => {
    t.steps[i].state = 'run'
    await wait(ms)
    t.steps[i].state = state
    t.steps[i].note = note
  }

  const hit = GUARDS.find((g) => g.re.test(question))
  if (hit) {
    await step(0, 'stop', hit.why)
    t.kind = 'refused'
    t.answer = `${hit.why} 회사 공개자료(홈페이지, 공시, 보도자료)로 확인할 수 있는 질문을 해 주세요.`
  } else {
    await step(0, 'ok', '공개자료 범위의 질문')
    await step(1, 'ok', 'genians-public')
    await step(2, 'stop', '색인된 문서 0건', 520)
    t.kind = 'empty'
    t.answer = '아직 공개자료 색인을 만들기 전이라 근거가 없습니다. 근거 없이는 답하지 않도록 설계했기 때문에 여기서 멈춥니다.'
  }
  busy.value = false
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })
}
</script>

<template>
  <div class="proto proto--wide" id="chat">
    <div class="proto__bar">
      <strong>지니언스 공개자료 챗봇</strong>
      <span>화면과 질문 거르기 규칙은 동작합니다. 문서 색인 전이라 답변은 항상 "근거 없음"으로 끝납니다.</span>
    </div>
    <div class="layout">
      <section class="chat" aria-label="대화">
        <div ref="scroller" class="chat__log">
          <p v-if="!log.length" class="chat__empty">질문을 고르거나 직접 입력해 보세요. 답변 대신 질문이 어떤 단계를 거치는지 보여줍니다.</p>
          <article v-for="(t, i) in log" :key="i" class="turn">
            <p class="turn__q">{{ t.question }}</p>
            <ol class="trace">
              <li v-for="s in t.steps" :key="s.key" :class="`s-${s.state}`">
                <span class="trace__label">{{ s.label }}</span>
                <span class="trace__note">{{ s.note || (s.state === 'idle' ? '' : '…') }}</span>
              </li>
            </ol>
            <p v-if="t.answer" :class="['turn__a', `turn__a--${t.kind}`]">{{ t.answer }}</p>
          </article>
        </div>
        <div class="suggest">
          <button v-for="s in SUGGEST" :key="s" type="button" class="btn" :disabled="busy" @click="ask(s)">{{ s }}</button>
        </div>
        <form class="chat__form" @submit.prevent="ask()">
          <input v-model="q" class="field" placeholder="공개자료로 확인할 수 있는 질문" aria-label="질문" />
          <button type="submit" class="btn btn--primary" :disabled="busy || !q.trim()">보내기</button>
        </form>
      </section>

      <aside class="side" aria-label="처리 단계와 출처">
        <h4>질문이 거치는 단계</h4>
        <ol class="steps">
          <li v-for="s in STEPS" :key="s.key"><b>{{ s.label }}</b><span>{{ s.detail }}</span></li>
        </ol>
        <h4>출처 레지스트리</h4>
        <ul class="sources">
          <li v-for="s in SOURCES" :key="s.name"><b>{{ s.name }}</b><span>{{ s.how }}</span><em>{{ s.state }}</em></li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(260px, 1fr); }
.chat { display: flex; flex-direction: column; min-height: 520px; border-right: 1px solid var(--mist); }
.chat__log { flex: 1; max-height: 440px; padding: 20px; overflow-y: auto; }
.chat__empty { margin: 0 !important; color: var(--slate); }
.turn + .turn { margin-top: 22px; padding-top: 18px; border-top: 1px dashed var(--mist-strong); }
.turn__q { margin: 0 0 0 auto !important; width: fit-content; max-width: 80%; padding: 8px 14px; border-radius: 14px 14px 4px 14px; background: var(--ink); color: #fff; }
.trace { margin: 12px 0 0; padding: 0; list-style: none; }
.trace li { display: grid; grid-template-columns: 14px 120px 1fr; gap: 8px; align-items: baseline; margin: 0 !important; padding: 3px 0; font-size: 13px !important; color: var(--slate); }
.trace li::before { width: 8px; height: 8px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px var(--mist-strong); content: ""; align-self: center; }
.trace .s-run::before { background: var(--marker); box-shadow: none; }
.trace .s-ok::before { background: var(--live); box-shadow: none; }
.trace .s-stop::before { background: #c53030; box-shadow: none; }
.trace .s-ok .trace__label, .trace .s-stop .trace__label, .trace .s-run .trace__label { color: var(--ink); font-weight: 600; }
.turn__a { margin: 12px 0 0 !important; padding: 12px 14px; border-radius: 4px 14px 14px 14px; background: var(--wash); color: var(--ink); }
.turn__a--refused { background: #fff3f3; }
.suggest { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 20px 12px; }
.suggest .btn { min-height: 32px; font-size: 13px; font-weight: 500; }
.chat__form { display: flex; gap: 8px; padding: 12px 20px 20px; border-top: 1px solid var(--mist); }
.chat__form .field { padding: 8px 12px; }
.side { padding: 20px; background: var(--wash); }
.side h4 { margin: 0 0 10px !important; color: var(--ink); font-size: 14px; }
.side h4 + ol, .side h4 + ul { margin-bottom: 24px; }
.steps, .sources { margin: 0; padding: 0; list-style: none; }
.steps li, .sources li { margin: 0 !important; padding: 8px 0; border-bottom: 1px solid var(--mist-strong); font-size: 13px !important; line-height: 1.55 !important; }
.steps b, .sources b { display: block; color: var(--ink); font-size: 14px; }
.steps span, .sources span { display: block; color: var(--slate); }
.sources em { display: inline-block; margin-top: 4px; padding: 0 6px; border-radius: 4px; box-shadow: inset 0 0 0 1px var(--design); color: var(--slate); font-size: 12px; font-style: normal; }
@media (max-width: 860px) { .layout { grid-template-columns: 1fr; } .chat { border-right: 0; border-bottom: 1px solid var(--mist); } }
</style>

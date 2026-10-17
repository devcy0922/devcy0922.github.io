<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const START = 6 * 60 // 06:00
const SLOT = 10 // 분
const SLOTS = 18 * 6 // 06:00 ~ 24:00

const hhmm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
const slotMin = (i) => START + i * SLOT

function build(spans) {
  const day = Array(SLOTS).fill('sit')
  for (const [from, to, kind] of spans) {
    const a = Math.max(0, Math.round((from - START) / SLOT))
    const b = Math.min(SLOTS, Math.round((to - START) / SLOT))
    for (let i = a; i < b; i++) day[i] = kind
  }
  return day
}
const t = (h, m = 0) => h * 60 + m

const PRESETS = {
  office: {
    label: '사무실 근무일',
    day: () => build([[t(6), t(7), 'rest'], [t(8), t(8, 30), 'walk'], [t(10, 20), t(10, 30), 'walk'], [t(12), t(12, 40), 'walk'], [t(15, 10), t(15, 20), 'walk'], [t(18), t(18, 40), 'walk'], [t(21, 30), t(21, 40), 'walk'], [t(23), t(24), 'rest']]),
  },
  remote: {
    label: '재택 근무일',
    day: () => build([[t(6), t(8), 'rest'], [t(9, 50), t(10), 'walk'], [t(11, 40), t(11, 50), 'walk'], [t(13), t(13, 20), 'walk'], [t(16, 30), t(16, 40), 'walk'], [t(20), t(20, 50), 'walk'], [t(23, 30), t(24), 'rest']]),
  },
}

// 지난 2주 흡연 기록에서 뽑은 시간대별 빈도(예시). 0~1
const RISK = { 8: 0.6, 10: 0.9, 12: 0.7, 13: 0.8, 15: 0.9, 18: 0.7, 21: 0.8 }
const risk = (min) => RISK[Math.floor(min / 60)] ?? 0.1

const preset = ref('office')
const day = ref(PRESETS.office.day())
const minSit = ref(60)
const cooldown = ref(60)
const riskOnly = ref(true)
const picked = ref(null)

function usePreset(key) {
  preset.value = key
  day.value = PRESETS[key].day()
  picked.value = null
}
function toggle(i) {
  const next = { sit: 'walk', walk: 'rest', rest: 'sit' }
  day.value[i] = next[day.value[i]]
  day.value = [...day.value]
  preset.value = ''
}

const evaluation = computed(() => {
  const nudges = []
  const skipped = []
  let last = -Infinity
  for (let i = 1; i < SLOTS; i++) {
    if (day.value[i] !== 'walk' || day.value[i - 1] !== 'sit') continue
    let run = 0
    for (let k = i - 1; k >= 0 && day.value[k] === 'sit'; k--) run++
    const at = slotMin(i)
    const sat = run * SLOT
    const r = risk(at)
    const reasons = []
    if (sat < minSit.value) reasons.push(`앉아 있던 시간 ${sat}분 < ${minSit.value}분`)
    if (at - last < cooldown.value) reasons.push(`직전 알림 후 ${at - last}분`)
    if (riskOnly.value && r < 0.5) reasons.push('평소 흡연이 드문 시간대')
    if (reasons.length) skipped.push({ i, at, sat, reasons })
    else {
      nudges.push({ i, at, sat, r })
      last = at
    }
  }
  return { nudges, skipped }
})

// 금연 타이머: 시작 시각은 이 브라우저에만 저장한다.
const KEY = 'quit-nudge:start'
const startedAt = ref(null)
const now = ref(Date.now())
const perDay = ref(15)
let timer
onMounted(() => {
  try {
    const saved = localStorage.getItem(KEY)
    startedAt.value = saved ? Number(saved) : Date.now() - (3 * 24 + 4) * 3600e3
  } catch {
    startedAt.value = Date.now() - (3 * 24 + 4) * 3600e3
  }
  timer = setInterval(() => (now.value = Date.now()), 30e3)
})
onBeforeUnmount(() => clearInterval(timer))
function restart() {
  startedAt.value = Date.now()
  try {
    localStorage.setItem(KEY, String(startedAt.value))
  } catch {}
}
const elapsed = computed(() => {
  if (!startedAt.value) return null
  const ms = Math.max(0, now.value - startedAt.value)
  const d = Math.floor(ms / 86400e3)
  const h = Math.floor((ms % 86400e3) / 3600e3)
  const m = Math.floor((ms % 3600e3) / 60e3)
  const cigs = Math.floor((ms / 86400e3) * perDay.value)
  return { d, h, m, cigs, won: Math.round((cigs / 20) * 4500) }
})
const elapsedLabel = computed(() => (elapsed.value ? `${elapsed.value.d}일 ${elapsed.value.h}시간` : ''))

const active = computed(() => evaluation.value.nudges.find((n) => n.i === picked.value) ?? evaluation.value.nudges[0])
const message = computed(() => {
  const n = active.value
  if (!n) return null
  const h = Math.floor(n.sat / 60)
  const m = n.sat % 60
  const sat = h ? `${h}시간${m ? ` ${m}분` : ''}` : `${m}분`
  return { time: hhmm(n.at), body: `${sat} 앉아 있다가 걷기 시작했어요. 혹시 담배 피우러 가세요?`, foot: `참으면 금연 ${elapsedLabel.value}째예요.` }
})
</script>

<template>
  <div class="proto proto--wide" id="simulator">
    <div class="proto__bar">
      <strong>넛지 규칙 시뮬레이터</strong>
      <span>하루의 움직임을 칸 단위로 바꿔 보면서 알림이 어느 순간에 뜨는지 확인합니다. 칸 하나는 10분입니다.</span>
    </div>
    <div class="proto__body">
      <div class="top">
        <div class="presets" role="group" aria-label="하루 패턴">
          <button v-for="(p, k) in PRESETS" :key="k" type="button" class="btn" :aria-pressed="preset === k" @click="usePreset(k)">{{ p.label }}</button>
        </div>
        <div class="legend"><i class="c-sit" />앉음 <i class="c-walk" />걷기 <i class="c-rest" />휴식·수면 <i class="c-nudge" />알림</div>
      </div>

      <div class="timeline" role="grid" aria-label="하루 활동 타임라인">
        <div class="cells">
          <button
            v-for="(s, i) in day"
            :key="i"
            type="button"
            :class="['cell', `c-${s}`, { nudge: evaluation.nudges.some((n) => n.i === i) }]"
            :title="`${hhmm(slotMin(i))} ${({ sit: '앉음', walk: '걷기', rest: '휴식' })[s]} (눌러서 바꾸기)`"
            :aria-label="`${hhmm(slotMin(i))} ${({ sit: '앉음', walk: '걷기', rest: '휴식' })[s]}`"
            @click="toggle(i)"
          />
        </div>
        <div class="hours" aria-hidden="true"><span v-for="h in [6, 9, 12, 15, 18, 21]" :key="h" :style="{ left: `${((h * 60 - START) / (SLOTS * SLOT)) * 100}%` }">{{ h }}시</span></div>
      </div>

      <div class="rules">
        <label>앉아 있던 시간이 <input v-model.number="minSit" type="number" min="10" max="240" step="10" /> 분 이상일 때만</label>
        <label>직전 알림 뒤 <input v-model.number="cooldown" type="number" min="10" max="240" step="10" /> 분은 쉬기</label>
        <label class="check"><input v-model="riskOnly" type="checkbox" /> 평소 담배를 피우던 시간대에만</label>
      </div>

      <div class="result">
        <section>
          <h4>알림 {{ evaluation.nudges.length }}번</h4>
          <ul class="nudges">
            <li v-for="n in evaluation.nudges" :key="n.i">
              <button type="button" :aria-pressed="active && active.i === n.i" @click="picked = n.i">
                <b>{{ hhmm(n.at) }}</b> {{ n.sat }}분 앉아 있다가 걷기 시작
              </button>
            </li>
          </ul>
          <h4 class="skip-title">보내지 않은 순간 {{ evaluation.skipped.length }}번</h4>
          <ul class="skipped">
            <li v-for="s in evaluation.skipped" :key="s.i"><b>{{ hhmm(s.at) }}</b> {{ s.reasons.join(', ') }}</li>
          </ul>
        </section>

        <div class="phone" aria-label="알림 미리보기">
          <div class="phone__screen">
            <p class="phone__clock">{{ message ? message.time : '--:--' }}</p>
            <div v-if="message" class="notif">
              <p class="notif__app">금연 타이머 <span>지금</span></p>
              <p class="notif__body">{{ message.body }}</p>
              <p class="notif__foot">{{ message.foot }}</p>
              <div class="notif__actions"><span>참았어요</span><span>피웠어요</span></div>
            </div>
            <p v-else class="notif__none">이 규칙으로는 알림이 뜨지 않습니다.</p>
          </div>
        </div>
      </div>

      <div v-if="elapsed" class="timer">
        <div><span>금연한 지</span><b>{{ elapsed.d }}일 {{ elapsed.h }}시간 {{ elapsed.m }}분</b></div>
        <div><span>피우지 않은 담배</span><b>{{ elapsed.cigs.toLocaleString('ko-KR') }}개비</b></div>
        <div><span>아낀 돈 (한 갑 4,500원)</span><b>{{ elapsed.won.toLocaleString('ko-KR') }}원</b></div>
        <label>하루 <input v-model.number="perDay" type="number" min="1" max="60" /> 개비 피웠음</label>
        <button type="button" class="btn" @click="restart">지금부터 다시 시작</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.presets { display: flex; gap: 6px; }
.presets .btn[aria-pressed="true"] { border-color: var(--ink); background: var(--ink); color: #fff; }
.legend { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; color: var(--slate); font-size: 13px; }
.legend i { display: inline-block; width: 12px; height: 12px; margin-right: -6px; border-radius: 3px; vertical-align: -2px; }
.c-sit { background: #d9dce2; }
.c-walk { background: #16a34a; }
.c-rest { background: #f1f2f4; }
.c-nudge { background: var(--marker); box-shadow: inset 0 0 0 2px #e0b800; }
.timeline { position: relative; margin-top: 16px; padding-bottom: 22px; overflow-x: auto; }
.cells { display: grid; grid-template-columns: repeat(108, minmax(6px, 1fr)); gap: 2px; min-width: 760px; }
.cell { height: 40px; padding: 0; border-radius: 3px; cursor: pointer; }
.cell:hover { outline: 2px solid var(--ink); outline-offset: 0; }
.cell.nudge { background: var(--marker); box-shadow: inset 0 0 0 2px #e0b800; }
.hours { position: relative; min-width: 760px; height: 18px; margin-top: 4px; }
.hours span { position: absolute; color: var(--slate); font-size: 12px; transform: translateX(-2px); }
.rules { display: flex; flex-wrap: wrap; gap: 10px 24px; margin-top: 4px; padding: 14px 0; border-top: 1px solid var(--mist); border-bottom: 1px solid var(--mist); color: var(--ink-soft); font-size: 14px; }
.rules input[type="number"], .timer input { width: 64px; height: 30px; margin: 0 4px; padding: 0 8px; border: 1px solid var(--mist-strong); border-radius: 6px; font: inherit; text-align: right; }
.check { display: inline-flex; align-items: center; gap: 8px; }
.check input { width: 16px; height: 16px; accent-color: var(--ink); }
.result { display: grid; grid-template-columns: 1fr 280px; gap: 32px; margin-top: 18px; }
h4 { margin: 0 0 8px !important; color: var(--ink); font-size: 15px; }
.skip-title { margin-top: 18px !important; color: var(--slate) !important; }
.nudges, .skipped { margin: 0; padding: 0; list-style: none; }
.nudges li, .skipped li { margin: 0 !important; }
.nudges button { display: block; width: 100%; padding: 8px 10px; border-radius: 8px; color: var(--ink-soft); font-size: 14px; text-align: left; cursor: pointer; }
.nudges button:hover { background: var(--wash); }
.nudges button[aria-pressed="true"] { background: var(--marker-soft); color: var(--ink); }
.nudges b, .skipped b { margin-right: 8px; color: var(--ink); font-variant-numeric: tabular-nums; }
.skipped li { padding: 4px 10px; color: var(--slate); font-size: 13px !important; }
.phone { padding: 10px; border-radius: 30px; background: #16181d; }
.phone__screen { min-height: 360px; padding: 26px 12px; border-radius: 22px; background: linear-gradient(#dfe6ee, #c9d3de); }
.phone__clock { margin: 0 0 18px !important; color: #fff; font-size: 44px !important; font-weight: 300; text-align: center; text-shadow: 0 1px 6px rgb(0 0 0 / 0.18); font-variant-numeric: tabular-nums; }
.notif { padding: 12px 14px; border-radius: 16px; background: rgb(255 255 255 / 0.9); }
.notif p { margin: 0 !important; }
.notif__app { color: var(--slate); font-size: 12px !important; font-weight: 600; }
.notif__app span { float: right; font-weight: 400; }
.notif__body { margin-top: 4px !important; color: var(--ink); font-size: 14px !important; font-weight: 600; line-height: 1.5 !important; }
.notif__foot { margin-top: 2px !important; color: var(--ink-soft); font-size: 13px !important; }
.notif__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px; }
.notif__actions span { padding: 6px; border-radius: 8px; background: #eef0f3; color: var(--ink); font-size: 13px; font-weight: 600; text-align: center; }
.notif__none { color: #3d424d; font-size: 13px !important; text-align: center; }
.timer { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px 32px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--mist); }
.timer div span { display: block; color: var(--slate); font-size: 13px; }
.timer div b { color: var(--ink); font-size: 22px; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.timer label { color: var(--ink-soft); font-size: 14px; }
@media (max-width: 860px) { .result { grid-template-columns: 1fr; } .phone { max-width: 300px; } }
</style>

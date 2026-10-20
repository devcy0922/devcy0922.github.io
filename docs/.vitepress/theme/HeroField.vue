<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

// 히어로 배경. 모눈종이처럼 깔린 점 격자가 포인터 주변에서 먹색으로 짙어지며 밀려나고,
// 지나간 자리에 형광펜 자국이 잠깐 남는다. 포인터가 없으면 느린 물결이 격자를 훑는다.
// 외부 라이브러리 없이 Canvas 2D로 그린다. 포인터 좌표는 그리기에만 쓰고 저장하거나 보내지 않는다.
const canvas = ref(null)
let teardown = () => {}

const DOT = [204, 209, 217] // 쉴 때 점 색(Rule보다 한 단계 짙게)
const INK = [22, 24, 29] // --ink
const MARKER = '#ffe45e' // --marker
const REACH = 150 // 포인터가 영향을 주는 반경(px)
const PUSH = 9 // 점이 밀려나는 최대 거리(px)
const TRAIL_MS = 520 // 형광펜 자국이 남는 시간
const TRAIL_WIDTH = 18
const IDLE_MS = 1600 // 포인터가 멈춘 뒤 물결로 돌아가는 시간
const LEVELS = 6 // 색 단계. 단계별로 경로를 묶어 그리기 호출을 줄인다

const mix = (a, b, k) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(' ')})`
const COLORS = Array.from({ length: LEVELS + 1 }, (_, i) => mix(DOT, INK, i / LEVELS))
const smooth = (k) => k * k * (3 - 2 * k)

onMounted(() => {
  const el = canvas.value
  const ctx = el?.getContext('2d')
  if (!ctx) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  let w = 0
  let h = 0
  let dots = new Float32Array(0)
  let pointer = null // { x, y, t } 캔버스 좌표
  const trail = [] // { x, y, t }
  let raf = 0
  let inView = true

  function layout() {
    const rect = el.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = rect.width
    h = rect.height
    el.width = Math.round(w * dpr)
    el.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const gap = w < 640 ? 22 : 28
    const ox = (w % gap) / 2
    const oy = (h % gap) / 2
    const list = []
    for (let y = oy; y <= h; y += gap) for (let x = ox; x <= w; x += gap) list.push(x, y)
    dots = Float32Array.from(list)
    draw(performance.now())
  }

  function drawTrail(now) {
    while (trail.length && now - trail[0].t > TRAIL_MS) trail.shift()
    if (trail.length < 2) return
    // 투명도를 겹치면 이음매가 진해지므로 불투명한 노랑을 쓰고, 오래된 구간일수록 가늘게 그린다.
    ctx.strokeStyle = MARKER
    ctx.lineCap = 'round'
    for (let i = 1; i < trail.length; i++) {
      const life = 1 - (now - trail[i].t) / TRAIL_MS
      if (life <= 0) continue
      ctx.lineWidth = TRAIL_WIDTH * smooth(life)
      ctx.beginPath()
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y)
      ctx.lineTo(trail[i].x, trail[i].y)
      ctx.stroke()
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h)
    if (!reduced.matches) drawTrail(now)

    const active = pointer && now - pointer.t < IDLE_MS && !reduced.matches
    // 물결: 왼쪽 위에서 오른쪽 아래로 지나가는 띠. 포인터가 쉬는 동안에만 보인다.
    const span = w + h * 0.6
    const band = reduced.matches || active ? null : (((now * 0.00005) % 1.3) - 0.15) * span

    const buckets = Array.from({ length: LEVELS + 1 }, () => [])
    for (let i = 0; i < dots.length; i += 2) {
      let x = dots[i]
      let y = dots[i + 1]
      let k = 0
      if (active) {
        const dx = x - pointer.x
        const dy = y - pointer.y
        const d = Math.hypot(dx, dy)
        if (d < REACH) {
          k = smooth(1 - d / REACH)
          const push = (k * PUSH) / (d || 1)
          x += dx * push
          y += dy * push
        }
      } else if (band !== null) {
        const d = Math.abs(x + y * 0.6 - band)
        if (d < 140) k = smooth(1 - d / 140) * 0.45
      }
      buckets[Math.round(k * LEVELS)].push(x, y, 1.1 + k * 1.5)
    }

    for (let level = 0; level <= LEVELS; level++) {
      const b = buckets[level]
      if (!b.length) continue
      ctx.fillStyle = COLORS[level]
      ctx.beginPath()
      for (let i = 0; i < b.length; i += 3) {
        ctx.moveTo(b[i] + b[i + 2], b[i + 1])
        ctx.arc(b[i], b[i + 1], b[i + 2], 0, Math.PI * 2)
      }
      ctx.fill()
    }
  }

  function frame(now) {
    draw(now)
    raf = inView && !document.hidden && !reduced.matches ? requestAnimationFrame(frame) : 0
  }
  function start() {
    if (!raf && inView && !document.hidden && !reduced.matches) raf = requestAnimationFrame(frame)
  }
  function stop() {
    cancelAnimationFrame(raf)
    raf = 0
  }

  function onPointer(e) {
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      pointer = null
      return
    }
    const t = performance.now()
    const last = trail[trail.length - 1]
    if (!last || Math.hypot(x - last.x, y - last.y) > 2) trail.push({ x, y, t })
    pointer = { x, y, t }
  }
  const onLeave = () => (pointer = null)
  const onVisibility = () => (document.hidden ? stop() : start())
  const onMotionChange = () => (reduced.matches ? (stop(), draw(performance.now())) : start())

  const resize = new ResizeObserver(layout)
  resize.observe(el)
  const seen = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting
    inView ? start() : stop()
  })
  seen.observe(el)
  window.addEventListener('pointermove', onPointer, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
  document.addEventListener('visibilitychange', onVisibility)
  reduced.addEventListener('change', onMotionChange)

  layout()
  start()

  teardown = () => {
    stop()
    resize.disconnect()
    seen.disconnect()
    window.removeEventListener('pointermove', onPointer)
    document.documentElement.removeEventListener('pointerleave', onLeave)
    document.removeEventListener('visibilitychange', onVisibility)
    reduced.removeEventListener('change', onMotionChange)
  }
})

onBeforeUnmount(() => teardown())
</script>

<template>
  <canvas ref="canvas" class="hero-field" aria-hidden="true" />
</template>

<style scoped>
.hero-field {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  pointer-events: none;
  /* 아래쪽은 다음 섹션으로 자연스럽게 사라진다 */
  -webkit-mask-image: linear-gradient(to bottom, #000 72%, transparent);
  mask-image: linear-gradient(to bottom, #000 72%, transparent);
}
</style>

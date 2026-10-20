<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import products, { STATUS } from '../../../lab-projects'
import ProductPreview from './ProductPreview.vue'

// 제품 하나를 설명·화면·플랜으로 안내하는 대화상자. 주소에 #제품id를 남겨 링크로 공유할 수 있다.
const dialog = ref(null)
const p = ref(null)
const PLAN = { done: '완료', now: '진행 중', next: '예정' }

async function open(item) {
  p.value = item
  await nextTick()
  if (!dialog.value?.open) dialog.value?.showModal()
  document.documentElement.style.overflow = 'hidden'
  history.replaceState(history.state, '', `${location.pathname}${location.search}#${item.id}`)
}
function close() {
  dialog.value?.close()
}
function onClose() {
  document.documentElement.style.overflow = ''
  if (p.value && location.hash === `#${p.value.id}`) history.replaceState(history.state, '', location.pathname + location.search)
}
function onBackdrop(e) {
  if (e.target === dialog.value) close()
}
const caption = (x) =>
  x.status === 'design'
    ? '설계한 화면입니다. 아직 만들지 않은 부분이 있고, 값은 예시입니다.'
    : x.demo
      ? '실제 화면을 줄인 모습입니다. 제품 페이지에서 그대로 써볼 수 있습니다.'
      : '대표 화면을 줄인 모습입니다. 값은 예시입니다.'
const primary = (x) => (x.demo ? { label: x.status === 'design' ? '화면 미리 보기' : '지금 써보기', href: x.href + x.demo } : { label: '제품 페이지 보기', href: x.href })

onMounted(() => {
  const hit = products.find((x) => `#${x.id}` === location.hash)
  if (hit) open(hit)
})
onBeforeUnmount(() => (document.documentElement.style.overflow = ''))
defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="pm" :aria-labelledby="p ? `pm-${p.id}` : undefined" @close="onClose" @click="onBackdrop">
    <article v-if="p" class="pm__card" tabindex="-1" autofocus>
      <header class="pm__head">
        <div>
          <p class="pm__meta"><span :class="['state', `state--${p.status}`]">{{ STATUS[p.status].label }}</span>{{ p.area }}</p>
          <h2 :id="`pm-${p.id}`">{{ p.title }}</h2>
          <p class="pm__tagline">{{ p.tagline }}</p>
        </div>
        <button type="button" class="pm__x" aria-label="닫기" @click="close">✕</button>
      </header>

      <div class="pm__body">
        <figure class="pm__shot">
          <ProductPreview :id="p.id" large />
          <figcaption>{{ caption(p) }}</figcaption>
        </figure>

        <div class="pm__text">
          <section>
            <h3>설명</h3>
            <p>{{ p.problem }}</p>
            <p>{{ p.summary }}</p>
          </section>
          <section>
            <h3>핵심 기능</h3>
            <ul class="pm__features">
              <li v-for="f in p.features" :key="f.title"><b>{{ f.title }}</b>{{ f.body }}</li>
            </ul>
          </section>
          <section>
            <h3>플랜</h3>
            <ol class="pm__plan">
              <li v-for="(step, i) in p.plan" :key="i" :class="`is-${step.state}`"><span>{{ PLAN[step.state] }}</span>{{ step.text }}</li>
            </ol>
          </section>
          <p class="pm__stack">{{ p.stack.join(', ') }}</p>
        </div>
      </div>

      <footer class="pm__foot">
        <a class="btn btn--primary" :href="primary(p).href">{{ primary(p).label }}</a>
        <a v-if="p.demo" class="btn" :href="p.href">제품 페이지 보기</a>
        <a v-for="l in p.links ?? []" :key="l.href" class="btn" :href="l.href" target="_blank" rel="noopener">{{ l.label }} ↗</a>
        <button type="button" class="btn pm__close" @click="close">닫기</button>
      </footer>
    </article>
  </dialog>
</template>

<style scoped>
.pm { width: min(1080px, calc(100vw - 32px)); max-height: calc(100dvh - 48px); margin: auto; padding: 0; border: 0; border-radius: 20px; background: var(--paper); color: var(--ink); box-shadow: 0 40px 80px -30px rgb(22 24 29 / 0.45); }
.pm::backdrop { background: rgb(22 24 29 / 0.45); backdrop-filter: blur(2px); }
.pm[open] { animation: pm-in 180ms ease-out; }
@keyframes pm-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.pm__card:focus { outline: none; }
.pm__card { display: flex; flex-direction: column; max-height: calc(100dvh - 48px); }
.pm__head { display: flex; justify-content: space-between; gap: 24px; padding: 28px 32px 20px; border-bottom: 1px solid var(--mist); }
.pm__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin: 0; color: var(--slate); font-size: 13px; }
.pm h2 { margin: 8px 0 0; padding: 0; border: 0; color: var(--ink); font-size: 34px; font-weight: 800; letter-spacing: -0.045em; line-height: 1.15; }
.pm__tagline { margin: 6px 0 0; color: var(--ink-soft); font-size: 18px; font-weight: 600; letter-spacing: -0.02em; word-break: keep-all; }
.pm__x { flex: none; width: 40px; height: 40px; border-radius: 50%; background: var(--wash); color: var(--ink); font-size: 15px; cursor: pointer; }
.pm__x:hover { background: var(--mist-strong); }
.pm__body { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 32px; padding: 24px 32px; overflow-y: auto; }
.pm__shot { margin: 0; align-self: start; position: sticky; top: 0; }
.pm__shot > :first-child { padding: 28px; border-radius: 14px; background: var(--wash); height: auto; }
.pm__shot :deep(.pv--large) { font-size: 14px; }
.pm__shot figcaption { margin-top: 8px; color: var(--slate); font-size: 13px; }
.pm__text section + section { margin-top: 26px; }
.pm h3 { margin: 0 0 8px; padding: 0; border: 0; color: var(--slate); font-size: 13px; font-weight: 700; letter-spacing: 0; }
.pm__text p { margin: 0 0 8px; color: var(--ink-soft); font-size: 15px; line-height: 1.75; word-break: keep-all; }
.pm__features { margin: 0; padding: 0; list-style: none; }
.pm__features li { padding: 10px 0; border-top: 1px solid var(--mist); color: var(--ink-soft); font-size: 14px; line-height: 1.6; word-break: keep-all; }
.pm__features b { display: block; color: var(--ink); font-size: 15px; }
.pm__plan { position: relative; margin: 0; padding: 0 0 0 18px; list-style: none; }
.pm__plan::before { position: absolute; left: 4px; top: 8px; bottom: 8px; width: 1px; background: var(--mist-strong); content: ""; }
.pm__plan li { position: relative; padding: 5px 0; color: var(--ink-soft); font-size: 14px; line-height: 1.55; }
.pm__plan li::before { position: absolute; left: -18px; top: 11px; width: 9px; height: 9px; border-radius: 50%; background: var(--paper); box-shadow: inset 0 0 0 1.5px var(--design); content: ""; }
.pm__plan li.is-done::before { background: var(--live); box-shadow: none; }
.pm__plan li.is-now::before { background: var(--marker); box-shadow: inset 0 0 0 1.5px #d1b200; }
.pm__plan li span { display: inline-block; min-width: 52px; margin-right: 8px; color: var(--slate); font-size: 12px; font-weight: 700; }
.pm__plan li.is-done { color: var(--ink); }
.pm__plan li.is-now { color: var(--ink); font-weight: 600; }
.pm__stack { margin-top: 20px !important; color: var(--slate) !important; font-size: 13px !important; }
.pm__foot { display: flex; flex-wrap: wrap; gap: 8px; padding: 16px 32px 24px; border-top: 1px solid var(--mist); }
.pm__close { margin-left: auto; }
@media (max-width: 760px) {
  .pm { width: 100vw; max-width: 100vw; max-height: 100dvh; margin: auto 0 0; border-radius: 20px 20px 0 0; }
  .pm__card { max-height: 92dvh; }
  .pm__head { padding: 20px 20px 16px; }
  .pm h2 { font-size: 26px; }
  .pm__body { grid-template-columns: 1fr; padding: 18px 20px; gap: 20px; }
  .pm__shot { position: static; }
  .pm__shot > :first-child { padding: 18px; }
  .pm__shot :deep(.pv--large) { font-size: 12px; }
  .pm__foot { padding: 12px 20px 20px; }
  .pm__close { display: none; }
}
@media (prefers-reduced-motion: reduce) { .pm[open] { animation: none; } }
</style>

<script setup>
import { computed, onMounted, ref } from 'vue'
import products, { STATUS } from '../../../lab-projects'
import ProductPreview from './ProductPreview.vue'
import ProductModal from './ProductModal.vue'

// 한 줄에 제품 하나. 텍스트와 화면을 번갈아 배치하고, 자세히 보기는 대화상자로 안내한다.
const filters = [{ key: 'all', label: '전체' }, ...Object.entries(STATUS).map(([key, v]) => ({ key, label: v.label }))]
const active = ref('all')
const modal = ref(null)
const count = (key) => (key === 'all' ? products.length : products.filter((p) => p.status === key).length)
const shown = computed(() => (active.value === 'all' ? products : products.filter((p) => p.status === active.value)))
const tryLabel = (p) => (p.status === 'design' ? '화면 미리 보기' : '지금 써보기')

// ?status=prototype 처럼 주소로 거른 상태를 열 수 있다(홈의 '바로 써볼 수 있는 제품'). 고르면 주소도 바꿔 공유할 수 있다.
function select(key) {
  active.value = key
  const url = new URL(location.href)
  if (key === 'all') url.searchParams.delete('status')
  else url.searchParams.set('status', key)
  history.replaceState(history.state, '', url)
}

onMounted(() => {
  const key = new URLSearchParams(location.search).get('status')
  if (key && key in STATUS) active.value = key
})

defineExpose({ show: select })
</script>

<template>
  <div>
    <div class="filters" role="group" aria-label="상태로 거르기">
      <button
        v-for="f in filters"
        :key="f.key"
        type="button"
        :class="['chip', f.key !== 'all' && `state state--${f.key}`]"
        :aria-pressed="active === f.key"
        @click="select(f.key)"
      >
        {{ f.label }} <span>{{ count(f.key) }}</span>
      </button>
    </div>

    <TransitionGroup tag="ol" name="row" class="rows">
      <li v-for="(p, i) in shown" :key="p.id" :class="['row', { 'row--flip': i % 2 === 1 }]">
        <div class="row__text">
          <p class="row__meta"><span :class="['state', `state--${p.status}`]">{{ STATUS[p.status].label }}</span>{{ p.area }}</p>
          <h3><a :href="p.href">{{ p.title }}</a></h3>
          <p class="row__tagline">{{ p.tagline }}</p>
          <p class="row__summary">{{ p.summary }}</p>
          <ul class="row__features">
            <li v-for="f in p.features" :key="f.title">{{ f.title }}</li>
          </ul>
          <div class="row__cta">
            <button type="button" class="btn btn--primary btn--lg" @click="modal.open(p)">자세히 보기</button>
            <a v-if="p.demo" class="btn btn--lg" :href="p.href + p.demo">{{ tryLabel(p) }}</a>
            <a v-else-if="p.links?.length" class="btn btn--lg" :href="p.links[0].href" target="_blank" rel="noopener">{{ p.links[0].label }} ↗</a>
            <a v-else class="btn btn--lg" :href="p.href">제품 페이지</a>
          </div>
        </div>
        <button type="button" class="row__shot" :aria-label="`${p.title} 자세히 보기`" @click="modal.open(p)">
          <ProductPreview :id="p.id" large />
        </button>
      </li>
    </TransitionGroup>

    <ProductModal ref="modal" />
  </div>
</template>

<style scoped>
.filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.chip { display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 14px; border: 1px solid var(--mist-strong); border-radius: 999px; background: var(--paper); color: var(--ink-soft); font-size: 14px; font-weight: 600; cursor: pointer; }
.chip:hover { border-color: var(--ink); }
.chip span { color: var(--slate); font-weight: 500; }
.chip[aria-pressed="true"] { border-color: var(--ink); background: var(--ink); color: #fff; }
.chip[aria-pressed="true"] span { color: #c9ccd3; }

.rows { margin: 0; padding: 0; list-style: none; }
.row { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: 56px; align-items: center; margin: 0; padding: 56px 0; border-bottom: 1px solid var(--mist-strong); }
.row:last-child { border-bottom: 0; }
.row--flip .row__text { order: 2; }
.row__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin: 0; color: var(--slate); font-size: 14px; }
.row h3 { margin: 12px 0 0; font-size: clamp(30px, 3.4vw, 42px); font-weight: 800; letter-spacing: -0.045em; line-height: 1.12; }
.row h3 a { color: var(--ink); text-decoration: none; }
.row h3 a:hover { background: linear-gradient(transparent 60%, var(--marker) 60%, var(--marker) 92%, transparent 92%); }
.row__tagline { margin: 12px 0 0; color: var(--ink); font-size: 20px; font-weight: 650; line-height: 1.45; letter-spacing: -0.025em; word-break: keep-all; }
.row__summary { margin: 10px 0 0; color: var(--ink-soft); font-size: 16px; line-height: 1.75; word-break: keep-all; }
.row__features { display: flex; flex-wrap: wrap; gap: 6px; margin: 18px 0 0; padding: 0; list-style: none; }
.row__features li { padding: 4px 10px; border-radius: 6px; background: var(--wash); color: var(--ink-soft); font-size: 13px; font-weight: 600; }
.row__cta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 26px; }
.btn--lg { min-height: 46px; padding: 0 18px; border-radius: 10px; font-size: 15px; }
.row__shot { display: block; width: 100%; min-height: 300px; padding: clamp(20px, 3vw, 40px); border: 1px solid var(--mist-strong); border-radius: 20px; background: var(--wash); color: inherit; font: inherit; text-align: left; cursor: zoom-in; transition: border-color 140ms ease, transform 160ms ease; }
.row__shot:hover { border-color: var(--ink); transform: translateY(-2px); }
.row__shot :deep(.pv--large) { font-size: 14px; }

.row-enter-active, .row-leave-active { transition: opacity 160ms ease; }
.row-enter-from, .row-leave-to { opacity: 0; }
.row-leave-active { display: none; }

@media (max-width: 900px) {
  .row { grid-template-columns: 1fr; gap: 28px; padding: 44px 0; }
  .row--flip .row__text { order: 0; }
  .row__shot { min-height: 0; }
  .row__shot :deep(.pv--large) { font-size: 12.5px; }
}
@media (prefers-reduced-motion: reduce) { .row__shot { transition: none; } .row__shot:hover { transform: none; } }
</style>

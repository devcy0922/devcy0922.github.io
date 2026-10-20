<script setup>
import { computed } from 'vue'
import { useData } from 'vitepress'
import products, { STATUS } from '../../../lab-projects'
import ProductPreview from './ProductPreview.vue'

const { frontmatter } = useData()
const p = computed(() => products.find((x) => x.id === frontmatter.value.lab))
</script>

<template>
  <header v-if="p" class="ph">
    <div class="ph__inner">
      <a class="ph__back" href="/lab/">제품 목록</a>
      <p class="ph__meta"><span :class="['state', `state--${p.status}`]" :title="STATUS[p.status].hint">{{ STATUS[p.status].label }}</span>{{ p.area }}</p>
      <h1>{{ p.title }}</h1>
      <p class="ph__tagline">{{ p.tagline }}</p>
      <p class="ph__summary">{{ p.summary }}</p>
      <div class="ph__cta">
        <a v-if="p.demo" class="btn btn--primary btn--lg" :href="p.demo">{{ p.status === 'design' ? '화면 미리 보기' : '지금 써보기' }}</a>
        <!-- 주 버튼은 하나만: 데모가 없으면 첫 외부 링크가 주 버튼이다 -->
        <a v-for="(l, i) in p.links ?? []" :key="l.href" :class="['btn', 'btn--lg', { 'btn--primary': !p.demo && i === 0 }]" :href="l.href" target="_blank" rel="noopener">{{ l.label }} ↗</a>
        <a class="btn btn--lg" href="#how">동작 방식</a>
      </div>
      <ul class="ph__stack" aria-label="사용 기술">
        <li v-for="s in p.stack" :key="s">{{ s }}</li>
      </ul>
    </div>
    <div v-if="!p.demo" class="ph__show">
      <ProductPreview :id="p.id" large />
    </div>
  </header>
</template>

<style scoped>
.ph { width: min(var(--page-max), calc(100% - var(--page-gutter) * 2)); margin: 0 auto; padding: 48px 0 0; }
.ph__back { color: var(--slate); font-size: 14px; text-decoration: none; }
.ph__back::before { content: "← "; }
.ph__back:hover { color: var(--ink); }
.ph__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin: 40px 0 0; color: var(--slate); font-size: 14px; }
.ph h1 { margin: 14px 0 0; color: var(--ink); font-size: clamp(44px, 7vw, 84px); font-weight: 800; line-height: 1.04; letter-spacing: -0.055em; word-break: keep-all; }
.ph__tagline { max-width: 22em; margin: 18px 0 0; color: var(--ink); font-size: clamp(22px, 2.6vw, 30px); font-weight: 650; line-height: 1.4; letter-spacing: -0.035em; word-break: keep-all; }
.ph__summary { max-width: 38em; margin: 14px 0 0; color: var(--ink-soft); font-size: 17px; line-height: 1.75; word-break: keep-all; }
.ph__cta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
.btn--lg { min-height: 48px; padding: 0 20px; border-radius: 10px; font-size: 15px; }
.ph__stack { display: flex; flex-wrap: wrap; gap: 6px; margin: 24px 0 0; padding: 0; list-style: none; }
.ph__stack li { padding: 3px 10px; border: 1px solid var(--mist-strong); border-radius: 6px; color: var(--slate); font-size: 13px; }
.ph__show { margin-top: 48px; padding: clamp(20px, 4vw, 48px); border: 1px solid var(--mist-strong); border-radius: 20px; background: var(--wash); }
@media (max-width: 640px) {
  .ph { padding-top: 28px; }
  .ph__show :deep(.pv--large) { font-size: 12px; }
}
</style>

<script setup>
import { computed } from 'vue'
import { useData } from 'vitepress'
import work from '../../../lab-projects'

const { frontmatter } = useData()
const index = computed(() => work.findIndex((w) => w.id === frontmatter.value.lab))
const prev = computed(() => (index.value > 0 ? work[index.value - 1] : null))
const next = computed(() => (index.value >= 0 && index.value < work.length - 1 ? work[index.value + 1] : null))
</script>

<template>
  <nav v-if="index >= 0" class="lab-pager" aria-label="다른 제품">
    <a v-if="prev" :href="prev.href" class="lab-pager__prev"><span>이전 제품</span><strong>{{ prev.title }}</strong></a>
    <span v-else />
    <a v-if="next" :href="next.href" class="lab-pager__next"><span>다음 제품</span><strong>{{ next.title }}</strong></a>
  </nav>
</template>

<style scoped>
.lab-pager { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: min(1200px, calc(100% - 48px)); margin: 112px auto 96px; }
@media (max-width: 640px) { .lab-pager { width: calc(100% - 32px); grid-template-columns: 1fr; } }
.lab-pager a { display: block; padding: 16px 18px; border: 1px solid var(--mist-strong); border-radius: 10px; color: inherit; text-decoration: none; }
.lab-pager a:hover { border-color: var(--ink); }
.lab-pager__next { text-align: right; }
.lab-pager span { display: block; color: var(--slate); font-size: 13px; }
.lab-pager strong { display: block; margin-top: 2px; color: var(--ink); font-size: 16px; }
</style>

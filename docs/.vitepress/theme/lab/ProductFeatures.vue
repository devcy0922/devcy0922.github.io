<script setup>
import { computed } from 'vue'
import { useData } from 'vitepress'
import products from '../../../lab-projects.js'

const { frontmatter } = useData()
const features = computed(() => products.find((x) => x.id === frontmatter.value.lab)?.features ?? [])
</script>

<template>
  <section v-if="features.length" class="pf" aria-label="주요 기능">
    <div v-for="f in features" :key="f.title" class="pf__item">
      <h3>{{ f.title }}</h3>
      <p>{{ f.body }}</p>
    </div>
  </section>
</template>

<style scoped>
.pf { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; margin: 72px 0 0; }
.pf__item { padding-top: 18px; border-top: 2px solid var(--ink); }
.pf h3 { margin: 0 !important; padding: 0; border: 0; color: var(--ink); font-size: 20px !important; font-weight: 750; letter-spacing: -0.03em; }
.pf p { margin: 10px 0 0 !important; color: var(--ink-soft); font-size: 15px !important; line-height: 1.7 !important; word-break: keep-all; }
@media (max-width: 760px) { .pf { grid-template-columns: 1fr; gap: 24px; } }
</style>

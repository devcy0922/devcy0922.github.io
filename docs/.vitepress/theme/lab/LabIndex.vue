<script setup>
import ProductList from './ProductList.vue'
</script>

<template>
  <main class="lab-index">
    <header>
      <h1>제품</h1>
      <p>일하다 막힌 곳마다 만든 제품들입니다. 미리 써보기 제품은 이 사이트에서 바로 동작하고, 준비 중인 제품도 설계와 화면 뼈대를 공개합니다.</p>
    </header>
    <ProductList />
  </main>
</template>

<style scoped>
.lab-index { width: min(1200px, calc(100% - 48px)); margin: 0 auto; padding: 64px 0 120px; }
header { max-width: 680px; margin-bottom: 36px; }
h1 { margin: 0; color: var(--ink); font-size: clamp(44px, 6vw, 72px); font-weight: 800; line-height: 1.1; letter-spacing: -0.055em; }
header p { margin: 20px 0 0; color: var(--ink-soft); font-size: 18px; line-height: 1.75; word-break: keep-all; }
@media (max-width: 640px) { .lab-index { width: calc(100% - 32px); padding-top: 40px; } }
</style>

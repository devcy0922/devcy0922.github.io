<script setup>
import { ref } from 'vue'
import { data as posts } from '../../posts.data.js'
import platforms from '../../selected-projects.js'
import products from '../../lab-projects.js'
import ProductList from './lab/ProductList.vue'
import ProductPreview from './lab/ProductPreview.vue'

const grid = ref(null)
const tryable = products.filter((p) => p.status === 'prototype').length

function showTryable() {
  grid.value?.show('prototype')
  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <main class="home">
    <header class="hero">
      <div class="hero__text">
        <h1>업무에 AI를 붙여<br />실제로 돌려봅니다.</h1>
        <p class="hero__lead">
          사업보고서 비교, 공개자료 안내 챗봇, 대리점 정산, 금연 앱까지.
          일하다 막힌 곳마다 작은 제품을 만들고 있습니다. 그중 {{ tryable }}개는 지금 이 페이지에서 바로 써볼 수 있습니다.
        </p>
        <div class="hero__cta">
          <button type="button" class="btn btn--primary btn--lg" @click="showTryable">바로 써볼 수 있는 제품</button>
          <a class="btn btn--lg" href="#products">제품 전체 보기</a>
        </div>
      </div>
      <div class="hero__stage">
        <a class="hero__shot" href="/lab/vibe-post-it#report-diff" aria-label="사업보고서 두 버전 비교 써보기">
          <span class="hero__shot-bar"><i /><i /><i /><b>사업보고서 두 버전 비교</b><em>써보기</em></span>
          <span class="hero__shot-body"><ProductPreview id="vibe-post-it" large /></span>
        </a>
        <a class="hero__phone" href="/lab/quit-nudge" aria-label="금연 타이머 보기"><ProductPreview id="quit-nudge" /></a>
      </div>
    </header>

    <section id="products" class="block" aria-labelledby="products-title">
      <h2 id="products-title">제품</h2>
      <p class="block__lead">상태 표시는 실제 구현 범위 그대로입니다. 준비 중인 제품도 설계와 화면 뼈대를 공개합니다.</p>
      <ProductList ref="grid" />
    </section>

    <section class="block" aria-labelledby="base-title">
      <h2 id="base-title">함께 쓰는 기반</h2>
      <p class="block__lead">위 제품들은 이미 운영 중인 플랫폼 위에 올라갑니다. 모델 호출, 검색 범위, 데이터와 배포를 매번 새로 만들지 않습니다.</p>
      <ul class="base">
        <li v-for="p in platforms" :key="p.title">
          <a :href="p.href"><strong>{{ p.title }}</strong><span>{{ p.description }}</span></a>
        </li>
      </ul>
    </section>

    <section class="maker" aria-labelledby="maker-title">
      <div>
        <h2 id="maker-title">만든 사람</h2>
        <p>
          devcy0922. 10년차 백엔드·AI 플랫폼 엔지니어입니다. 그룹웨어·B2B·백오피스를 만들고 운영해 왔고,
          지금은 AI가 실제 업무를 맡을 때 필요한 실행 경계와 검증, 운영 기반을 만듭니다.
        </p>
        <p class="maker__links">
          <a href="https://github.com/devcy0922" target="_blank" rel="noopener">GitHub ↗</a>
          <a href="/about">경력</a>
          <a href="/rss.xml">RSS</a>
        </p>
      </div>
      <div v-if="posts.length">
        <h3>최근 기록</h3>
        <ul class="notes">
          <li v-for="post in posts.slice(0, 4)" :key="post.url">
            <a :href="post.url"><strong>{{ post.title }}</strong><time :datetime="post.date">{{ post.dateLabel }}</time></a>
          </li>
        </ul>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home { width: min(1200px, calc(100% - 48px)); margin: 0 auto; padding: 64px 0 120px; }

.hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: 56px; align-items: center; min-height: min(640px, calc(100vh - 140px)); }
.hero h1 { margin: 0; color: var(--ink); font-size: clamp(42px, 6vw, 76px); font-weight: 800; line-height: 1.08; letter-spacing: -0.055em; word-break: keep-all; }
.hero__lead { max-width: 30em; margin: 24px 0 0; color: var(--ink-soft); font-size: 18px; line-height: 1.75; word-break: keep-all; }
.hero__cta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 32px; }
.btn--lg { min-height: 48px; padding: 0 20px; border-radius: 10px; font-size: 15px; }

.hero__stage { position: relative; padding: 0 48px 120px 0; }
.hero__phone { position: absolute; right: 0; bottom: 0; width: 200px; color: inherit; text-decoration: none; filter: drop-shadow(0 24px 30px rgb(22 24 29 / 0.25)); transition: transform 160ms ease; }
.hero__phone:hover { transform: translateY(-4px); }
.hero__phone :deep(.pv) { font-size: 12.5px; }
.hero__phone :deep(.phone) { width: 100%; }
.hero__shot { position: relative; display: block; border: 1px solid var(--mist-strong); border-radius: 18px; background: var(--paper); color: inherit; text-decoration: none; overflow: hidden; box-shadow: 0 30px 60px -40px rgb(22 24 29 / 0.35); transition: border-color 140ms ease; }
.hero__shot:hover { border-color: var(--ink); }
.hero__shot-bar { display: flex; align-items: center; gap: 6px; height: 40px; padding: 0 16px; border-bottom: 1px solid var(--mist); background: var(--wash); }
.hero__shot-bar i { width: 10px; height: 10px; border-radius: 50%; background: var(--mist-strong); }
.hero__shot-bar b { margin-left: 10px; color: var(--ink-soft); font-size: 13px; font-weight: 600; }
.hero__shot-bar em { margin-left: auto; padding: 3px 10px; border-radius: 999px; background: var(--ink); color: #fff; font-size: 12px; font-style: normal; font-weight: 700; }
.hero__shot-body { display: block; padding: 28px 28px 96px; }

.block { padding-top: 112px; scroll-margin-top: 72px; }
h2 { margin: 0; color: var(--ink); font-size: clamp(30px, 3.6vw, 44px); font-weight: 800; letter-spacing: -0.045em; }
.block__lead { max-width: 40em; margin: 12px 0 28px; color: var(--slate); font-size: 16px; line-height: 1.7; word-break: keep-all; }

.base { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 40px; margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--ink); }
.base li { border-bottom: 1px solid var(--mist-strong); }
.base a { display: block; padding: 20px 0; color: inherit; text-decoration: none; }
.base strong { color: var(--ink); font-size: 17px; font-weight: 750; }
.base span { display: block; margin-top: 6px; color: var(--slate); font-size: 14px; line-height: 1.65; word-break: keep-all; }
.base a:hover strong { background: linear-gradient(transparent 58%, var(--marker) 58%, var(--marker) 94%, transparent 94%); }

.maker { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; margin-top: 112px; padding: 40px; border-radius: 18px; background: var(--wash); }
.maker h2 { font-size: 28px; }
.maker p { margin: 14px 0 0; color: var(--ink-soft); font-size: 16px; line-height: 1.75; word-break: keep-all; }
.maker__links { display: flex; gap: 20px; }
.maker__links a { color: var(--ink); font-weight: 650; text-decoration: underline; text-decoration-color: var(--mist-strong); text-decoration-thickness: 2px; text-underline-offset: 5px; }
.maker__links a:hover { text-decoration-color: var(--ink); }
.maker h3 { margin: 4px 0 10px; color: var(--slate); font-size: 14px; font-weight: 650; }
.notes { margin: 0; padding: 0; list-style: none; }
.notes li { border-top: 1px solid var(--mist-strong); }
.notes a { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; color: inherit; text-decoration: none; }
.notes strong { color: var(--ink); font-size: 15px; font-weight: 600; }
.notes time { flex: none; color: var(--slate); font-size: 13px; }
.notes a:hover strong { color: var(--cobalt); }

@media (max-width: 960px) {
  .hero { grid-template-columns: 1fr; min-height: 0; gap: 40px; }
  .base { grid-template-columns: 1fr 1fr; }
  .maker { grid-template-columns: 1fr; gap: 32px; }
}
@media (max-width: 640px) {
  .home { width: calc(100% - 32px); padding-top: 40px; }
  .hero__stage { padding: 0 0 0; }
  .hero__phone { display: none; }
  .hero__shot-body { padding: 18px; }
  .hero__shot .pv--large { font-size: 13px; }
  .block { padding-top: 80px; }
  .base { grid-template-columns: 1fr; }
  .maker { padding: 24px; margin-top: 80px; }
  .notes a { flex-direction: column; gap: 2px; }
}
</style>

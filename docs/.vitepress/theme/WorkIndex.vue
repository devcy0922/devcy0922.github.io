<script setup>
import { data as posts } from '../../posts.data.js'
import platforms from '../../selected-projects.js'
import products, { STATUS, STATUS_ORDER, featured } from '../../lab-projects'
import HeroField from './HeroField.vue'
import ProductPreview from './lab/ProductPreview.vue'

// 홈은 사이트의 얼굴이다. 전체 제품 목록과 상태 필터는 /lab/에만 두고, 여기서는 대표 제품만 보여 준다.
const count = (status) => products.filter((p) => p.status === status).length
const tryable = count('prototype')
const tryLabel = (p) => (p.demo ? '지금 써보기' : p.links?.[0]?.label ?? '제품 페이지')
const tryTarget = (p) => (p.demo ? p.href + p.demo : p.links?.[0]?.href ?? p.href)
const isExternal = (href) => /^https?:/.test(href)
</script>

<template>
  <main class="home">
    <section class="hero-wrap">
      <HeroField />
      <header class="hero page-wrap">
        <div class="hero__text">
          <h1>일하다 막힌 곳마다<br />작은 제품을 만듭니다.</h1>
          <p class="hero__lead">
            사업보고서 비교, 도메인 RAG, 업계 용어 번역, 금연 앱까지.
            그중 {{ tryable }}개는 지금 브라우저에서 바로 써볼 수 있습니다.
          </p>
          <div class="hero__cta">
            <a class="btn btn--primary btn--lg" href="/lab/?status=prototype">바로 써볼 수 있는 제품</a>
            <a class="btn btn--lg" href="/lab/">제품 전체 보기</a>
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
    </section>

    <section class="block page-wrap" aria-labelledby="featured-title">
      <div class="block__head">
        <div>
          <h2 id="featured-title">대표 제품</h2>
          <p class="block__lead">운영 중인 것과 지금 바로 써볼 수 있는 것부터. 상태 표시는 실제 구현 범위 그대로입니다.</p>
        </div>
        <a class="more" href="/lab/">제품 {{ products.length }}개 모두 보기</a>
      </div>

      <ul class="cards">
        <li v-for="p in featured" :key="p.id" class="card">
          <a class="card__shot" :href="p.href" :aria-label="`${p.title} 제품 페이지`"><ProductPreview :id="p.id" large /></a>
          <div class="card__text">
            <p class="card__meta"><span :class="['state', `state--${p.status}`]">{{ STATUS[p.status].label }}</span>{{ p.area }}</p>
            <h3><a :href="p.href">{{ p.title }}</a></h3>
            <p class="card__tagline">{{ p.tagline }}</p>
            <p class="card__links">
              <a :href="p.href">자세히</a>
              <a
                :href="tryTarget(p)"
                :target="isExternal(tryTarget(p)) ? '_blank' : undefined"
                :rel="isExternal(tryTarget(p)) ? 'noopener' : undefined"
              >{{ tryLabel(p) }}{{ isExternal(tryTarget(p)) ? ' ↗' : '' }}</a>
            </p>
          </div>
        </li>
      </ul>

      <p class="tally">
        <a v-for="s in STATUS_ORDER" :key="s" :href="`/lab/?status=${s}`" :class="['state', `state--${s}`]">{{ STATUS[s].label }} {{ count(s) }}</a>
      </p>
    </section>

    <section class="block page-wrap" aria-labelledby="base-title">
      <h2 id="base-title">함께 쓰는 기반</h2>
      <p class="block__lead">위 제품들은 이미 운영 중인 플랫폼 위에 올라갑니다. 모델 호출, 검색 범위, 데이터와 배포를 매번 새로 만들지 않습니다.</p>
      <ul class="base">
        <li v-for="p in platforms" :key="p.title">
          <a :href="p.href"><strong>{{ p.title }}</strong><span>{{ p.description }}</span></a>
        </li>
      </ul>
    </section>

    <section class="maker page-wrap" aria-labelledby="maker-title">
      <div>
        <h2 id="maker-title">만든 사람</h2>
        <p>
          devcy0922. 백엔드·AI 플랫폼 엔지니어입니다. 그룹웨어·B2B·백오피스를 만들고 운영해 왔고,
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
.home { padding: 0 0 120px; }

.hero-wrap { position: relative; isolation: isolate; overflow: hidden; padding: 64px 0 96px; }
.hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: 56px; align-items: center; min-height: min(640px, calc(100vh - 160px)); }
.hero h1 { margin: 0; color: var(--ink); font-size: clamp(42px, 6vw, 76px); font-weight: 800; line-height: 1.08; letter-spacing: -0.055em; word-break: keep-all; }
.hero__lead { max-width: 30em; margin: 24px 0 0; color: var(--ink-soft); font-size: 18px; line-height: 1.75; word-break: keep-all; }
/* 배경 점이 글자 아래로 지나가도 읽히도록 글자 뒤만 흰 바탕으로 옅게 가린다 */
.hero__text { position: relative; }
.hero__text::before { position: absolute; inset: -40px -56px; z-index: -1; background: radial-gradient(closest-side, rgb(255 255 255 / 0.92), rgb(255 255 255 / 0)); content: ""; }
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

.block { padding-top: 96px; scroll-margin-top: 72px; }
.block__head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px 32px; }
h2 { margin: 0; color: var(--ink); font-size: clamp(30px, 3.6vw, 44px); font-weight: 800; letter-spacing: -0.045em; }
.block__lead { max-width: 40em; margin: 12px 0 28px; color: var(--slate); font-size: 16px; line-height: 1.7; word-break: keep-all; }
.more { margin-bottom: 28px; color: var(--ink); font-size: 15px; font-weight: 650; text-decoration: underline; text-decoration-color: var(--mist-strong); text-decoration-thickness: 2px; text-underline-offset: 5px; }
.more:hover { text-decoration-color: var(--ink); }

.cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin: 0; padding: 0; list-style: none; }
.card { display: flex; flex-direction: column; min-width: 0; }
.card__shot { display: block; height: 260px; padding: 24px; border: 1px solid var(--mist-strong); border-radius: 16px; background: var(--wash); color: inherit; text-decoration: none; overflow: hidden; transition: border-color 140ms ease, transform 160ms ease; }
.card__shot:hover { border-color: var(--ink); transform: translateY(-2px); }
.card__shot :deep(.pv--large) { font-size: 13px; }
.card__text { padding: 18px 2px 0; }
.card__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin: 0; color: var(--slate); font-size: 13px; }
.card h3 { margin: 10px 0 0; font-size: 24px; font-weight: 800; letter-spacing: -0.04em; line-height: 1.2; }
.card h3 a { color: var(--ink); text-decoration: none; }
.card h3 a:hover { background: linear-gradient(transparent 60%, var(--marker) 60%, var(--marker) 92%, transparent 92%); }
.card__tagline { margin: 8px 0 0; color: var(--ink-soft); font-size: 15px; line-height: 1.65; word-break: keep-all; }
.card__links { display: flex; flex-wrap: wrap; gap: 18px; margin: 14px 0 0; }
.card__links a { color: var(--ink); font-size: 14px; font-weight: 650; text-decoration: underline; text-decoration-color: var(--mist-strong); text-decoration-thickness: 2px; text-underline-offset: 5px; }
.card__links a:hover { text-decoration-color: var(--ink); }

.tally { display: flex; flex-wrap: wrap; gap: 8px 20px; margin: 32px 0 0; padding-top: 18px; border-top: 1px solid var(--mist-strong); }
.tally a { text-decoration: none; }
.tally a:hover { color: var(--ink); text-decoration: underline; text-underline-offset: 4px; }

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
.notes a:hover strong { background: linear-gradient(transparent 60%, var(--marker) 60%); }

@media (max-width: 1080px) {
  .cards { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 960px) {
  .hero { grid-template-columns: 1fr; min-height: 0; gap: 40px; }
  .base { grid-template-columns: 1fr 1fr; }
  .maker { grid-template-columns: 1fr; gap: 32px; }
}
@media (max-width: 640px) {
  .hero-wrap { padding: 40px 0 64px; }
  .hero__stage { padding: 0; }
  .hero__phone { display: none; }
  .hero__shot-body { padding: 18px; }
  .hero__shot .pv--large { font-size: 13px; }
  .block { padding-top: 72px; }
  .cards { grid-template-columns: 1fr; gap: 36px; }
  .card__shot { height: auto; min-height: 200px; }
  .base { grid-template-columns: 1fr; }
  .maker { padding: 24px; margin-top: 80px; }
  .notes a { flex-direction: column; gap: 2px; }
}
@media (prefers-reduced-motion: reduce) { .card__shot:hover, .hero__phone:hover { transform: none; } }
</style>

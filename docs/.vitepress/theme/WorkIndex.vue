<script setup>
import { ref, computed } from 'vue'
import { data as posts } from '../../posts.data.js'
import platforms from '../../selected-projects.js'
import products, { STATUS, STATUS_ORDER } from '../../lab-projects'
import HeroField from './HeroField.vue'
import ProductPreview from './lab/ProductPreview.vue'

const activeFilter = ref('all')

const filteredProducts = computed(() => {
  if (activeFilter.value === 'all') return products
  return products.filter((p) => p.status === activeFilter.value)
})

const count = (status) => products.filter((p) => p.status === status).length
const tryLabel = (p) => (p.demo ? '지금 써보기' : p.links?.[0]?.label ?? '제품 페이지')
const tryTarget = (p) => (p.demo ? p.href + p.demo : p.links?.[0]?.href ?? p.href)
const isExternal = (href) => /^https?:/.test(href)

const metrics = [
  { label: '전체 제품', value: '10개', note: '프로덕트 & 플랫폼' },
  { label: '운영 중 (Live)', value: `${count('live')}개`, note: 'GoVail · NS 트레이딩' },
  { label: '미리 써보기 (Prototype)', value: `${count('prototype')}개`, note: '도메인 RAG · vibe 도구' },
  { label: '설계 및 개발 (Design)', value: `${count('design')}개`, note: '샌드박스 · MCP · 넛지' },
]

const principles = [
  {
    num: '01',
    title: '원인과 출처를 끝까지 추적 (Tracing & Verification)',
    desc: '블랙박스 챗봇에 의존하지 않고, 모든 RAG 문장의 원문 인용 검증과 AI Gateway 감사 원장으로 판단 근거를 투명하게 입증합니다.',
  },
  {
    num: '02',
    title: '계산과 상태의 엄격한 분리 (State Safety)',
    desc: '퀀트 거래 시스템부터 마이크로서비스까지 연산 로직과 상태 전이(State Transition) 권한을 물리적으로 격리하여 시스템 무결성을 지킵니다.',
  },
  {
    num: '03',
    title: '실무자의 1초를 아끼는 최소 도구 (Lean Craftsmanship)',
    desc: '거창한 프레임워크보다 실무자가 당장 겪는 공시 문서 비교, Slack 메시지 변환 등의 병목을 브라우저 로컬 단 한 장의 가벼운 인터페이스로 해결합니다.',
  },
]
</script>

<template>
  <main class="home ws-linear-theme">
    <!-- Hero Section -->
    <section class="hero-wrap">
      <HeroField />
      <header class="hero page-wrap">
        <div class="hero__text">
          <div class="hero__eyebrow">
            <span class="eyebrow-badge">PLATFORM & AI SYSTEMS</span>
            <span class="eyebrow-author">DEVCY0922</span>
          </div>
          <h1>문제를 풀기 위해<br />직접 만든 제품과 플랫폼.</h1>
          <p class="hero__lead">
            AI 게이트웨이부터 퀀트 트레이딩, 출처를 대는 RAG까지. 현장에서 마주친 비효율과
            장애 위험을 직접 뚫어온 10가지 제품과 아키텍처 기록입니다.
          </p>
          <div class="hero__cta">
            <a class="btn btn--primary btn--lg" href="#products">제품 10선 탐색 <span class="arrow">↓</span></a>
            <a class="btn btn--secondary btn--lg" href="/playground">라이브 콘솔 실행 <span class="arrow">→</span></a>
          </div>
          <div class="hero__tags">
            <span>Rust</span>
            <span>Go</span>
            <span>React</span>
            <span>Docker</span>
            <span>LiteLLM</span>
            <span>MCP</span>
          </div>
        </div>

        <div class="hero__stage">
          <div class="terminal-card">
            <div class="terminal-bar">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
              <span class="terminal-title">ops-cluster-control.sh</span>
              <span class="terminal-badge">LIVE 200 OK</span>
            </div>
            <div class="terminal-body">
              <div class="term-row"><span class="cmd">$</span> govail-gateway --status</div>
              <div class="term-out success">✔ Rust/Axum Proxy: 0.12ms p99 latency | DLP redaction active</div>
              <div class="term-row"><span class="cmd">$</span> ns-trading --healthcheck</div>
              <div class="term-out success">✔ Go Control-Plane: 100% Hash-Verified State Transitions</div>
              <div class="term-row"><span class="cmd">$</span> domain-rag --verify-citations</div>
              <div class="term-out info">ℹ 3 domains registered | BM25 + Citation Verifier: 0 hallucination</div>
            </div>
          </div>
          <a class="hero__floating-shot" href="/lab/vibe-post-it#report-diff" aria-label="사업보고서 두 버전 비교">
            <div class="floating-header">
              <span>vibe-post-it</span>
              <em>브라우저 실행 ↗</em>
            </div>
            <div class="floating-preview">
              <ProductPreview id="vibe-post-it" large />
            </div>
          </a>
        </div>
      </header>
    </section>

    <!-- Metrics Bar -->
    <section class="metrics-section page-wrap">
      <div class="metrics-grid">
        <div v-for="m in metrics" :key="m.label" class="metric-card">
          <span class="metric-label">{{ m.label }}</span>
          <strong class="metric-value">{{ m.value }}</strong>
          <span class="metric-note">{{ m.note }}</span>
        </div>
      </div>
    </section>

    <!-- Products Exploration Section -->
    <section id="products" class="block page-wrap" aria-labelledby="products-title">
      <div class="block__head">
        <div>
          <span class="section-tag">PORTFOLIO & PRODUCTS</span>
          <h2 id="products-title">직접 설계하고 운영하는 제품 10선</h2>
          <p class="block__lead">
            실제 운영 중인 서비스부터 브라우저에서 즉시 써볼 수 있는 프로토타입까지, 모든 구현 상태를 투명하게 공개합니다.
          </p>
        </div>
        <div class="filter-pills">
          <button
            :class="['filter-btn', { active: activeFilter === 'all' }]"
            @click="activeFilter = 'all'"
          >
            전체 ({{ products.length }})
          </button>
          <button
            v-for="s in STATUS_ORDER"
            :key="s"
            :class="['filter-btn', { active: activeFilter === s }]"
            @click="activeFilter = s"
          >
            <span :class="['dot-indicator', `dot--${s}`]"></span>
            {{ STATUS[s].label }} ({{ count(s) }})
          </button>
        </div>
      </div>

      <ul class="cards linear-cards">
        <li v-for="p in filteredProducts" :key="p.id" class="card linear-card">
          <div class="card__header">
            <div class="card__meta">
              <span class="card__area">{{ p.area }}</span>
              <span :class="['state-badge', `state--${p.status}`]">
                <span class="state-dot"></span>
                {{ STATUS[p.status].label }}
              </span>
            </div>
            <a class="card__shot" :href="p.href" :aria-label="`${p.title} 제품 페이지`">
              <ProductPreview :id="p.id" large />
            </a>
          </div>

          <div class="card__body">
            <h3><a :href="p.href">{{ p.title }}</a></h3>
            <p class="card__tagline">{{ p.tagline }}</p>
            <p class="card__summary">{{ p.summary }}</p>

            <div class="card__stack">
              <span v-for="tech in p.stack" :key="tech" class="tech-pill">{{ tech }}</span>
            </div>

            <div class="card__actions">
              <a class="btn-detail" :href="p.href">
                아키텍처 분석 <span class="arrow">→</span>
              </a>
              <a
                v-if="p.demo || p.links?.length"
                class="btn-live"
                :href="tryTarget(p)"
                :target="isExternal(tryTarget(p)) ? '_blank' : undefined"
                :rel="isExternal(tryTarget(p)) ? 'noopener' : undefined"
              >
                {{ tryLabel(p) }}{{ isExternal(tryTarget(p)) ? ' ↗' : '' }}
              </a>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <!-- Engineering Principles / Core Values -->
    <section class="block principles-section page-wrap" aria-labelledby="principles-title">
      <div class="section-heading-centered">
        <span class="section-tag">ENGINEERING PRINCIPLES</span>
        <h2 id="principles-title">실패를 먼저 가정하는 아키텍처 원칙</h2>
        <p class="block__lead">
          화려한 기술 스택의 나열보다 중요한 것은 장애 상황에서도 스스로를 증명하는 재현성과 무결성입니다.
        </p>
      </div>

      <div class="principles-grid">
        <article v-for="item in principles" :key="item.num" class="principle-card">
          <span class="principle-num">{{ item.num }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </article>
      </div>
    </section>

    <!-- Foundational Platforms -->
    <section class="block base-section page-wrap" aria-labelledby="base-title">
      <div class="block__head">
        <div>
          <span class="section-tag">FOUNDATIONAL PLATFORMS</span>
          <h2 id="base-title">함께 쓰는 운영 기반</h2>
          <p class="block__lead">
            모든 제품은 이미 검증된 공통 플랫폼 위에 올라갑니다. 모델 라우팅, 관측성, 샌드박스를 매번 새로 만들지 않습니다.
          </p>
        </div>
      </div>
      <ul class="base-grid">
        <li v-for="p in platforms" :key="p.title" class="base-card">
          <a :href="p.href">
            <strong>{{ p.title }}</strong>
            <p>{{ p.description }}</p>
            <span class="link-arrow">자세히 보기 →</span>
          </a>
        </li>
      </ul>
    </section>

    <!-- Maker & Recent Notes -->
    <section class="maker-section page-wrap" aria-labelledby="maker-title">
      <div class="maker-profile">
        <span class="section-tag">ABOUT THE ENGINEER</span>
        <h2 id="maker-title">만든 사람 · devcy0922</h2>
        <p>
          백엔드 및 AI 플랫폼 엔지니어입니다. 금융 퀀트 시스템, 엔터프라이즈 백오피스를 직접 설계·운영해 왔으며,
          현재는 사내 AI 요청의 실행 경계와 감사 원장, 출처 검증 플랫폼을 만들고 있습니다.
        </p>
        <div class="maker-actions">
          <a class="btn btn--primary" href="https://github.com/devcy0922" target="_blank" rel="noopener">GitHub ↗</a>
          <a class="btn btn--secondary" href="/about">경력 및 철학 →</a>
          <a class="btn btn--secondary" href="/rss.xml">RSS 구독</a>
        </div>
      </div>

      <div v-if="posts.length" class="maker-posts">
        <h3>최근 엔지니어링 기록</h3>
        <ul class="notes-list">
          <li v-for="post in posts.slice(0, 4)" :key="post.url" class="note-item">
            <a :href="post.url">
              <strong>{{ post.title }}</strong>
              <time :datetime="post.date">{{ post.dateLabel }}</time>
            </a>
          </li>
        </ul>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home {
  padding-bottom: 120px;
}

/* Hero Section */
.hero-wrap {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: 56px 0 80px;
  border-bottom: 1px solid var(--mist-strong);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 48px;
  align-items: center;
  min-height: min(600px, calc(100vh - 140px));
}

.hero__eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.eyebrow-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #2563eb;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.eyebrow-author {
  color: var(--slate);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.hero h1 {
  margin: 0;
  color: var(--ink);
  font-size: clamp(38px, 5vw, 64px);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.045em;
  word-break: keep-all;
}

.hero__lead {
  max-width: 32em;
  margin: 20px 0 0;
  color: var(--ink-soft);
  font-size: 17px;
  line-height: 1.7;
  word-break: keep-all;
}

.hero__cta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.hero__cta .arrow {
  display: inline-block;
  transition: transform 140ms ease;
}

.hero__cta a:hover .arrow {
  transform: translateX(3px);
}

.btn--lg {
  min-height: 46px;
  padding: 0 22px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 650;
}

.btn--secondary {
  border: 1px solid var(--mist-strong);
  background: var(--paper);
  color: var(--ink);
}

.btn--secondary:hover {
  border-color: var(--ink);
  background: var(--wash);
}

.hero__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 28px;
}

.hero__tags span {
  padding: 4px 10px;
  border: 1px solid var(--mist-strong);
  border-radius: 6px;
  background: var(--wash);
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 550;
}

/* Terminal Stage in Hero */
.hero__stage {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.terminal-card {
  border: 1px solid #2d3748;
  border-radius: 14px;
  background: #111827;
  color: #e2e8f0;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.terminal-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 14px;
  border-bottom: 1px solid #1f2937;
  background: #1f2937;
}

.terminal-bar .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.red { background: #ef4444; }
.dot.yellow { background: #f59e0b; }
.dot.green { background: #10b981; }

.terminal-title {
  margin-left: 8px;
  color: #94a3b8;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 600;
}

.terminal-badge {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
}

.terminal-body {
  padding: 16px 18px 20px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.65;
}

.term-row {
  margin-top: 10px;
  color: #f8fafc;
}

.term-row:first-child {
  margin-top: 0;
}

.term-row .cmd {
  color: #38bdf8;
  margin-right: 6px;
  font-weight: 700;
}

.term-out.success {
  margin-top: 4px;
  color: #a7f3d0;
  font-size: 12px;
}

.term-out.info {
  margin-top: 4px;
  color: #bae6fd;
  font-size: 12px;
}

.hero__floating-shot {
  border: 1px solid var(--mist-strong);
  border-radius: 14px;
  background: var(--paper);
  color: inherit;
  text-decoration: none;
  box-shadow: 0 12px 28px -10px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  transition: transform 160ms ease, border-color 160ms ease;
}

.hero__floating-shot:hover {
  transform: translateY(-2px);
  border-color: #2563eb;
}

.floating-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid var(--mist);
  background: var(--wash);
  font-size: 13px;
  font-weight: 650;
}

.floating-header em {
  color: #2563eb;
  font-style: normal;
  font-weight: 600;
}

.floating-preview {
  padding: 14px 16px;
}

/* Metrics Section */
.metrics-section {
  padding: 32px 0;
  border-bottom: 1px solid var(--mist);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  padding: 18px 20px;
  border: 1px solid var(--mist-strong);
  border-radius: 12px;
  background: var(--wash);
}

.metric-label {
  color: var(--slate);
  font-size: 13px;
  font-weight: 600;
}

.metric-value {
  margin: 6px 0 4px;
  color: var(--ink);
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.metric-note {
  color: var(--ink-soft);
  font-size: 12px;
}

/* Common Section Typography */
.block {
  padding-top: 88px;
}

.section-tag {
  display: inline-block;
  margin-bottom: 8px;
  color: #2563eb;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.block h2 {
  margin: 0;
  color: var(--ink);
  font-size: clamp(28px, 3.2vw, 40px);
  font-weight: 800;
  letter-spacing: -0.04em;
}

.block__lead {
  max-width: 44em;
  margin: 10px 0 0;
  color: var(--slate);
  font-size: 16px;
  line-height: 1.7;
  word-break: keep-all;
}

/* Filter Pills */
.block__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px 32px;
  margin-bottom: 36px;
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--mist-strong);
  border-radius: 999px;
  background: var(--paper);
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 140ms ease;
}

.filter-btn:hover {
  border-color: var(--ink);
  color: var(--ink);
}

.filter-btn.active {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.dot-indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.dot--live { background: var(--live); }
.dot--prototype { background: var(--proto); }
.dot--design { background: var(--design); }

/* Linear Cards Grid */
.linear-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.linear-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--mist-strong);
  border-radius: 16px;
  background: var(--paper);
  overflow: hidden;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.linear-card:hover {
  transform: translateY(-3px);
  border-color: #2563eb;
  box-shadow: 0 16px 36px -12px rgba(37, 99, 235, 0.12);
}

.card__header {
  background: var(--wash);
  border-bottom: 1px solid var(--mist);
  padding: 16px 16px 0;
}

.card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card__area {
  color: var(--slate);
  font-size: 12px;
  font-weight: 600;
}

.state-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
}

.state-badge.state--live {
  background: rgba(22, 163, 74, 0.1);
  color: #15803d;
}

.state-badge.state--prototype {
  background: rgba(36, 80, 230, 0.1);
  color: #1d4ed8;
}

.state-badge.state--design {
  background: rgba(154, 160, 170, 0.15);
  color: #4b5563;
}

.state-badge .state-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.card__shot {
  display: block;
  height: 180px;
  color: inherit;
  text-decoration: none;
  overflow: hidden;
}

.card__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 20px;
}

.card__body h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.3;
}

.card__body h3 a {
  color: var(--ink);
  text-decoration: none;
}

.card__body h3 a:hover {
  color: #2563eb;
}

.card__tagline {
  margin: 8px 0 0;
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  word-break: keep-all;
}

.card__summary {
  margin: 8px 0 16px;
  color: var(--slate);
  font-size: 13px;
  line-height: 1.6;
  word-break: keep-all;
  flex: 1;
}

.card__stack {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 20px;
}

.tech-pill {
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--wash);
  color: var(--slate);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
}

.card__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid var(--mist);
}

.btn-detail {
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-detail:hover {
  color: #2563eb;
}

.btn-live {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--wash);
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.btn-live:hover {
  background: #2563eb;
  color: #ffffff;
}

/* Principles Section */
.principles-section {
  padding-top: 104px;
}

.section-heading-centered {
  text-align: center;
  max-width: 680px;
  margin: 0 auto 48px;
}

.principles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.principle-card {
  padding: 32px 28px;
  border: 1px solid var(--mist-strong);
  border-radius: 16px;
  background: var(--wash);
}

.principle-num {
  display: block;
  color: #2563eb;
  font-family: var(--vp-font-family-mono);
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 12px;
}

.principle-card h3 {
  margin: 0 0 12px;
  color: var(--ink);
  font-size: 17px;
  font-weight: 750;
  line-height: 1.4;
  word-break: keep-all;
}

.principle-card p {
  margin: 0;
  color: var(--slate);
  font-size: 14px;
  line-height: 1.7;
  word-break: keep-all;
}

/* Foundational Platforms */
.base-section {
  padding-top: 104px;
}

.base-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.base-card {
  border: 1px solid var(--mist-strong);
  border-radius: 14px;
  background: var(--paper);
  transition: border-color 140ms ease;
}

.base-card:hover {
  border-color: var(--ink);
}

.base-card a {
  display: flex;
  flex-direction: column;
  padding: 24px;
  color: inherit;
  text-decoration: none;
  height: 100%;
}

.base-card strong {
  color: var(--ink);
  font-size: 17px;
  font-weight: 750;
}

.base-card p {
  margin: 8px 0 16px;
  color: var(--slate);
  font-size: 14px;
  line-height: 1.6;
  flex: 1;
}

.link-arrow {
  color: #2563eb;
  font-size: 13px;
  font-weight: 650;
}

/* Maker Section */
.maker-section {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 56px;
  margin-top: 104px;
  padding: 44px;
  border-radius: 20px;
  background: var(--wash);
  border: 1px solid var(--mist-strong);
}

.maker-profile h2 {
  margin: 0 0 16px;
  color: var(--ink);
  font-size: 26px;
  font-weight: 800;
}

.maker-profile p {
  margin: 0 0 24px;
  color: var(--ink-soft);
  font-size: 15px;
  line-height: 1.75;
  word-break: keep-all;
}

.maker-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.maker-posts h3 {
  margin: 0 0 16px;
  color: var(--ink);
  font-size: 16px;
  font-weight: 750;
}

.notes-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.note-item {
  border-top: 1px solid var(--mist-strong);
}

.note-item a {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  color: inherit;
  text-decoration: none;
}

.note-item strong {
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
}

.note-item time {
  color: var(--slate);
  font-size: 12px;
  white-space: nowrap;
}

.note-item a:hover strong {
  color: #2563eb;
}

/* Responsive */
@media (max-width: 1080px) {
  .linear-cards { grid-template-columns: repeat(2, 1fr); }
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
  .principles-grid { grid-template-columns: 1fr; }
  .base-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 860px) {
  .hero { grid-template-columns: 1fr; gap: 36px; min-height: 0; }
  .maker-section { grid-template-columns: 1fr; gap: 32px; padding: 28px; }
}

@media (max-width: 640px) {
  .linear-cards { grid-template-columns: 1fr; }
  .metrics-grid { grid-template-columns: 1fr; }
  .base-grid { grid-template-columns: 1fr; }
  .block__head { flex-direction: column; align-items: flex-start; }
}
</style>

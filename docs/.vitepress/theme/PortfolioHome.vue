<script setup lang="ts">
/**
 * PortfolioHome — 로케일 기반 다국어 홈페이지 컨테이너
 *
 * ko.json 원본과 LingoAgent가 생성한 en.json / ja.json을 런타임에 로드합니다.
 * 기존 VitePress hero 레이아웃 대신 커스텀 레이아웃으로 렌더링합니다.
 */
import { ref, onMounted } from 'vue'
import { useLocale } from './useLocale'
import LocaleSwitcher from './LocaleSwitcher.vue'

const { t, setLocale, detectInitialLocale, loading } = useLocale()
const isMounted = ref(false)

const projects = [
  {
    href: '/projects/govail-gateway',
    titleKey: 'project.govail.title',
    descKey: 'project.govail.desc',
    typeKey: 'project.govail.meta.type',
    stackKey: 'project.govail.meta.stack',
    status: 'live',
    statusKey: 'status.live',
  },
  {
    href: '/projects/aegis-llm',
    titleKey: 'project.aegis.title',
    descKey: 'project.aegis.desc',
    typeKey: 'project.aegis.meta.type',
    stackKey: 'project.aegis.meta.stack',
    status: 'stable',
    statusKey: 'status.stable',
  },
  {
    href: '/projects/slicerag',
    titleKey: 'project.slicerag.title',
    descKey: 'project.slicerag.desc',
    typeKey: 'project.slicerag.meta.type',
    stackKey: 'project.slicerag.meta.stack',
    status: 'stable',
    statusKey: 'status.stable',
  },
  {
    href: '/projects/agentsecops-playground',
    titleKey: 'project.agentsecops.title',
    descKey: 'project.agentsecops.desc',
    typeKey: 'project.agentsecops.meta.type',
    stackKey: 'project.agentsecops.meta.stack',
    status: 'experimental',
    statusKey: 'status.experimental',
  },
  {
    href: '/projects/lingo-agent',
    titleKey: 'project.lingo.title',
    descKey: 'project.lingo.desc',
    typeKey: 'project.lingo.meta.type',
    stackKey: 'project.lingo.meta.stack',
    status: 'pipeline',
    statusKey: 'status.pipeline',
  },
]

onMounted(async () => {
  const initial = detectInitialLocale()
  await setLocale(initial)
  isMounted.value = true
})
</script>

<template>
  <!-- 언어 전환 바 (우측 상단 고정) -->
  <div class="locale-bar">
    <LocaleSwitcher />
  </div>

  <div v-if="!isMounted" class="loading-skeleton-container">
    <div class="skeleton skeleton-title"></div>
    <div class="skeleton skeleton-subtitle"></div>
    <div class="skeleton skeleton-text"></div>
  </div>

  <div v-else class="portfolio-container">
    <!-- 히어로 섹션 -->
    <div class="portfolio-hero">
      <div class="hero-content">
        <h1 class="hero-name">{{ t('hero.name') }}</h1>
        <p class="hero-text">{{ t('hero.text') }}</p>
        <p class="hero-tagline">{{ t('hero.tagline') }}</p>
        <div class="hero-actions">
          <a href="/projects/govail-gateway" class="btn-primary">{{ t('hero.cta.explore') }}</a>
          <a href="https://github.com/devcy0922" class="btn-secondary" target="_blank" rel="noopener">{{ t('hero.cta.github') }}</a>
          <a href="/#live-demo-title" class="btn-secondary">{{ t('hero.cta.demo') }}</a>
        </div>
      </div>
    </div>

    <!-- 대표 시스템 섹션 -->
    <div class="systems-section">
      <h2 class="section-title">{{ t('section.selectedSystems') }}</h2>
      <p class="section-desc">{{ t('section.selectedSystems.desc') }}</p>

      <div class="project-grid">
        <a
          v-for="proj in projects"
          :key="proj.href"
          class="project-card"
          :href="proj.href"
        >
          <div>
            <h3>
              {{ t(proj.titleKey) }}
              <span :class="`status-badge status-${proj.status}`">{{ t(proj.statusKey) }}</span>
            </h3>
            <p>{{ t(proj.descKey) }}</p>
          </div>
          <div class="project-meta">
            <span>{{ t(proj.typeKey) }}</span>
            <span>{{ t(proj.stackKey) }}</span>
          </div>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 로케일 전환 바 */
.locale-bar {
  display: flex;
  justify-content: flex-end;
  padding: 12px 24px 0;
  max-width: 1152px;
  margin: 0 auto;
}

/* 히어로 */
.portfolio-hero {
  padding: 64px 24px 48px;
  max-width: 1152px;
  margin: 0 auto;
}

.hero-content {
  max-width: 720px;
}

.hero-name {
  font-size: 2.8rem;
  font-weight: 700;
  line-height: 1.1;
  background: linear-gradient(135deg, var(--vp-c-brand-1) 0%, var(--vp-c-brand-2, #7c3aed) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 12px;
}

.hero-text {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 16px;
}

.hero-tagline {
  font-size: 1rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  margin: 0 0 32px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-primary {
  display: inline-block;
  padding: 10px 22px;
  background: var(--vp-c-brand-1);
  color: #fff;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  transition: opacity 0.15s;
}

.btn-primary:hover { opacity: 0.85; }

.btn-secondary {
  display: inline-block;
  padding: 10px 22px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.9rem;
  text-decoration: none;
  transition: border-color 0.15s, background 0.15s;
}

.btn-secondary:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

/* 대표 시스템 */
.systems-section {
  max-width: 1152px;
  margin: 0 auto;
  padding: 0 24px 64px;
}

.section-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 8px;
  border: none !important;
}

.section-desc {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin: 0 0 28px;
  line-height: 1.6;
}

/* loading-skeleton */
.loading-skeleton-container {
  padding: 64px 24px 48px;
  max-width: 1152px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.skeleton {
  background: linear-gradient(90deg, var(--vp-c-bg-mute) 25%, var(--vp-c-bg-soft) 37%, var(--vp-c-bg-mute) 63%);
  background-size: 400% 100%;
  animation: skeleton-loading 1.4s ease infinite;
  border-radius: 4px;
}

.skeleton-title {
  width: 40%;
  height: 48px;
}

.skeleton-subtitle {
  width: 60%;
  height: 32px;
}

.skeleton-text {
  width: 80%;
  height: 24px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>

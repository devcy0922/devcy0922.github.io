<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useLocale } from './useLocale'
import LocaleSwitcher from './LocaleSwitcher.vue'

const { t, setLocale, detectInitialLocale } = useLocale()
const isMounted = ref(false)

const stats = [
  { valueKey: 'home.stats.experience.value', labelKey: 'home.stats.experience' },
  { valueKey: 'home.stats.projects.value', labelKey: 'home.stats.projects' },
  { valueKey: 'home.stats.demo.value', labelKey: 'home.stats.demo' },
]

const experienceAreas = [
  {
    titleKey: 'home.experience.backend.title',
    descKey: 'home.experience.backend.desc',
    skillsKey: 'home.experience.backend.skills',
  },
  {
    titleKey: 'home.experience.identity.title',
    descKey: 'home.experience.identity.desc',
    skillsKey: 'home.experience.identity.skills',
  },
  {
    titleKey: 'home.experience.operations.title',
    descKey: 'home.experience.operations.desc',
    skillsKey: 'home.experience.operations.skills',
  },
]

const projects = [
  {
    href: '/projects/govail-gateway',
    titleKey: 'project.govail.title',
    descKey: 'project.govail.desc',
    typeKey: 'project.govail.meta.type',
    stackKey: 'project.govail.meta.stack',
  },
  {
    href: '/projects/lingo-agent',
    titleKey: 'project.lingo.title',
    descKey: 'project.lingo.desc',
    typeKey: 'project.lingo.meta.type',
    stackKey: 'project.lingo.meta.stack',
  },
  {
    href: '/projects/leandraft-linter',
    titleKey: 'project.leandraft.title',
    descKey: 'project.leandraft.desc',
    typeKey: 'project.leandraft.meta.type',
    stackKey: 'project.leandraft.meta.stack',
  },
]

const evidenceItems = [
  { titleKey: 'home.evidence.repository', meta: '01 · Repository' },
  { titleKey: 'home.evidence.decisions', meta: '02 · Design record' },
  { titleKey: 'home.evidence.runtime', meta: '03 · Live validation' },
]

onMounted(async () => {
  await setLocale(detectInitialLocale())
  isMounted.value = true
})
</script>

<template>
  <main class="portfolio-shell">
    <div class="portfolio-utility">
      <span>devcy0922 · Seoul</span>
      <LocaleSwitcher />
    </div>

    <div v-if="!isMounted" class="portfolio-loading" aria-label="콘텐츠 불러오는 중">
      <span />
      <span />
      <span />
    </div>

    <template v-else>
      <section class="portfolio-hero" aria-labelledby="portfolio-title">
        <p class="hero-role">{{ t('hero.eyebrow') }}</p>
        <h1 id="portfolio-title">{{ t('hero.headline') }}</h1>
        <p class="hero-lead">{{ t('hero.tagline') }}</p>
        <p class="hero-context">{{ t('hero.context') }}</p>

        <div class="hero-actions">
          <a href="/experience" class="btn-primary">{{ t('hero.cta.experience') }}</a>
          <a href="#projects" class="btn-secondary">{{ t('hero.cta.explore') }}</a>
          <a href="https://github.com/devcy0922" class="btn-text" target="_blank" rel="noopener">
            GitHub ↗
          </a>
        </div>
      </section>

      <section class="career-stats" :aria-label="t('home.stats.label')">
        <article v-for="item in stats" :key="item.valueKey">
          <strong>{{ t(item.valueKey) }}</strong>
          <span>{{ t(item.labelKey) }}</span>
        </article>
      </section>

      <section class="home-section" aria-labelledby="experience-title">
        <header class="section-heading">
          <div>
            <p>{{ t('home.experience.label') }}</p>
            <h2 id="experience-title">{{ t('home.experience.title') }}</h2>
          </div>
          <div>
            <p>{{ t('home.experience.desc') }}</p>
            <a href="/experience">{{ t('home.experience.link') }} →</a>
          </div>
        </header>

        <div class="experience-grid">
          <article v-for="area in experienceAreas" :key="area.titleKey">
            <h3>{{ t(area.titleKey) }}</h3>
            <p>{{ t(area.descKey) }}</p>
            <small>{{ t(area.skillsKey) }}</small>
          </article>
        </div>
      </section>

      <section id="projects" class="home-section project-section" aria-labelledby="projects-title">
        <header class="section-heading">
          <div>
            <p>{{ t('home.projects.label') }}</p>
            <h2 id="projects-title">{{ t('home.projects.title') }}</h2>
          </div>
          <p>{{ t('home.projects.desc') }}</p>
        </header>

        <div class="featured-projects">
          <a v-for="project in projects" :key="project.href" :href="project.href" class="featured-project">
            <div>
              <span>{{ t(project.typeKey) }}</span>
              <h3>{{ t(project.titleKey) }}</h3>
              <p>{{ t(project.descKey) }}</p>
            </div>
            <small>{{ t(project.stackKey) }}</small>
          </a>
        </div>
      </section>

      <section class="evidence-preview" aria-labelledby="evidence-preview-title">
        <div class="evidence-preview__copy">
          <p>{{ t('home.evidence.label') }}</p>
          <h2 id="evidence-preview-title">{{ t('home.evidence.title') }}</h2>
          <p>{{ t('home.evidence.desc') }}</p>
          <div class="evidence-actions">
            <a href="/projects/" class="btn-primary">{{ t('home.evidence.cta') }} →</a>
            <a href="/live-demo" class="btn-text">{{ t('home.evidence.demo') }} →</a>
          </div>
        </div>

        <ol class="evidence-list" :aria-label="t('home.evidence.listLabel')">
          <li v-for="(item, index) in evidenceItems" :key="item.titleKey">
            <span>{{ index + 1 }}</span>
            <div>
              <small>{{ item.meta }}</small>
              <strong>{{ t(item.titleKey) }}</strong>
            </div>
          </li>
        </ol>
      </section>
    </template>
  </main>
</template>

<style scoped>
.portfolio-shell { max-width: 1080px; margin: 0 auto; padding: 0 24px 96px; }
.portfolio-utility { display: flex; align-items: center; justify-content: space-between; min-height: 52px; border-bottom: 1px solid var(--border-default); color: var(--text-muted); font-size: 11px; }
.portfolio-loading { display: grid; gap: 16px; padding: 80px 0; }
.portfolio-loading span { height: 18px; border-radius: 4px; background: var(--surface-muted); }
.portfolio-loading span:first-child { width: 42%; height: 52px; }
.portfolio-loading span:nth-child(2) { width: 66%; }
.portfolio-loading span:last-child { width: 52%; }

.portfolio-hero { max-width: 850px; padding: 104px 0 72px; }
.hero-role { margin: 0 0 18px; color: var(--accent-primary); font-size: 13px; font-weight: 650; }
.portfolio-hero h1 { max-width: 900px; margin: 0; border: 0; padding: 0; color: var(--text-primary); font-size: clamp(40px, 5.4vw, 64px); font-weight: 720; letter-spacing: -.05em; line-height: 1.12; word-break: keep-all; }
.hero-lead { max-width: 720px; margin: 28px 0 0; color: var(--text-secondary); font-size: 19px; line-height: 1.7; }
.hero-context { max-width: 720px; margin: 14px 0 0; color: var(--text-muted); font-size: 14px; line-height: 1.75; }
.hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 36px; }
.hero-actions a,
.evidence-actions a { border-radius: 7px; padding: 11px 17px; font-size: 13px; font-weight: 650; text-decoration: none; }
.btn-primary { border: 1px solid var(--accent-primary); background: var(--accent-primary); color: white !important; }
.btn-secondary { border: 1px solid var(--border-strong); background: var(--surface-raised); color: var(--text-primary) !important; }
.btn-text { color: var(--text-secondary) !important; }
.hero-actions a:hover,
.evidence-actions a:hover { opacity: .84; }

.career-stats { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--border-default); border-bottom: 1px solid var(--border-default); }
.career-stats article { display: grid; gap: 5px; border-right: 1px solid var(--border-default); padding: 26px 28px; }
.career-stats article:first-child { padding-left: 0; }
.career-stats article:last-child { border-right: 0; }
.career-stats strong { color: var(--text-primary); font-size: 28px; letter-spacing: -.03em; }
.career-stats span { color: var(--text-muted); font-size: 12px; }

.home-section { padding-top: 104px; }
.section-heading { display: grid; grid-template-columns: minmax(260px, .8fr) minmax(0, 1fr); gap: 64px; align-items: end; }
.section-heading > div:first-child > p,
.evidence-preview__copy > p:first-child { margin: 0; color: var(--text-muted); font-size: 11px; font-weight: 650; }
.section-heading h2,
.evidence-preview h2 { margin: 8px 0 0; border: 0; padding: 0; color: var(--text-primary); font-size: 30px; letter-spacing: -.03em; word-break: keep-all; }
.section-heading > p,
.section-heading > div:last-child > p { max-width: 600px; margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.75; }
.section-heading > div:last-child > a { display: inline-block; margin-top: 12px; color: var(--text-primary); font-size: 13px; font-weight: 650; text-decoration: none; }
.section-heading a:hover { color: var(--accent-primary); }

.experience-grid,
.featured-projects { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 30px; }
.experience-grid article,
.featured-project { min-height: 205px; border: 1px solid var(--border-default); border-radius: 9px; background: var(--surface-raised); padding: 24px; }
.experience-grid article { display: flex; flex-direction: column; }
.experience-grid h3,
.featured-project h3 { margin: 0 0 12px; border: 0; padding: 0; color: var(--text-primary); font-size: 17px; word-break: keep-all; }
.experience-grid p,
.featured-project p { margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.7; }
.experience-grid small { margin-top: auto; padding-top: 24px; color: var(--text-muted); font-size: 10px; }

.featured-project { display: flex; flex-direction: column; justify-content: space-between; color: inherit !important; text-decoration: none !important; transition: border-color 150ms ease, transform 150ms ease; }
.featured-project:hover { transform: translateY(-2px); border-color: var(--border-strong); }
.featured-project span { display: block; margin-bottom: 18px; color: var(--text-muted); font-size: 10px; }
.featured-project small { margin-top: 24px; color: var(--text-muted); font-size: 10px; }

.evidence-preview { display: grid; grid-template-columns: minmax(0, .95fr) minmax(360px, 1fr); gap: 72px; align-items: center; margin-top: 112px; border-top: 1px solid var(--border-default); border-bottom: 1px solid var(--border-default); padding: 48px 0; }
.evidence-preview__copy > p:not(:first-child) { margin: 18px 0 28px; color: var(--text-secondary); font-size: 14px; line-height: 1.75; }
.evidence-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.evidence-actions .btn-text { padding-right: 4px; }
.evidence-list { margin: 0; padding: 0; list-style: none; }
.evidence-list li { display: grid; grid-template-columns: 34px 1fr; gap: 14px; align-items: center; min-height: 74px; border-bottom: 1px solid var(--border-default); }
.evidence-list li:last-child { border-bottom: 0; }
.evidence-list li > span { display: grid; place-items: center; width: 27px; height: 27px; border: 1px solid var(--border-strong); border-radius: 50%; color: var(--text-muted); font-size: 10px; }
.evidence-list small { display: block; color: var(--text-muted); font-size: 9px; }
.evidence-list strong { display: block; margin-top: 4px; color: var(--text-primary); font-size: 13px; line-height: 1.55; }

@media (max-width: 860px) {
  .portfolio-hero { padding-top: 76px; }
  .section-heading { grid-template-columns: 1fr; gap: 18px; }
  .experience-grid,
  .featured-projects { grid-template-columns: 1fr; }
  .experience-grid article,
  .featured-project { min-height: 0; }
  .evidence-preview { grid-template-columns: 1fr; gap: 36px; }
}

@media (max-width: 640px) {
  .portfolio-shell { padding: 0 20px 72px; }
  .portfolio-utility > span { display: none; }
  .portfolio-utility { justify-content: flex-end; }
  .portfolio-hero { padding: 60px 0 52px; }
  .portfolio-hero h1 { font-size: 42px; }
  .hero-lead { font-size: 17px; }
  .career-stats { grid-template-columns: 1fr; }
  .career-stats article,
  .career-stats article:first-child { border-right: 0; border-bottom: 1px solid var(--border-default); padding: 20px 0; }
  .career-stats article:last-child { border-bottom: 0; }
  .home-section { padding-top: 76px; }
  .evidence-preview { margin-top: 84px; padding: 36px 0; }
}

@media (prefers-reduced-motion: reduce) {
  .featured-project { transition: none; }
}
</style>

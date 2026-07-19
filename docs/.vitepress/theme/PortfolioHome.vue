<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useLocale } from './useLocale'
import LocaleSwitcher from './LocaleSwitcher.vue'

const { t, setLocale, detectInitialLocale } = useLocale()
const isMounted = ref(false)

const capabilities = [
  { index: '01', titleKey: 'capability.boundary.title', descKey: 'capability.boundary.desc' },
  { index: '02', titleKey: 'capability.delivery.title', descKey: 'capability.delivery.desc' },
  { index: '03', titleKey: 'capability.runtime.title', descKey: 'capability.runtime.desc' },
]

const operatingPath = [
  { labelKey: 'path.identity', meta: 'AuthN · AuthZ' },
  { labelKey: 'path.tenant', meta: 'Scope · Quota' },
  { labelKey: 'path.runtime', meta: 'Route · Infer' },
  { labelKey: 'path.observe', meta: 'Trace · Audit' },
]

const projects = [
  {
    href: '/projects/govail-gateway',
    index: '01',
    titleKey: 'project.govail.title',
    descKey: 'project.govail.desc',
    typeKey: 'project.govail.meta.type',
    stackKey: 'project.govail.meta.stack',
    status: 'live',
    statusKey: 'status.live',
  },
  {
    href: '/projects/aegis-llm',
    index: '02',
    titleKey: 'project.aegis.title',
    descKey: 'project.aegis.desc',
    typeKey: 'project.aegis.meta.type',
    stackKey: 'project.aegis.meta.stack',
    status: 'stable',
    statusKey: 'status.stable',
  },
  {
    href: '/projects/slicerag',
    index: '03',
    titleKey: 'project.slicerag.title',
    descKey: 'project.slicerag.desc',
    typeKey: 'project.slicerag.meta.type',
    stackKey: 'project.slicerag.meta.stack',
    status: 'stable',
    statusKey: 'status.stable',
  },
  {
    href: '/projects/agentsecops-playground',
    index: '04',
    titleKey: 'project.agentsecops.title',
    descKey: 'project.agentsecops.desc',
    typeKey: 'project.agentsecops.meta.type',
    stackKey: 'project.agentsecops.meta.stack',
    status: 'experimental',
    statusKey: 'status.experimental',
  },
  {
    href: '/projects/lingo-agent',
    index: '05',
    titleKey: 'project.lingo.title',
    descKey: 'project.lingo.desc',
    typeKey: 'project.lingo.meta.type',
    stackKey: 'project.lingo.meta.stack',
    status: 'pipeline',
    statusKey: 'status.pipeline',
  },
]

onMounted(async () => {
  await setLocale(detectInitialLocale())
  isMounted.value = true
})
</script>

<template>
  <div class="portfolio-shell">
    <div class="portfolio-utility">
      <span>{{ t('utility.availability') }}</span>
      <LocaleSwitcher />
    </div>

    <div v-if="!isMounted" class="portfolio-loading" aria-label="콘텐츠 불러오는 중">
      <span />
      <span />
      <span />
    </div>

    <template v-else>
      <section class="portfolio-hero" aria-labelledby="portfolio-title">
        <div class="hero-copy">
          <p class="hero-eyebrow">{{ t('hero.eyebrow') }}</p>
          <h1 id="portfolio-title">{{ t('hero.headline') }}</h1>
          <p class="hero-lead">{{ t('hero.tagline') }}</p>
          <div class="hero-actions">
            <a href="/#live-demo-title" class="btn-primary">{{ t('hero.cta.demo') }}</a>
            <a href="/projects/govail-gateway" class="btn-secondary">{{ t('hero.cta.explore') }}</a>
            <a href="https://github.com/devcy0922" class="btn-tertiary" target="_blank" rel="noopener">{{ t('hero.cta.github') }} ↗</a>
          </div>
        </div>

        <aside class="operating-surface" aria-label="운영 책임 경로">
          <div class="operating-surface__head">
            <span>OPERATING SURFACE</span>
            <strong>{{ t('path.caption') }}</strong>
          </div>
          <ol>
            <li v-for="(item, index) in operatingPath" :key="item.labelKey">
              <span>0{{ index + 1 }}</span>
              <div>
                <strong>{{ t(item.labelKey) }}</strong>
                <small>{{ item.meta }}</small>
              </div>
            </li>
          </ol>
          <p>{{ t('path.boundary') }}</p>
        </aside>
      </section>

      <section class="capability-strip" aria-label="핵심 엔지니어링 역량">
        <article v-for="item in capabilities" :key="item.index">
          <span>{{ item.index }}</span>
          <div>
            <h2>{{ t(item.titleKey) }}</h2>
            <p>{{ t(item.descKey) }}</p>
          </div>
        </article>
      </section>

      <section class="systems-section" aria-labelledby="systems-title">
        <header class="section-heading">
          <div>
            <p>SELECTED SYSTEMS</p>
            <h2 id="systems-title">{{ t('section.selectedSystems') }}</h2>
          </div>
          <p>{{ t('section.selectedSystems.desc') }}</p>
        </header>

        <div class="project-grid">
          <a v-for="proj in projects" :key="proj.href" class="project-card" :href="proj.href">
            <div>
              <span class="project-index">{{ proj.index }}</span>
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
      </section>

      <div class="live-lab-intro">
        <div>
          <span>EXECUTABLE EVIDENCE</span>
          <h2>{{ t('lab.intro.title') }}</h2>
        </div>
        <p>{{ t('lab.intro.desc') }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.portfolio-shell { max-width: 1152px; margin: 0 auto; padding: 0 24px; }
.portfolio-utility { display: flex; align-items: center; justify-content: space-between; min-height: 52px; border-bottom: 1px solid var(--border-default); color: var(--text-muted); font: 10px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .06em; }
.portfolio-loading { display: grid; gap: 16px; padding: 80px 0; }
.portfolio-loading span { height: 18px; border-radius: 4px; background: var(--surface-muted); }
.portfolio-loading span:first-child { width: 38%; height: 48px; }
.portfolio-loading span:nth-child(2) { width: 62%; }
.portfolio-loading span:last-child { width: 48%; }
.portfolio-hero { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(320px, .75fr); gap: 72px; align-items: center; padding: 88px 0 72px; }
.hero-copy { max-width: 720px; }
.hero-eyebrow,
.section-heading > div > p,
.live-lab-intro span { margin: 0; color: var(--text-muted); font: 10px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .12em; }
.hero-copy h1 { max-width: 700px; margin: 14px 0 20px; border: 0; padding: 0; color: var(--text-primary); font-size: clamp(38px, 5vw, 60px); font-weight: 700; letter-spacing: -.045em; line-height: 1.12; }
.hero-lead { max-width: 650px; margin: 0; color: var(--text-secondary); font-size: 16px; line-height: 1.75; }
.hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 32px; }
.hero-actions a { border-radius: 7px; padding: 10px 16px; font-size: 12px; font-weight: 620; text-decoration: none; }
.btn-primary { border: 1px solid var(--accent-primary); background: var(--accent-primary); color: white; }
.btn-secondary { border: 1px solid var(--border-strong); background: var(--surface-raised); color: var(--text-primary); }
.btn-tertiary { color: var(--text-secondary); }
.hero-actions a:hover { opacity: .84; }
.operating-surface { border: 1px solid var(--border-default); border-radius: 9px; background: var(--surface-raised); padding: 18px; }
.operating-surface__head { display: grid; gap: 4px; border-bottom: 1px solid var(--border-default); padding-bottom: 14px; }
.operating-surface__head span { color: var(--text-muted); font: 9px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .1em; }
.operating-surface__head strong { color: var(--text-secondary); font-size: 11px; font-weight: 500; }
.operating-surface ol { margin: 0; padding: 10px 0; list-style: none; }
.operating-surface li { position: relative; display: grid; grid-template-columns: 30px 1fr; gap: 10px; align-items: center; min-height: 54px; border-bottom: 1px solid var(--border-default); }
.operating-surface li:last-child { border: 0; }
.operating-surface li > span { color: var(--text-muted); font: 10px ui-monospace, SFMono-Regular, Menlo, monospace; }
.operating-surface li strong { display: block; color: var(--text-primary); font-size: 12px; font-weight: 620; }
.operating-surface li small { display: block; margin-top: 3px; color: var(--text-muted); font: 9px ui-monospace, SFMono-Regular, Menlo, monospace; }
.operating-surface > p { margin: 10px 0 0; color: var(--text-muted); font-size: 10px; line-height: 1.5; }
.capability-strip { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--border-default); border-radius: 8px; background: var(--surface-raised); }
.capability-strip article { display: grid; grid-template-columns: 30px 1fr; gap: 10px; border-right: 1px solid var(--border-default); padding: 20px; }
.capability-strip article:last-child { border-right: 0; }
.capability-strip article > span { color: var(--text-muted); font: 10px ui-monospace, SFMono-Regular, Menlo, monospace; }
.capability-strip h2 { margin: 0 0 6px; border: 0; padding: 0; color: var(--text-primary); font-size: 13px; font-weight: 650; }
.capability-strip p { margin: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.6; }
.systems-section { padding: 88px 0 48px; }
.section-heading { display: grid; grid-template-columns: minmax(280px, .7fr) minmax(0, 1fr); gap: 48px; align-items: end; }
.section-heading h2 { margin: 8px 0 0; border: 0; padding: 0; color: var(--text-primary); font-size: 28px; letter-spacing: -.025em; }
.section-heading > p { max-width: 600px; margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.7; }
.project-index { display: block; margin-bottom: 20px; color: var(--text-muted); font: 10px ui-monospace, SFMono-Regular, Menlo, monospace; }
.live-lab-intro { display: grid; grid-template-columns: minmax(300px, .8fr) minmax(0, 1fr); gap: 48px; align-items: end; border-top: 1px solid var(--border-default); padding: 48px 0 0; }
.live-lab-intro h2 { margin: 8px 0 0; border: 0; padding: 0; color: var(--text-primary); font-size: 26px; letter-spacing: -.02em; }
.live-lab-intro > p { margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.7; }
@media (max-width: 900px) {
  .portfolio-hero { grid-template-columns: 1fr; gap: 40px; padding-top: 64px; }
  .operating-surface { max-width: 560px; }
  .capability-strip { grid-template-columns: 1fr; }
  .capability-strip article { border-right: 0; border-bottom: 1px solid var(--border-default); }
  .capability-strip article:last-child { border-bottom: 0; }
}
@media (max-width: 768px) {
  .portfolio-shell { padding: 0 20px; }
  .portfolio-utility > span { display: none; }
  .portfolio-utility { justify-content: flex-end; }
  .portfolio-hero { padding: 48px 0 56px; }
  .hero-copy h1 { font-size: 40px; }
  .section-heading,
  .live-lab-intro { grid-template-columns: 1fr; gap: 16px; }
  .systems-section { padding-top: 64px; }
}
</style>

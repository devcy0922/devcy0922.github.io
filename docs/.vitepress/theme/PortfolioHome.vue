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

const careerBridge = [
  { titleKey: 'career.identity.title', descKey: 'career.identity.desc', meta: 'SSO · AuthN · AuthZ' },
  { titleKey: 'career.delivery.title', descKey: 'career.delivery.desc', meta: 'CI/CD · Docker · AWS' },
  { titleKey: 'career.operations.title', descKey: 'career.operations.desc', meta: 'Audit · Incident · Legacy' },
]

const coreComponents = [
  {
    href: '/projects/aegis-llm',
    index: '01',
    titleKey: 'project.aegis.title',
    descKey: 'project.aegis.desc',
    typeKey: 'project.aegis.meta.type',
    stackKey: 'project.aegis.meta.stack',
    status: 'mvp',
    statusKey: 'status.mvp',
  },
  {
    href: '/projects/aperture-mcp',
    index: '02',
    titleKey: 'project.aperture.title',
    descKey: 'project.aperture.desc',
    typeKey: 'project.aperture.meta.type',
    stackKey: 'project.aperture.meta.stack',
    status: 'mvp',
    statusKey: 'status.mvp',
  },
  {
    href: '/projects/slicerag',
    index: '03',
    titleKey: 'project.slicerag.title',
    descKey: 'project.slicerag.desc',
    typeKey: 'project.slicerag.meta.type',
    stackKey: 'project.slicerag.meta.stack',
    status: 'mvp',
    statusKey: 'status.mvp',
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
          <p class="hero-context">{{ t('hero.context') }}</p>
          <div class="hero-actions">
            <a href="/#live-demo-title" class="btn-primary">{{ t('hero.cta.demo') }}</a>
            <a href="/experience" class="btn-secondary">{{ t('hero.cta.experience') }}</a>
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

      <section class="career-section" aria-labelledby="career-title">
        <header class="section-heading">
          <div>
            <p>PRODUCTION EXPERIENCE → AI PLATFORM</p>
            <h2 id="career-title">{{ t('career.title') }}</h2>
          </div>
          <div class="section-heading__copy">
            <p>{{ t('career.desc') }}</p>
            <a href="/experience">{{ t('career.link') }} →</a>
          </div>
        </header>

        <div class="career-bridge">
          <article v-for="item in careerBridge" :key="item.titleKey">
            <small>{{ item.meta }}</small>
            <h3>{{ t(item.titleKey) }}</h3>
            <p>{{ t(item.descKey) }}</p>
          </article>
          <div class="career-bridge__destination">
            <span>EXTENDED INTO</span>
            <strong>{{ t('career.destination') }}</strong>
          </div>
        </div>
      </section>

      <section class="systems-section" aria-labelledby="systems-title">
        <header class="section-heading">
          <div>
            <p>SELECTED SYSTEMS</p>
            <h2 id="systems-title">{{ t('section.selectedSystems') }}</h2>
          </div>
          <p>{{ t('section.selectedSystems.desc') }}</p>
        </header>

        <div class="system-map" aria-label="GoVail 플랫폼 프로젝트 관계도">
          <a class="system-platform" href="/projects/govail-gateway">
            <div>
              <span>{{ t('system.platform.label') }}</span>
              <h3>{{ t('project.govail.title') }}</h3>
              <p>{{ t('project.govail.desc') }}</p>
            </div>
            <strong>{{ t('project.govail.meta.stack') }}</strong>
          </a>

          <div class="system-connector" aria-hidden="true">
            <span>{{ t('system.core.label') }}</span>
          </div>

          <div class="system-components">
            <a v-for="proj in coreComponents" :key="proj.href" class="project-card" :href="proj.href">
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

          <div class="system-connector system-connector--validation" aria-hidden="true">
            <span>{{ t('system.validation.label') }}</span>
          </div>

          <a class="system-validation" href="/projects/agentsecops-playground">
            <div>
              <span>{{ t('system.validation.role') }}</span>
              <h3>{{ t('project.agentsecops.title') }}</h3>
            </div>
            <p>{{ t('project.agentsecops.desc') }}</p>
            <strong>{{ t('project.agentsecops.meta.stack') }}</strong>
          </a>
        </div>
      </section>

      <div class="live-lab-intro">
        <div>
          <span>EXECUTABLE EVIDENCE</span>
          <h2>{{ t('lab.intro.title') }}</h2>
        </div>
        <div class="live-lab-intro__copy">
          <p>{{ t('lab.intro.desc') }}</p>
          <a href="/operational-evidence">{{ t('lab.intro.evidence') }} →</a>
        </div>
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
.hero-context { max-width: 650px; margin: 16px 0 0; border-left: 2px solid var(--accent-primary); padding-left: 14px; color: var(--text-muted); font-size: 12px; line-height: 1.7; }
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
.career-section { padding: 88px 0 0; }
.systems-section { padding: 104px 0 48px; }
.section-heading { display: grid; grid-template-columns: minmax(280px, .7fr) minmax(0, 1fr); gap: 48px; align-items: end; }
.section-heading h2 { margin: 8px 0 0; border: 0; padding: 0; color: var(--text-primary); font-size: 28px; letter-spacing: -.025em; }
.section-heading > p,
.section-heading__copy > p { max-width: 600px; margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.7; }
.section-heading__copy a { display: inline-block; margin-top: 12px; color: var(--text-primary); font-size: 12px; font-weight: 650; text-decoration: none; }
.section-heading__copy a:hover { color: var(--accent-primary); }
.career-bridge { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 24px; border: 1px solid var(--border-default); border-radius: 8px; overflow: hidden; background: var(--border-default); }
.career-bridge article { min-height: 180px; background: var(--surface-raised); padding: 22px; }
.career-bridge article small { color: var(--text-muted); font: 9px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .06em; }
.career-bridge article h3 { margin: 22px 0 8px; border: 0; padding: 0; color: var(--text-primary); font-size: 14px; }
.career-bridge article p { margin: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.65; }
.career-bridge__destination { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; gap: 14px; background: color-mix(in srgb, var(--accent-primary) 9%, var(--surface-raised)); padding: 14px 22px; text-align: center; }
.career-bridge__destination span { color: var(--text-muted); font: 9px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .1em; }
.career-bridge__destination strong { color: var(--text-primary); font-size: 12px; }
.system-map { margin-top: 28px; }
.system-platform { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; border: 1px solid color-mix(in srgb, var(--accent-primary) 50%, var(--border-default)); border-radius: 9px; background: linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 12%, var(--surface-raised)), var(--surface-raised)); padding: 28px 30px; color: inherit !important; text-decoration: none !important; }
.system-platform:hover { border-color: var(--accent-primary); }
.system-platform span,
.system-validation span { color: var(--text-muted); font: 9px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .1em; }
.system-platform h3 { margin: 8px 0; border: 0; padding: 0; color: var(--text-primary); font-size: 22px; }
.system-platform p { max-width: 700px; margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.65; }
.system-platform > strong,
.system-validation > strong { flex: 0 0 auto; color: var(--text-muted); font: 10px ui-monospace, SFMono-Regular, Menlo, monospace; }
.system-connector { position: relative; display: flex; justify-content: center; min-height: 54px; }
.system-connector::before { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--border-strong); content: ''; }
.system-connector span { z-index: 1; align-self: center; border: 1px solid var(--border-default); border-radius: 999px; background: var(--surface-base); padding: 4px 9px; color: var(--text-muted); font: 9px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .06em; }
.system-components { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.system-components .project-card { min-height: 218px; }
.system-connector--validation { min-height: 48px; }
.system-validation { display: grid; grid-template-columns: minmax(180px, .6fr) minmax(0, 1fr) auto; gap: 24px; align-items: center; border: 1px dashed var(--border-strong); border-radius: 8px; background: var(--surface-raised); padding: 20px 24px; color: inherit !important; text-decoration: none !important; }
.system-validation:hover { border-color: var(--accent-primary); }
.system-validation h3 { margin: 5px 0 0; border: 0; padding: 0; color: var(--text-primary); font-size: 15px; }
.system-validation p { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.6; }
.project-index { display: block; margin-bottom: 20px; color: var(--text-muted); font: 10px ui-monospace, SFMono-Regular, Menlo, monospace; }
.live-lab-intro { display: grid; grid-template-columns: minmax(300px, .8fr) minmax(0, 1fr); gap: 48px; align-items: end; border-top: 1px solid var(--border-default); padding: 48px 0 0; }
.live-lab-intro h2 { margin: 8px 0 0; border: 0; padding: 0; color: var(--text-primary); font-size: 26px; letter-spacing: -.02em; }
.live-lab-intro__copy > p { margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.7; }
.live-lab-intro__copy > a { display: inline-block; margin-top: 12px; color: var(--text-primary); font-size: 12px; font-weight: 650; text-decoration: none; }
.live-lab-intro__copy > a:hover { color: var(--accent-primary); }
@media (max-width: 900px) {
  .portfolio-hero { grid-template-columns: 1fr; gap: 40px; padding-top: 64px; }
  .operating-surface { max-width: 560px; }
  .capability-strip { grid-template-columns: 1fr; }
  .capability-strip article { border-right: 0; border-bottom: 1px solid var(--border-default); }
  .capability-strip article:last-child { border-bottom: 0; }
  .career-bridge { grid-template-columns: 1fr; }
  .career-bridge__destination { grid-column: auto; }
  .system-components { grid-template-columns: 1fr; }
  .system-validation { grid-template-columns: 1fr; gap: 10px; }
}
@media (max-width: 768px) {
  .portfolio-shell { padding: 0 20px; }
  .portfolio-utility > span { display: none; }
  .portfolio-utility { justify-content: flex-end; }
  .portfolio-hero { padding: 48px 0 56px; }
  .hero-copy h1 { font-size: 40px; }
  .section-heading,
  .live-lab-intro { grid-template-columns: 1fr; gap: 16px; }
  .career-section { padding-top: 64px; }
  .systems-section { padding-top: 80px; }
  .system-platform { align-items: flex-start; flex-direction: column; gap: 18px; padding: 24px; }
  .system-validation { padding: 20px; }
}
</style>

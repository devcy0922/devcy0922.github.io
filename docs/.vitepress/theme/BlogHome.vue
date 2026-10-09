<script setup>
import { computed } from 'vue'
import { data as posts } from '../../posts.data.js'
import projects from '../../selected-projects.js'

const CONSOLE_URL = 'https://console.govail.cloud'

const latestPosts = computed(() => posts.slice(0, 3))
const otherProjects = computed(() => projects.filter((project) => project.title !== 'GoVail Gateway').slice(0, 4))
</script>

<template>
  <main class="hub">
    <header class="hub-intro">
      <p class="hub-kicker">devcy0922</p>
      <h1>Backend &amp; AI Platform Engineer</h1>
      <p class="hub-lead">
        10년차 개발자입니다. 그룹웨어·B2B·백오피스 같은 업무 시스템을 만들고 운영해 왔고,
        지금은 AI가 실제 업무를 수행할 때 필요한 실행 경계와 검증, 운영 기반을 만듭니다.
      </p>
      <p class="hub-links">
        <a href="https://github.com/devcy0922">GitHub ↗</a>
        <a href="/about">소개</a>
        <a href="/rss.xml">RSS</a>
      </p>
    </header>

    <section class="hub-section" aria-labelledby="hub-now">
      <h2 id="hub-now">지금 만드는 것</h2>
      <a class="hub-feature" :href="CONSOLE_URL">
        <div>
          <strong>GoVail</strong>
          <p>모델 접근 정책, 에이전트 실행, 증적과 감사를 한 경계에서 다루는 AI 운영 플랫폼. 제품 소개와 데모, 콘솔은 GoVail Console에서 봅니다.</p>
        </div>
        <span aria-hidden="true">console.govail.cloud ↗</span>
      </a>
    </section>

    <section class="hub-section" aria-labelledby="hub-projects">
      <h2 id="hub-projects">다른 프로젝트</h2>
      <ul class="hub-list">
        <li v-for="project in otherProjects" :key="project.title">
          <a :href="project.href">
            <strong>{{ project.title }}</strong>
            <span>{{ project.description }}</span>
          </a>
        </li>
      </ul>
      <p class="hub-more"><a href="/projects/">전체 프로젝트</a></p>
    </section>

    <section v-if="latestPosts.length" class="hub-section" aria-labelledby="hub-notes">
      <h2 id="hub-notes">기록</h2>
      <ul class="hub-list">
        <li v-for="post in latestPosts" :key="post.url">
          <a :href="post.url">
            <strong>{{ post.title }}</strong>
            <time :datetime="post.date">{{ post.dateLabel }}</time>
          </a>
        </li>
      </ul>
      <p class="hub-more"><a href="/posts/">모든 기록</a></p>
    </section>
  </main>
</template>

<style scoped>
.hub {
  max-width: 720px;
  margin: 0 auto;
  padding: 72px 24px 96px;
}

.hub-kicker {
  margin: 0 0 12px;
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  color: var(--vp-c-text-3);
}

.hub h1 {
  margin: 0;
  font-size: clamp(30px, 6vw, 44px);
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: -0.02em;
  border: 0;
}

.hub-lead {
  margin: 20px 0 0;
  font-size: 17px;
  line-height: 1.8;
  color: var(--vp-c-text-2);
}

.hub-links {
  display: flex;
  gap: 20px;
  margin: 20px 0 0;
  font-size: 15px;
}

.hub-links a,
.hub-more a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.hub-links a:hover,
.hub-more a:hover {
  text-decoration: underline;
}

.hub-section {
  margin-top: 56px;
}

.hub-section h2 {
  margin: 0 0 16px;
  padding: 0;
  border: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
}

.hub-feature {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 22px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s;
}

.hub-feature:hover,
.hub-feature:focus-visible {
  border-color: var(--vp-c-brand-1);
}

.hub-feature strong {
  font-size: 18px;
}

.hub-feature p {
  margin: 6px 0 0;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.hub-feature > span {
  flex: none;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-brand-1);
}

.hub-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--vp-c-divider);
}

.hub-list li {
  margin: 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.hub-list a {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 24px;
  padding: 14px 0;
  color: inherit;
  text-decoration: none;
}

.hub-list a:hover strong,
.hub-list a:focus-visible strong {
  color: var(--vp-c-brand-1);
}

.hub-list strong {
  font-weight: 600;
}

.hub-list span,
.hub-list time {
  color: var(--vp-c-text-3);
  font-size: 14px;
  text-align: right;
}

.hub-list span {
  max-width: 60%;
  line-height: 1.6;
}

.hub-more {
  margin: 12px 0 0;
  font-size: 14px;
}

@media (max-width: 640px) {
  .hub {
    padding: 48px 16px 72px;
  }

  .hub-feature,
  .hub-list a {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .hub-list span,
  .hub-list time {
    max-width: none;
    text-align: left;
  }
}
</style>

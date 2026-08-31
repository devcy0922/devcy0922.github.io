<script setup>
import { computed } from 'vue'
import { data as posts } from '../../posts.data.js'

const latestPosts = computed(() => posts.slice(0, 4))

const projects = [
  {
    type: 'AI Platform',
    title: 'GoVail Gateway',
    description: 'LLM 앞에 이것저것 붙이다가, 결국 Gateway가 어디까지 해야 하는지 다시 줄여본 프로젝트.',
    href: '/projects/govail-gateway',
  },
  {
    type: 'Automation',
    title: 'LingoAgent',
    description: '번역하고 끝내지 않고 검증, QA, 커밋까지 이어지게 만든 자동화 작업.',
    href: '/projects/lingo-agent',
  },
  {
    type: 'Developer Tool',
    title: 'Leandraft Linter',
    description: '설계 문서를 커밋하기 전에 구조와 민감정보를 먼저 확인해보려고 만든 작은 도구.',
    href: '/projects/leandraft-linter',
  },
]
</script>

<template>
  <main class="dev-home">
    <section class="identity-hero" aria-labelledby="home-title">
      <p class="utility-label"><span class="status-dot" aria-hidden="true" /> devcy0922 / engineering log</p>

      <h1 id="home-title">
        만들고 고치고 운영하면서,
        <span>배운 걸 적어둡니다.</span>
      </h1>

      <p class="hero-copy">
        백엔드 개발과 서비스 운영 자동화를 주로 해왔습니다.
        요즘은 로컬 LLM, AI 도구, 작은 제품들을 직접 붙여보면서 어디까지 실무에 쓸 만한지 보는 중입니다.
      </p>

      <div class="hero-actions">
        <a class="action-primary" href="/posts/">최근 글 읽기</a>
        <a class="action-quiet" href="https://github.com/devcy0922" target="_blank" rel="noopener">GitHub 보기 ↗</a>
      </div>
    </section>

    <div class="trace-shell" aria-label="개발하면서 반복하는 일">
      <div class="trace-line" aria-hidden="true" />
      <ol class="trace-rail">
        <li><span>build</span><strong>일단 만든다</strong></li>
        <li><span>break</span><strong>어디서 깨지는지 본다</strong></li>
        <li><span>fix</span><strong>고친다</strong></li>
        <li><span>operate</span><strong>계속 굴려본다</strong></li>
        <li><span>write</span><strong>잊기 전에 적는다</strong></li>
      </ol>
    </div>

    <section class="home-section" aria-labelledby="latest-title">
      <header class="section-head">
        <div>
          <p class="utility-label">Latest writing</p>
          <h2 id="latest-title">최근 기록</h2>
        </div>
        <a href="/posts/">모든 글 →</a>
      </header>

      <div class="post-ledger">
        <a v-for="post in latestPosts" :key="post.url" class="ledger-row" :href="post.url">
          <time :datetime="post.date">{{ post.date }}</time>
          <div class="ledger-copy">
            <div class="tag-line">
              <span v-for="tag in post.tags.slice(0, 2)" :key="tag">{{ tag }}</span>
            </div>
            <h3>{{ post.title }}</h3>
            <p>{{ post.description }}</p>
          </div>
          <span class="row-arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>

    <section class="home-section" aria-labelledby="work-title">
      <header class="section-head">
        <div>
          <p class="utility-label">Selected work</p>
          <h2 id="work-title">만들어본 것</h2>
        </div>
        <a href="/projects/">프로젝트 보기 →</a>
      </header>

      <div class="work-ledger">
        <a v-for="project in projects" :key="project.title" class="work-row" :href="project.href">
          <span class="work-type">{{ project.type }}</span>
          <div>
            <h3>{{ project.title }}</h3>
            <p>{{ project.description }}</p>
          </div>
          <span class="row-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </section>

    <aside class="current-note">
      <div>
        <p class="utility-label">These days</p>
        <strong>backend · automation · local LLM · small products</strong>
      </div>
      <p>
        회사에서는 오래된 시스템을 고치고 자동화할 일을 찾고,
        집에서는 모델과 서버를 굴리거나 생각난 제품을 빠르게 만들어보고 있습니다.
      </p>
    </aside>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { data as posts } from '../../posts.data.js'

const latestPosts = computed(() => posts.slice(0, 4))

const projects = [
  {
    type: 'AI Platform',
    title: 'GoVail Gateway',
    description: 'AI 요청의 인증, 정책, 감사와 모델 실행 경계를 분리하며 운영 책임을 검증한 프로젝트.',
    href: '/projects/govail-gateway',
  },
  {
    type: 'Automation',
    title: 'LingoAgent',
    description: '번역 결과를 바로 신뢰하지 않고 검증, QA, 자동 커밋까지 하나의 파이프라인으로 묶은 작업.',
    href: '/projects/lingo-agent',
  },
  {
    type: 'Developer Tool',
    title: 'Leandraft Linter',
    description: '설계 문서의 구조와 민감정보 노출을 커밋 전에 검사하도록 만든 Rust 기반 정적 분석 도구.',
    href: '/projects/leandraft-linter',
  },
]
</script>

<template>
  <main class="dev-home">
    <section class="identity-hero" aria-labelledby="home-title">
      <p class="utility-label"><span class="status-dot" aria-hidden="true" /> devcy0922 / engineering log</p>

      <h1 id="home-title">
        만들고, 운영하고,
        <span>왜 그렇게 했는지 기록합니다.</span>
      </h1>

      <p class="hero-copy">
        10년차 풀스택 개발자입니다. 백엔드와 운영 경험을 바탕으로
        AI 플랫폼과 제품을 만들고, 구현보다 오래 남는 설계 판단과 실패 경로를 기록합니다.
      </p>

      <div class="hero-actions">
        <a class="action-primary" href="/posts/">최근 글 읽기</a>
        <a class="action-quiet" href="https://github.com/devcy0922" target="_blank" rel="noopener">GitHub 보기 ↗</a>
      </div>
    </section>

    <div class="trace-shell" aria-label="문제를 다루는 순서">
      <div class="trace-line" aria-hidden="true" />
      <ol class="trace-rail">
        <li><span>problem</span><strong>문제를 좁힌다</strong></li>
        <li><span>boundary</span><strong>책임을 나눈다</strong></li>
        <li><span>build</span><strong>작게 만든다</strong></li>
        <li><span>operate</span><strong>실패를 본다</strong></li>
        <li><span>write</span><strong>판단을 남긴다</strong></li>
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
          <h2 id="work-title">선택한 작업</h2>
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
        <p class="utility-label">Current</p>
        <strong>AI platform · agent workflow · product building</strong>
      </div>
      <p>
        완성된 정답을 정리하기보다 실제로 만들면서 바뀐 판단을 남깁니다.
        공개 코드가 실험 단계라면 그 한계도 함께 적습니다.
      </p>
    </aside>
  </main>
</template>

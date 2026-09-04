<script setup>
import { computed } from 'vue'
import { data as posts } from '../../posts.data.js'

const latestPosts = computed(() => posts.slice(0, 5))

const projects = [
  {
    type: 'AI 플랫폼',
    title: 'GoVail Gateway',
    description: '인증, 정책, 감사와 모델 실행의 경계를 분리하는 OpenAI-compatible Gateway.',
    href: '/projects/govail-gateway',
  },
  {
    type: '자동화',
    title: 'LingoAgent',
    description: '번역 생성부터 ICU 검증, QA, 커밋까지 연결한 i18n 배포 게이트.',
    href: '/projects/lingo-agent',
  },
  {
    type: '개발 도구',
    title: 'Leandraft Linter',
    description: '기술 문서를 커밋하기 전 구조와 민감정보를 검사하는 로컬 CLI.',
    href: '/projects/leandraft-linter',
  },
  {
    type: 'RELEASE SAFETY',
    title: 'coexistgate',
    description: '변경을 안전하게 릴리스하고 롤백할 수 있는지 검증하는 Rust 엔진.',
    href: '/projects/coexistgate',
  },
  {
    type: 'AGENT WORKFLOW',
    title: 'works-agent-demo',
    description: '증거 기반 에이전트 워크플로를 직접 확인하는 인터랙티브 데모.',
    href: '/projects/works-agent-demo',
  },
]
</script>

<template>
  <main class="dev-home">
    <section class="identity-hero" aria-labelledby="home-title">
      <p class="utility-label">devcy0922 · engineering notes</p>

      <h1 id="home-title">
        만들고 운영하며
        남긴 기록
      </h1>

      <p class="hero-copy">
        백엔드와 서비스 운영 자동화를 해왔습니다. 요즘은 로컬 LLM과 AI 도구를 직접 붙여보며,
        실제 운영에서 남는 문제와 판단을 기록합니다.
      </p>

      <div class="hero-actions">
        <a class="action-primary" href="/posts/">기록 살펴보기</a>
        <a class="action-quiet" href="https://github.com/devcy0922" target="_blank" rel="noopener">GitHub 보기 ↗</a>
      </div>
    </section>

    <section class="home-section" aria-labelledby="latest-title">
      <header class="section-head">
        <div>
          <p class="utility-label">Recent notes</p>
          <h2 id="latest-title">새로 쓴 기록</h2>
        </div>
        <a href="/posts/">모든 기록 →</a>
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
          <p class="utility-label">Selected projects</p>
          <h2 id="work-title">대표 프로젝트</h2>
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

    <p class="home-signoff">
      이 블로그는 AI와 함께 만들고 있습니다. 글 작성부터 검토, 개선, 배포까지 개발 과정 전반에 AI를 활용합니다.
      주제 선정과 최종 판단은 제가 합니다.
    </p>
  </main>
</template>

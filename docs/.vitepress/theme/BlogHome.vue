<script setup>
import { computed } from 'vue'
import { data as posts } from '../../posts.data.js'

const latestPosts = computed(() => posts.slice(0, 5))
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
        웹·백엔드 시스템을 만들고 운영해왔습니다.
        요즘은 AI가 실제 시스템 안에서 어디까지 유용한지, 경계와 실패 조건까지 직접 만들고 검증하고 있습니다.
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
          <time :datetime="post.date">{{ post.dateLabel }}</time>
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

      <SelectedProjects />
    </section>

    <p class="home-signoff">
      이 블로그는 AI와 함께 만들고 있습니다. 경험과 판단은 직접 기록하고,
      초안 작성·검토·사이트 유지보수에는 AI를 활용합니다.
    </p>
  </main>
</template>

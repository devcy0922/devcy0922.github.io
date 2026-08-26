<script setup>
import { data as posts } from '../../posts.data.js'
</script>

<template>
  <main class="archive-page">
    <header class="archive-hero">
      <p class="utility-label">Writing</p>
      <h1>기술 기록</h1>
      <p>
        설치법을 다시 쓰기보다, 실제 프로젝트에서 경계를 어디에 두었고
        무엇이 실패했으며 다음에는 무엇을 다르게 할지 기록합니다.
      </p>
    </header>

    <div class="post-ledger archive-ledger">
      <a v-for="post in posts" :key="post.url" class="ledger-row" :href="post.url">
        <time :datetime="post.date">{{ post.date }}</time>
        <div class="ledger-copy">
          <div class="tag-line">
            <span v-for="tag in post.tags" :key="tag">{{ tag }}</span>
          </div>
          <h2>{{ post.title }}</h2>
          <p>{{ post.description }}</p>
        </div>
        <span class="row-arrow" aria-hidden="true">→</span>
      </a>
    </div>
  </main>
</template>

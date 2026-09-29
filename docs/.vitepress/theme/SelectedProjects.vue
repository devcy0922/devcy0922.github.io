<script setup>
import projects from '../../selected-projects.js'
</script>
<template>
  <div class="case-list">
    <article v-for="project in projects" :key="project.title" class="project-case">
      <div class="case-identity"><span>{{ project.type }}</span><h3><a :href="project.href">{{ project.title }}</a></h3><p>{{ project.description }}</p></div>
      <dl><div><dt>문제</dt><dd>{{ project.problem }}</dd></div><div><dt>설계 결정</dt><dd>{{ project.decision }}</dd></div></dl>
      <div class="case-links"><a :href="project.href">설계와 구현 범위</a><a v-if="project.demo" :href="project.demo">브라우저 데모</a></div>
    </article>
  </div>
</template>

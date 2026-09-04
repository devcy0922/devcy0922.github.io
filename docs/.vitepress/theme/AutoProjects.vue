<script setup>
import { computed } from 'vue'
import projects from '../../projects.data.json'

const genericDescription = 'GitHub에서 진행 중인 공개 프로젝트입니다.'
const visibleProjects = computed(() => projects.filter((project) => {
  return project.description && project.description !== genericDescription
}))
</script>

<template>
  <div class="project-ledger auto-project-ledger">
    <a v-for="project in visibleProjects" :key="project.name" :href="project.repoUrl" target="_blank" rel="noopener">
      <span class="project-kind">{{ project.language }}</span>
      <div>
        <h3>{{ project.title }}</h3>
        <p>{{ project.description }}</p>
      </div>
      <span class="project-arrow" aria-hidden="true">↗</span>
    </a>
  </div>
</template>

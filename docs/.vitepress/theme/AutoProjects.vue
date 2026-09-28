<script setup>
import { computed } from 'vue'
import projects from '../../projects.data.json'
import selectedProjects from '../../selected-projects.js'
import otherProjects from '../../other-projects.js'

const genericDescription = 'GitHub에서 진행 중인 공개 프로젝트입니다.'

// Selected Projects와 Other Work에 이미 손으로 큐레이션된 repo는 여기서 다시
// 보여주지 않는다 — 둘 다 같은 /projects/<slug> href를 쓰므로 그대로 비교한다.
const curatedHrefs = new Set([
  ...selectedProjects.map((project) => project.href),
  ...otherProjects.map((project) => project.href),
])

const visibleProjects = computed(() => projects.filter((project) => {
  return project.description && project.description !== genericDescription && !curatedHrefs.has(project.href)
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

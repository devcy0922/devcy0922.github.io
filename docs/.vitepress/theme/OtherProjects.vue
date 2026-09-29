<script setup>
import projects from '../../other-projects.js'
import selected from '../../selected-projects.js'
const visibleProjects = projects.filter(project => !selected.some(item => item.href === project.href))
</script>

<template>
  <div class="project-ledger other-project-ledger">
    <a v-for="project in visibleProjects" :key="project.title" :href="project.href">
      <span class="project-kind">{{ project.kind }}</span>
      <div>
        <h3>{{ project.title }}</h3>
        <p>{{ project.description }}</p>
      </div>
      <span class="project-arrow" aria-hidden="true">↗</span>
    </a>
  </div>
</template>

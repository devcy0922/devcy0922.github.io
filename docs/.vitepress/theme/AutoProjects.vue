<script setup>
import projects from '../../projects.data.json'
</script>

<template>
  <div class="project-ledger">
    <a v-for="project in projects" :key="project.name" :href="project.repoUrl" target="_blank" rel="noopener">
      <span class="project-kind">{{ project.language }}</span>
      <div>
        <h3>{{ project.title }}</h3>
        <p>{{ project.description }}</p>
      </div>
      <span class="project-arrow">↗</span>
    </a>
  </div>
</template>

<script setup>
import projects from '../../selected-projects.js'
</script>

<template>
  <div class="project-ledger selected-project-ledger">
    <a v-for="project in projects" :key="project.title" :href="project.href">
      <span class="project-kind">{{ project.type }}</span>
      <div>
        <h3>{{ project.title }}</h3>
        <p>{{ project.description }}</p>
      </div>
      <span class="project-arrow" aria-hidden="true">↗</span>
    </a>
  </div>
</template>

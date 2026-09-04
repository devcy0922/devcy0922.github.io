<script setup>
defineProps({
  caption: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <figure class="architecture-diagram">
    <figcaption v-if="caption">{{ caption }}</figcaption>
    <div class="architecture-diagram__canvas">
      <slot />
    </div>
  </figure>
</template>

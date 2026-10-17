<script setup>
// 아직 촬영하지 않은 캡처의 구도를 먼저 잡아두는 자리. src가 생기면 이미지로 바뀐다.
defineProps({
  title: { type: String, required: true },
  shot: { type: String, default: '' },
  size: { type: String, default: '1440 × 900' },
  device: { type: String, default: 'desktop' },
  src: { type: String, default: '' },
  points: { type: Array, default: () => [] },
})
</script>

<template>
  <figure :class="['capture', `capture--${device}`]">
    <div class="capture__frame">
      <div class="capture__chrome" aria-hidden="true"><i /><i /><i /><span>{{ shot }}</span></div>
      <img v-if="src" :src="src" :alt="title" loading="lazy" />
      <div v-else class="capture__empty">
        <strong>캡처 예정</strong>
        <span>{{ size }}</span>
        <ol v-if="points.length">
          <li v-for="p in points" :key="p">{{ p }}</li>
        </ol>
      </div>
    </div>
    <figcaption>{{ title }}</figcaption>
  </figure>
</template>

<style scoped>
.capture { margin: 0; }
.capture__frame { border: 1px solid var(--mist-strong); border-radius: 10px; overflow: hidden; background: var(--paper); }
.capture__chrome { display: flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-bottom: 1px solid var(--mist); background: var(--wash); }
.capture__chrome i { width: 9px; height: 9px; border-radius: 50%; background: var(--mist-strong); }
.capture__chrome span { margin-left: 10px; color: var(--slate); font-size: 12px; }
.capture img { display: block; width: 100%; }
.capture__empty { display: flex; flex-direction: column; gap: 4px; aspect-ratio: 16 / 10; padding: 22px; background-image: linear-gradient(var(--mist) 1px, transparent 1px), linear-gradient(90deg, var(--mist) 1px, transparent 1px); background-size: 24px 24px; }
.capture--mobile .capture__frame { max-width: 300px; margin: 0 auto; border-radius: 22px; }
.capture--mobile .capture__empty { aspect-ratio: 9 / 17; }
.capture__empty strong { color: var(--ink); font-size: 15px; }
.capture__empty span { color: var(--slate); font-size: 13px; }
.capture__empty ol { margin: 10px 0 0; padding-left: 18px; }
.capture__empty li { margin: 0; color: var(--ink-soft); font-size: 13px !important; line-height: 1.6 !important; }
.capture figcaption { margin-top: 8px; color: var(--slate); font-size: 13px; }
</style>

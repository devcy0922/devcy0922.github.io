<script setup lang="ts">
import { SCENARIOS } from '../../../workbench-core.js'

defineProps<{ busy: boolean }>()
defineEmits<{ (e: 'run', scenario: (typeof SCENARIOS)[number]): void; (e: 'fill', scenario: (typeof SCENARIOS)[number]): void }>()
</script>

<template>
  <section class="wb-start" aria-labelledby="wb-start-title">
    <h2 id="wb-start-title">추천 질문으로 시작하기</h2>
    <p class="wb-muted">자주 묻는 질문을 누르면 입력창에 채워지며, 바로 대화를 시작할 수 있습니다.</p>
    <ul class="wb-examples">
      <li v-for="s in SCENARIOS" :key="s.id" class="wb-example">
        <div class="wb-example-info">
          <strong class="wb-example-title">{{ s.title }}</strong>
          <button type="button" class="wb-example-prompt" :title="`${s.title} 입력창에 채우기`" @click="$emit('fill', s)">{{ s.prompt }}</button>
        </div>
        <button type="button" class="wb-btn wb-btn-sm" :disabled="busy" :aria-label="`${s.title} 실행`" @click="$emit('run', s)">실행</button>
      </li>
    </ul>
  </section>
</template>

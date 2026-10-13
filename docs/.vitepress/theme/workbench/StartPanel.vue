<script setup lang="ts">
import { SCENARIOS, toolLabel } from '../../../workbench-core.js'

defineProps<{ busy: boolean }>()
defineEmits<{ (e: 'run', scenario: (typeof SCENARIOS)[number]): void; (e: 'fill', scenario: (typeof SCENARIOS)[number]): void }>()

const toolsOf = (tools: string[]) => (tools.length ? tools.map(toolLabel).join(', ') : '도구 없음')
</script>

<template>
  <section class="wb-start" aria-labelledby="wb-start-title">
    <h2 id="wb-start-title">무엇을 해볼까요?</h2>
    <p class="wb-muted">예시를 실행하면 도구 호출과 응답이 아래와 오른쪽 증적에 나타납니다. 누를 때만 relay로 전송됩니다.</p>
    <ul class="wb-scenarios">
      <li v-for="s in SCENARIOS" :key="s.id" class="wb-scenario">
        <h3>{{ s.title }}</h3>
        <p>{{ s.summary }}</p>
        <p class="wb-scenario-prompt">“{{ s.prompt }}”</p>
        <p class="wb-scenario-tools">도구: {{ toolsOf(s.tools) }}</p>
        <div class="wb-scenario-actions">
          <button type="button" class="wb-btn wb-btn-primary wb-btn-sm" :disabled="busy" @click="$emit('run', s)">실행</button>
          <button type="button" class="wb-link-btn" @click="$emit('fill', s)">입력창에 채우기</button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { SCENARIOS, toolLabel } from '../../../workbench-core.js'

defineProps<{ busy: boolean }>()
defineEmits<{ (e: 'run', scenario: (typeof SCENARIOS)[number]): void; (e: 'fill', scenario: (typeof SCENARIOS)[number]): void }>()

const toolsOf = (tools: string[]) => (tools.length ? tools.map(toolLabel).join(', ') : '도구 없음')
</script>

<template>
  <section class="wb-start" aria-labelledby="wb-start-title">
    <h2 id="wb-start-title">예시로 시작하기</h2>
    <p class="wb-muted">누를 때만 relay로 전송됩니다. 문장을 누르면 입력창에 채워집니다.</p>
    <ul class="wb-examples">
      <li v-for="s in SCENARIOS" :key="s.id" class="wb-example">
        <span class="wb-example-tool">{{ toolsOf(s.tools) }}</span>
        <button type="button" class="wb-example-prompt" :title="`${s.title} · 입력창에 채우기`" @click="$emit('fill', s)">{{ s.prompt }}</button>
        <button type="button" class="wb-btn wb-btn-sm" :disabled="busy" :aria-label="`${s.title} 실행`" @click="$emit('run', s)">실행</button>
      </li>
    </ul>
  </section>
</template>

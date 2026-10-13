<script setup lang="ts">
import { relativeTime, statusLabel, titleFromPrompt, toolSummary } from '../../../workbench-core.js'

defineProps<{ runs: any[]; activeId: string | null; now: number }>()
defineEmits<{ (e: 'select', id: string): void; (e: 'remove', id: string): void; (e: 'clear'): void }>()
</script>

<template>
  <section class="wb-panel" aria-labelledby="wb-rail-title">
    <div class="wb-panel-head">
      <h2 id="wb-rail-title">작업 기록</h2>
      <span class="wb-muted">{{ runs.length }}건</span>
    </div>

    <p v-if="runs.length === 0" class="wb-empty-sm">아직 실행한 작업이 없습니다. 예시를 실행하면 여기에 쌓입니다.</p>

    <ul v-else class="wb-runlist">
      <li v-for="run in runs" :key="run.id" class="wb-runitem" :class="{ active: run.id === activeId }">
        <button type="button" class="wb-runitem-main" :aria-current="run.id === activeId ? 'true' : undefined" @click="$emit('select', run.id)">
          <span class="wb-status" :data-state="run.status"><i aria-hidden="true"></i>{{ statusLabel(run.status) }}</span>
          <span class="wb-runitem-title">{{ titleFromPrompt(run.prompt) }}</span>
          <span class="wb-runitem-meta">{{ relativeTime(run.createdAt, now) }} · {{ toolSummary(run) }}</span>
        </button>
        <button type="button" class="wb-icon-btn" :aria-label="`기록 삭제: ${titleFromPrompt(run.prompt, 20)}`" :disabled="run.status === 'running'" @click="$emit('remove', run.id)">×</button>
      </li>
    </ul>

    <div class="wb-panel-foot">
      <p class="wb-note">기록은 이 브라우저에만 저장됩니다.</p>
      <button v-if="runs.length" type="button" class="wb-link-btn" @click="$emit('clear')">기록 모두 삭제</button>
    </div>
  </section>
</template>

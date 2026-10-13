<script setup lang="ts">
import { computed } from 'vue'
import { describeSteps, errorTitle, formatDuration, relativeTime, statusLabel, toolSummary } from '../../../workbench-core.js'
import { renderMarkdown } from './markdown'

const props = defineProps<{ run: any; now: number }>()
defineEmits<{ (e: 'stop'): void; (e: 'retry'): void; (e: 'edit'): void }>()

const stateWord: Record<string, string> = { done: '완료', active: '진행 중', pending: '대기', error: '실패', skipped: '건너뜀' }
const steps = computed(() => describeSteps(props.run))
const html = computed(() => renderMarkdown(props.run.answer))
const running = computed(() => props.run.status === 'running')
const metrics = computed(() => {
  const m = props.run.metrics
  if (!m) return []
  return [
    { label: '전체 시간', value: formatDuration(m.totalLatencyMs) },
    { label: '첫 토큰까지', value: formatDuration(m.ttftMs) },
    { label: '속도', value: m.tokensPerSec ? `${m.tokensPerSec.toFixed(1)} tok/s` : '' },
    { label: '출력 토큰', value: m.completionTokens ? String(m.completionTokens) : '' },
  ].filter((item) => item.value)
})
</script>

<template>
  <article class="wb-run" :aria-busy="running">
    <header class="wb-run-head">
      <span class="wb-status wb-status-lg" :data-state="run.status"><i aria-hidden="true"></i>{{ statusLabel(run.status) }}</span>
      <span class="wb-muted">{{ relativeTime(run.createdAt, now) }} · {{ toolSummary(run) }}</span>
      <button v-if="running" type="button" class="wb-btn wb-btn-sm wb-run-stop" @click="$emit('stop')">중단</button>
    </header>

    <h2 class="wb-run-prompt">{{ run.prompt }}</h2>

    <ol class="wb-steps" aria-label="진행 단계">
      <li v-for="step in steps" :key="step.id" class="wb-step" :data-state="step.state">
        <span class="wb-step-mark" aria-hidden="true"></span>
        <span class="wb-step-label">{{ step.label }}<span class="wb-sr"> — {{ stateWord[step.state] }}</span></span>
        <span v-if="step.detail" class="wb-step-detail">{{ step.detail }}</span>
      </li>
    </ol>

    <div v-if="run.error" class="wb-notice wb-notice-error" role="alert">
      <strong>{{ errorTitle(run.error) }}</strong>
      <p>{{ run.error.message }}</p>
      <div class="wb-notice-actions">
        <button v-if="run.error.retryable" type="button" class="wb-btn wb-btn-primary wb-btn-sm" @click="$emit('retry')">다시 시도</button>
        <button type="button" class="wb-btn wb-btn-sm" @click="$emit('edit')">질문 수정</button>
      </div>
    </div>

    <div v-else-if="run.status === 'aborted'" class="wb-notice">
      <strong>중단했습니다</strong>
      <p>받은 내용까지만 남아 있습니다.</p>
      <div class="wb-notice-actions">
        <button type="button" class="wb-btn wb-btn-primary wb-btn-sm" @click="$emit('retry')">같은 질문 다시 실행</button>
        <button type="button" class="wb-btn wb-btn-sm" @click="$emit('edit')">질문 수정</button>
      </div>
    </div>

    <section v-if="run.answer || running" class="wb-answer" aria-labelledby="wb-answer-title">
      <h3 id="wb-answer-title">답변</h3>
      <div v-if="run.answer" class="wb-md" v-html="html"></div>
      <p v-else class="wb-muted">응답을 기다리는 중입니다…</p>
    </section>

    <dl v-if="metrics.length" class="wb-metrics">
      <div v-for="item in metrics" :key="item.label">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  describeSteps,
  errorTitle,
  formatDuration,
  relativeTime,
  searchResultsOf,
  sourceHost,
  statusLabel,
  toolLabel,
  toolSummary,
} from '../../../workbench-core.js'
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
    { label: '소요 시간', value: formatDuration(m.totalLatencyMs) },
    { label: '첫 토큰', value: formatDuration(m.ttftMs) },
    { label: '속도', value: m.tokensPerSec ? `${m.tokensPerSec.toFixed(1)} tok/s` : '' },
  ].filter((item) => item.value)
})
</script>

<template>
  <article class="wb-chat-thread" :aria-busy="running">
    <header class="wb-thread-head">
      <div class="wb-thread-meta">
        <span class="wb-status" :data-state="run.status"><i aria-hidden="true"></i>{{ statusLabel(run.status) }}</span>
        <span class="wb-muted">{{ relativeTime(run.createdAt, now) }} · {{ toolSummary(run) }}</span>
      </div>
      <button v-if="running" type="button" class="wb-btn wb-btn-sm wb-run-stop" @click="$emit('stop')">중단</button>
    </header>

    <!-- 사용자 질문 -->
    <div class="wb-msg wb-msg-user">
      <span class="wb-msg-sender">질문</span>
      <p class="wb-msg-prompt">{{ run.prompt }}</p>
    </div>

    <!-- engine-process 오케스트레이션 진행 단계 -->
    <ol class="wb-steps" aria-label="진행 단계">
      <li v-for="step in steps" :key="step.id" class="wb-step" :data-state="step.state">
        <span class="wb-step-mark" aria-hidden="true"></span>
        <span class="wb-step-label">{{ step.label }}<span class="wb-sr"> — {{ stateWord[step.state] }}</span></span>
        <span v-if="step.detail" class="wb-step-detail">{{ step.detail }}</span>
      </li>
    </ol>

    <!-- 실행 증적 (도구 호출 카드) -->
    <div v-if="run.toolCalls && run.toolCalls.length" class="wb-evidence-block">
      <article v-for="call in run.toolCalls" :key="call.callId" class="wb-evidence-card" :data-state="call.status">
        <!-- 1. 웹 검색 출처 -->
        <details v-if="call.tool === 'web_search'" class="wb-fold" :open="call.status === 'calling'">
          <summary class="wb-fold-summary">
            <span class="wb-fold-tag">웹 검색</span>
            <span>참고 출처 ({{ searchResultsOf(call).length }}건)</span>
            <span v-if="call.durationMs" class="wb-muted">{{ formatDuration(call.durationMs) }}</span>
          </summary>
          <div v-if="searchResultsOf(call).length" class="wb-sources">
            <a
              v-for="result in searchResultsOf(call)"
              :key="result.url"
              class="wb-source-item"
              :href="result.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div class="wb-source-title">{{ result.title }}</div>
              <div class="wb-source-host">{{ sourceHost(result.url) }}</div>
              <p v-if="result.snippet" class="wb-source-snippet">{{ result.snippet }}</p>
            </a>
          </div>
          <p v-else-if="call.status === 'calling'" class="wb-muted-sm">웹에서 최신 정보를 검색하는 중입니다…</p>
          <p v-else-if="call.error" class="wb-call-error">{{ call.error }}</p>
          <p v-else class="wb-muted-sm">확인된 검색 결과가 없습니다.</p>
        </details>

        <!-- 2. URL 본문 조회 -->
        <details v-else-if="call.tool === 'fetch_url'" class="wb-fold" :open="call.status === 'calling'">
          <summary class="wb-fold-summary">
            <span class="wb-fold-tag">URL 읽기</span>
            <span>조회한 웹페이지 본문</span>
            <span v-if="call.durationMs" class="wb-muted">{{ formatDuration(call.durationMs) }}</span>
          </summary>
          <div v-if="call.output && call.output.content" class="wb-url-content">
            <div class="wb-url-meta">
              <strong>{{ call.output.title || '웹페이지' }}</strong>
              <a :href="call.output.url" target="_blank" rel="noopener noreferrer" class="wb-url-link">{{ call.output.url }}</a>
            </div>
            <p class="wb-url-snippet">{{ call.output.content.slice(0, 400) }}{{ call.output.content.length > 400 ? '…' : '' }}</p>
          </div>
          <p v-else-if="call.status === 'calling'" class="wb-muted-sm">페이지 본문을 불러오는 중입니다…</p>
          <p v-else-if="call.error" class="wb-call-error">{{ call.error }}</p>
        </details>

        <!-- 3. 기타 도구 -->
        <details v-else class="wb-fold">
          <summary class="wb-fold-summary">
            <span class="wb-fold-tag">{{ toolLabel(call.tool) }}</span>
            <span>도구 실행 결과</span>
            <span v-if="call.durationMs" class="wb-muted">{{ formatDuration(call.durationMs) }}</span>
          </summary>
          <div v-if="call.output" class="wb-generic-tool-output">
            <p v-if="call.status === 'calling'" class="wb-muted-sm">도구 응답 대기 중…</p>
            <p v-else-if="call.error" class="wb-call-error">{{ call.error }}</p>
            <div v-else class="wb-output-kv">
              <span v-for="(val, key) in call.output" :key="key" class="wb-kv-badge">
                <strong>{{ key }}:</strong> {{ String(val).slice(0, 80) }}
              </span>
            </div>
          </div>
        </details>
      </article>
    </div>

    <!-- 오류 알림 -->
    <div v-if="run.error" class="wb-notice wb-notice-error" role="alert">
      <strong>{{ errorTitle(run.error) }}</strong>
      <p>{{ run.error.message }}</p>
      <div class="wb-notice-actions">
        <button v-if="run.error.retryable" type="button" class="wb-btn wb-btn-primary wb-btn-sm" @click="$emit('retry')">다시 시도</button>
        <button type="button" class="wb-btn wb-btn-sm" @click="$emit('edit')">질문 수정</button>
      </div>
    </div>

    <!-- 중단 안내 -->
    <div v-else-if="run.status === 'aborted'" class="wb-notice">
      <strong>답변 수신을 중단했습니다</strong>
      <p>수신된 내용까지만 보존됩니다.</p>
      <div class="wb-notice-actions">
        <button type="button" class="wb-btn wb-btn-primary wb-btn-sm" @click="$emit('retry')">다시 실행</button>
        <button type="button" class="wb-btn wb-btn-sm" @click="$emit('edit')">질문 수정</button>
      </div>
    </div>

    <!-- 어시스턴트 답변 카드 -->
    <div v-if="run.answer || running" class="wb-msg wb-msg-assistant">
      <span class="wb-msg-sender">답변</span>
      <div v-if="run.answer" class="wb-md" v-html="html"></div>
      <p v-else class="wb-streaming-indicator">답변을 작성하고 있습니다…</p>
    </div>

    <!-- 하단 경량 지표 -->
    <footer v-if="metrics.length" class="wb-thread-foot">
      <span v-for="item in metrics" :key="item.label" class="wb-foot-metric">
        {{ item.label }}: {{ item.value }}
      </span>
    </footer>
  </article>
</template>
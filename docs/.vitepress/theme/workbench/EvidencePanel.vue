<script setup lang="ts">
import { computed } from 'vue'
import { buildRequestBody, formatDuration, searchResultsOf, sourceHost, toolLabel } from '../../../workbench-core.js'

const props = defineProps<{ run: any | null }>()

const callState = { calling: '실행 중', done: '완료', error: '실패' } as Record<string, string>
const pretty = (value: unknown) => JSON.stringify(value ?? {}, null, 2)

const request = computed(() => (props.run ? pretty(buildRequestBody(props.run)) : ''))
const emptyCalls = computed(() => {
  const run = props.run
  if (!run) return ''
  if (run.tools.length === 0) return '이 요청은 도구 없이 모델이 직접 답합니다.'
  if (run.status === 'running') return '도구 호출을 기다리는 중입니다.'
  return '요청한 도구가 호출되지 않았습니다.'
})
</script>

<template>
  <section class="wb-panel" aria-labelledby="wb-evidence-title">
    <div class="wb-panel-head">
      <h2 id="wb-evidence-title">실행 증적</h2>
      <span v-if="run" class="wb-muted">도구 호출 {{ run.toolCalls.length }}건</span>
    </div>

    <p v-if="!run" class="wb-empty-sm">작업을 실행하면 게이트웨이로 보낸 요청과 도구가 받은 입력·돌려준 결과가 여기에 쌓입니다.</p>

    <template v-else>
      <details class="wb-fold">
        <summary>게이트웨이로 보낸 요청</summary>
        <pre class="wb-json"><code>{{ request }}</code></pre>
      </details>

      <p v-if="run.toolCalls.length === 0" class="wb-empty-sm">{{ emptyCalls }}</p>

      <article v-for="call in run.toolCalls" :key="call.callId" class="wb-call" :data-state="call.status">
        <header class="wb-call-head">
          <span class="wb-status" :data-state="call.status === 'calling' ? 'running' : call.status"><i aria-hidden="true"></i>{{ callState[call.status] }}</span>
          <strong>{{ toolLabel(call.tool) }}</strong>
          <span v-if="call.durationMs" class="wb-muted">{{ formatDuration(call.durationMs) }}</span>
        </header>

        <details class="wb-fold">
          <summary>입력</summary>
          <pre class="wb-json"><code>{{ pretty(call.input) }}</code></pre>
        </details>

        <div v-if="searchResultsOf(call).length" class="wb-sources">
          <p class="wb-fold-title">검색 결과 {{ searchResultsOf(call).length }}건</p>
          <a v-for="result in searchResultsOf(call)" :key="result.url" class="wb-source" :href="result.url" target="_blank" rel="noopener noreferrer">
            <strong>{{ result.title }}</strong>
            <span>{{ sourceHost(result.url) }}</span>
            <p v-if="result.snippet">{{ result.snippet }}</p>
          </a>
        </div>
        <details v-else-if="call.output !== undefined" class="wb-fold" open>
          <summary>결과</summary>
          <pre class="wb-json"><code>{{ pretty(call.output) }}</code></pre>
        </details>

        <p v-if="call.error" class="wb-call-error">{{ call.error }}</p>
        <p v-else-if="call.status === 'calling'" class="wb-muted">도구의 응답을 기다리는 중입니다.</p>
      </article>

      <p v-if="run.routing?.policy" class="wb-note">라우팅 정책: {{ run.routing.policy }}</p>
    </template>
  </section>
</template>

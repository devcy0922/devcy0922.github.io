<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { createEventParser } from '../../stream-events.js'

// 전송 버튼을 눌렀을 때만 공개 relay를 호출한다. 응답이 실패하면 오류로 표시하고 대체 응답을 만들지 않는다.
const RELAY_STREAM_URL = 'https://api.govail.cloud/v1/model-routing/stream'
const MAX_PROMPT = 500

interface Preset { label: string; prompt: string; tools: string[] }
interface TraceLine { key: number; name: string; detail: string; state: 'run' | 'ok' | 'err' }
interface Metrics { totalLatencyMs: number; ttftMs: number; tokensPerSec: number; tokens: number }

const presets: Preset[] = [
  { label: '개념 질문', prompt: 'LLM Gateway가 하는 일을 세 문장으로 설명해줘.', tools: [] },
  { label: '서버 상태 조회', prompt: '클러스터 서버 상태를 알려줘.', tools: ['system_metrics'] },
  { label: '코드 실행', prompt: '파이썬으로 피보나치 수열 10개를 계산해줘.', tools: ['code_interpreter'] },
]

const prompt = ref(presets[0].prompt)
const tools = ref<string[]>(presets[0].tools)
const activePreset = ref(0)
const running = ref(false)
const answer = ref('')
const trace = ref<TraceLine[]>([])
const metrics = ref<Metrics | null>(null)
const errorText = ref('')
const started = ref(false)
let controller: AbortController | null = null
let seq = 0

const canSend = computed(() => !running.value && prompt.value.trim().length > 0)

function choose(i: number) {
  if (running.value) return
  activePreset.value = i
  prompt.value = presets[i].prompt
  tools.value = presets[i].tools
}

function onInput() {
  // 직접 입력하면 프리셋의 도구 선택을 해제한다.
  activePreset.value = -1
  tools.value = []
}

function push(name: string, detail: string, state: TraceLine['state'] = 'ok') {
  const line = { key: ++seq, name, detail, state }
  trace.value.push(line)
  return line
}

function compact(value: unknown) {
  const text = JSON.stringify(value ?? {})
  return text.length > 90 ? `${text.slice(0, 90)}…` : text
}

function handle(event: string, data: Record<string, any>) {
  if (event === 'routing') {
    // relay가 보내는 내부 노드명과 주소는 표시하지 않는다.
    push('Gateway', '인증·정책 경계 통과')
  } else if (event === 'status') {
    if (data.message || data.phase) push('상태', String(data.message || data.phase))
  } else if (event === 'tool_call') {
    push(`도구 · ${data.tool}`, compact(data.input), 'run')
  } else if (event === 'tool_result') {
    const line = [...trace.value].reverse().find((l) => l.name === `도구 · ${data.tool}` && l.state === 'run')
    const failed = data.status === 'error' || data.error
    if (line) {
      line.state = failed ? 'err' : 'ok'
      line.detail = failed ? String(data.error || '도구 오류') : `${Number(data.durationMs) || 0}ms`
    }
  } else if (event === 'token') {
    if (data.delta) answer.value += String(data.delta)
  } else if (event === 'done') {
    if (data.status === 'truncated') errorText.value = '응답이 토큰 한도에서 잘렸습니다.'
    metrics.value = {
      totalLatencyMs: Number(data.totalLatencyMs) || 0,
      ttftMs: Number(data.ttftMs) || 0,
      tokensPerSec: Number(data.tokensPerSec) || 0,
      tokens: Number(data.usage?.completionTokens) || 0,
    }
  } else if (event === 'error') {
    errorText.value = String(data.message || '응답 스트림이 중단되었습니다.')
  }
}

async function send() {
  if (!canSend.value) return
  started.value = true
  running.value = true
  answer.value = ''
  trace.value = []
  metrics.value = null
  errorText.value = ''
  controller = new AbortController()
  push('요청', `POST /v1/model-routing/stream${tools.value.length ? ` · ${tools.value.join(', ')}` : ''}`)

  try {
    const response = await fetch(RELAY_STREAM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt.value.trim().slice(0, MAX_PROMPT),
        model: 'govail/thinker',
        tools: tools.value,
        enableThinking: true,
      }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Gateway HTTP ${response.status}`)
    if (!response.body) throw new Error('스트리밍 본문이 없습니다.')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let completed = false
    const parse = createEventParser((event: string, raw: string) => {
      if (raw === '[DONE]') return
      if (event === 'done' || event === 'error') completed = true
      handle(event, JSON.parse(raw))
    })
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        parse(decoder.decode())
        if (!completed) throw new Error('완료 이벤트 없이 응답이 종료되었습니다.')
        break
      }
      parse(decoder.decode(value, { stream: true }))
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') errorText.value = '사용자가 중단했습니다.'
    else errorText.value = err instanceof Error ? err.message : '요청에 실패했습니다.'
  } finally {
    running.value = false
    controller = null
  }
}

function stop() {
  controller?.abort()
}

onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <div class="hd">
    <div class="hd-left">
      <div class="hd-presets" role="group" aria-label="예시 요청">
        <button v-for="(p, i) in presets" :key="p.label" type="button" class="hd-chip" :class="{ on: activePreset === i }" :aria-pressed="activePreset === i" :disabled="running" @click="choose(i)">{{ p.label }}</button>
      </div>
      <label class="hd-label" for="hd-prompt">요청</label>
      <textarea id="hd-prompt" v-model="prompt" class="hd-input" rows="4" :maxlength="MAX_PROMPT" :disabled="running" @input="onInput"></textarea>
      <div class="hd-actions">
        <button v-if="!running" type="button" class="hd-send" :disabled="!canSend" @click="send">전송</button>
        <button v-else type="button" class="hd-send hd-stop" @click="stop">중단</button>
        <span class="hd-note">전송할 때만 공개 relay로 요청합니다. 모델은 govail/thinker입니다.</span>
      </div>
    </div>

    <div class="hd-right" aria-live="polite">
      <div class="hd-head"><span>실행 기록</span><span v-if="running" class="hd-live">수신 중</span></div>
      <p v-if="!started" class="hd-empty">전송하면 Gateway 통과, 도구 호출, 응답 스트림이 순서대로 표시됩니다.</p>
      <ol v-else class="hd-trace">
        <li v-for="t in trace" :key="t.key" :class="t.state">
          <span class="hd-dot" aria-hidden="true"></span>
          <span class="hd-tname">{{ t.name }}</span>
          <span class="hd-tdetail">{{ t.detail }}</span>
        </li>
      </ol>
      <div v-if="answer" class="hd-answer">{{ answer }}</div>
      <p v-if="errorText" class="hd-error" role="alert">{{ errorText }}</p>
      <dl v-if="metrics" class="hd-metrics">
        <div><dt>총 지연</dt><dd>{{ metrics.totalLatencyMs }}ms</dd></div>
        <div><dt>첫 토큰</dt><dd>{{ metrics.ttftMs }}ms</dd></div>
        <div><dt>속도</dt><dd>{{ metrics.tokensPerSec.toFixed(1) }} tok/s</dd></div>
        <div><dt>출력 토큰</dt><dd>{{ metrics.tokens }}</dd></div>
      </dl>
    </div>
  </div>
</template>

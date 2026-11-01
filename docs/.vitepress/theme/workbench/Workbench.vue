<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { streamGateway } from '../../../gateway-client.js'
import {
  ALL_PUBLIC_TOOLS,
  buildRequestBody,
  createRun,
  failRun,
  newRunId,
  nextActionHint,
  reduceStreamEvent,
  relativeTime,
  settleRun,
  titleFromPrompt,
} from '../../../workbench-core.js'
import EvidencePanel from './EvidencePanel.vue'
import RunView from './RunView.vue'
import StartPanel from './StartPanel.vue'

type Run = ReturnType<typeof createRun>

interface Session {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  runs: Run[]
}

const STORAGE_KEY = 'govail_console_sessions_v2'

const sessions = ref<Session[]>([])
const currentSessionId = ref<string | null>(null)
const prompt = ref('')
const now = ref(Date.now())
const promptEl = ref<HTMLTextAreaElement | null>(null)
const showHistory = ref(false)

let controller: AbortController | null = null
let clock: ReturnType<typeof setInterval> | undefined

const currentSession = computed(() => sessions.value.find((s) => s.id === currentSessionId.value) ?? null)
const runs = computed(() => currentSession.value?.runs ?? [])
const activeRun = computed(() => {
  const list = runs.value
  return list.length > 0 ? list[list.length - 1] : null
})
const isRunning = computed(() => runs.value.some((r) => r.status === 'running'))
const hint = computed(() => nextActionHint(activeRun.value))

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.value.slice(0, 20)))
  } catch {
    // 시크릿 모드 등 예외 방어
  }
}

function createNewSession(): Session {
  return {
    id: `sess_${Date.now().toString(36)}`,
    title: '새 대화',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    runs: [],
  }
}

function startNewSession() {
  if (isRunning.value) return
  const session = createNewSession()
  sessions.value.unshift(session)
  currentSessionId.value = session.id
  prompt.value = ''
  showHistory.value = false
  persist()
  focusPrompt()
}

function selectSession(id: string) {
  if (isRunning.value) return
  currentSessionId.value = id
  showHistory.value = false
}

function deleteSession(id: string) {
  if (isRunning.value) return
  sessions.value = sessions.value.filter((s) => s.id !== id)
  if (currentSessionId.value === id) {
    if (sessions.value.length > 0) {
      currentSessionId.value = sessions.value[0].id
    } else {
      startNewSession()
    }
  }
  persist()
}

function clearAllSessions() {
  if (isRunning.value) return
  if (!window.confirm('이 브라우저에 저장된 이전 대화 기록을 모두 삭제할까요?')) return
  sessions.value = []
  startNewSession()
}

function removeRun(runId: string) {
  if (isRunning.value || !currentSession.value) return
  currentSession.value.runs = currentSession.value.runs.filter((r) => r.id !== runId)
  if (currentSession.value.runs.length === 0) {
    currentSession.value.title = '새 대화'
  }
  currentSession.value.updatedAt = Date.now()
  persist()
}

function clearPriorRuns() {
  if (isRunning.value || !currentSession.value) return
  const list = currentSession.value.runs
  if (list.length <= 1) return
  currentSession.value.runs = [list[list.length - 1]]
  currentSession.value.updatedAt = Date.now()
  persist()
}

function clearCurrentSession() {
  if (isRunning.value || !currentSession.value) return
  if (!window.confirm('현재 대화 내용을 모두 비울까요?')) return
  currentSession.value.runs = []
  currentSession.value.title = '새 대화'
  currentSession.value.updatedAt = Date.now()
  prompt.value = ''
  persist()
}

async function focusPrompt() {
  await nextTick()
  promptEl.value?.focus()
}

function patchActiveRun(runId: string, update: (run: Run) => Run) {
  if (!currentSession.value) return
  const list = currentSession.value.runs
  const index = list.findIndex((r) => r.id === runId)
  if (index >= 0) {
    list[index] = update(list[index])
    currentSession.value.updatedAt = Date.now()
  }
}

async function execute(text: string) {
  if (isRunning.value || !text.trim()) return

  if (!currentSession.value) {
    startNewSession()
  }
  const session = currentSession.value!

  if (session.runs.length === 0 || session.title === '새 대화') {
    session.title = titleFromPrompt(text, 24)
  }

  // 이전 대화 턴들의 Q&A를 압축하여 history 구성
  const history: Array<{ role: string; content: string }> = []
  for (const r of session.runs) {
    if (r.status === 'done' && r.answer) {
      history.push({ role: 'user', content: r.prompt })
      const shortAnswer = r.answer.length > 500 ? `${r.answer.slice(0, 500)}…` : r.answer
      history.push({ role: 'assistant', content: shortAnswer })
    }
  }

  // 도구는 사용자에게 묻지 않고 지원 가능한 전체 도구를 모아서 제공
  const run = createRun({
    id: newRunId(),
    prompt: text.trim(),
    plan: { tools: [...ALL_PUBLIC_TOOLS], mode: 'auto' },
    history,
  })

  session.runs.push(run)
  session.updatedAt = Date.now()
  prompt.value = ''
  persist()

  controller = new AbortController()
  try {
    await streamGateway({
      body: buildRequestBody(run),
      signal: controller.signal,
      onEvent: (event: string, data: Record<string, unknown>) => {
        patchActiveRun(run.id, (cur) => reduceStreamEvent(cur, event, data))
      },
    })
    patchActiveRun(run.id, settleRun)
  } catch (err) {
    if ((err as { name?: string })?.name !== 'GatewayError') console.error('콘솔 처리 오류', err)
    patchActiveRun(run.id, (cur) => failRun(cur, err))
  } finally {
    controller = null
    persist()
  }
}

function submit() {
  const text = prompt.value.trim()
  if (!text || isRunning.value) return
  execute(text)
}

function runScenario(scenario: { prompt: string }) {
  execute(scenario.prompt)
}

function fillScenario(scenario: { prompt: string }) {
  prompt.value = scenario.prompt
  focusPrompt()
}

function stop() {
  controller?.abort()
}

function retry() {
  if (activeRun.value) execute(activeRun.value.prompt)
}

function editActive() {
  if (activeRun.value) {
    prompt.value = activeRun.value.prompt
    focusPrompt()
  }
}

onMounted(() => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        sessions.value = parsed
        currentSessionId.value = parsed[0].id
      }
    }
  } catch {
    sessions.value = []
  }

  if (sessions.value.length === 0) {
    const initial = createNewSession()
    sessions.value = [initial]
    currentSessionId.value = initial.id
  }

  clock = setInterval(() => {
    now.value = Date.now()
  }, 30_000)
})

onBeforeUnmount(() => {
  controller?.abort()
  if (clock) clearInterval(clock)
})
</script>

<template>
  <section class="wb" aria-labelledby="wb-title">
    <header class="wb-head">
      <div class="wb-head-text">
        <p class="wb-eyebrow">GoVail AI Assistance Engine</p>
        <h1 id="wb-title">AI 어시스턴스 콘솔</h1>
        <p class="wb-lead">
          웹 검색과 실시간 URL 본문 조회를 지원하며, 대화 맥락을 압축해 세션을 이어갑니다.
        </p>
      </div>

      <div class="wb-head-actions">
        <button type="button" class="wb-btn wb-btn-primary" :disabled="isRunning" @click="startNewSession">
          + 새 대화 시작
        </button>

        <div class="wb-history-dropdown">
          <button
            type="button"
            class="wb-btn"
            :aria-expanded="showHistory"
            @click="showHistory = !showHistory"
          >
            이전 대화 ({{ sessions.length }})
          </button>

          <!-- 컴팩트한 이전 대화 팝오버 -->
          <div v-if="showHistory" class="wb-history-popover">
            <div class="wb-history-head">
              <strong>대화 목록</strong>
              <button type="button" class="wb-link-btn wb-muted-sm" @click="clearAllSessions">모두 비우기</button>
            </div>
            <ul v-if="sessions.length" class="wb-history-items">
              <li
                v-for="s in sessions"
                :key="s.id"
                class="wb-history-item"
                :class="{ active: s.id === currentSessionId }"
              >
                <button type="button" class="wb-history-item-btn" @click="selectSession(s.id)">
                  <span class="wb-history-item-title">{{ s.title }}</span>
                  <span class="wb-muted-sm">{{ relativeTime(s.updatedAt || s.createdAt, now) }} · {{ s.runs.length }}턴</span>
                </button>
                <button
                  type="button"
                  class="wb-icon-btn"
                  title="이 대화 삭제"
                  :disabled="isRunning"
                  @click.stop="deleteSession(s.id)"
                >
                  ×
                </button>
              </li>
            </ul>
            <p v-else class="wb-empty-sm">대화 기록이 없습니다.</p>
          </div>
        </div>
      </div>
    </header>

    <p class="wb-next" role="status" aria-live="polite">
      <span class="wb-next-label">상태</span>
      <span>{{ hint }}</span>
    </p>

    <!-- 2단 그리드: 메인 대화창 + engine-process 실행 증적 (EvidencePanel) -->
    <div class="wb-grid">
      <div class="wb-main">
        <!-- 질문 입력창: 도구 선택 UI 없이 깔끔한 폼 -->
        <form class="wb-composer" @submit.prevent="submit">
          <label class="wb-label" for="wb-prompt">질문</label>
          <textarea
            id="wb-prompt"
            ref="promptEl"
            v-model="prompt"
            rows="3"
            placeholder="질문을 입력하세요. 웹 검색이나 링크 조회가 필요하면 엔진이 자동으로 도구를 호출합니다."
            :disabled="isRunning"
            @keydown.ctrl.enter.prevent="submit"
            @keydown.meta.enter.prevent="submit"
          ></textarea>

          <div class="wb-composer-foot-clean">
            <span class="wb-hint">Ctrl/⌘ + Enter로 전송</span>
            <div class="wb-composer-actions">
              <button v-if="isRunning" type="button" class="wb-btn" @click="stop">중단</button>
              <button v-else type="submit" class="wb-btn wb-btn-primary" :disabled="!prompt.trim()">전송</button>
            </div>
          </div>
        </form>

        <!-- 세션 내에 실행이 없으면 추천 질문 표시 -->
        <StartPanel v-if="!activeRun" :busy="isRunning" @run="runScenario" @fill="fillScenario" />

        <!-- 세션 내에 실행이 있으면 engine-process 단계와 답변 표시 -->
        <template v-else>
          <!-- 이전 턴들 접이식 (개별 삭제 및 전체 비우기 지원) -->
          <details v-if="runs.length > 1" class="wb-fold" style="margin-bottom: 12px;" open>
            <summary style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <span>이전 대화 ({{ runs.length - 1 }}건)</span>
              <button
                type="button"
                class="wb-link-btn wb-muted-sm"
                title="이전 대화 비우기"
                :disabled="isRunning"
                @click.stop="clearPriorRuns"
              >
                이전 대화 비우기
              </button>
            </summary>
            <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 12px;">
              <RunView
                v-for="priorRun in runs.slice(0, -1)"
                :key="priorRun.id"
                :run="priorRun"
                :now="now"
                @stop="stop"
                @retry="execute(priorRun.prompt)"
                @edit="prompt = priorRun.prompt; focusPrompt()"
                @remove="removeRun(priorRun.id)"
              />
            </div>
          </details>

          <!-- 현재 활성 턴 -->
          <RunView
            :run="activeRun"
            :now="now"
            @stop="stop"
            @retry="retry"
            @edit="editActive"
            @remove="removeRun(activeRun.id)"
          />

          <!-- 현재 세션 비우기 바 -->
          <div class="wb-panel-foot" style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span class="wb-muted-sm">기록은 브라우저에만 저장됩니다.</span>
            <button
              type="button"
              class="wb-link-btn wb-muted-sm"
              :disabled="isRunning"
              @click="clearCurrentSession"
            >
              현재 대화 모두 비우기
            </button>
          </div>
        </template>
      </div>

      <!-- 우측 증적 패널: engine-process 오케스트레이션 실행 증적 -->
      <div class="wb-side" :class="{ 'wb-side-idle': !activeRun }">
        <EvidencePanel :run="activeRun" />
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { streamGateway } from '../../../gateway-client.js'
import {
  ALL_PUBLIC_TOOLS,
  buildRequestBody,
  createRun,
  failRun,
  newRunId,
  reduceStreamEvent,
  settleRun,
  titleFromPrompt,
  relativeTime,
} from '../../../workbench-core.js'
import EvidencePanel from './EvidencePanel.vue'
import RunView from './RunView.vue'
import StartPanel from './StartPanel.vue'

interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  runs: Array<ReturnType<typeof createRun>>
}

const STORAGE_SESSIONS_KEY = 'govail_console_sessions_v1'

const sessions = ref<ChatSession[]>([])
const currentSessionId = ref<string | null>(null)
const prompt = ref('')
const now = ref(Date.now())
const promptEl = ref<HTMLTextAreaElement | null>(null)
const showHistoryMenu = ref(false)

let controller: AbortController | null = null
let clock: ReturnType<typeof setInterval> | undefined

const currentSession = computed(() => sessions.value.find((s) => s.id === currentSessionId.value) ?? null)
const isRunning = computed(() => currentSession.value?.runs.some((r) => r.status === 'running') ?? false)
const latestRun = computed(() => {
  const r = currentSession.value?.runs
  return r && r.length > 0 ? r[r.length - 1] : null
})

function persist() {
  try {
    window.localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions.value.slice(0, 20)))
  } catch {
    // 시크릿 모드 등 예외 방어
  }
}

function createNewSession(): ChatSession {
  return {
    id: `session_${Date.now().toString(36)}`,
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
  showHistoryMenu.value = false
  persist()
  focusPrompt()
}

function selectSession(id: string) {
  if (isRunning.value) return
  currentSessionId.value = id
  showHistoryMenu.value = false
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

async function focusPrompt() {
  await nextTick()
  promptEl.value?.focus()
}

function buildHistoryContext(session: ChatSession) {
  // 이전 완료된 턴들의 Q&A를 추출하여 압축
  const turns = session.runs.filter((r) => r.status === 'done' && r.answer)
  const history: Array<{ role: string; content: string }> = []
  for (const t of turns) {
    history.push({ role: 'user', content: t.prompt })
    // 긴 답변은 압축(최대 600자)하여 컨텍스트 윈도우 보존
    const shortAnswer = t.answer.length > 600 ? `${t.answer.slice(0, 600)}…` : t.answer
    history.push({ role: 'assistant', content: shortAnswer })
  }
  return history
}

function patchCurrentRun(runId: string, update: (run: any) => any) {
  if (!currentSession.value) return
  const runs = currentSession.value.runs
  const index = runs.findIndex((r) => r.id === runId)
  if (index >= 0) {
    runs[index] = update(runs[index])
    currentSession.value.updatedAt = Date.now()
  }
}

async function execute(text: string) {
  if (isRunning.value || !text.trim()) return

  if (!currentSession.value) {
    startNewSession()
  }
  const session = currentSession.value!

  // 세션의 첫 질문이면 제목 갱신
  if (session.runs.length === 0 || session.title === '새 대화') {
    session.title = titleFromPrompt(text, 24)
  }

  // 이전 대화 내용을 압축하여 history 구성
  const history = buildHistoryContext(session)

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
        patchCurrentRun(run.id, (cur) => reduceStreamEvent(cur, event, data))
      },
    })
    patchCurrentRun(run.id, settleRun)
  } catch (err) {
    if ((err as { name?: string })?.name !== 'GatewayError') console.error('콘솔 처리 오류', err)
    patchCurrentRun(run.id, (cur) => failRun(cur, err))
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

function retry(run: any) {
  if (run?.prompt) execute(run.prompt)
}

function editPrompt(run: any) {
  if (run?.prompt) {
    prompt.value = run.prompt
    focusPrompt()
  }
}

onMounted(() => {
  try {
    const raw = window.localStorage.getItem(STORAGE_SESSIONS_KEY)
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
    <!-- 상단 헤더: 타이틀 + 세션 제어 + 이전 기록 드롭다운 -->
    <header class="wb-head">
      <div class="wb-head-text">
        <p class="wb-eyebrow">GoVail AI Assistance Engine</p>
        <h1 id="wb-title">AI 어시스턴스 콘솔</h1>
        <p class="wb-lead">
          웹 검색과 실시간 링크 조회를 지원하며, 대화 맥락을 압축해 세션을 이어갑니다.
        </p>
      </div>

      <div class="wb-session-controls">
        <button type="button" class="wb-btn wb-btn-primary" :disabled="isRunning" @click="startNewSession">
          + 새 대화 시작
        </button>

        <div class="wb-history-dropdown-wrapper">
          <button
            type="button"
            class="wb-btn wb-btn-secondary"
            :aria-expanded="showHistoryMenu"
            @click="showHistoryMenu = !showHistoryMenu"
          >
            이전 대화 ({{ sessions.length }})
          </button>

          <!-- 컴팩트한 이전 대화 팝오버 (작업 기록이 화면을 길게 차지하지 않음) -->
          <div v-if="showHistoryMenu" class="wb-history-menu">
            <div class="wb-history-menu-head">
              <strong>대화 목록</strong>
              <button type="button" class="wb-link-btn wb-muted-sm" @click="clearAllSessions">모두 비우기</button>
            </div>
            <ul v-if="sessions.length" class="wb-history-menu-list">
              <li
                v-for="s in sessions"
                :key="s.id"
                class="wb-history-menu-item"
                :class="{ active: s.id === currentSessionId }"
              >
                <button type="button" class="wb-history-menu-title" @click="selectSession(s.id)">
                  <span class="wb-history-name">{{ s.title }}</span>
                  <span class="wb-muted-sm">{{ relativeTime(s.updatedAt || s.createdAt, now) }} · {{ s.runs.length }}턴</span>
                </button>
                <button
                  type="button"
                  class="wb-icon-btn"
                  title="삭제"
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

    <!-- 2단 레이아웃: 메인 대화 스레드 (70%) + engine-process 실행 증적 (30%) -->
    <div class="wb-grid-2col">
      <main class="wb-main-col">
        <!-- 대화가 없을 때: 추천 질문 안내 -->
        <StartPanel
          v-if="!currentSession || currentSession.runs.length === 0"
          :busy="isRunning"
          @run="runScenario"
          @fill="fillScenario"
        />

        <!-- 대화 세션 스레드: 한 세션 안의 모든 턴을 순서대로 표시 -->
        <div v-else class="wb-turns-container">
          <RunView
            v-for="run in currentSession.runs"
            :key="run.id"
            :run="run"
            :now="now"
            @stop="stop"
            @retry="retry(run)"
            @edit="editPrompt(run)"
          />
        </div>

        <!-- 질문 작성기: 도구 선택 UI 전면 제거, 단정하고 깔끔한 입력창 -->
        <form class="wb-composer wb-composer-clean" @submit.prevent="submit">
          <label class="wb-label" for="wb-prompt">질문 입력</label>
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

          <div class="wb-composer-foot">
            <span class="wb-composer-hint">Ctrl + Enter 또는 ⌘ + Enter로 전송</span>
            <div class="wb-composer-buttons">
              <button v-if="isRunning" type="button" class="wb-btn" @click="stop">중단</button>
              <button v-else type="submit" class="wb-btn wb-btn-primary" :disabled="!prompt.trim()">
                전송
              </button>
            </div>
          </div>
        </form>
      </main>

      <!-- 우측 사이드: engine-process 오케스트레이션 실행 증적 (EvidencePanel) -->
      <aside class="wb-side-col">
        <EvidencePanel :run="latestRun" />
      </aside>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { streamGateway } from '../../../gateway-client.js'
import {
  TOOLS,
  buildRequestBody,
  createRun,
  describeToolPlan,
  failRun,
  loadRuns,
  newRunId,
  nextActionHint,
  reduceStreamEvent,
  resolveTools,
  saveRuns,
  settleRun,
} from '../../../workbench-core.js'
import EvidencePanel from './EvidencePanel.vue'
import RunList from './RunList.vue'
import RunView from './RunView.vue'
import StartPanel from './StartPanel.vue'

type Run = ReturnType<typeof createRun>
type Plan = { tools: string[]; mode: string; signal?: string }

const runs = ref<Run[]>([])
const activeId = ref<string | null>(null)
const prompt = ref('')
const toolSelection = ref('auto')
const now = ref(Date.now())
const promptEl = ref<HTMLTextAreaElement | null>(null)

let controller: AbortController | null = null
let clock: ReturnType<typeof setInterval> | undefined

const activeRun = computed(() => runs.value.find((run) => run.id === activeId.value) ?? null)
const isRunning = computed(() => runs.value.some((run) => run.status === 'running'))
const plan = computed(() => resolveTools(prompt.value, toolSelection.value))
const planText = computed(() => describeToolPlan(plan.value))
const hint = computed(() => nextActionHint(activeRun.value))

function persist() {
  try {
    saveRuns(window.localStorage, runs.value)
  } catch {
    // 저장소를 쓸 수 없는 환경(시크릿 모드 등)에서도 콘솔은 동작해야 한다.
  }
}

function patchRun(id: string, update: (run: Run) => Run) {
  const index = runs.value.findIndex((run) => run.id === id)
  if (index >= 0) runs.value[index] = update(runs.value[index])
}

async function execute(text: string, runPlan: Plan) {
  if (isRunning.value) return
  const run = createRun({ id: newRunId(), prompt: text, plan: runPlan })
  runs.value.unshift(run)
  activeId.value = run.id
  persist()

  controller = new AbortController()
  try {
    await streamGateway({
      body: buildRequestBody(run),
      signal: controller.signal,
      onEvent: (event: string, data: Record<string, unknown>) => patchRun(run.id, (current) => reduceStreamEvent(current, event, data)),
    })
    patchRun(run.id, settleRun)
  } catch (err) {
    if ((err as { name?: string })?.name !== 'GatewayError') console.error('콘솔 처리 오류', err)
    patchRun(run.id, (current) => failRun(current, err))
  } finally {
    controller = null
    persist()
  }
}

function submit() {
  const text = prompt.value.trim()
  if (!text || isRunning.value) return
  // plan은 입력창 내용에서 계산되므로 비우기 전에 확정한다. 안내한 도구와 전송하는 도구가 같아야 한다.
  const runPlan = { ...plan.value }
  prompt.value = ''
  execute(text, runPlan)
}

function runScenario(scenario: { prompt: string; tools: string[] }) {
  execute(scenario.prompt, { tools: scenario.tools, mode: scenario.tools.length ? 'manual' : 'none' })
}

async function focusPrompt() {
  await nextTick()
  promptEl.value?.focus()
  promptEl.value?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

function fill(text: string, tools: string[]) {
  prompt.value = text
  toolSelection.value = tools[0] ?? 'none'
  focusPrompt()
}

const fillScenario = (scenario: { prompt: string; tools: string[] }) => fill(scenario.prompt, scenario.tools)

function retry() {
  const run = activeRun.value
  if (!run) return
  execute(run.prompt, { tools: run.tools, mode: run.toolMode === 'auto' || run.toolMode === 'none' ? run.toolMode : 'manual' })
}

function editActive() {
  const run = activeRun.value
  if (run) fill(run.prompt, run.tools)
}

function stop() {
  controller?.abort()
}

function newTask() {
  activeId.value = null
  prompt.value = ''
  toolSelection.value = 'auto'
  focusPrompt()
}

function removeRun(id: string) {
  runs.value = runs.value.filter((run) => run.id !== id)
  if (activeId.value === id) activeId.value = null
  persist()
}

function clearAll() {
  if (isRunning.value) return
  if (!window.confirm('이 브라우저에 저장된 작업 기록을 모두 삭제할까요?')) return
  runs.value = []
  activeId.value = null
  persist()
}

onMounted(() => {
  try {
    runs.value = loadRuns(window.localStorage)
  } catch {
    runs.value = []
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
        <p class="wb-eyebrow">GoVail Gateway · 공개 데모</p>
        <h1 id="wb-title">질문을 보내고, 실행 증적을 확인하세요</h1>
        <p class="wb-lead">질문 하나가 게이트웨이를 거쳐 도구 호출과 모델 응답으로 처리되는 과정을 그대로 보여 줍니다. 실행을 누를 때만 relay로 전송되고, 기록은 이 브라우저에만 저장됩니다.</p>
      </div>
      <button type="button" class="wb-btn wb-btn-primary" @click="newTask">+ 새 작업</button>
    </header>

    <p class="wb-next" role="status" aria-live="polite">
      <span class="wb-next-label">다음 행동</span>
      <span>{{ hint }}</span>
    </p>

    <div class="wb-grid">
      <div class="wb-main">
        <form class="wb-composer" @submit.prevent="submit">
          <label class="wb-label" for="wb-prompt">질문</label>
          <textarea
            id="wb-prompt"
            ref="promptEl"
            v-model="prompt"
            rows="3"
            placeholder="직접 질문을 입력하세요. 예: 최근 LLM Gateway 장애 복구 패턴을 웹 검색해서 정리해줘"
            :disabled="isRunning"
            aria-describedby="wb-plan"
            @keydown.ctrl.enter.prevent="submit"
            @keydown.meta.enter.prevent="submit"
          ></textarea>

          <div class="wb-composer-row">
            <div class="wb-tool-field">
              <label for="wb-tool">도구</label>
              <select id="wb-tool" v-model="toolSelection" :disabled="isRunning">
                <option value="auto">자동</option>
                <option v-for="(tool, key) in TOOLS" :key="key" :value="key">{{ tool.label }}</option>
                <option value="none">사용 안 함</option>
              </select>
            </div>
            <p id="wb-plan" class="wb-plan">{{ planText }}</p>
            <div class="wb-composer-actions">
              <button v-if="isRunning" type="button" class="wb-btn" @click="stop">중단</button>
              <button v-else type="submit" class="wb-btn wb-btn-primary" :disabled="!prompt.trim()">실행</button>
            </div>
          </div>
          <p class="wb-hint">Ctrl/⌘ + Enter로도 실행합니다 · 모델 govail/thinker</p>
        </form>

        <StartPanel v-if="!activeRun" :busy="isRunning" @run="runScenario" @fill="fillScenario" />
        <RunView v-else :run="activeRun" :now="now" @stop="stop" @retry="retry" @edit="editActive" />
      </div>

      <div class="wb-side" :class="{ 'wb-side-idle': !activeRun }">
        <EvidencePanel :run="activeRun" />
      </div>

      <div class="wb-rail">
        <RunList :runs="runs" :active-id="activeId" :now="now" @select="(id: string) => (activeId = id)" @remove="removeRun" @clear="clearAll" />
      </div>
    </div>
  </section>
</template>

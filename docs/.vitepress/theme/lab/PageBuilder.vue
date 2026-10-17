<script setup>
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'

const host = ref(null)
const editor = shallowRef(null)
const state = ref('loading') // loading | ready | error
const errorText = ref('')
const selected = ref(null)
const fontSize = ref(16)
const device = ref('Desktop')

const START_HTML = `
<header class="hero">
  <p class="eyebrow">성수동 골목 빵집</p>
  <h1>아침 7시, 오늘 구운 빵만 팝니다</h1>
  <p class="lead">전날 반죽을 하루 숙성해 굽습니다. 남은 빵은 저녁 8시에 근처 쉼터로 보냅니다.</p>
  <a class="cta" href="#menu">오늘 메뉴 보기</a>
</header>
<section class="cols" id="menu">
  <div><h3>캄파뉴</h3><p>통밀 30%, 천연 발효종. 오전 중 소진됩니다.</p></div>
  <div><h3>소금빵</h3><p>버터를 넣고 굽기 직전에 소금을 올립니다.</p></div>
  <div><h3>무화과 깜빠뉴</h3><p>금·토요일에만 굽습니다.</p></div>
</section>`

const START_CSS = `
body{margin:0;font-family:'Pretendard Variable',-apple-system,sans-serif;color:#1d1d1f;background:#fff}
.hero{padding:72px 40px 56px;background:#faf6ef}
.eyebrow{margin:0;color:#9a6b2f;font-size:14px;font-weight:600}
.hero h1{margin:12px 0 0;font-size:44px;line-height:1.2;letter-spacing:-0.03em}
.lead{max-width:520px;margin:16px 0 0;font-size:17px;line-height:1.7;color:#4a4a4f}
.cta{display:inline-block;margin-top:24px;padding:12px 20px;border-radius:8px;background:#1d1d1f;color:#fff;text-decoration:none;font-weight:600}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:40px}
.cols h3{margin:0;font-size:20px}
.cols p{margin:8px 0 0;font-size:15px;line-height:1.6;color:#55555a}`

const BLOCKS = [
  { id: 'heading', label: '제목', content: '<h2 style="font-size:32px;margin:24px 40px">새 제목</h2>' },
  { id: 'text', label: '문단', content: '<p style="font-size:16px;line-height:1.7;margin:12px 40px">여기에 문단을 쓰세요.</p>' },
  { id: 'button', label: '버튼', content: '<a href="#" style="display:inline-block;margin:12px 40px;padding:12px 20px;border-radius:8px;background:#1d1d1f;color:#fff;text-decoration:none">버튼</a>' },
  { id: 'image', label: '이미지', content: { type: 'image', style: { width: '100%', 'max-width': '640px', margin: '12px 40px' } }, activate: true },
  { id: 'two-col', label: '2단', content: '<section style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:24px 40px"><div><h3>왼쪽</h3><p>내용</p></div><div><h3>오른쪽</h3><p>내용</p></div></section>' },
  { id: 'divider', label: '구분선', content: '<hr style="margin:24px 40px;border:0;border-top:1px solid #e5e5e5">' },
]

function readFontSize(component) {
  if (!component || !editor.value) return 16
  const el = component.getEl()
  const px = el ? parseFloat(getComputedStyle(el).fontSize) : NaN
  return Number.isFinite(px) ? Math.round(px) : 16
}

function applyFontSize(v) {
  fontSize.value = v
  const c = editor.value?.getSelected()
  if (c) c.addStyle({ 'font-size': `${v}px` })
}

function setDevice(name) {
  device.value = name
  editor.value?.setDevice(name)
}

function exportHtml() {
  const ed = editor.value
  if (!ed) return
  const doc = `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>내보낸 페이지</title>\n<style>\n${ed.getCss()}\n</style>\n</head>\n<body>\n${ed.getHtml()}\n</body>\n</html>\n`
  const url = URL.createObjectURL(new Blob([doc], { type: 'text/html' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'page.html'
  a.click()
  URL.revokeObjectURL(url)
}

function resetPage() {
  const ed = editor.value
  if (!ed) return
  ed.setComponents(START_HTML)
  ed.setStyle(START_CSS)
}

onMounted(async () => {
  try {
    const { default: grapesjs } = await import('grapesjs')
    // VitePress는 CSS를 전역 번들 하나로 합치므로, 편집기 CSS는 설치된 버전과 같은 CDN 파일을 이 페이지에서만 붙인다.
    if (!document.querySelector('link[data-grapesjs]')) {
      await new Promise((resolve, reject) => {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = `https://cdn.jsdelivr.net/npm/grapesjs@${grapesjs.version}/dist/css/grapes.min.css`
        link.dataset.grapesjs = ''
        link.onload = resolve
        link.onerror = () => reject(new Error('편집기 스타일을 불러오지 못했습니다'))
        document.head.appendChild(link)
      })
    }
    const ed = grapesjs.init({
      container: host.value,
      height: '640px',
      width: 'auto',
      storageManager: false,
      // 캔버스는 iframe이라 사이트 폰트를 따로 넣어 준다.
      canvas: { styles: ['https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css'] },
      i18n: { messagesAdd: { en: { styleManager: { empty: '캔버스에서 영역을 먼저 선택하세요.' }, traitManager: { empty: '캔버스에서 영역을 먼저 선택하세요.' } } } },
      components: START_HTML,
      style: START_CSS,
      deviceManager: {
        devices: [
          { id: 'Desktop', name: 'Desktop', width: '' },
          { id: 'Tablet', name: 'Tablet', width: '768px', widthMedia: '992px' },
          { id: 'Mobile', name: 'Mobile', width: '375px', widthMedia: '480px' },
        ],
      },
      styleManager: {
        sectors: [
          { name: '글자', open: true, properties: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align'] },
          { name: '배경과 여백', open: false, properties: ['background-color', 'padding', 'margin', 'border-radius'] },
          { name: '크기', open: false, properties: ['width', 'max-width', 'height'] },
        ],
      },
      blockManager: { blocks: BLOCKS },
    })
    ed.on('component:selected', (c) => {
      selected.value = c ? (c.getName?.() || c.get('tagName')) : null
      fontSize.value = readFontSize(c)
    })
    ed.on('component:deselected', () => {
      selected.value = null
    })
    editor.value = ed
    state.value = 'ready'
  } catch (e) {
    state.value = 'error'
    errorText.value = e?.message ?? String(e)
  }
})

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <div class="proto proto--wide builder" id="editor">
    <div class="proto__bar">
      <strong>웹페이지 빌더</strong>
      <span>캔버스에서 영역을 클릭하면 오른쪽 패널과 아래 슬라이더로 스타일을 바꿀 수 있습니다.</span>
    </div>
    <div class="quick">
      <span class="quick__sel">{{ selected ? `선택: ${selected}` : '영역을 클릭하세요' }}</span>
      <label class="quick__size">
        글자 크기
        <input type="range" min="10" max="96" :value="fontSize" :disabled="!selected" @input="applyFontSize(Number($event.target.value))" />
        <output>{{ fontSize }}px</output>
      </label>
      <div class="quick__devices" role="group" aria-label="미리보기 화면 크기">
        <button v-for="d in ['Desktop', 'Tablet', 'Mobile']" :key="d" type="button" :aria-pressed="device === d" :disabled="state !== 'ready'" @click="setDevice(d)">{{ { Desktop: '데스크톱', Tablet: '태블릿', Mobile: '모바일' }[d] }}</button>
      </div>
      <button type="button" class="btn" :disabled="state !== 'ready'" @click="resetPage">처음 상태로</button>
      <button type="button" class="btn btn--primary" :disabled="state !== 'ready'" @click="exportHtml">HTML 내려받기</button>
    </div>
    <p v-if="state === 'loading'" class="status">편집기를 불러오는 중입니다.</p>
    <p v-if="state === 'error'" class="status status--err">편집기를 불러오지 못했습니다: {{ errorText }}</p>
    <div ref="host" class="builder__host" />
    <p class="mobile-note">편집은 넓은 화면에서 쓰기 좋습니다. 휴대폰에서는 미리보기 위주로 확인하세요.</p>
  </div>
</template>

<style scoped>
.quick { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; padding: 10px 16px; border-bottom: 1px solid var(--mist); }
.quick__sel { min-width: 140px; color: var(--ink); font-size: 14px; font-weight: 650; }
.quick__size { display: inline-flex; align-items: center; gap: 10px; color: var(--ink-soft); font-size: 14px; }
.quick__size input { width: 160px; accent-color: var(--ink); }
.quick__size output { min-width: 44px; color: var(--ink); font-variant-numeric: tabular-nums; }
.quick__devices { display: inline-flex; margin-left: auto; border: 1px solid var(--mist-strong); border-radius: 8px; overflow: hidden; }
.quick__devices button { height: 34px; padding: 0 12px; background: var(--paper); color: var(--ink-soft); font-size: 13px; font-weight: 600; cursor: pointer; }
.quick__devices button + button { border-left: 1px solid var(--mist-strong); }
.quick__devices button[aria-pressed="true"] { background: var(--ink); color: #fff; }
.status { margin: 0; padding: 14px 16px; color: var(--slate); font-size: 14px; }
.status--err { color: #a12c2c; }
.builder__host { min-height: 640px; }
.mobile-note { display: none; margin: 0; padding: 10px 16px; color: var(--slate); font-size: 13px; }
@media (max-width: 760px) { .mobile-note { display: block; } .quick__devices { margin-left: 0; } }
</style>

<style>
/* GrapesJS 기본 다크 패널을 사이트 톤(흰 바탕, 먹색 강조)으로 바꾼다. */
.builder .gjs-one-bg { background-color: #ffffff; }
.builder .gjs-two-color { color: #3d424d; }
.builder .gjs-three-bg { background-color: #16181d; color: #fff; }
.builder .gjs-four-color, .builder .gjs-four-color-h:hover { color: #2450e6; }
.builder .gjs-pn-panel, .builder .gjs-pn-views-container { border-color: #e2e5ea; }
.builder .gjs-pn-views-container, .builder .gjs-pn-views { border-left: 1px solid #e2e5ea; box-shadow: none; }
.builder .gjs-cv-canvas { background: #f6f7f9; }
.builder .gjs-block { width: 44%; min-height: 64px; border: 1px solid #e2e5ea; border-radius: 8px; box-shadow: none; font-family: inherit; }
.builder .gjs-block:hover { border-color: #16181d; color: #16181d; }
.builder .gjs-sm-sector-title, .builder .gjs-layer-title, .builder .gjs-block-category .gjs-title { background: #f6f7f9; border-color: #e2e5ea; }
.builder .gjs-field { background: #f6f7f9; border: 1px solid #e2e5ea; color: #16181d; }
.builder .gjs-pn-devices-c { display: none; }
.builder .gjs-editor { font-family: "Pretendard Variable", Pretendard, sans-serif; }
</style>

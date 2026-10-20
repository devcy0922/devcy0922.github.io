import { h } from 'vue'
import { inBrowser } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
// 폰트는 외부 CDN 대신 패키지에서 번들한다. 한글은 unicode-range로 나뉜 조각 중 필요한 것만 받는다.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import '@fontsource-variable/jetbrains-mono'
import WorkIndex from './WorkIndex.vue'
import PostArchive from './PostArchive.vue'
import AutoProjects from './AutoProjects.vue'
import SelectedProjects from './SelectedProjects.vue'
import OtherProjects from './OtherProjects.vue'
import DiagramFrame from './DiagramFrame.vue'
import Workbench from './workbench/Workbench.vue'
import RedirectNotice from './RedirectNotice.vue'
import ProductHero from './lab/ProductHero.vue'
import ProductFeatures from './lab/ProductFeatures.vue'
import LabPager from './lab/LabPager.vue'
import LabIndex from './lab/LabIndex.vue'
import CaptureSlot from './lab/CaptureSlot.vue'
import ReportDiff from './lab/ReportDiff.vue'
import SlackBlocks from './lab/SlackBlocks.vue'
import DomainChecker from './lab/DomainChecker.vue'
import QuitSimulator from './lab/QuitSimulator.vue'
import SandboxPolicy from './lab/SandboxPolicy.vue'
import DomainRag from './lab/DomainRag.vue'
import './custom.css'
import './workbench/workbench.css'

export default {
  extends: DefaultTheme,
  // frontmatter에 lab: <id>가 있는 페이지(layout: page)는 제품 히어로와 이전/다음 제품 링크를 자동으로 붙인다.
  Layout: () => h(DefaultTheme.Layout, null, {
    'page-top': () => h(ProductHero),
    'page-bottom': () => h(LabPager),
  }),
  enhanceApp({ app }) {
    const components = {
      WorkIndex, PostArchive, AutoProjects, SelectedProjects, OtherProjects, DiagramFrame,
      Workbench, RedirectNotice, LabIndex, CaptureSlot, ReportDiff, SlackBlocks,
      DomainChecker, ProductFeatures, QuitSimulator, SandboxPolicy, DomainRag,
    }
    for (const [name, component] of Object.entries(components)) app.component(name, component)
    if (inBrowser) watchDiagramFonts()
  },
}

// mermaid는 처음 그릴 때 라벨 글자 폭을 잰다. 그때 라벨에 필요한 한글 조각 폰트가 아직 없으면
// 대체 글꼴로 재서 박스가 좁아지고 글자가 잘린다. 다이어그램이 생기면 라벨 글자의 폰트를 받아 두고,
// 새로 받은 경우에만 <html> 속성을 바꿔 다시 그리게 한다(vitepress-plugin-mermaid는 이 속성 변화에 다시 그린다).
const DIAGRAM_FONT = '400 14px "Pretendard Variable"'

function watchDiagramFonts() {
  let queued = false
  const settle = async () => {
    queued = false
    const text = Array.from(document.querySelectorAll('.mermaid'), (el) => el.textContent ?? '').join('')
    if (!text || document.fonts.check(DIAGRAM_FONT, text)) return
    await document.fonts.load(DIAGRAM_FONT, text).catch(() => [])
    document.documentElement.dataset.diagramFonts = String(Date.now())
  }
  new MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(settle)
  }).observe(document.body, { childList: true, subtree: true })
}

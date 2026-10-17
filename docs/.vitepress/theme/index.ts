import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
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
import PageBuilder from './lab/PageBuilder.vue'
import DomainChecker from './lab/DomainChecker.vue'
import QuitSimulator from './lab/QuitSimulator.vue'
import SandboxPolicy from './lab/SandboxPolicy.vue'
import RagSkeleton from './lab/RagSkeleton.vue'
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
      PageBuilder, DomainChecker, ProductFeatures, QuitSimulator, SandboxPolicy, RagSkeleton,
    }
    for (const [name, component] of Object.entries(components)) app.component(name, component)
  },
}

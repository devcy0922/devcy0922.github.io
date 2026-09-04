import DefaultTheme from 'vitepress/theme'
import BlogHome from './BlogHome.vue'
import PostArchive from './PostArchive.vue'
import AutoProjects from './AutoProjects.vue'
import SelectedProjects from './SelectedProjects.vue'
import DiagramFrame from './DiagramFrame.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('BlogHome', BlogHome)
    app.component('PostArchive', PostArchive)
    app.component('AutoProjects', AutoProjects)
    app.component('SelectedProjects', SelectedProjects)
    app.component('DiagramFrame', DiagramFrame)
  },
}

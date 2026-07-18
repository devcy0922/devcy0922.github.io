import DefaultTheme from 'vitepress/theme'
import LiveLlmDemo from './LiveLlmDemo.vue'
import LocaleSwitcher from './LocaleSwitcher.vue'
import PortfolioHome from './PortfolioHome.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('LiveLlmDemo', LiveLlmDemo)
    app.component('LocaleSwitcher', LocaleSwitcher)
    app.component('PortfolioHome', PortfolioHome)
  }
}

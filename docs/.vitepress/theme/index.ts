import DefaultTheme from 'vitepress/theme'
import LiveLlmDemo from './LiveLlmDemo.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('LiveLlmDemo', LiveLlmDemo)
  }
}

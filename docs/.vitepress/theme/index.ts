import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 필요한 경우 컴포넌트 전역 등록 가능
  }
}

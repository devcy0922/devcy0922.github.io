<script setup lang="ts">
import { onMounted } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps<{ to: string; label: string }>()

// JS가 꺼져 있어도 frontmatter의 meta refresh와 아래 링크로 이동할 수 있다.
onMounted(() => {
  window.location.replace(withBase(props.to))
})
</script>

<template>
  <main class="redirect-notice">
    <p>이 주소는 <a :href="withBase(to)">{{ label }}</a>로 통합되었습니다. 자동으로 이동하지 않으면 링크를 눌러 주세요.</p>
  </main>
</template>

<style scoped>
.redirect-notice {
  width: min(720px, calc(100% - 32px));
  margin: 0 auto;
  padding: 96px 0;
  color: var(--ink-soft);
  font-size: 15px;
  line-height: 1.7;
}

.redirect-notice a {
  color: var(--cobalt);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>

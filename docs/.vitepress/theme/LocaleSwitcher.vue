<script setup lang="ts">
import { onMounted } from 'vue'
import { useLocale } from './useLocale'

const { currentLocale, loading, setLocale, detectInitialLocale, SUPPORTED } = useLocale()

// 로케일 레이블
const LABELS: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
}

// 마운트 시 초기 로케일 감지
onMounted(async () => {
  const initial = detectInitialLocale()
  await setLocale(initial)
})
</script>

<template>
  <div class="locale-switcher" aria-label="언어 선택">
    <button
      v-for="lang in SUPPORTED"
      :key="lang"
      class="locale-btn"
      :class="{ active: currentLocale === lang, loading }"
      :disabled="loading"
      :aria-pressed="currentLocale === lang"
      @click="setLocale(lang as 'ko' | 'en' | 'ja')"
    >
      {{ LABELS[lang] }}
    </button>
    <!-- LingoAgent 생성 배지 (ko 외 언어 선택 시) -->
    <span v-if="currentLocale !== 'ko'" class="lingo-badge" title="LingoAgent가 번역한 텍스트입니다">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right:3px">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
      </svg>
      AI 번역
    </span>
  </div>
</template>

<style scoped>
.locale-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.locale-btn {
  padding: 4px 10px;
  font-size: 0.78rem;
  font-weight: 500;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.locale-btn:hover:not(:disabled) {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}

.locale-btn.active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.locale-btn.loading {
  opacity: 0.5;
  cursor: wait;
}

.lingo-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  margin-left: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 4px;
  letter-spacing: 0.02em;
}
</style>

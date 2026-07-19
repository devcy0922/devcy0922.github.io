/**
 * useLocale — 포트폴리오 사이트 다국어 composable
 *
 * /public/locales/{lang}.json 을 fetch하여 UI 텍스트를 제공합니다.
 * LingoAgent가 생성한 en.json, ja.json 을 런타임에 로드합니다.
 */

import { computed, ref, watch } from 'vue'

type SupportedLocale = 'ko' | 'en' | 'ja'

const SUPPORTED: SupportedLocale[] = ['ko', 'en', 'ja']
const STORAGE_KEY = 'portfolio:locale'

// ─── 전역 상태 (모든 컴포넌트 공유) ───
const currentLocale = ref<SupportedLocale>('ko')
const messages = ref<Record<string, string>>({})
const loading = ref(false)

/**
 * 브라우저 언어 설정을 참고하여 초기 로케일을 감지합니다.
 */
function detectInitialLocale(): SupportedLocale {
  // 1. localStorage 저장값 우선
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null
    if (stored && SUPPORTED.includes(stored)) return stored
  }
  // 2. 브라우저 언어 설정 참고
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language.toLowerCase()
    if (lang.startsWith('ja')) return 'ja'
    if (lang.startsWith('en')) return 'en'
  }
  return 'ko'
}

/**
 * 지정한 로케일의 JSON 파일을 fetch합니다.
 * ko.json 은 항상 /public/locales/ko.json 에 위치합니다.
 * en.json / ja.json 은 LingoAgent가 생성한 파일입니다.
 */
async function loadMessages(locale: SupportedLocale): Promise<Record<string, string>> {
  // VitePress의 base path 환경변수 및 window.location을 활용하여 어떤 호스팅 환경(subpath)에서도 정확한 locales 주소를 계산
  const base = typeof window !== 'undefined' 
    ? (window.location.origin + (import.meta.env.BASE_URL || '/')) 
    : '/'
  const cleanBase = base.endsWith('/') ? base : base + '/'
  const url = `${cleanBase}locales/${locale}.json`
  
  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`)
    return await resp.json()
  } catch (e) {
    console.warn(`[useLocale] ${locale}.json 로드 실패, ko로 폴백:`, e)
    // 번역 파일 로드 실패 시 ko로 폴백
    if (locale !== 'ko') {
      const fallbackUrl = `${cleanBase}locales/ko.json`
      const fallback = await fetch(fallbackUrl)
      return fallback.ok ? fallback.json() : {}
    }
    return {}
  }
}

/**
 * 로케일을 전환하고 메시지를 로드합니다.
 */
async function setLocale(locale: SupportedLocale) {
  if (locale === currentLocale.value && Object.keys(messages.value).length > 0) return
  loading.value = true
  try {
    messages.value = await loadMessages(locale)
    currentLocale.value = locale
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, locale)
    }
  } finally {
    loading.value = false
  }
}

/**
 * 번역 함수 t() — 키에 해당하는 UI 텍스트를 반환합니다.
 * messages 가 ref이므로 템플릿에서 t가 호출될 때 messages 의존성이 추적됩니다.
 */
function t(key: string): string {
  return messages.value[key] ?? key
}

export function useLocale() {
  return {
    currentLocale: computed(() => currentLocale.value),
    loading: computed(() => loading.value),
    messages: computed(() => messages.value), // messages 자체를 반응성 있게 제공
    setLocale,
    detectInitialLocale,
    SUPPORTED,
    t,
  }
}

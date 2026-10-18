// Lingo 도메인 번역 데모의 LLM 단계. 화면(DomainChecker.vue)은 요청을 만들고, 받은 번역을 복원·검사할 때 이 함수만 쓴다.
// LLM에는 용어를 자리표시자(⟦T1⟧)로 바꾼 문장만 보낸다. 용어는 번역 뒤 용어집 번역으로 되돌린다.

export const PLACEHOLDER = /⟦T(\d+)⟧/g
export const MAX_SOURCE = 300

const SYSTEM_PROMPT = [
  'Translate the Korean sentence into natural English for a security product document.',
  'Keep every placeholder like ⟦T1⟧ exactly as written, once each, in a natural position.',
  'Reply with the English sentence only. No notes, no quotes.',
].join(' ')

/** 게이트웨이로 보내는 요청 본문. 한 번 호출, 짧은 출력으로 끝낸다. */
export function buildTranslateRequest(masked) {
  return {
    prompt: String(masked).slice(0, MAX_SOURCE),
    systemPrompt: SYSTEM_PROMPT,
    tools: [],
    enableThinking: false,
    temperature: 0,
    maxTokens: 160,
  }
}

/** 모델이 붙이는 따옴표·머리말·여러 줄을 걷어 첫 번역 문장만 남긴다. */
export function cleanOutput(text) {
  const line = String(text ?? '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean) ?? ''
  return line.replace(/^(translation|english)\s*:\s*/i, '').replace(/^["'“”]+|["'“”]+$/g, '').trim()
}

/** ⟦Tn⟧을 slots[n-1]의 도메인 번역으로 되돌린다. 문장 첫 글자는 대문자로 맞춘다. */
export function restoreTerms(text, slots) {
  const out = text.replace(PLACEHOLDER, (m, n) => slots[Number(n) - 1]?.en ?? m)
  return out.charAt(0).toUpperCase() + out.slice(1)
}

/**
 * 규칙 QA. 자리표시자가 빠지거나 늘었는지, 넘긴 문장의 숫자가 번역에 남았는지 본다.
 * 용어 안의 숫자(802.1X 등)는 이미 자리표시자라서 masked 기준으로 센다.
 * 통과하지 못하면 번역 메모리에 넣지 않는다.
 */
export function checkTranslation({ masked, raw, slots }) {
  const expected = slots.map((_, i) => `⟦T${i + 1}⟧`)
  const found = [...raw.matchAll(PLACEHOLDER)].map((m) => m[0])
  const missing = expected.filter((p) => !found.includes(p))
  const extra = found.filter((p, i) => !expected.includes(p) || found.indexOf(p) !== i)
  const numbers = String(masked).replace(PLACEHOLDER, '').match(/\d+(?:[.,]\d+)*/g) ?? []
  const missingNumbers = numbers.filter((n) => !raw.includes(n) && !raw.includes(n.replace(/,/g, '')))
  return {
    ok: !missing.length && !extra.length && !missingNumbers.length,
    missing,
    extra,
    missingNumbers,
  }
}

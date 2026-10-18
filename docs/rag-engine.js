// 도메인 RAG 브라우저 데모의 엔진. 화면(DomainRag.vue)은 이 함수들만 부른다.
// 출처 등록 → 정규화 → 청킹 → 색인(BM25) → 범위 가드 → 검색 → 답변(원문 인용) → 인용 검증.
// LLM을 쓰지 않는다. 답변 문장은 검색된 조각에서 그대로 뽑고, 뽑은 문장이 조각 안에 실제로 있는지 다시 확인한다.

const CHUNK_MAX = 240
const BM25_K1 = 1.2
const BM25_B = 0.75
// 질문 토큰 중 이 비율 이상이 겹치는 문장만 근거로 쓴다. 못 미치면 "근거 없음"으로 멈춘다.
export const MIN_COVERAGE = 0.34
const MAX_ANSWER_SENTENCES = 3

/** 목록 기호·강조 기호와 공백을 정리한다. 제목(#)은 남겨 청킹 때 섹션 이름으로 쓴다. */
export function normalize(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/^\s*([-*•]|\d+\.)\s+/, '').replace(/[*_`]/g, '').trim())
    .map((line) => line.replace(/^(#{1,6})\s*/, '## '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 문장 단위로 나눈다. 숫자 사이의 마침표(1.5, 2.0)는 자르지 않는다. */
export function splitSentences(text) {
  return String(text)
    .split(/(?<=[^\d][.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * 문단 경계를 지키며 CHUNK_MAX 글자 이하로 묶는다. 한 문단이 길면 문장 단위로 자른다.
 * 제목 줄은 본문에 섞지 않고 뒤따르는 조각의 section으로 붙인다.
 */
export function chunkText(text, max = CHUNK_MAX) {
  const pieces = []
  let section = ''
  for (const para of text.split(/\n\s*\n/)) {
    const lines = para.split('\n').map((l) => l.trim()).filter(Boolean)
    while (lines[0]?.startsWith('## ')) section = lines.shift().slice(3)
    const p = lines.join(' ')
    if (!p) continue
    if (p.length <= max) {
      pieces.push({ section, text: p })
      continue
    }
    let cur = ''
    for (const s of splitSentences(p)) {
      if (cur && cur.length + s.length + 1 > max) {
        pieces.push({ section, text: cur })
        cur = s
      } else {
        cur = cur ? `${cur} ${s}` : s
      }
    }
    if (cur) pieces.push({ section, text: cur })
  }
  return pieces
}

/**
 * 한국어는 조사가 붙어 단어 단위 일치가 잘 안 되므로 한글 연속 구간은 글자 2개씩(bigram) 자른다.
 * 영문·숫자는 단어 그대로 소문자로 쓴다.
 */
export function tokenize(text) {
  const out = []
  for (const m of String(text).toLowerCase().matchAll(/[가-힣]+|[a-z0-9][a-z0-9.+-]*/g)) {
    const w = m[0].replace(/[.+-]+$/, '')
    if (!w) continue
    if (/^[가-힣]+$/.test(w)) {
      if (w.length === 1) out.push(w)
      for (let i = 0; i < w.length - 1; i++) out.push(w.slice(i, i + 2))
    } else {
      out.push(w)
    }
  }
  return out
}

// 질문에만 쓰는 정리: 의문형 어미와 조사를 떼고, 근거가 될 수 없는 의문사는 버린다.
const QUESTION_ENDING = /(인가요|었나요|하나요|되나요|있나요|나요|가요|까요|해요|에서|으로|까지|부터|은|는|이|가|을|를|에|의|도|로|와|과|요)$/
const QUESTION_WORDS = new Set(['어떻게', '무엇', '무엇을', '뭐', '뭔가', '얼마', '언제', '어디', '누가', '누구', '알려줘', '알려', '주세요', '되나', '하나', '있나', '어떤', '해', '해줘'])

/** 질문을 토큰으로. 본문 토큰화(tokenize)와 같은 규칙에 어미·조사 제거만 더한다. */
export function queryTokens(query) {
  const words = String(query)
    .replace(/[?？!.,]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (QUESTION_WORDS.has(w)) return ''
      if (!/^[가-힣]+$/.test(w)) return w
      const stem = w.replace(QUESTION_ENDING, '')
      return stem.length >= 2 && !QUESTION_WORDS.has(stem) ? stem : QUESTION_WORDS.has(stem) ? '' : w
    })
  return [...new Set(tokenize(words.join(' ')))]
}

/** 동의어 사전으로 질문을 넓힌다. ['PC', '단말']이면 PC가 들어간 질문에 단말도 붙인다. */
export function expandQuery(query, synonyms = []) {
  const added = []
  for (const [a, b] of synonyms) {
    if (query.includes(a) && !query.includes(b)) added.push(b)
    else if (query.includes(b) && !query.includes(a)) added.push(a)
  }
  return { text: added.length ? `${query} ${added.join(' ')}` : query, added }
}

/** 도메인 설정 하나로 색인을 만든다. 허용되지 않은 출처는 이유와 함께 남기고 수집하지 않는다. */
export function buildIndex(domain) {
  const sources = domain.sources.map((s) => ({
    ...s,
    status: s.allowed === false ? 'skipped' : 'indexed',
  }))
  const docs = sources
    .filter((s) => s.status === 'indexed')
    .map((s) => ({ ...s, normalized: normalize(s.text) }))
    .filter((d) => d.normalized)

  const chunks = []
  for (const d of docs) {
    chunkText(d.normalized).forEach(({ section, text }, i) => {
      // 섹션 이름은 검색에는 쓰고(같은 말로 묻는 경우가 많다) 답변 문장에는 넣지 않는다.
      const tokens = tokenize(section ? `${section} ${text}` : text)
      chunks.push({ id: `${d.id}#${i + 1}`, docId: d.id, title: d.title, section, url: d.url, text, tokens })
    })
  }

  const df = new Map()
  for (const c of chunks) for (const t of new Set(c.tokens)) df.set(t, (df.get(t) ?? 0) + 1)
  const avgLen = chunks.length ? chunks.reduce((n, c) => n + c.tokens.length, 0) / chunks.length : 0
  const topTerms = [...df.entries()]
    .filter(([t]) => t.length > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([term, n]) => ({ term, n }))

  return {
    domain,
    sources,
    docs,
    chunks,
    df,
    avgLen,
    stats: {
      sources: sources.length,
      skipped: sources.length - docs.length,
      docs: docs.length,
      chars: docs.reduce((n, d) => n + d.normalized.replace(/^## /gm, '').length, 0),
      chunks: chunks.length,
      vocab: df.size,
    },
    topTerms,
  }
}

/** BM25 상위 k개. 점수가 0인 조각은 돌려주지 않는다. */
export function search(index, query, k = 3) {
  const q = queryTokens(query)
  const N = index.chunks.length
  if (!N || !q.length) return []
  return index.chunks
    .map((c) => {
      const tf = new Map()
      for (const t of c.tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
      let score = 0
      for (const t of q) {
        const f = tf.get(t)
        if (!f) continue
        const n = index.df.get(t) ?? 0
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
        score += idf * ((f * (BM25_K1 + 1)) / (f + BM25_K1 * (1 - BM25_B + (BM25_B * c.tokens.length) / index.avgLen)))
      }
      return { chunk: c, score }
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

/** 질문 토큰 가운데 문장에 들어 있는 비율. */
export function coverage(queryTokens, sentence) {
  const q = new Set(queryTokens)
  if (!q.size) return 0
  const s = new Set(tokenize(sentence))
  let hit = 0
  for (const t of q) if (s.has(t)) hit += 1
  return hit / q.size
}

/** 검색 전에 규칙으로 거른다. 걸리면 그 규칙을 돌려준다. */
export function guard(domain, query) {
  return (domain.guards ?? []).find((g) => g.re.test(query)) ?? null
}

/**
 * 질문 하나를 끝까지 처리한다.
 * kind: refused(가드에서 멈춤) · empty(근거 부족) · answered
 * 답변 문장은 모두 cite(조각 id)를 갖고, verified는 그 문장이 조각 원문에 그대로 있는지다.
 */
export function ask(index, rawQuery) {
  const query = String(rawQuery ?? '').trim()
  const rule = guard(index.domain, query)
  if (rule) return { query, kind: 'refused', rule, expanded: null, hits: [], sentences: [] }

  const expanded = expandQuery(query, index.domain.synonyms)
  const hits = search(index, expanded.text)
  // 동의어로 붙인 말은 검색과 보조 판정에만 쓴다. 기본 판정은 원래 질문으로 한다.
  const qTokens = queryTokens(query)
  const expandedTokens = expanded.added.length ? queryTokens(expanded.text) : null

  const scored = []
  for (const h of hits) {
    for (const s of splitSentences(h.chunk.text)) {
      const cov = Math.max(coverage(qTokens, s), expandedTokens ? coverage(expandedTokens, s) : 0)
      scored.push({ text: s, cite: h.chunk.id, coverage: cov, score: cov * (1 + h.score / 10) })
    }
  }
  const sentences = scored
    .filter((s) => s.coverage >= MIN_COVERAGE)
    .sort((a, b) => b.score - a.score)
    .filter((s, i, arr) => arr.findIndex((o) => o.text === s.text) === i)
    .slice(0, MAX_ANSWER_SENTENCES)
    .map((s) => ({ ...s, verified: index.chunks.some((c) => c.id === s.cite && c.text.includes(s.text)) }))
    .filter((s) => s.verified)

  return { query, kind: sentences.length ? 'answered' : 'empty', rule: null, expanded, hits, sentences }
}

/**
 * "직접 넣기" 입력을 출처 목록으로 바꾼다. 문서는 `---` 줄로 나누고 첫 줄을 제목으로 쓴다.
 */
export function parseCustomSources(text) {
  return String(text ?? '')
    .split(/^\s*---\s*$/m)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      const [first, ...rest] = block.split('\n')
      const title = first.replace(/^#+\s*/, '').trim() || `문서 ${i + 1}`
      return { id: `doc${i + 1}`, title, url: `직접 입력 ${i + 1}`, text: rest.join('\n').trim() || first }
    })
}

import assert from 'node:assert/strict'
import test from 'node:test'
import { ask, buildIndex, chunkText, normalize, parseCustomSources, queryTokens, tokenize } from '../docs/rag-engine.js'
import { CUSTOM_GUARDS, CUSTOM_SAMPLE, POLICY_DOMAIN, SECURITY_DOMAIN } from '../docs/rag-domains.js'

test('한글은 2글자 단위, 영문·숫자는 단어 단위로 자른다', () => {
  assert.deepEqual(tokenize('연차 15일 VPN'), ['연차', '15', '일', 'vpn'])
})

test('질문에서는 의문형 어미와 조사, 의문사를 뗀다', () => {
  assert.deepEqual(queryTokens('연차는 며칠 생기나요?'), ['연차', '며칠', '생기'])
  assert.deepEqual(queryTokens('장애 나면 어떻게 해?'), ['장애', '나면'])
})

test('제목은 본문에 섞지 않고 조각의 섹션 이름이 된다', () => {
  const chunks = chunkText(normalize('# 휴가 신청\n휴가는 3일 전까지 신청합니다.\n\n둘째 문단.'))
  assert.deepEqual(chunks, [
    { section: '휴가 신청', text: '휴가는 3일 전까지 신청합니다.' },
    { section: '휴가 신청', text: '둘째 문단.' },
  ])
})

test('제외한 출처는 색인하지 않고 이유와 함께 남긴다', () => {
  const index = buildIndex(POLICY_DOMAIN)
  const skipped = index.sources.filter((s) => s.status === 'skipped')
  assert.deepEqual(skipped.map((s) => s.id), ['review', 'payroll'])
  assert.ok(index.chunks.every((c) => c.docId !== 'payroll'))
  assert.equal(index.stats.skipped, 2)
})

test('답변 문장은 모두 인용한 조각 원문에 그대로 있다', () => {
  const index = buildIndex(POLICY_DOMAIN)
  const r = ask(index, '재택근무는 일주일에 며칠까지?')
  assert.equal(r.kind, 'answered')
  assert.match(r.sentences[0].text, /2일까지/)
  for (const s of r.sentences) {
    const chunk = index.chunks.find((c) => c.id === s.cite)
    assert.ok(chunk.text.includes(s.text))
  }
})

test('범위 가드에 걸리면 검색하지 않는다', () => {
  const r = ask(buildIndex(POLICY_DOMAIN), '김 대리 연봉 얼마예요?')
  assert.equal(r.kind, 'refused')
  assert.equal(r.hits.length, 0)
})

test('근거가 없으면 지어내지 않고 멈춘다', () => {
  assert.equal(ask(buildIndex(POLICY_DOMAIN), '회사 주차장은 몇 대인가요?').kind, 'empty')
  assert.equal(ask(buildIndex(SECURITY_DOMAIN), '가격은 얼마인가요?').kind, 'empty')
})

test('동의어로 질문과 문서의 다른 말을 잇는다', () => {
  const r = ask(buildIndex(SECURITY_DOMAIN), '등록 안 된 PC가 연결되면 어떻게 되나요?')
  assert.deepEqual(r.expanded.added, ['단말'])
  assert.equal(r.kind, 'answered')
  assert.equal(r.sentences[0].cite, 'quarantine#1')
})

test('직접 넣기: --- 로 문서를 나누고 첫 줄을 제목으로 쓴다', () => {
  const sources = parseCustomSources(CUSTOM_SAMPLE)
  assert.deepEqual(sources.map((s) => s.title), ['팀 온보딩', '배포 절차', '장애 대응'])
  const index = buildIndex({ id: 'c', title: '팀 위키', sources, guards: CUSTOM_GUARDS, synonyms: [] })
  const r = ask(index, '운영 배포는 언제 하나요?')
  assert.equal(r.kind, 'answered')
  assert.match(r.sentences[0].text, /화요일과 목요일/)
})

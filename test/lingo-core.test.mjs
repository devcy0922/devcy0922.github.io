import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTranslateRequest, checkTranslation, cleanOutput, restoreTerms } from '../docs/lingo-core.js'

const slots = [{ en: 'unauthorized endpoint' }, { en: 'internal network' }, { en: 'quarantine' }]
const masked = '⟦T1⟧이 ⟦T2⟧에 접속하면 30초 안에 ⟦T3⟧합니다.'

test('요청은 자리표시자 문장만 보내고 짧게 끝낸다', () => {
  const body = buildTranslateRequest(masked)
  assert.equal(body.prompt, masked)
  assert.deepEqual(body.tools, [])
  assert.equal(body.enableThinking, false)
  assert.ok(body.maxTokens <= 200)
})

test('모델 출력의 머리말·따옴표·둘째 줄을 걷어 낸다', () => {
  assert.equal(cleanOutput('Translation: "When ⟦T1⟧ connects."\n\nNote: kept placeholders'), 'When ⟦T1⟧ connects.')
})

test('자리표시자를 도메인 번역으로 되돌린다', () => {
  assert.equal(restoreTerms('⟦T1⟧s on the ⟦T2⟧ get ⟦T3⟧d.', slots), 'Unauthorized endpoints on the internal network get quarantined.')
})

test('자리표시자와 숫자가 모두 남으면 QA 통과', () => {
  const raw = 'When an ⟦T1⟧ joins the ⟦T2⟧, it is ⟦T3⟧d within 30 seconds.'
  assert.equal(checkTranslation({ masked, raw, slots }).ok, true)
})

test('빠진 용어·중복 자리표시자·빠진 숫자를 잡는다', () => {
  const qa = checkTranslation({ masked, raw: 'An ⟦T1⟧ joining ⟦T1⟧ is isolated quickly.', slots })
  assert.equal(qa.ok, false)
  assert.deepEqual(qa.missing, ['⟦T2⟧', '⟦T3⟧'])
  assert.deepEqual(qa.extra, ['⟦T1⟧'])
  assert.deepEqual(qa.missingNumbers, ['30'])
})

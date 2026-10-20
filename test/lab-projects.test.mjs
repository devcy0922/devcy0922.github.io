import assert from 'node:assert/strict'
import test from 'node:test'
import products, { STATUS_ORDER, featured } from '../docs/lab-projects.ts'

test('제품 목록은 운영 중 → 미리 써보기 → 준비 중 순서다', () => {
  const ranks = products.map((p) => STATUS_ORDER.indexOf(p.status))
  assert.ok(ranks.every((rank) => rank >= 0), '알 수 없는 상태가 없어야 한다')
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b))
})

test('홈 대표 제품은 1~3개이고 목록 순서를 따른다', () => {
  assert.ok(featured.length >= 1 && featured.length <= 3)
  const positions = featured.map((p) => products.indexOf(p))
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b))
})

test('제품 id와 주소는 겹치지 않는다', () => {
  assert.equal(new Set(products.map((p) => p.id)).size, products.length)
  for (const p of products) assert.equal(p.href, `/lab/${p.id}`)
})

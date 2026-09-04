import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatDateLabel,
  getKstToday,
  isPublished,
  toDateKey,
  toRssDate,
} from '../docs/content-utils.js'

test('date-only frontmatter keeps its declared calendar date', () => {
  assert.equal(toDateKey('2026-09-05'), '2026-09-05')
  assert.equal(isPublished('2026-09-05', '2026-09-05'), true)
})

test('future posts are excluded against the KST reference date', () => {
  assert.equal(isPublished('2026-09-06', '2026-09-05'), false)
  assert.equal(isPublished('2026-09-04', '2026-09-05'), true)
})

test('timezone boundary is evaluated in Asia/Seoul', () => {
  assert.equal(toDateKey('2026-09-01T23:30:00Z'), '2026-09-02')
  assert.equal(toDateKey(new Date('2026-09-01T23:30:00Z')), '2026-09-02')
  assert.equal(getKstToday(new Date('2026-09-01T15:00:00Z')), '2026-09-02')
})

test('date labels and RSS dates use the same normalized date', () => {
  assert.match(formatDateLabel('2026-09-05'), /2026.*09.*05/)
  assert.match(toRssDate('2026-09-05'), /Sat, 05 Sep 2026/)
})

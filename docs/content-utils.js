export const SITE_TIME_ZONE = 'Asia/Seoul'

function dateParts(date, timeZone = SITE_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  return Object.fromEntries(parts.map(({ type, value }) => [type, value]))
}

export function toDateKey(value, timeZone = SITE_TIME_ZONE) {
  if (typeof value === 'string') {
    const normalized = value.trim()
    const dateOnly = normalized.match(/^\d{4}-\d{2}-\d{2}$/)
    if (dateOnly) return dateOnly[0]

    const date = new Date(normalized)
    if (Number.isNaN(date.getTime())) return ''
    const parts = dateParts(date, timeZone)
    return `${parts.year}-${parts.month}-${parts.day}`
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const parts = dateParts(value, timeZone)
    return `${parts.year}-${parts.month}-${parts.day}`
  }

  if (value == null) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = dateParts(date, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function getKstToday(now = new Date()) {
  const parts = dateParts(now, SITE_TIME_ZONE)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function isPublished(value, today = getKstToday()) {
  const dateKey = toDateKey(value)
  return Boolean(dateKey) && dateKey <= today
}

export function compareDateKeys(a, b) {
  return toDateKey(b).localeCompare(toDateKey(a))
}

export function formatDateLabel(value, locale = 'ko-KR') {
  const dateKey = toDateKey(value)
  if (!dateKey) return ''

  return new Intl.DateTimeFormat(locale, {
    timeZone: SITE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(`${dateKey}T12:00:00+09:00`))
}

export function toRssDate(value) {
  const dateKey = toDateKey(value)
  if (!dateKey) return ''
  return new Date(`${dateKey}T12:00:00+09:00`).toUTCString()
}

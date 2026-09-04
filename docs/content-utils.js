export function toDateKey(value) {
  if (typeof value === 'string') return value.slice(0, 10)

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

export function getKstToday() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function isPublished(value, today = getKstToday()) {
  const dateKey = toDateKey(value)
  return Boolean(dateKey) && dateKey <= today
}

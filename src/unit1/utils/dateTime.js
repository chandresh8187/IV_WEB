const ZONE = 'Asia/Kolkata'
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export const todayIso = () => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

export const formatDate = value => {
  if (!value) return '—'
  if (DATE_ONLY.test(String(value))) { const [year, month, day] = String(value).slice(0, 10).split('-'); return `${day}/${month}/${year}` }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export const formatTime = value => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hour12: true }).format(date)
}

export const formatDateTime = value => value ? `${formatDate(value)}, ${formatTime(value)}` : '—'
export const formatClock = value => {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return '—'
  const hour = Number(match[1])
  return `${String(hour % 12 || 12).padStart(2, '0')}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`
}

export function formatVND(n) {
  if (!n) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
}

export function formatVNDShort(n) {
  if (!n) return '0₫'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'tr'
  if (n >= 1000) return Math.round(n / 1000) + 'k'
  return n + '₫'
}

export function formatDate(d, weekday = 'long') {
  if (!d) return ''
  return new Date(d).toLocaleDateString('vi-VN', {
    weekday,
    day: '2-digit',
    month: '2-digit',
  })
}

export function formatDateFull(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

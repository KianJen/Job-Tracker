export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function fmtDate(d: string): string {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y.slice(2)}`
}

export function isOverdue(d: string): boolean {
  return !!d && d < today()
}

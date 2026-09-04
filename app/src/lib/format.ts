export function currency(n: number): string {
  const v = Math.round(n || 0)
  return `₹${v.toLocaleString('en-IN')}`
}

export function currencyK(n: number): string {
  const v = n || 0
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)}L`
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)}k`
  return `₹${Math.round(v)}`
}

export function num(n: number): string {
  return (n || 0).toLocaleString('en-IN')
}

export function fmtDate(d: string): string {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateTime(d: string): string {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime()
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target - now.getTime()) / 86400000)
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function monthKey(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

export function last12Months(): string[] {
  const out: string[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = 11; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push(monthKey(dd))
  }
  return out
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

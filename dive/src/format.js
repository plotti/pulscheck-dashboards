// Formatierung nach Projektkonvention: de-CH (Tausendertrennzeichen ’),
// CHF-Beträge als ganze Zahlen, Tage kurz.

const intFmt = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 })

// BigInt-sicher: DuckDB/Arrow kann Int64-Werte als BigInt liefern.
export function fmtInt(v) {
  if (v == null) return '–'
  const n = typeof v === 'bigint' ? Number(v) : v
  return Number.isFinite(n) ? intFmt.format(n) : '–'
}

export function fmtPct(v) {
  if (v == null) return '–'
  const n = typeof v === 'bigint' ? Number(v) : v
  return Number.isFinite(n) ? `${intFmt.format(n)} %` : '–'
}

const dayFmt = new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: 'short' })

// DuckDB DATE kommt je nach Arrow-Version als Date, Epoch-Millis oder String an.
export function toDay(value) {
  if (value instanceof Date) return dayFmt.format(value)
  if (typeof value === 'number') return dayFmt.format(new Date(value))
  if (typeof value === 'string') return dayFmt.format(new Date(value.slice(0, 10) + 'T00:00:00'))
  return String(value)
}

export const fmtDay = (value) => toDay(value)

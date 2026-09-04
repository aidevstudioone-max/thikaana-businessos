import type { DocLine } from './types'

export interface DocTotals {
  subtotal: number
  discountTotal: number
  taxableValue: number
  taxTotal: number
  grandTotal: number
}

export function computeTotals(lines: DocLine[]): DocTotals {
  let subtotal = 0
  let discountTotal = 0
  let taxTotal = 0
  for (const l of lines) {
    const gross = l.qty * l.rate
    const disc = (gross * (l.discountPct || 0)) / 100
    const taxable = gross - disc
    subtotal += gross
    discountTotal += disc
    taxTotal += (taxable * (l.gstRate || 0)) / 100
  }
  const taxableValue = subtotal - discountTotal
  return {
    subtotal: Math.round(subtotal),
    discountTotal: Math.round(discountTotal),
    taxableValue: Math.round(taxableValue),
    taxTotal: Math.round(taxTotal),
    grandTotal: Math.round(taxableValue + taxTotal)
  }
}

export function splitGst(taxTotal: number, interState: boolean) {
  return interState
    ? { cgst: 0, sgst: 0, igst: Math.round(taxTotal) }
    : { cgst: Math.round(taxTotal / 2), sgst: Math.round(taxTotal / 2), igst: 0 }
}

// Derived / computed reads shared by the admin app, the employee portal and the
// platform console. Pure functions over collections so they can move behind an
// API later without touching the pages.

import { COLLECTIONS, getAll, load } from './db'
import { last12Months, monthKey } from './format'
import type {
  Account,
  AttendanceRecord,
  Category,
  Customer,
  Employee,
  ExpenseRecord,
  Invoice,
  JournalEntry,
  Payslip,
  Product,
  PurchaseOrder,
  StockLevel,
  Supplier,
  Warehouse
} from './types'

// ---------- lookups ----------

export function productName(id: string): string {
  return getAll<Product>(COLLECTIONS.products).find((p) => p.id === id)?.name ?? '—'
}
export function product(id: string): Product | undefined {
  return getAll<Product>(COLLECTIONS.products).find((p) => p.id === id)
}
export function customerName(id: string): string {
  return getAll<Customer>(COLLECTIONS.customers).find((c) => c.id === id)?.name ?? '—'
}
export function supplierName(id: string): string {
  return getAll<Supplier>(COLLECTIONS.suppliers).find((s) => s.id === id)?.name ?? '—'
}
export function warehouseName(id: string): string {
  return getAll<Warehouse>(COLLECTIONS.warehouses).find((w) => w.id === id)?.name ?? '—'
}
export function employeeName(id: string): string {
  return getAll<Employee>(COLLECTIONS.employees).find((e) => e.id === id)?.name ?? '—'
}
export function categoryName(id: string): string {
  return getAll<Category>(COLLECTIONS.categories).find((c) => c.id === id)?.name ?? '—'
}
export function categoryPath(id: string): string {
  const cats = getAll<Category>(COLLECTIONS.categories)
  const c = cats.find((x) => x.id === id)
  if (!c) return '—'
  if (!c.parentId) return c.name
  const parent = cats.find((x) => x.id === c.parentId)
  return parent ? `${parent.name} › ${c.name}` : c.name
}

// ---------- inventory ----------

export function stockForProduct(productId: string): { total: number; byWarehouse: { warehouseId: string; onHand: number }[] } {
  const levels = getAll<StockLevel>(COLLECTIONS.stockLevels).filter((l) => l.productId === productId)
  return {
    total: levels.reduce((s, l) => s + l.onHand, 0),
    byWarehouse: levels.map((l) => ({ warehouseId: l.warehouseId, onHand: l.onHand }))
  }
}

export function totalStockValue(): { cost: number; retail: number } {
  const products = getAll<Product>(COLLECTIONS.products)
  const levels = getAll<StockLevel>(COLLECTIONS.stockLevels)
  let cost = 0
  let retail = 0
  for (const l of levels) {
    const p = products.find((x) => x.id === l.productId)
    if (!p) continue
    cost += l.onHand * p.costPrice
    retail += l.onHand * p.sellingPrice
  }
  return { cost, retail }
}

export function lowStockItems(): { product: Product; onHand: number }[] {
  const products = getAll<Product>(COLLECTIONS.products)
  const levels = getAll<StockLevel>(COLLECTIONS.stockLevels)
  const byProduct: Record<string, number> = {}
  for (const l of levels) byProduct[l.productId] = (byProduct[l.productId] ?? 0) + l.onHand
  return products
    .filter((p) => p.status === 'ACTIVE')
    .map((p) => ({ product: p, onHand: byProduct[p.id] ?? 0 }))
    .filter((r) => r.onHand <= r.product.reorderLevel)
    .sort((a, b) => a.onHand - b.onHand)
}

// ---------- receivables / payables ----------

export function receivables(): { total: number; overdue: number; byCustomer: Record<string, number> } {
  const invoices = getAll<Invoice>(COLLECTIONS.invoices)
  const today = new Date().toISOString().slice(0, 10)
  let total = 0
  let overdue = 0
  const byCustomer: Record<string, number> = {}
  for (const inv of invoices) {
    if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') continue
    const due = inv.total - inv.amountPaid
    if (due <= 0) continue
    total += due
    byCustomer[inv.customerId] = (byCustomer[inv.customerId] ?? 0) + due
    if (inv.dueDate < today) overdue += due
  }
  return { total, overdue, byCustomer }
}

export function payables(): { total: number } {
  const pos = getAll<PurchaseOrder>(COLLECTIONS.purchaseOrders)
  let total = 0
  for (const po of pos) {
    if (po.status === 'DRAFT' || po.status === 'CANCELLED') continue
    total += Math.max(0, po.total - po.amountPaid)
  }
  return { total }
}

// ---------- sales analytics ----------

export interface MonthlySales {
  month: string
  revenue: number
  cogs: number
  grossProfit: number
  invoiceCount: number
}

export function monthlySales(): MonthlySales[] {
  const invoices = getAll<Invoice>(COLLECTIONS.invoices).filter((i) => i.status !== 'DRAFT' && i.status !== 'CANCELLED')
  const products = getAll<Product>(COLLECTIONS.products)
  const months = last12Months()
  return months.map((mk) => {
    const inMonth = invoices.filter((i) => monthKey(i.date) === mk)
    const revenue = inMonth.reduce((s, i) => s + (i.total - i.cgst - i.sgst - i.igst - i.roundOff), 0)
    const cogs = inMonth.reduce(
      (s, i) =>
        s +
        i.lines.reduce((ls, l) => {
          const p = products.find((x) => x.id === l.productId)
          return ls + (p ? p.costPrice * l.qty : 0)
        }, 0),
      0
    )
    return { month: mk, revenue, cogs, grossProfit: revenue - cogs, invoiceCount: inMonth.length }
  })
}

export function topProducts(limit = 8): { product: Product; qty: number; revenue: number }[] {
  const invoices = getAll<Invoice>(COLLECTIONS.invoices).filter((i) => i.status !== 'DRAFT' && i.status !== 'CANCELLED')
  const products = getAll<Product>(COLLECTIONS.products)
  const agg: Record<string, { qty: number; revenue: number }> = {}
  for (const inv of invoices) {
    for (const l of inv.lines) {
      const a = (agg[l.productId] ??= { qty: 0, revenue: 0 })
      a.qty += l.qty
      a.revenue += l.qty * l.rate * (1 - l.discountPct / 100)
    }
  }
  return Object.entries(agg)
    .map(([id, a]) => ({ product: products.find((p) => p.id === id)!, ...a }))
    .filter((r) => r.product)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export function topCustomers(limit = 8): { customer: Customer; revenue: number; invoices: number }[] {
  const invoices = getAll<Invoice>(COLLECTIONS.invoices).filter((i) => i.status !== 'DRAFT' && i.status !== 'CANCELLED')
  const customers = getAll<Customer>(COLLECTIONS.customers)
  const agg: Record<string, { revenue: number; invoices: number }> = {}
  for (const inv of invoices) {
    const a = (agg[inv.customerId] ??= { revenue: 0, invoices: 0 })
    a.revenue += inv.total
    a.invoices += 1
  }
  return Object.entries(agg)
    .map(([id, a]) => ({ customer: customers.find((c) => c.id === id)!, ...a }))
    .filter((r) => r.customer)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export function salesByCategory(): { name: string; revenue: number }[] {
  const invoices = getAll<Invoice>(COLLECTIONS.invoices).filter((i) => i.status !== 'DRAFT' && i.status !== 'CANCELLED')
  const products = getAll<Product>(COLLECTIONS.products)
  const cats = getAll<Category>(COLLECTIONS.categories)
  const parentOf = (catId: string) => {
    const c = cats.find((x) => x.id === catId)
    if (!c) return 'Other'
    return c.parentId ? cats.find((x) => x.id === c.parentId)?.name ?? c.name : c.name
  }
  const agg: Record<string, number> = {}
  for (const inv of invoices) {
    for (const l of inv.lines) {
      const p = products.find((x) => x.id === l.productId)
      if (!p) continue
      const name = parentOf(p.categoryId)
      agg[name] = (agg[name] ?? 0) + l.qty * l.rate * (1 - l.discountPct / 100)
    }
  }
  return Object.entries(agg)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
}

// ---------- accounting ----------

export function accountBalances(): Record<string, number> {
  const journal = getAll<JournalEntry>(COLLECTIONS.journalEntries)
  const accounts = getAll<Account>(COLLECTIONS.accounts)
  const bal: Record<string, number> = {}
  for (const a of accounts) bal[a.id] = 0
  for (const je of journal) {
    for (const l of je.lines) {
      const acc = accounts.find((a) => a.id === l.accountId)
      if (!acc) continue
      // Debit-positive for ASSET/EXPENSE, credit-positive for the rest.
      const sign = acc.type === 'ASSET' || acc.type === 'EXPENSE' ? 1 : -1
      bal[l.accountId] += sign * (l.debit - l.credit)
    }
  }
  return bal
}

export function profitAndLoss(): {
  income: { account: Account; amount: number }[]
  expense: { account: Account; amount: number }[]
  totalIncome: number
  totalExpense: number
  netProfit: number
} {
  const accounts = getAll<Account>(COLLECTIONS.accounts)
  const bal = accountBalances()
  const income = accounts
    .filter((a) => a.type === 'INCOME')
    .map((a) => ({ account: a, amount: bal[a.id] }))
    .filter((r) => r.amount !== 0)
  const expense = accounts
    .filter((a) => a.type === 'EXPENSE')
    .map((a) => ({ account: a, amount: bal[a.id] }))
    .filter((r) => r.amount !== 0)
  const totalIncome = income.reduce((s, r) => s + r.amount, 0)
  const totalExpense = expense.reduce((s, r) => s + r.amount, 0)
  return { income, expense, totalIncome, totalExpense, netProfit: totalIncome - totalExpense }
}

export function balanceSheet(): {
  assets: { account: Account; amount: number }[]
  liabilities: { account: Account; amount: number }[]
  equity: { account: Account; amount: number }[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
} {
  const accounts = getAll<Account>(COLLECTIONS.accounts)
  const bal = accountBalances()
  const pick = (t: Account['type']) =>
    accounts.filter((a) => a.type === t).map((a) => ({ account: a, amount: bal[a.id] })).filter((r) => r.amount !== 0)
  const assets = pick('ASSET')
  const liabilities = pick('LIABILITY')
  const equityRaw = pick('EQUITY')
  const { netProfit } = profitAndLoss()
  const totalAssets = assets.reduce((s, r) => s + r.amount, 0)
  const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0)
  const totalEquity = equityRaw.reduce((s, r) => s + r.amount, 0) + netProfit
  return { assets, liabilities, equity: equityRaw, totalAssets, totalLiabilities, totalEquity }
}

// ---------- GST ----------

export interface GstPeriodRow {
  period: string
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
  invoiceCount: number
  inputCredit: number
}

export function gstReturns(): GstPeriodRow[] {
  const invoices = getAll<Invoice>(COLLECTIONS.invoices).filter((i) => i.status !== 'DRAFT' && i.status !== 'CANCELLED')
  const expenses = getAll<ExpenseRecord>(COLLECTIONS.expenses)
  const pos = getAll<PurchaseOrder>(COLLECTIONS.purchaseOrders).filter((p) => p.status === 'RECEIVED' || p.status === 'PARTIAL')
  const months = last12Months()
  return months.map((mk) => {
    const inv = invoices.filter((i) => monthKey(i.date) === mk)
    const taxableValue = inv.reduce((s, i) => s + (i.subtotal - i.discountTotal), 0)
    const cgst = inv.reduce((s, i) => s + i.cgst, 0)
    const sgst = inv.reduce((s, i) => s + i.sgst, 0)
    const igst = inv.reduce((s, i) => s + i.igst, 0)
    const expInput = expenses
      .filter((e) => monthKey(e.date) === mk)
      .reduce((s, e) => s + (e.amount * e.gstRate) / (100 + e.gstRate), 0)
    const poInput = pos.filter((p) => monthKey(p.orderDate) === mk).reduce((s, p) => s + p.taxTotal, 0)
    return { period: mk, taxableValue, cgst, sgst, igst, invoiceCount: inv.length, inputCredit: expInput + poInput }
  })
}

// ---------- HR ----------

export function attendanceForMonth(monthK: string): AttendanceRecord[] {
  return getAll<AttendanceRecord>(COLLECTIONS.attendance).filter((a) => monthKey(a.date) === monthK)
}

export function payrollCostByMonth(): { month: string; net: number; gross: number }[] {
  const slips = getAll<Payslip>(COLLECTIONS.payslips)
  const byMonth: Record<string, { net: number; gross: number }> = {}
  for (const s of slips) {
    const b = (byMonth[s.period] ??= { net: 0, gross: 0 })
    b.net += s.netPay
    b.gross += s.grossEarnings
  }
  return Object.entries(byMonth)
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

// ---------- inventory health score (0-100) ----------

export function inventoryHealthScore(): { score: number; parts: { label: string; value: number; weight: number }[] } {
  const products = getAll<Product>(COLLECTIONS.products).filter((p) => p.status === 'ACTIVE')
  const low = lowStockItems()
  const moves = getAll(COLLECTIONS.stockMoves) as { productId: string; type: string; ts: string }[]
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const soldRecently = new Set(moves.filter((m) => m.type === 'SALE' && new Date(m.ts) >= cutoff).map((m) => m.productId))
  const deadStock = products.filter((p) => !soldRecently.has(p.id)).length

  const inStockPct = products.length ? (1 - low.length / products.length) * 100 : 100
  const freshPct = products.length ? (1 - deadStock / products.length) * 100 : 100
  const allBatches = getAll(COLLECTIONS.batches) as any[]
  const expiringSoon = allBatches.filter((b) => {
    const d = (new Date(b.expiryDate).getTime() - Date.now()) / 86400000
    return d > 0 && d < 45
  }).length
  const expired = allBatches.filter((b) => new Date(b.expiryDate).getTime() < Date.now()).length
  const batchHealth = allBatches.length
    ? (1 - (expiringSoon * 0.5 + expired) / allBatches.length) * 100
    : 100

  const parts = [
    { label: 'Items above reorder level', value: Math.round(inStockPct), weight: 0.5 },
    { label: 'Items sold in last 90 days', value: Math.round(freshPct), weight: 0.3 },
    { label: 'Batch freshness', value: Math.max(0, Math.round(batchHealth)), weight: 0.2 }
  ]
  const score = Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0))
  return { score: Math.max(0, Math.min(100, score)), parts }
}

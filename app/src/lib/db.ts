// Local persistence layer. Everything reads/writes through the functions below,
// which is the intended swap seam: replace the bodies of load()/save() with real
// API calls (or point them at Postgres via a backend) once the database exists.
// No other file in the app should touch localStorage directly.

const PREFIX = 'tbos:'
export const SCHEMA_VERSION = 5

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function save<T>(key: string, value: T): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value))
}

export function getAll<T>(collection: string): T[] {
  return load<T[]>(collection, [])
}

export function saveAll<T>(collection: string, items: T[]): void {
  save(collection, items)
}

export function upsert<T extends { id: string }>(collection: string, item: T): T {
  const items = getAll<T>(collection)
  const idx = items.findIndex((i) => i.id === item.id)
  if (idx >= 0) items[idx] = item
  else items.push(item)
  saveAll(collection, items)
  return item
}

export function remove(collection: string, id: string): void {
  const items = getAll<{ id: string }>(collection).filter((i) => i.id !== id)
  saveAll(collection, items)
}

export function genId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function resetAll(reseed: () => void): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k))
  reseed()
  save('schema_version', SCHEMA_VERSION)
}

export function ensureSchemaVersion(reseed: () => void): void {
  const current = load<number>('schema_version', 0)
  if (current !== SCHEMA_VERSION) {
    resetAll(reseed)
  }
}

export const COLLECTIONS = {
  // platform / access
  moduleStates: 'module_states',
  roles: 'roles',
  users: 'users',
  company: 'company',
  settings: 'settings',
  auditLog: 'audit_log',
  notifications: 'notifications',
  session: 'session',
  // inventory
  categories: 'categories',
  warehouses: 'warehouses',
  products: 'products',
  stockLevels: 'stock_levels',
  stockMoves: 'stock_moves',
  batches: 'batches',
  stockTransfers: 'stock_transfers',
  // suppliers & purchasing
  suppliers: 'suppliers',
  purchaseOrders: 'purchase_orders',
  supplierPayments: 'supplier_payments',
  // customers
  customers: 'customers',
  // sales & billing
  quotations: 'quotations',
  salesOrders: 'sales_orders',
  invoices: 'invoices',
  deliveryChallans: 'delivery_challans',
  creditNotes: 'credit_notes',
  paymentReceipts: 'payment_receipts',
  // accounting & tax
  accounts: 'accounts',
  journalEntries: 'journal_entries',
  expenses: 'expenses',
  // hr & payroll
  departments: 'departments',
  employees: 'employees',
  shifts: 'shifts',
  attendance: 'attendance',
  leaveRequests: 'leave_requests',
  leaveBalances: 'leave_balances',
  payslips: 'payslips',
  payrollRuns: 'payroll_runs',
  // crm
  leads: 'leads',
  followUps: 'follow_ups',
  commMessages: 'comm_messages',
  // super-admin platform console
  workspaces: 'workspaces',
  platformPlans: 'platform_plans',
  platformInvoices: 'platform_invoices',
  supportTickets: 'support_tickets'
} as const

import type { ModuleDef, ModuleState, ModuleStatus } from './types'

// The module registry is the spine of the whole application: every admin nav item
// and route is gated by whether its module is ENABLED here (see ModuleContext +
// Layout). `dependsOn` encodes the dependency graph — a module cannot be enabled
// unless everything it depends on is already enabled, and cannot be disabled while
// something enabled still depends on it. This is what lets Thikaana sell a single
// product to a tiny retail shop (Inventory + Billing only) and to a manufacturing
// SME running the whole business (every module on).

export const MODULE_DEFS: ModuleDef[] = [
  // ---------------- Phase 1 · Inventory & Purchasing ----------------
  {
    id: 'inventory',
    name: 'Inventory Management',
    category: 'INVENTORY',
    phase: 1,
    description: 'Product master, SKUs, barcodes, variants, stock in/out, adjustments and low-stock alerts.',
    dependsOn: [],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'warehouses',
    name: 'Warehouse Management',
    category: 'INVENTORY',
    phase: 1,
    description: 'Multiple stock locations with per-warehouse quantities and stock transfers.',
    dependsOn: ['inventory'],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'batch_tracking',
    name: 'Batch & Serial Tracking',
    category: 'INVENTORY',
    phase: 1,
    description: 'Track batch numbers, manufacturing / expiry dates and serial numbers.',
    dependsOn: ['inventory'],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'suppliers',
    name: 'Supplier Management',
    category: 'INVENTORY',
    phase: 1,
    description: 'Vendor database, purchase history, supplier payments and due tracking.',
    dependsOn: [],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'purchasing',
    name: 'Purchase Orders',
    category: 'INVENTORY',
    phase: 1,
    description: 'Raise POs, receive goods (GRN), and settle supplier bills.',
    dependsOn: ['inventory', 'suppliers'],
    defaultStatus: 'ENABLED'
  },

  // ---------------- Phase 1 · Sales & Billing ----------------
  {
    id: 'customers',
    name: 'Customer Management',
    category: 'SALES',
    phase: 1,
    description: 'Customer database, purchase history, credit limits, outstanding and notes.',
    dependsOn: [],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'billing',
    name: 'Sales & GST Billing',
    category: 'SALES',
    phase: 1,
    description: 'GST tax invoices, proforma invoices, credit notes and payment receipts.',
    dependsOn: ['customers', 'inventory'],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'quotations',
    name: 'Quotations',
    category: 'SALES',
    phase: 1,
    description: 'Price quotes with validity that convert into sales orders and invoices.',
    dependsOn: ['billing'],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'sales_orders',
    name: 'Sales Orders & Dispatch',
    category: 'SALES',
    phase: 1,
    description: 'Confirmed orders, delivery challans and dispatch tracking.',
    dependsOn: ['billing'],
    defaultStatus: 'ENABLED'
  },

  // ---------------- Phase 2 · Finance & Compliance ----------------
  {
    id: 'accounting',
    name: 'Accounting',
    category: 'FINANCE',
    phase: 2,
    description: 'Chart of accounts, journal entries, general ledger, P&L, balance sheet and cash flow.',
    dependsOn: [],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'expenses',
    name: 'Expense Tracking',
    category: 'FINANCE',
    phase: 2,
    description: 'Record business expenses against accounts with GST input credit.',
    dependsOn: ['accounting'],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'gst',
    name: 'GST & Tax Filing',
    category: 'FINANCE',
    phase: 2,
    description: 'GSTR-1, GSTR-3B, tax summary, audit trail and CA-ready export.',
    dependsOn: ['billing'],
    defaultStatus: 'ENABLED'
  },

  // ---------------- Phase 3 · Human Resources ----------------
  {
    id: 'employees',
    name: 'Employee Management',
    category: 'HR',
    phase: 3,
    description: 'Employee profiles, departments, designations, reporting lines and documents.',
    dependsOn: [],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'attendance',
    name: 'Attendance & Shifts',
    category: 'HR',
    phase: 3,
    description: 'Web / mobile check-in, geo-fencing, shift management and overtime.',
    dependsOn: ['employees'],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'leave',
    name: 'Leave Management',
    category: 'HR',
    phase: 3,
    description: 'Leave types, balances and an approval workflow.',
    dependsOn: ['employees'],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'payroll',
    name: 'Payroll',
    category: 'HR',
    phase: 3,
    description: 'Salary structures, auto payroll runs, payslips, PF / ESI, bonus and reimbursements.',
    dependsOn: ['employees', 'attendance'],
    defaultStatus: 'ENABLED'
  },

  // ---------------- Phase 4 · CRM & Sales ----------------
  {
    id: 'crm',
    name: 'Lead & Pipeline CRM',
    category: 'CRM',
    phase: 4,
    description: 'Lead capture, assignment, follow-ups, sales pipeline and opportunity tracking.',
    dependsOn: ['customers'],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'communication',
    name: 'Customer Communication',
    category: 'CRM',
    phase: 4,
    description: 'WhatsApp, SMS and email broadcasts for reminders, promotions and order updates.',
    dependsOn: ['customers'],
    defaultStatus: 'ENABLED'
  },

  // ---------------- Phase 5 · Analytics & AI ----------------
  {
    id: 'analytics',
    name: 'Executive Analytics',
    category: 'INTELLIGENCE',
    phase: 5,
    description: 'Revenue, profit, top products / customers, employee performance and inventory health score.',
    dependsOn: ['billing'],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'ai_forecasting',
    name: 'AI Demand Forecasting',
    category: 'INTELLIGENCE',
    phase: 5,
    description: 'Demand forecasting, stock replenishment and smart purchase recommendations.',
    dependsOn: ['inventory', 'billing', 'analytics'],
    defaultStatus: 'ENABLED'
  },
  {
    id: 'ai_assistant',
    name: 'AI Business Assistant',
    category: 'INTELLIGENCE',
    phase: 5,
    description: 'Ask-anything business assistant and invoice OCR capture.',
    dependsOn: ['analytics'],
    defaultStatus: 'ENABLED'
  }
]

export const MODULE_MAP: Record<string, ModuleDef> = Object.fromEntries(MODULE_DEFS.map((m) => [m.id, m]))

export function defaultModuleStates(): ModuleState[] {
  return MODULE_DEFS.map((m) => ({
    id: m.id,
    status: m.defaultStatus,
    ...(m.defaultStatus === 'ENABLED' ? { enabledAt: new Date().toISOString() } : {})
  }))
}

export function directDependents(moduleId: string): ModuleDef[] {
  return MODULE_DEFS.filter((m) => m.dependsOn.includes(moduleId))
}

// All modules (direct + transitive) that would need to be disabled first.
export function transitiveDependents(moduleId: string, states: ModuleState[]): ModuleDef[] {
  const enabledIds = new Set(states.filter((s) => s.status === 'ENABLED').map((s) => s.id))
  const result: ModuleDef[] = []
  const seen = new Set<string>()
  const queue = [moduleId]
  while (queue.length) {
    const current = queue.shift()!
    for (const dep of directDependents(current)) {
      if (enabledIds.has(dep.id) && !seen.has(dep.id)) {
        seen.add(dep.id)
        result.push(dep)
        queue.push(dep.id)
      }
    }
  }
  return result
}

// All dependencies (direct + transitive) that are not yet enabled.
export function missingDependencies(moduleId: string, states: ModuleState[]): ModuleDef[] {
  const statusOf = (id: string) => states.find((s) => s.id === id)?.status ?? 'DISABLED'
  const result: ModuleDef[] = []
  const seen = new Set<string>()
  const queue = [...MODULE_MAP[moduleId].dependsOn]
  while (queue.length) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    if (statusOf(id) !== 'ENABLED') {
      result.push(MODULE_MAP[id])
      queue.push(...MODULE_MAP[id].dependsOn)
    }
  }
  return result
}

export function statusOf(states: ModuleState[], id: string): ModuleStatus {
  return states.find((s) => s.id === id)?.status ?? 'DISABLED'
}

export const CATEGORY_LABELS: Record<string, string> = {
  INVENTORY: 'Inventory & Purchasing',
  SALES: 'Sales & Billing',
  FINANCE: 'Finance & Compliance',
  HR: 'Human Resources',
  CRM: 'CRM & Communication',
  INTELLIGENCE: 'Analytics & AI'
}

export const CATEGORY_ORDER: string[] = ['INVENTORY', 'SALES', 'FINANCE', 'HR', 'CRM', 'INTELLIGENCE']

export const PHASE_LABELS: Record<number, string> = {
  1: 'Phase 1 · Core Foundation',
  2: 'Phase 2 · Finance & Compliance',
  3: 'Phase 3 · Human Resources',
  4: 'Phase 4 · CRM & Sales',
  5: 'Phase 5 · Analytics & AI'
}

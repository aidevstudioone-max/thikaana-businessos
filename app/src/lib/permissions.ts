import { MODULE_DEFS } from './modules'
import type { ModulePermission, Role } from './types'

export function fullAccess(): ModulePermission {
  return { view: true, create: true, edit: true, delete: true, actions: {} }
}

export function noAccess(): ModulePermission {
  return { view: false, create: false, edit: false, delete: false, actions: {} }
}

function permsFor(map: Record<string, Partial<ModulePermission>>): Record<string, ModulePermission> {
  const out: Record<string, ModulePermission> = {}
  for (const m of MODULE_DEFS) {
    out[m.id] = { ...noAccess(), ...map[m.id] }
  }
  return out
}

const view: Partial<ModulePermission> = { view: true }
const viewCreate: Partial<ModulePermission> = { view: true, create: true }
const viewCreateEdit: Partial<ModulePermission> = { view: true, create: true, edit: true }
const all: Partial<ModulePermission> = { view: true, create: true, edit: true, delete: true }

const everyModule = (perm: Partial<ModulePermission>) => Object.fromEntries(MODULE_DEFS.map((m) => [m.id, perm]))

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'role_super_admin',
    name: 'Super Admin',
    isSystem: true,
    isSuperAdmin: true,
    portal: 'PLATFORM',
    description: 'Thikaana platform owner. Manages company workspaces, subscription plans, platform billing and support.',
    permissions: permsFor(everyModule(all))
  },
  {
    id: 'role_owner',
    name: 'Company Owner',
    isSystem: true,
    isSuperAdmin: false,
    portal: 'ADMIN',
    description: 'Business owner. Full access to every enabled module plus company settings, users and roles.',
    permissions: permsFor(everyModule(all))
  },
  {
    id: 'role_manager',
    name: 'Manager',
    isSystem: true,
    isSuperAdmin: false,
    portal: 'ADMIN',
    description: 'Operations manager — runs inventory, purchasing, sales and reads analytics. No finance / HR admin.',
    permissions: permsFor({
      inventory: all,
      warehouses: all,
      batch_tracking: all,
      suppliers: all,
      purchasing: all,
      customers: all,
      billing: all,
      quotations: all,
      sales_orders: all,
      crm: all,
      communication: viewCreate,
      analytics: view,
      ai_forecasting: view,
      ai_assistant: view,
      accounting: view,
      gst: view
    })
  },
  {
    id: 'role_hr',
    name: 'HR',
    isSystem: true,
    isSuperAdmin: false,
    portal: 'ADMIN',
    description: 'Human resources — employees, attendance, leave approvals and payroll processing.',
    permissions: permsFor({
      employees: all,
      attendance: all,
      leave: all,
      payroll: all,
      analytics: view
    })
  },
  {
    id: 'role_accountant',
    name: 'Accountant',
    isSystem: true,
    isSuperAdmin: false,
    portal: 'ADMIN',
    description: 'Finance — billing, receipts, supplier payments, accounting, expenses and GST filing.',
    permissions: permsFor({
      inventory: view,
      suppliers: view,
      purchasing: viewCreateEdit,
      customers: view,
      billing: all,
      quotations: view,
      sales_orders: view,
      accounting: all,
      expenses: all,
      gst: all,
      payroll: view,
      analytics: view
    })
  },
  {
    id: 'role_sales',
    name: 'Sales Executive',
    isSystem: true,
    isSuperAdmin: false,
    portal: 'ADMIN',
    description: 'Field / counter sales — leads, quotations, orders and invoices for their own customers.',
    permissions: permsFor({
      inventory: view,
      customers: viewCreateEdit,
      billing: viewCreate,
      quotations: all,
      sales_orders: all,
      crm: all,
      communication: viewCreate,
      analytics: view
    })
  },
  {
    id: 'role_employee',
    name: 'Employee',
    isSystem: true,
    isSuperAdmin: false,
    portal: 'EMPLOYEE',
    description:
      'Self-service (check-in, leave, payslips) plus any operational work the owner delegates — by default, updating products and adjusting stock.',
    permissions: permsFor({
      // Work the owner has delegated. Toggle these per company on Roles & Permissions;
      // self-service (My Workspace) is always available and needs no permission here.
      inventory: viewCreateEdit,
      warehouses: view,
      batch_tracking: view
    })
  }
]

export function hasPermission(
  role: Role | undefined,
  moduleId: string,
  action: keyof Omit<ModulePermission, 'actions'> | string
): boolean {
  if (!role) return false
  if (role.isSuperAdmin) return true
  const p = role.permissions[moduleId]
  if (!p) return false
  if (action === 'view' || action === 'create' || action === 'edit' || action === 'delete') return p[action]
  return !!p.actions[action]
}

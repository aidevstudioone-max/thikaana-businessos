export interface NavItem {
  label: string
  path: string
  icon: string
  moduleId: string | null // null = always visible (system page)
}

export interface NavSection {
  title: string
  items: NavItem[]
}

// ---- Company admin portal (Owner / Manager / HR / Accountant / Sales) ----
export const ADMIN_NAV: NavSection[] = [
  {
    title: '',
    items: [{ label: 'Dashboard', path: '/', icon: 'LayoutDashboard', moduleId: null }]
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Products', path: '/products', icon: 'Package', moduleId: 'inventory' },
      { label: 'Categories', path: '/categories', icon: 'FolderTree', moduleId: 'inventory' },
      { label: 'Stock Ledger', path: '/stock', icon: 'ArrowLeftRight', moduleId: 'inventory' },
      { label: 'Adjustments', path: '/stock/adjust', icon: 'SlidersHorizontal', moduleId: 'inventory' },
      { label: 'Low Stock', path: '/stock/low', icon: 'TriangleAlert', moduleId: 'inventory' },
      { label: 'Warehouses', path: '/warehouses', icon: 'Warehouse', moduleId: 'warehouses' },
      { label: 'Transfers', path: '/warehouses/transfers', icon: 'Truck', moduleId: 'warehouses' },
      { label: 'Batches & Expiry', path: '/batches', icon: 'Boxes', moduleId: 'batch_tracking' }
    ]
  },
  {
    title: 'Purchasing',
    items: [
      { label: 'Suppliers', path: '/suppliers', icon: 'Factory', moduleId: 'suppliers' },
      { label: 'Purchase Orders', path: '/purchase-orders', icon: 'ClipboardList', moduleId: 'purchasing' },
      { label: 'Supplier Payments', path: '/supplier-payments', icon: 'Banknote', moduleId: 'purchasing' }
    ]
  },
  {
    title: 'Sales',
    items: [
      { label: 'Customers', path: '/customers', icon: 'Users', moduleId: 'customers' },
      { label: 'Quotations', path: '/quotations', icon: 'FileText', moduleId: 'quotations' },
      { label: 'Sales Orders', path: '/sales-orders', icon: 'ShoppingCart', moduleId: 'sales_orders' },
      { label: 'Delivery Challans', path: '/challans', icon: 'PackageCheck', moduleId: 'sales_orders' },
      { label: 'Invoices', path: '/invoices', icon: 'ReceiptIndianRupee', moduleId: 'billing' },
      { label: 'Credit Notes', path: '/credit-notes', icon: 'FileMinus', moduleId: 'billing' },
      { label: 'Payments In', path: '/receipts', icon: 'HandCoins', moduleId: 'billing' }
    ]
  },
  {
    title: 'Finance',
    items: [
      { label: 'Chart of Accounts', path: '/accounts', icon: 'BookText', moduleId: 'accounting' },
      { label: 'Journal', path: '/journal', icon: 'NotebookPen', moduleId: 'accounting' },
      { label: 'Ledger', path: '/ledger', icon: 'BookOpen', moduleId: 'accounting' },
      { label: 'P&L / Balance Sheet', path: '/financials', icon: 'Scale', moduleId: 'accounting' },
      { label: 'Expenses', path: '/expenses', icon: 'CreditCard', moduleId: 'expenses' },
      { label: 'GST Returns', path: '/gst', icon: 'Landmark', moduleId: 'gst' }
    ]
  },
  {
    title: 'Human Resources',
    items: [
      { label: 'Employees', path: '/employees', icon: 'Contact', moduleId: 'employees' },
      { label: 'Departments', path: '/departments', icon: 'Network', moduleId: 'employees' },
      { label: 'Attendance', path: '/attendance', icon: 'CalendarCheck', moduleId: 'attendance' },
      { label: 'Leave Requests', path: '/leave', icon: 'CalendarOff', moduleId: 'leave' },
      { label: 'Payroll', path: '/payroll', icon: 'Wallet', moduleId: 'payroll' }
    ]
  },
  {
    title: 'CRM',
    items: [
      { label: 'Leads & Pipeline', path: '/leads', icon: 'Filter', moduleId: 'crm' },
      { label: 'Follow-ups', path: '/follow-ups', icon: 'PhoneCall', moduleId: 'crm' },
      { label: 'Communication', path: '/communication', icon: 'MessageSquare', moduleId: 'communication' }
    ]
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'Executive Analytics', path: '/analytics', icon: 'BarChart3', moduleId: 'analytics' },
      { label: 'Demand Forecasting', path: '/forecasting', icon: 'TrendingUp', moduleId: 'ai_forecasting' },
      { label: 'AI Assistant', path: '/assistant', icon: 'Sparkles', moduleId: 'ai_assistant' }
    ]
  },
  {
    title: 'System',
    items: [
      { label: 'Notifications', path: '/notifications', icon: 'Bell', moduleId: null },
      { label: 'Modules', path: '/admin/modules', icon: 'ToggleRight', moduleId: null },
      { label: 'Users', path: '/admin/users', icon: 'UserCog', moduleId: null },
      { label: 'Roles & Permissions', path: '/admin/roles', icon: 'KeyRound', moduleId: null },
      { label: 'Company Profile', path: '/admin/company', icon: 'Building2', moduleId: null },
      { label: 'Settings', path: '/admin/settings', icon: 'Settings', moduleId: null },
      { label: 'Audit Log', path: '/admin/audit', icon: 'History', moduleId: null }
    ]
  }
]

// ---- Employee self-service portal ----
export const EMPLOYEE_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: 'LayoutDashboard', moduleId: null },
  { label: 'My Attendance', path: '/me/attendance', icon: 'CalendarCheck', moduleId: 'attendance' },
  { label: 'My Leave', path: '/me/leave', icon: 'CalendarOff', moduleId: 'leave' },
  { label: 'My Payslips', path: '/me/payslips', icon: 'Wallet', moduleId: 'payroll' },
  { label: 'My Profile', path: '/me/profile', icon: 'IdCard', moduleId: 'employees' }
]

// ---- Super Admin platform console ----
export const PLATFORM_NAV: NavItem[] = [
  { label: 'Overview', path: '/', icon: 'LayoutDashboard', moduleId: null },
  { label: 'Workspaces', path: '/platform/workspaces', icon: 'Building2', moduleId: null },
  { label: 'Plans', path: '/platform/plans', icon: 'Layers', moduleId: null },
  { label: 'Billing', path: '/platform/billing', icon: 'ReceiptText', moduleId: null },
  { label: 'Support', path: '/platform/support', icon: 'LifeBuoy', moduleId: null }
]

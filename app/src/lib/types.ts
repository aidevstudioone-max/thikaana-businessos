// Core domain types for Thikaana BusinessOS.
// This file is the contract the localStorage repository (db.ts) implements today
// and that a real API / Postgres layer should implement later — see db.ts header.

// ---------------------------------------------------------------------------
// Platform / access control
// ---------------------------------------------------------------------------

export type ModuleCategory =
  | 'INVENTORY'
  | 'SALES'
  | 'FINANCE'
  | 'HR'
  | 'CRM'
  | 'INTELLIGENCE'
export type ModuleStatus = 'ENABLED' | 'DISABLED'

export interface ModuleDef {
  id: string
  name: string
  category: ModuleCategory
  description: string
  phase: 1 | 2 | 3 | 4 | 5
  dependsOn: string[]
  defaultStatus: ModuleStatus
}

export interface ModuleState {
  id: string
  status: ModuleStatus
  enabledAt?: string
  disabledAt?: string
}

export interface ModulePermission {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
  actions: Record<string, boolean>
}

export type PortalKind = 'ADMIN' | 'EMPLOYEE' | 'PLATFORM'

export interface Role {
  id: string
  name: string
  isSystem: boolean
  isSuperAdmin: boolean
  portal: PortalKind
  description: string
  permissions: Record<string, ModulePermission>
}

export interface Company {
  id: string
  name: string
  legalName: string
  tagline: string
  industry: string
  gstin: string
  pan: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  website: string
  upiId: string
  bankName: string
  bankAccount: string
  bankIfsc: string
  financialYear: string
  logoEmoji: string
}

export interface Settings {
  currency: string
  invoicePrefix: string
  quotePrefix: string
  poPrefix: string
  receiptPrefix: string
  defaultGstRate: number
  lowStockGlobalThreshold: number
  placeOfSupply: string
  enableRoundOff: boolean
  payslipNote: string
  whatsappSenderName: string
}

export interface User {
  id: string
  name: string
  username: string
  email: string
  mobile: string
  password: string
  roleId: string
  linkedEmployeeId?: string
  status: 'ACTIVE' | 'INACTIVE'
  lastLoginAt?: string
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  ts: string
  userId: string
  userName: string
  module: string
  action: string
  entity: string
  entityId?: string
  detail?: string
}

export type Channel = 'in-app' | 'whatsapp' | 'sms' | 'email'

export interface Notification {
  id: string
  ts: string
  type: string
  channel: Channel
  title: string
  message: string
  read: boolean
  severity: 'info' | 'warning' | 'critical'
  link?: string
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export interface Category {
  id: string
  name: string
  parentId: string | null
  hsn: string
  createdAt: string
}

export interface Warehouse {
  id: string
  name: string
  code: string
  address: string
  city: string
  isPrimary: boolean
  status: 'ACTIVE' | 'INACTIVE'
}

export interface ProductVariant {
  id: string
  sku: string
  barcode: string
  attributes: Record<string, string> // { Size: 'M', Color: 'Blue' }
  costPrice: number
  sellingPrice: number
  mrp: number
}

export interface Product {
  id: string
  name: string
  sku: string
  barcode: string
  categoryId: string
  brand: string
  hsn: string
  unit: 'PCS' | 'BOX' | 'KG' | 'LTR' | 'MTR' | 'PKT' | 'SET' | 'DOZ'
  gstRate: number
  costPrice: number
  sellingPrice: number
  mrp: number
  reorderLevel: number
  trackBatches: boolean
  trackSerials: boolean
  hasVariants: boolean
  variants: ProductVariant[]
  primarySupplierId: string
  status: 'ACTIVE' | 'DISCONTINUED'
  createdAt: string
}

// One row per product per warehouse.
export interface StockLevel {
  id: string
  productId: string
  warehouseId: string
  onHand: number
  reserved: number
}

export type StockMoveType =
  | 'PURCHASE'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'RETURN_IN'
  | 'RETURN_OUT'
  | 'OPENING'

export interface StockMove {
  id: string
  ts: string
  productId: string
  warehouseId: string
  type: StockMoveType
  qty: number // signed: +in / -out
  balanceAfter: number
  batchNo?: string
  serialNo?: string
  refType?: string // 'PurchaseOrder' | 'Invoice' | 'Adjustment' | 'Transfer'
  refId?: string
  refLabel?: string
  reason?: string
  userId: string
  userName: string
}

export interface Batch {
  id: string
  productId: string
  batchNo: string
  warehouseId: string
  qty: number
  mfgDate: string
  expiryDate: string
  costPrice: number
  receivedAt: string
}

export interface StockTransfer {
  id: string
  transferNo: string
  fromWarehouseId: string
  toWarehouseId: string
  date: string
  status: 'DRAFT' | 'IN_TRANSIT' | 'COMPLETED'
  lines: { productId: string; qty: number }[]
  note: string
  createdByUserId: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Suppliers & Purchasing
// ---------------------------------------------------------------------------

export interface Supplier {
  id: string
  name: string
  contactPerson: string
  phone: string
  email: string
  gstin: string
  address: string
  city: string
  state: string
  paymentTerms: 'Advance' | 'Net 7' | 'Net 15' | 'Net 30' | 'Net 45'
  openingBalance: number
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
}

export type PurchaseStatus = 'DRAFT' | 'ORDERED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED'

export interface PurchaseOrderLine {
  productId: string
  qty: number
  receivedQty: number
  rate: number
  gstRate: number
}

export interface PurchaseOrder {
  id: string
  poNo: string
  supplierId: string
  warehouseId: string
  orderDate: string
  expectedDate: string
  status: PurchaseStatus
  lines: PurchaseOrderLine[]
  subtotal: number
  taxTotal: number
  total: number
  amountPaid: number
  notes: string
  createdByUserId: string
  createdAt: string
}

export interface SupplierPayment {
  id: string
  paymentNo: string
  supplierId: string
  purchaseOrderId: string | null
  amount: number
  mode: PaymentMode
  reference: string
  date: string
  note: string
  createdByUserId: string
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export interface Customer {
  id: string
  name: string
  type: 'Retail' | 'Wholesale' | 'Distributor' | 'Corporate'
  contactPerson: string
  phone: string
  email: string
  gstin: string
  billingAddress: string
  shippingAddress: string
  city: string
  state: string
  creditLimit: number
  openingBalance: number
  priceTier: 'Standard' | 'Silver' | 'Gold'
  notes: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
}

// ---------------------------------------------------------------------------
// Sales & Billing
// ---------------------------------------------------------------------------

export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Cheque' | 'Credit'
export type DocStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CONFIRMED'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'FULFILLED'
  | 'CANCELLED'

export interface DocLine {
  productId: string
  description: string
  qty: number
  rate: number
  discountPct: number
  gstRate: number
}

export interface Quotation {
  id: string
  quoteNo: string
  customerId: string
  date: string
  validUntil: string
  status: DocStatus
  lines: DocLine[]
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  notes: string
  createdByUserId: string
  createdAt: string
}

export interface SalesOrder {
  id: string
  orderNo: string
  customerId: string
  quotationId: string | null
  date: string
  expectedDispatch: string
  status: DocStatus
  lines: DocLine[]
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  notes: string
  createdByUserId: string
  createdAt: string
}

export type InvoiceType = 'TAX' | 'PROFORMA'

export interface Invoice {
  id: string
  invoiceNo: string
  type: InvoiceType
  customerId: string
  salesOrderId: string | null
  warehouseId: string
  date: string
  dueDate: string
  placeOfSupply: string
  status: DocStatus
  lines: DocLine[]
  subtotal: number
  discountTotal: number
  cgst: number
  sgst: number
  igst: number
  roundOff: number
  total: number
  amountPaid: number
  salespersonEmployeeId: string
  notes: string
  createdByUserId: string
  createdAt: string
}

export interface DeliveryChallan {
  id: string
  challanNo: string
  invoiceId: string | null
  salesOrderId: string | null
  customerId: string
  date: string
  vehicleNo: string
  status: 'PENDING' | 'DISPATCHED' | 'DELIVERED'
  lines: { productId: string; qty: number }[]
  createdByUserId: string
}

export interface CreditNote {
  id: string
  noteNo: string
  invoiceId: string
  customerId: string
  date: string
  reason: string
  lines: DocLine[]
  total: number
  createdByUserId: string
}

export interface PaymentReceipt {
  id: string
  receiptNo: string
  invoiceId: string | null
  customerId: string
  amount: number
  mode: PaymentMode
  reference: string
  date: string
  note: string
  sentWhatsapp: boolean
  createdByUserId: string
}

// ---------------------------------------------------------------------------
// Accounting & Tax (Phase 2)
// ---------------------------------------------------------------------------

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'

export interface Account {
  id: string
  code: string
  name: string
  type: AccountType
  parentId: string | null
  isSystem: boolean
}

export interface JournalLine {
  accountId: string
  debit: number
  credit: number
}

export interface JournalEntry {
  id: string
  entryNo: string
  date: string
  narration: string
  source: 'MANUAL' | 'INVOICE' | 'PURCHASE' | 'PAYMENT' | 'PAYROLL' | 'EXPENSE'
  refId: string | null
  lines: JournalLine[]
  createdByUserId: string
  createdAt: string
}

export interface ExpenseRecord {
  id: string
  expenseNo: string
  date: string
  categoryAccountId: string
  paidToName: string
  amount: number
  gstRate: number
  mode: PaymentMode
  reference: string
  note: string
  createdByUserId: string
}

export interface GstReturnRow {
  period: string // 'YYYY-MM'
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
  invoiceCount: number
}

// ---------------------------------------------------------------------------
// Human Resources & Payroll (Phase 3)
// ---------------------------------------------------------------------------

export interface Department {
  id: string
  name: string
  headEmployeeId: string | null
}

export interface Employee {
  id: string
  empCode: string
  name: string
  photoUrl: string
  gender: 'Male' | 'Female' | 'Other'
  dob: string
  email: string
  mobile: string
  address: string
  departmentId: string
  designation: string
  reportingManagerId: string | null
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Intern'
  joiningDate: string
  ctcAnnual: number
  basicPct: number
  hraPct: number
  pan: string
  pfNumber: string
  esiNumber: string
  bankAccount: string
  bankIfsc: string
  status: 'ACTIVE' | 'ON_NOTICE' | 'EXITED'
  documents: EmployeeDocument[]
  createdAt: string
}

export interface EmployeeDocument {
  id: string
  type: 'Offer Letter' | 'PAN' | 'Aadhaar' | 'Degree' | 'Experience Letter' | 'Other'
  name: string
  uploadedAt: string
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'WEEK_OFF' | 'HOLIDAY'

export interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  graceMinutes: number
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string // yyyy-mm-dd
  shiftId: string
  checkIn: string
  checkOut: string
  status: AttendanceStatus
  source: 'WEB' | 'MOBILE' | 'BIOMETRIC'
  withinGeofence: boolean
  overtimeHours: number
}

export type LeaveType = 'Sick' | 'Casual' | 'Paid' | 'Unpaid'

export interface LeaveRequest {
  id: string
  employeeId: string
  type: LeaveType
  fromDate: string
  toDate: string
  days: number
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  approverEmployeeId: string | null
  appliedAt: string
  decidedAt: string | null
}

export interface LeaveBalance {
  employeeId: string
  sick: number
  casual: number
  paid: number
}

export interface SalaryComponent {
  label: string
  amount: number
  kind: 'EARNING' | 'DEDUCTION'
}

export interface Payslip {
  id: string
  employeeId: string
  period: string // 'YYYY-MM'
  workingDays: number
  paidDays: number
  lopDays: number
  earnings: SalaryComponent[]
  deductions: SalaryComponent[]
  grossEarnings: number
  totalDeductions: number
  netPay: number
  status: 'DRAFT' | 'PROCESSED' | 'PAID'
  processedAt: string | null
  paidAt: string | null
}

export interface PayrollRun {
  id: string
  period: string
  status: 'DRAFT' | 'PROCESSED' | 'PAID'
  employeeCount: number
  grossTotal: number
  deductionTotal: number
  netTotal: number
  processedByUserId: string
  processedAt: string | null
}

// ---------------------------------------------------------------------------
// CRM (Phase 4)
// ---------------------------------------------------------------------------

export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST'

export interface Lead {
  id: string
  name: string
  company: string
  phone: string
  email: string
  source: 'Website' | 'Referral' | 'Cold Call' | 'Exhibition' | 'WhatsApp' | 'Walk-in'
  stage: LeadStage
  estimatedValue: number
  ownerEmployeeId: string
  customerId: string | null
  createdAt: string
  updatedAt: string
}

export interface FollowUp {
  id: string
  leadId: string
  dueDate: string
  channel: 'Call' | 'Email' | 'WhatsApp' | 'Meeting'
  note: string
  done: boolean
  createdByUserId: string
}

export interface CommMessage {
  id: string
  ts: string
  channel: Channel
  category: 'Payment Reminder' | 'Promotion' | 'Order Update' | 'Lead Follow-up' | 'General'
  audience: string
  recipientCount: number
  body: string
  sentByUserId: string
  status: 'SENT' | 'QUEUED' | 'FAILED'
}

// ---------------------------------------------------------------------------
// Super Admin platform console (multi-tenant)
// ---------------------------------------------------------------------------

export interface Workspace {
  id: string
  companyName: string
  ownerName: string
  industry: string
  city: string
  phone: string
  plan: 'Starter' | 'Growth' | 'Enterprise'
  seats: number
  modulesEnabled: number
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED'
  mrr: number
  joinedAt: string
  renewsAt: string
}

export interface PlatformPlan {
  id: string
  name: 'Starter' | 'Growth' | 'Enterprise'
  pricePerMonth: number
  seatLimit: number // -1 = unlimited
  moduleLimit: number // -1 = unlimited
  features: string[]
}

export interface PlatformInvoice {
  id: string
  invoiceNo: string
  workspaceId: string
  amount: number
  period: string
  status: 'PAID' | 'DUE' | 'FAILED'
  issuedAt: string
}

export interface SupportTicket {
  id: string
  ticketNo: string
  workspaceId: string
  subject: string
  priority: 'Low' | 'Medium' | 'High'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  openedAt: string
}

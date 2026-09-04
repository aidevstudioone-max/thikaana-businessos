import React from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ModuleProvider } from './context/ModuleContext'
import Layout from './components/Layout'
import PortalLayout from './components/PortalLayout'
import Gate from './components/Gate'
import { EMPLOYEE_NAV, PLATFORM_NAV } from './lib/nav'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NotificationsPage from './pages/system/Notifications'

// Inventory
import Products from './pages/inventory/Products'
import ProductDetail from './pages/inventory/ProductDetail'
import Categories from './pages/inventory/Categories'
import StockLedger from './pages/inventory/StockLedger'
import StockAdjust from './pages/inventory/StockAdjust'
import LowStock from './pages/inventory/LowStock'
import Warehouses from './pages/inventory/Warehouses'
import Transfers from './pages/inventory/Transfers'
import Batches from './pages/inventory/Batches'

// Purchasing
import Suppliers from './pages/purchasing/Suppliers'
import PurchaseOrders from './pages/purchasing/PurchaseOrders'
import PurchaseOrderDetail from './pages/purchasing/PurchaseOrderDetail'
import SupplierPayments from './pages/purchasing/SupplierPayments'

// Sales
import Customers from './pages/sales/Customers'
import CustomerDetail from './pages/sales/CustomerDetail'
import Quotations from './pages/sales/Quotations'
import SalesOrders from './pages/sales/SalesOrders'
import Challans from './pages/sales/Challans'
import Invoices from './pages/sales/Invoices'
import InvoiceDetail from './pages/sales/InvoiceDetail'
import CreditNotes from './pages/sales/CreditNotes'
import Receipts from './pages/sales/Receipts'

// Finance
import ChartOfAccounts from './pages/finance/ChartOfAccounts'
import Journal from './pages/finance/Journal'
import Ledger from './pages/finance/Ledger'
import Financials from './pages/finance/Financials'
import Expenses from './pages/finance/Expenses'
import GstReturns from './pages/finance/GstReturns'

// HR
import Employees from './pages/hr/Employees'
import EmployeeDetail from './pages/hr/EmployeeDetail'
import Departments from './pages/hr/Departments'
import Attendance from './pages/hr/Attendance'
import LeaveRequests from './pages/hr/LeaveRequests'
import Payroll from './pages/hr/Payroll'

// CRM
import Leads from './pages/crm/Leads'
import FollowUps from './pages/crm/FollowUps'
import Communication from './pages/crm/Communication'

// Intelligence
import Analytics from './pages/intelligence/Analytics'
import Forecasting from './pages/intelligence/Forecasting'
import Assistant from './pages/intelligence/Assistant'

// Admin
import Modules from './pages/admin/Modules'
import Users from './pages/admin/Users'
import Roles from './pages/admin/Roles'
import CompanyProfile from './pages/admin/CompanyProfile'
import SettingsPage from './pages/admin/Settings'
import AuditLog from './pages/admin/AuditLog'

// Employee portal
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import MyAttendance from './pages/employee/MyAttendance'
import MyLeave from './pages/employee/MyLeave'
import MyPayslips from './pages/employee/MyPayslips'
import MyProfile from './pages/employee/MyProfile'

// Platform console
import PlatformDashboard from './pages/platform/PlatformDashboard'
import Workspaces from './pages/platform/Workspaces'
import Plans from './pages/platform/Plans'
import PlatformBilling from './pages/platform/PlatformBilling'
import Support from './pages/platform/Support'

function RequireAuth({ children }: { children: React.JSX.Element }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminRoutes() {
  return (
    <Route element={<Layout />}>
      <Route path="/" element={<Dashboard />} />

      <Route path="/products" element={<Gate moduleId="inventory"><Products /></Gate>} />
      <Route path="/products/:id" element={<Gate moduleId="inventory"><ProductDetail /></Gate>} />
      <Route path="/categories" element={<Gate moduleId="inventory"><Categories /></Gate>} />
      <Route path="/stock" element={<Gate moduleId="inventory"><StockLedger /></Gate>} />
      <Route path="/stock/adjust" element={<Gate moduleId="inventory" action="edit"><StockAdjust /></Gate>} />
      <Route path="/stock/low" element={<Gate moduleId="inventory"><LowStock /></Gate>} />
      <Route path="/warehouses" element={<Gate moduleId="warehouses"><Warehouses /></Gate>} />
      <Route path="/warehouses/transfers" element={<Gate moduleId="warehouses"><Transfers /></Gate>} />
      <Route path="/batches" element={<Gate moduleId="batch_tracking"><Batches /></Gate>} />

      <Route path="/suppliers" element={<Gate moduleId="suppliers"><Suppliers /></Gate>} />
      <Route path="/purchase-orders" element={<Gate moduleId="purchasing"><PurchaseOrders /></Gate>} />
      <Route path="/purchase-orders/:id" element={<Gate moduleId="purchasing"><PurchaseOrderDetail /></Gate>} />
      <Route path="/supplier-payments" element={<Gate moduleId="purchasing"><SupplierPayments /></Gate>} />

      <Route path="/customers" element={<Gate moduleId="customers"><Customers /></Gate>} />
      <Route path="/customers/:id" element={<Gate moduleId="customers"><CustomerDetail /></Gate>} />
      <Route path="/quotations" element={<Gate moduleId="quotations"><Quotations /></Gate>} />
      <Route path="/sales-orders" element={<Gate moduleId="sales_orders"><SalesOrders /></Gate>} />
      <Route path="/challans" element={<Gate moduleId="sales_orders"><Challans /></Gate>} />
      <Route path="/invoices" element={<Gate moduleId="billing"><Invoices /></Gate>} />
      <Route path="/invoices/:id" element={<Gate moduleId="billing"><InvoiceDetail /></Gate>} />
      <Route path="/credit-notes" element={<Gate moduleId="billing"><CreditNotes /></Gate>} />
      <Route path="/receipts" element={<Gate moduleId="billing"><Receipts /></Gate>} />

      <Route path="/accounts" element={<Gate moduleId="accounting"><ChartOfAccounts /></Gate>} />
      <Route path="/journal" element={<Gate moduleId="accounting"><Journal /></Gate>} />
      <Route path="/ledger" element={<Gate moduleId="accounting"><Ledger /></Gate>} />
      <Route path="/financials" element={<Gate moduleId="accounting"><Financials /></Gate>} />
      <Route path="/expenses" element={<Gate moduleId="expenses"><Expenses /></Gate>} />
      <Route path="/gst" element={<Gate moduleId="gst"><GstReturns /></Gate>} />

      <Route path="/employees" element={<Gate moduleId="employees"><Employees /></Gate>} />
      <Route path="/employees/:id" element={<Gate moduleId="employees"><EmployeeDetail /></Gate>} />
      <Route path="/departments" element={<Gate moduleId="employees"><Departments /></Gate>} />
      <Route path="/attendance" element={<Gate moduleId="attendance"><Attendance /></Gate>} />
      <Route path="/leave" element={<Gate moduleId="leave"><LeaveRequests /></Gate>} />
      <Route path="/payroll" element={<Gate moduleId="payroll"><Payroll /></Gate>} />

      <Route path="/leads" element={<Gate moduleId="crm"><Leads /></Gate>} />
      <Route path="/follow-ups" element={<Gate moduleId="crm"><FollowUps /></Gate>} />
      <Route path="/communication" element={<Gate moduleId="communication"><Communication /></Gate>} />

      <Route path="/analytics" element={<Gate moduleId="analytics"><Analytics /></Gate>} />
      <Route path="/forecasting" element={<Gate moduleId="ai_forecasting"><Forecasting /></Gate>} />
      <Route path="/assistant" element={<Gate moduleId="ai_assistant"><Assistant /></Gate>} />

      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/admin/modules" element={<Modules />} />
      <Route path="/admin/users" element={<Users />} />
      <Route path="/admin/roles" element={<Roles />} />
      <Route path="/admin/company" element={<CompanyProfile />} />
      <Route path="/admin/settings" element={<SettingsPage />} />
      <Route path="/admin/audit" element={<AuditLog />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  )
}

function EmployeeRoutes() {
  return (
    <Route element={<PortalLayout nav={EMPLOYEE_NAV} brand="Employee Self-Service" emoji="🧑‍💼" />}>
      <Route path="/" element={<EmployeeDashboard />} />
      <Route path="/me/attendance" element={<Gate moduleId="attendance"><MyAttendance /></Gate>} />
      <Route path="/me/leave" element={<Gate moduleId="leave"><MyLeave /></Gate>} />
      <Route path="/me/payslips" element={<Gate moduleId="payroll"><MyPayslips /></Gate>} />
      <Route path="/me/profile" element={<Gate moduleId="employees"><MyProfile /></Gate>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  )
}

function PlatformRoutes() {
  return (
    <Route element={<PortalLayout nav={PLATFORM_NAV} brand="Thikaana · Platform" emoji="🛰️" />}>
      <Route path="/" element={<PlatformDashboard />} />
      <Route path="/platform/workspaces" element={<Workspaces />} />
      <Route path="/platform/plans" element={<Plans />} />
      <Route path="/platform/billing" element={<PlatformBilling />} />
      <Route path="/platform/support" element={<Support />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  )
}

function AppRoutes() {
  const { role } = useAuth()
  const portal = role?.portal ?? 'ADMIN'
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <ModuleProvider>
              <Outlet />
            </ModuleProvider>
          </RequireAuth>
        }
      >
        {portal === 'PLATFORM' ? PlatformRoutes() : portal === 'EMPLOYEE' ? EmployeeRoutes() : AdminRoutes()}
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  )
}

import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useModules } from '../context/ModuleContext'
import { COLLECTIONS, getAll } from '../lib/db'
import {
  inventoryHealthScore,
  lowStockItems,
  monthlySales,
  payables,
  receivables,
  topCustomers,
  topProducts,
  totalStockValue
} from '../lib/selectors'
import {
  BarChart,
  Card,
  currency,
  currencyK,
  monthLabel,
  num,
  PageHeader,
  ProgressBar,
  StatCard
} from '../components/ui'
import type { Employee, Invoice, LeaveRequest, Product } from '../lib/types'

export default function Dashboard() {
  const { user } = useAuth()
  const { isEnabled } = useModules()

  const ms = monthlySales()
  const thisM = ms[ms.length - 1]
  const prevM = ms[ms.length - 2] ?? thisM
  const revChange = prevM.revenue ? Math.round(((thisM.revenue - prevM.revenue) / prevM.revenue) * 100) : 0
  const ytdRevenue = ms.reduce((s, m) => s + m.revenue, 0)
  const ytdProfit = ms.reduce((s, m) => s + m.grossProfit, 0)

  const ar = receivables()
  const ap = payables()
  const stock = totalStockValue()
  const health = inventoryHealthScore()

  const products = getAll<Product>(COLLECTIONS.products)
  const invoices = getAll<Invoice>(COLLECTIONS.invoices)
  const employees = getAll<Employee>(COLLECTIONS.employees)
  const leaves = getAll<LeaveRequest>(COLLECTIONS.leaveRequests)
  const openInvoices = invoices.filter((i) => ['SENT', 'PARTIAL', 'OVERDUE'].includes(i.status)).length
  const pendingLeave = leaves.filter((l) => l.status === 'PENDING').length
  const lowCount = lowStockItems().length

  return (
    <div>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${user?.name?.split(' ')[0]}`}
        subtitle="A live snapshot of the whole business — sales, cash, stock and people."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Revenue this month" value={currencyK(thisM.revenue)} tone="good" hint={`${revChange >= 0 ? '▲' : '▼'} ${Math.abs(revChange)}% vs last month`} />
        <StatCard label="Gross profit (12 mo)" value={currencyK(ytdProfit)} hint={`on ${currencyK(ytdRevenue)} revenue`} />
        <StatCard label="Receivables" value={currencyK(ar.total)} tone={ar.overdue > 0 ? 'warn' : 'default'} hint={`${currencyK(ar.overdue)} overdue`} />
        <StatCard label="Payables" value={currencyK(ap.total)} hint="owed to suppliers" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">Revenue — last 12 months</h3>
            <Link to="/analytics" className="text-xs text-brand-600 hover:underline">
              Open analytics →
            </Link>
          </div>
          <BarChart
            data={ms.map((m) => ({ label: monthLabel(m.month), value: Math.round(m.revenue) }))}
            format={(n) => currencyK(n)}
            height={180}
          />
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-1">Inventory health</h3>
          <p className="text-3xl font-bold text-brand-600">{health.score}<span className="text-base text-slate-400">/100</span></p>
          <div className="mt-3 space-y-2">
            {health.parts.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                  <span>{p.label}</span>
                  <span>{p.value}%</span>
                </div>
                <ProgressBar value={p.value} tone={p.value > 70 ? 'green' : p.value > 45 ? 'amber' : 'red'} />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Stock value {currency(stock.cost)} at cost · {currency(stock.retail)} at retail
          </p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Top products</h3>
          <div className="space-y-2">
            {topProducts(6).map((r) => (
              <div key={r.product.id} className="flex items-center justify-between text-sm">
                <span className="truncate text-slate-600">{r.product.name}</span>
                <span className="font-medium text-slate-800 shrink-0 ml-2">{currencyK(r.revenue)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Top customers</h3>
          <div className="space-y-2">
            {topCustomers(6).map((r) => (
              <div key={r.customer.id} className="flex items-center justify-between text-sm">
                <span className="truncate text-slate-600">{r.customer.name}</span>
                <span className="font-medium text-slate-800 shrink-0 ml-2">{currencyK(r.revenue)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Needs attention</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-slate-600">Open invoices</span><Link to="/invoices" className="font-medium text-brand-600">{openInvoices}</Link></li>
            <li className="flex justify-between"><span className="text-slate-600">Overdue value</span><span className="font-medium text-red-600">{currencyK(ar.overdue)}</span></li>
            <li className="flex justify-between"><span className="text-slate-600">Low-stock SKUs</span><Link to="/stock/low" className="font-medium text-amber-600">{lowCount}</Link></li>
            {isEnabled('leave') && (
              <li className="flex justify-between"><span className="text-slate-600">Leave approvals</span><Link to="/leave" className="font-medium text-brand-600">{pendingLeave}</Link></li>
            )}
            <li className="flex justify-between"><span className="text-slate-600">Active products</span><span className="font-medium text-slate-800">{num(products.filter((p) => p.status === 'ACTIVE').length)}</span></li>
            <li className="flex justify-between"><span className="text-slate-600">Headcount</span><span className="font-medium text-slate-800">{employees.filter((e) => e.status !== 'EXITED').length}</span></li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

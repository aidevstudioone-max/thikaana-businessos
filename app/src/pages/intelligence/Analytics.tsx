import React, { useState } from 'react'
import {
  inventoryHealthScore,
  monthlySales,
  payrollCostByMonth,
  salesByCategory,
  topCustomers,
  topProducts
} from '../../lib/selectors'
import { COLLECTIONS, getAll } from '../../lib/db'
import {
  BarChart,
  Card,
  currency,
  currencyK,
  DonutChart,
  monthLabel,
  PageHeader,
  ProgressBar,
  Tabs,
  Table
} from '../../components/ui'
import type { Employee, Invoice } from '../../lib/types'

const CAT_COLORS = ['#059669', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899', '#64748b', '#84cc16', '#6366f1', '#f97316', '#22c55e']

export default function Analytics() {
  const [tab, setTab] = useState('Overview')
  const ms = monthlySales()
  const revenue12 = ms.reduce((s, m) => s + m.revenue, 0)
  const profit12 = ms.reduce((s, m) => s + m.grossProfit, 0)
  const margin = revenue12 ? Math.round((profit12 / revenue12) * 100) : 0
  const cats = salesByCategory()
  const health = inventoryHealthScore()
  const payroll = payrollCostByMonth()

  const invoices = getAll<Invoice>(COLLECTIONS.invoices).filter((i) => i.status !== 'DRAFT' && i.status !== 'CANCELLED')
  const employees = getAll<Employee>(COLLECTIONS.employees)
  const bySalesperson: Record<string, { revenue: number; count: number }> = {}
  for (const inv of invoices) {
    const a = (bySalesperson[inv.salespersonEmployeeId] ??= { revenue: 0, count: 0 })
    a.revenue += inv.total
    a.count++
  }
  const salesLeaderboard = Object.entries(bySalesperson)
    .map(([id, v]) => ({ name: employees.find((e) => e.id === id)?.name ?? '—', ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)

  return (
    <div>
      <PageHeader title="Executive Analytics" subtitle="One board for revenue, profit, customers, products and people." />
      <Tabs tabs={['Overview', 'Products', 'Customers', 'People']} active={tab} onChange={setTab} />

      {tab === 'Overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Card className="p-4"><p className="text-[11px] uppercase text-slate-400">Revenue (12 mo)</p><p className="text-xl font-bold">{currencyK(revenue12)}</p></Card>
            <Card className="p-4"><p className="text-[11px] uppercase text-slate-400">Gross profit</p><p className="text-xl font-bold text-emerald-600">{currencyK(profit12)}</p></Card>
            <Card className="p-4"><p className="text-[11px] uppercase text-slate-400">Gross margin</p><p className="text-xl font-bold">{margin}%</p></Card>
            <Card className="p-4"><p className="text-[11px] uppercase text-slate-400">Inventory health</p><p className="text-xl font-bold text-brand-600">{health.score}/100</p></Card>
          </div>
          <Card className="p-4 mb-4">
            <h3 className="font-semibold text-slate-800 mb-3">Revenue vs gross profit</h3>
            <BarChart data={ms.map((m) => ({ label: monthLabel(m.month), value: Math.round(m.revenue) }))} format={(n) => currencyK(n)} height={190} />
          </Card>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Sales by category</h3>
              <div className="flex items-center gap-4">
                <DonutChart size={150} segments={cats.slice(0, 8).map((c, i) => ({ label: c.name, value: c.revenue, color: CAT_COLORS[i % CAT_COLORS.length] }))} />
                <div className="flex-1 space-y-1">
                  {cats.slice(0, 8).map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />{c.name}</span>
                      <span className="font-medium">{currencyK(c.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Inventory health breakdown</h3>
              {health.parts.map((p) => (
                <div key={p.label} className="mb-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-0.5"><span>{p.label}</span><span>{p.value}%</span></div>
                  <ProgressBar value={p.value} tone={p.value > 70 ? 'green' : p.value > 45 ? 'amber' : 'red'} />
                </div>
              ))}
            </Card>
          </div>
        </>
      )}

      {tab === 'Products' && (
        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Top products by revenue</h3>
          <Table columns={['#', 'Product', 'Units sold', 'Revenue']}>
            {topProducts(15).map((r, i) => (
              <tr key={r.product.id}><td className="py-2 px-3 text-slate-400">{i + 1}</td><td className="py-2 px-3 text-slate-800">{r.product.name}</td><td className="py-2 px-3">{r.qty}</td><td className="py-2 px-3 font-medium">{currency(r.revenue)}</td></tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === 'Customers' && (
        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Top customers by revenue</h3>
          <Table columns={['#', 'Customer', 'Invoices', 'Revenue']}>
            {topCustomers(15).map((r, i) => (
              <tr key={r.customer.id}><td className="py-2 px-3 text-slate-400">{i + 1}</td><td className="py-2 px-3 text-slate-800">{r.customer.name}</td><td className="py-2 px-3">{r.invoices}</td><td className="py-2 px-3 font-medium">{currency(r.revenue)}</td></tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === 'People' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Sales leaderboard</h3>
            <Table columns={['#', 'Employee', 'Invoices', 'Revenue']}>
              {salesLeaderboard.map((r, i) => (
                <tr key={r.name}><td className="py-2 px-3 text-slate-400">{i + 1}</td><td className="py-2 px-3 text-slate-800">{r.name}</td><td className="py-2 px-3">{r.count}</td><td className="py-2 px-3 font-medium">{currency(r.revenue)}</td></tr>
              ))}
            </Table>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Payroll cost trend</h3>
            <BarChart data={payroll.map((p) => ({ label: monthLabel(p.month), value: Math.round(p.net) }))} format={(n) => currencyK(n)} height={190} tone="amber" />
          </Card>
        </div>
      )}
    </div>
  )
}

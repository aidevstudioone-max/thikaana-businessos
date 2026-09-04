import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { COLLECTIONS, getAll } from '../../lib/db'
import { supplierName } from '../../lib/selectors'
import { Badge, Card, currency, EmptyState, PageHeader, Sparkline, StatCard, Table } from '../../components/ui'
import { last12Months, monthKey } from '../../lib/format'
import type { Invoice, Product, StockLevel } from '../../lib/types'

export default function Forecasting() {
  const products = getAll<Product>(COLLECTIONS.products).filter((p) => p.status === 'ACTIVE')
  const invoices = getAll<Invoice>(COLLECTIONS.invoices).filter((i) => i.status !== 'DRAFT' && i.status !== 'CANCELLED')
  const levels = getAll<StockLevel>(COLLECTIONS.stockLevels)
  const months = last12Months()

  const rows = useMemo(() => {
    const soldByMonth: Record<string, Record<string, number>> = {}
    for (const inv of invoices) {
      const mk = monthKey(inv.date)
      for (const l of inv.lines) {
        ;(soldByMonth[l.productId] ??= {})[mk] = ((soldByMonth[l.productId] ??= {})[mk] ?? 0) + l.qty
      }
    }
    const onHandByProduct: Record<string, number> = {}
    for (const lv of levels) onHandByProduct[lv.productId] = (onHandByProduct[lv.productId] ?? 0) + lv.onHand

    return products
      .map((p) => {
        const series = months.map((mk) => soldByMonth[p.id]?.[mk] ?? 0)
        const recent3 = series.slice(-3)
        const avg = recent3.reduce((s, v) => s + v, 0) / 3
        const trend = series.slice(-6, -3).reduce((s, v) => s + v, 0) / 3
        const growth = trend ? (avg - trend) / trend : 0
        const forecastNextMonth = Math.max(0, Math.round(avg * (1 + Math.max(-0.4, Math.min(0.5, growth)))))
        const onHand = onHandByProduct[p.id] ?? 0
        const daysCover = forecastNextMonth ? Math.round((onHand / forecastNextMonth) * 30) : 999
        const leadDays = 12
        const reorderQty = Math.max(0, Math.round(forecastNextMonth * 1.5 - onHand))
        return { p, series, forecastNextMonth, onHand, daysCover, reorderQty, growth, leadDays }
      })
      .filter((r) => r.forecastNextMonth > 0)
      .sort((a, b) => a.daysCover - b.daysCover)
  }, [products, invoices, levels])

  const needReorder = rows.filter((r) => r.daysCover < r.leadDays + 7)
  const reorderValue = needReorder.reduce((s, r) => s + r.reorderQty * r.p.costPrice, 0)

  return (
    <div>
      <PageHeader
        title="AI Demand Forecasting"
        subtitle="Next-month demand from 12-month sales velocity and trend, with replenishment suggestions netted against lead time."
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="SKUs to reorder now" value={String(needReorder.length)} tone={needReorder.length ? 'warn' : 'good'} />
        <StatCard label="Suggested order value" value={currency(reorderValue)} />
        <StatCard label="SKUs forecasted" value={String(rows.length)} />
      </div>
      <Card>
        {rows.length === 0 ? <EmptyState title="Not enough sales history" /> : (
          <Table columns={['Product', '12-mo trend', 'Next-mo forecast', 'On hand', 'Days cover', 'Suggested order', 'Est. cost', 'Supplier']}>
            {rows.slice(0, 120).map((r) => (
              <tr key={r.p.id} className="hover:bg-slate-50">
                <td className="py-2 px-3"><Link to={`/products/${r.p.id}`} className="text-slate-800 hover:text-brand-600">{r.p.name}</Link></td>
                <td className="py-2 px-3"><Sparkline values={r.series} width={120} height={30} /></td>
                <td className="py-2 px-3 font-medium">{r.forecastNextMonth} {r.growth > 0.08 ? <Badge tone="green">↑</Badge> : r.growth < -0.08 ? <Badge tone="red">↓</Badge> : null}</td>
                <td className="py-2 px-3">{r.onHand}</td>
                <td className="py-2 px-3">{r.daysCover >= 999 ? '∞' : <span className={r.daysCover < r.leadDays + 7 ? 'text-red-600 font-medium' : 'text-slate-600'}>{r.daysCover}d</span>}</td>
                <td className="py-2 px-3 font-medium">{r.reorderQty || '—'}</td>
                <td className="py-2 px-3 text-slate-500">{r.reorderQty ? currency(r.reorderQty * r.p.costPrice) : '—'}</td>
                <td className="py-2 px-3 text-slate-500 text-xs">{supplierName(r.p.primarySupplierId)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

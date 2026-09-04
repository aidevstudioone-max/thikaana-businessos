import React, { useMemo, useState } from 'react'
import { COLLECTIONS, getAll, saveAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { customerName, productName } from '../../lib/selectors'
import { Button, Card, currency, EmptyState, fmtDate, Modal, PageHeader, Select, StatCard, StatusBadge, Table } from '../../components/ui'
import type { SalesOrder } from '../../lib/types'

export default function SalesOrders() {
  const { items, setItems } = useCollection<SalesOrder>(COLLECTIONS.salesOrders)
  const { user, can } = useAuth()
  const [status, setStatus] = useState('')
  const [view, setView] = useState<SalesOrder | null>(null)

  const filtered = useMemo(() => [...items].sort((a, b) => b.date.localeCompare(a.date)).filter((s) => !status || s.status === status), [items, status])
  const openValue = items.filter((s) => ['CONFIRMED', 'PARTIAL'].includes(s.status)).reduce((s, o) => s + o.total, 0)

  const mark = (o: SalesOrder, st: SalesOrder['status']) => {
    const next = items.map((x) => (x.id === o.id ? { ...x, status: st } : x))
    setItems(next); saveAll(COLLECTIONS.salesOrders, next)
    logAudit(user, 'Sales Orders', 'SO_STATUS', o.orderNo, { detail: st })
    setView(null)
  }

  return (
    <div>
      <PageHeader title="Sales Orders" subtitle="Confirmed customer orders awaiting dispatch and invoicing." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Open order value" value={currency(openValue)} />
        <StatCard label="Fulfilled" value={String(items.filter((s) => s.status === 'FULFILLED').length)} tone="good" />
        <StatCard label="Total orders" value={String(items.length)} />
      </div>
      <Card className="p-3 mb-4"><Select value={status} onChange={setStatus} className="max-w-[180px]"><option value="">All statuses</option>{['CONFIRMED', 'PARTIAL', 'FULFILLED', 'CANCELLED'].map((s) => <option key={s}>{s}</option>)}</Select></Card>
      <Card>
        {filtered.length === 0 ? <EmptyState title="No sales orders" subtitle="Accept a quotation to create one." /> : (
          <Table columns={['Order', 'Customer', 'Date', 'Dispatch by', 'Items', 'Total', 'Status', '']}>
            {filtered.slice(0, 150).map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium">{o.orderNo}</td>
                <td className="py-2.5 px-3 text-slate-600">{customerName(o.customerId)}</td>
                <td className="py-2.5 px-3 text-slate-500">{fmtDate(o.date)}</td>
                <td className="py-2.5 px-3 text-slate-500">{fmtDate(o.expectedDispatch)}</td>
                <td className="py-2.5 px-3">{o.lines.length}</td>
                <td className="py-2.5 px-3">{currency(o.total)}</td>
                <td className="py-2.5 px-3"><StatusBadge status={o.status} /></td>
                <td className="py-2.5 px-3 text-right"><button className="text-xs text-brand-600 hover:underline" onClick={() => setView(o)}>View →</button></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {view && (
        <Modal title={view.orderNo} onClose={() => setView(null)} wide>
          <p className="text-sm text-slate-500 mb-3">{customerName(view.customerId)} · dispatch by {fmtDate(view.expectedDispatch)}</p>
          <Table columns={['Item', 'Qty', 'Rate', 'Amount']}>
            {view.lines.map((l, i) => (
              <tr key={i}><td className="py-2 px-3">{l.description || productName(l.productId)}</td><td className="py-2 px-3">{l.qty}</td><td className="py-2 px-3">{currency(l.rate)}</td><td className="py-2 px-3">{currency(l.qty * l.rate * (1 - l.discountPct / 100))}</td></tr>
            ))}
          </Table>
          <p className="text-right text-base font-bold mt-3">Total {currency(view.total)}</p>
          {can('sales_orders', 'edit') && view.status !== 'FULFILLED' && view.status !== 'CANCELLED' && (
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="secondary" onClick={() => mark(view, 'CANCELLED')}>Cancel order</Button>
              <Button onClick={() => mark(view, 'FULFILLED')}>Mark fulfilled</Button>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

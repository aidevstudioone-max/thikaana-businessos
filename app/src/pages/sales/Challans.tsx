import React, { useMemo, useState } from 'react'
import { COLLECTIONS, getAll, saveAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { customerName, productName } from '../../lib/selectors'
import { Button, Card, EmptyState, fmtDate, Modal, PageHeader, Select, StatusBadge, Table } from '../../components/ui'
import type { DeliveryChallan } from '../../lib/types'

export default function Challans() {
  const { items, setItems } = useCollection<DeliveryChallan>(COLLECTIONS.deliveryChallans)
  const { can } = useAuth()
  const [status, setStatus] = useState('')
  const [view, setView] = useState<DeliveryChallan | null>(null)

  const filtered = useMemo(() => [...items].sort((a, b) => b.date.localeCompare(a.date)).filter((c) => !status || c.status === status), [items, status])

  const advance = (c: DeliveryChallan) => {
    const nextStatus: DeliveryChallan['status'] = c.status === 'PENDING' ? 'DISPATCHED' : 'DELIVERED'
    const next = items.map((x) => (x.id === c.id ? { ...x, status: nextStatus } : x))
    setItems(next); saveAll(COLLECTIONS.deliveryChallans, next); setView(null)
  }

  return (
    <div>
      <PageHeader title="Delivery Challans" subtitle="Goods dispatched against invoices and orders." />
      <Card className="p-3 mb-4"><Select value={status} onChange={setStatus} className="max-w-[180px]"><option value="">All statuses</option>{['PENDING', 'DISPATCHED', 'DELIVERED'].map((s) => <option key={s}>{s}</option>)}</Select></Card>
      <Card>
        {filtered.length === 0 ? <EmptyState title="No challans" /> : (
          <Table columns={['Challan', 'Customer', 'Date', 'Vehicle', 'Items', 'Status', '']}>
            {filtered.slice(0, 150).map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium">{c.challanNo}</td>
                <td className="py-2.5 px-3 text-slate-600">{customerName(c.customerId)}</td>
                <td className="py-2.5 px-3 text-slate-500">{fmtDate(c.date)}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{c.vehicleNo}</td>
                <td className="py-2.5 px-3">{c.lines.length}</td>
                <td className="py-2.5 px-3"><StatusBadge status={c.status} /></td>
                <td className="py-2.5 px-3 text-right"><button className="text-xs text-brand-600 hover:underline" onClick={() => setView(c)}>View →</button></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {view && (
        <Modal title={view.challanNo} onClose={() => setView(null)}>
          <p className="text-sm text-slate-500 mb-3">{customerName(view.customerId)} · {view.vehicleNo} · {fmtDate(view.date)}</p>
          <Table columns={['Item', 'Qty']}>
            {view.lines.map((l, i) => <tr key={i}><td className="py-2 px-3">{productName(l.productId)}</td><td className="py-2 px-3">{l.qty}</td></tr>)}
          </Table>
          {can('sales_orders', 'edit') && view.status !== 'DELIVERED' && (
            <div className="flex justify-end mt-3"><Button onClick={() => advance(view)}>{view.status === 'PENDING' ? 'Mark dispatched' : 'Mark delivered'}</Button></div>
          )}
        </Modal>
      )}
    </div>
  )
}

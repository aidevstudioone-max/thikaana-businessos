import React, { useMemo, useState } from 'react'
import { COLLECTIONS, getAll } from '../../lib/db'
import { supplierName } from '../../lib/selectors'
import { Card, currency, EmptyState, fmtDate, inputCls, PageHeader, Select, StatCard, Table } from '../../components/ui'
import type { PurchaseOrder, SupplierPayment } from '../../lib/types'

export default function SupplierPayments() {
  const pays = getAll<SupplierPayment>(COLLECTIONS.supplierPayments)
  const pos = getAll<PurchaseOrder>(COLLECTIONS.purchaseOrders)
  const [q, setQ] = useState('')
  const [mode, setMode] = useState('')

  const rows = useMemo(
    () => [...pays].sort((a, b) => b.date.localeCompare(a.date)).filter((p) => (!mode || p.mode === mode) && supplierName(p.supplierId).toLowerCase().includes(q.toLowerCase())),
    [pays, q, mode]
  )
  const thisMonth = pays.filter((p) => p.date.slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((s, p) => s + p.amount, 0)
  const totalPaid = pays.reduce((s, p) => s + p.amount, 0)
  const outstanding = pos.filter((p) => p.status !== 'DRAFT' && p.status !== 'CANCELLED').reduce((s, p) => s + Math.max(0, p.total - p.amountPaid), 0)

  return (
    <div>
      <PageHeader title="Supplier Payments" subtitle="Money paid out against purchase orders." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Paid this month" value={currency(thisMonth)} />
        <StatCard label="Paid (12 months)" value={currency(totalPaid)} />
        <StatCard label="Still outstanding" value={currency(outstanding)} tone={outstanding ? 'warn' : 'default'} />
      </div>
      <Card className="p-3 mb-4 flex flex-wrap gap-2">
        <input className={inputCls + ' max-w-sm'} placeholder="Search supplier…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={mode} onChange={setMode} className="max-w-[170px]"><option value="">All modes</option>{['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card'].map((m) => <option key={m}>{m}</option>)}</Select>
      </Card>
      <Card>
        {rows.length === 0 ? <EmptyState title="No payments" /> : (
          <Table columns={['Payment no', 'Date', 'Supplier', 'PO', 'Mode', 'Reference', 'Amount']}>
            {rows.slice(0, 200).map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="py-2 px-3 font-medium">{p.paymentNo}</td>
                <td className="py-2 px-3 text-slate-500">{fmtDate(p.date)}</td>
                <td className="py-2 px-3 text-slate-700">{supplierName(p.supplierId)}</td>
                <td className="py-2 px-3 text-slate-500 text-xs">{pos.find((x) => x.id === p.purchaseOrderId)?.poNo ?? '—'}</td>
                <td className="py-2 px-3 text-slate-500">{p.mode}</td>
                <td className="py-2 px-3 text-slate-400 text-xs">{p.reference}</td>
                <td className="py-2 px-3 font-medium">{currency(p.amount)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { COLLECTIONS, getAll } from '../../lib/db'
import { customerName } from '../../lib/selectors'
import { Badge, Card, currency, EmptyState, fmtDate, inputCls, PageHeader, Select, StatCard, Table } from '../../components/ui'
import type { Invoice, PaymentReceipt } from '../../lib/types'

export default function Receipts() {
  const receipts = getAll<PaymentReceipt>(COLLECTIONS.paymentReceipts)
  const invoices = getAll<Invoice>(COLLECTIONS.invoices)
  const [q, setQ] = useState('')
  const [mode, setMode] = useState('')

  const rows = useMemo(
    () => [...receipts].sort((a, b) => b.date.localeCompare(a.date)).filter((r) => (!mode || r.mode === mode) && customerName(r.customerId).toLowerCase().includes(q.toLowerCase())),
    [receipts, q, mode]
  )
  const thisMonth = receipts.filter((r) => r.date.slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((s, r) => s + r.amount, 0)
  const total = receipts.reduce((s, r) => s + r.amount, 0)

  return (
    <div>
      <PageHeader title="Payments In" subtitle="Every customer receipt recorded against an invoice." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Collected this month" value={currency(thisMonth)} tone="good" />
        <StatCard label="Collected (12 mo)" value={currency(total)} />
        <StatCard label="Receipts" value={String(receipts.length)} />
      </div>
      <Card className="p-3 mb-4 flex flex-wrap gap-2">
        <input className={inputCls + ' max-w-sm'} placeholder="Search customer…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={mode} onChange={setMode} className="max-w-[160px]"><option value="">All modes</option>{['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'].map((m) => <option key={m}>{m}</option>)}</Select>
      </Card>
      <Card>
        {rows.length === 0 ? <EmptyState title="No receipts" /> : (
          <Table columns={['Receipt', 'Date', 'Customer', 'Against invoice', 'Mode', 'Reference', 'Amount', 'Sent']}>
            {rows.slice(0, 200).map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="py-2 px-3 font-medium">{r.receiptNo}</td>
                <td className="py-2 px-3 text-slate-500">{fmtDate(r.date)}</td>
                <td className="py-2 px-3 text-slate-700">{customerName(r.customerId)}</td>
                <td className="py-2 px-3 text-slate-500 text-xs">{invoices.find((i) => i.id === r.invoiceId)?.invoiceNo ?? '—'}</td>
                <td className="py-2 px-3 text-slate-500">{r.mode}</td>
                <td className="py-2 px-3 text-slate-400 text-xs">{r.reference}</td>
                <td className="py-2 px-3 font-medium">{currency(r.amount)}</td>
                <td className="py-2 px-3">{r.sentWhatsapp ? <Badge tone="green">WhatsApp</Badge> : <span className="text-xs text-slate-300">—</span>}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

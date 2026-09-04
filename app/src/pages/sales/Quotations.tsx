import React, { useMemo, useState } from 'react'
import { COLLECTIONS, genId, getAll, saveAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { customerName, productName } from '../../lib/selectors'
import { Button, Card, currency, EmptyState, fmtDate, inputCls, Modal, PageHeader, Select, StatCard, StatusBadge, Table } from '../../components/ui'
import type { Quotation, SalesOrder } from '../../lib/types'

export default function Quotations() {
  const { items, setItems } = useCollection<Quotation>(COLLECTIONS.quotations)
  const { user, can } = useAuth()
  const [status, setStatus] = useState('')
  const [view, setView] = useState<Quotation | null>(null)

  const filtered = useMemo(() => [...items].sort((a, b) => b.date.localeCompare(a.date)).filter((q) => !status || q.status === status), [items, status])
  const pipeline = items.filter((q) => ['SENT', 'DRAFT'].includes(q.status)).reduce((s, q) => s + q.total, 0)
  const won = items.filter((q) => q.status === 'ACCEPTED').length

  const convert = (q: Quotation) => {
    const sos = getAll<SalesOrder>(COLLECTIONS.salesOrders)
    sos.push({
      id: genId('so'), orderNo: `ST/SO/${String(sos.length + 1).padStart(4, '0')}`, customerId: q.customerId, quotationId: q.id,
      date: new Date().toISOString().slice(0, 10), expectedDispatch: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
      status: 'CONFIRMED', lines: q.lines, subtotal: q.subtotal, discountTotal: q.discountTotal, taxTotal: q.taxTotal, total: q.total,
      notes: '', createdByUserId: user?.id ?? 'system', createdAt: new Date().toISOString()
    })
    saveAll(COLLECTIONS.salesOrders, sos)
    const next = items.map((x) => (x.id === q.id ? { ...x, status: 'ACCEPTED' as const } : x))
    setItems(next); saveAll(COLLECTIONS.quotations, next)
    logAudit(user, 'Quotations', 'QUOTE_CONVERTED', q.quoteNo)
    setView(null)
  }

  return (
    <div>
      <PageHeader title="Quotations" subtitle="Price quotes that convert into confirmed sales orders." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Open quote value" value={currency(pipeline)} />
        <StatCard label="Accepted" value={String(won)} tone="good" />
        <StatCard label="Total quotes" value={String(items.length)} />
      </div>
      <Card className="p-3 mb-4"><Select value={status} onChange={setStatus} className="max-w-[180px]"><option value="">All statuses</option>{['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED'].map((s) => <option key={s}>{s}</option>)}</Select></Card>
      <Card>
        {filtered.length === 0 ? <EmptyState title="No quotations" /> : (
          <Table columns={['Quote', 'Customer', 'Date', 'Valid until', 'Items', 'Total', 'Status', '']}>
            {filtered.slice(0, 150).map((q) => (
              <tr key={q.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium">{q.quoteNo}</td>
                <td className="py-2.5 px-3 text-slate-600">{customerName(q.customerId)}</td>
                <td className="py-2.5 px-3 text-slate-500">{fmtDate(q.date)}</td>
                <td className="py-2.5 px-3 text-slate-500">{fmtDate(q.validUntil)}</td>
                <td className="py-2.5 px-3">{q.lines.length}</td>
                <td className="py-2.5 px-3">{currency(q.total)}</td>
                <td className="py-2.5 px-3"><StatusBadge status={q.status} /></td>
                <td className="py-2.5 px-3 text-right"><button className="text-xs text-brand-600 hover:underline" onClick={() => setView(q)}>View →</button></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {view && (
        <Modal title={view.quoteNo} onClose={() => setView(null)} wide>
          <p className="text-sm text-slate-500 mb-3">{customerName(view.customerId)} · {fmtDate(view.date)}</p>
          <Table columns={['Item', 'Qty', 'Rate', 'Disc %', 'GST %', 'Amount']}>
            {view.lines.map((l, i) => (
              <tr key={i}><td className="py-2 px-3">{l.description || productName(l.productId)}</td><td className="py-2 px-3">{l.qty}</td><td className="py-2 px-3">{currency(l.rate)}</td><td className="py-2 px-3">{l.discountPct}%</td><td className="py-2 px-3">{l.gstRate}%</td><td className="py-2 px-3">{currency(l.qty * l.rate * (1 - l.discountPct / 100))}</td></tr>
            ))}
          </Table>
          <div className="text-right text-sm mt-3"><p>Taxable {currency(view.subtotal - view.discountTotal)}</p><p>GST {currency(view.taxTotal)}</p><p className="text-base font-bold">Total {currency(view.total)}</p></div>
          {can('quotations', 'edit') && view.status !== 'ACCEPTED' && (
            <div className="flex justify-end mt-3"><Button onClick={() => convert(view)}>Accept &amp; create sales order</Button></div>
          )}
        </Modal>
      )}
    </div>
  )
}

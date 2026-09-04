import React, { useState } from 'react'
import { COLLECTIONS, getAll } from '../../lib/db'
import { customerName, productName } from '../../lib/selectors'
import { Card, currency, EmptyState, fmtDate, Modal, PageHeader, StatCard, Table } from '../../components/ui'
import type { CreditNote } from '../../lib/types'

export default function CreditNotes() {
  const notes = getAll<CreditNote>(COLLECTIONS.creditNotes).sort((a, b) => b.date.localeCompare(a.date))
  const [view, setView] = useState<CreditNote | null>(null)
  const total = notes.reduce((s, n) => s + n.total, 0)

  return (
    <div>
      <PageHeader title="Credit Notes" subtitle="Sales returns and billing adjustments issued to customers." />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="Credit notes" value={String(notes.length)} />
        <StatCard label="Total credited" value={currency(total)} tone="warn" />
      </div>
      <Card>
        {notes.length === 0 ? <EmptyState title="No credit notes" /> : (
          <Table columns={['Note', 'Customer', 'Against', 'Date', 'Reason', 'Amount', '']}>
            {notes.map((n) => (
              <tr key={n.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium">{n.noteNo}</td>
                <td className="py-2.5 px-3 text-slate-600">{customerName(n.customerId)}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{getAll<any>(COLLECTIONS.invoices).find((i: any) => i.id === n.invoiceId)?.invoiceNo ?? '—'}</td>
                <td className="py-2.5 px-3 text-slate-500">{fmtDate(n.date)}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{n.reason}</td>
                <td className="py-2.5 px-3 font-medium">{currency(n.total)}</td>
                <td className="py-2.5 px-3 text-right"><button className="text-xs text-brand-600 hover:underline" onClick={() => setView(n)}>View →</button></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {view && (
        <Modal title={view.noteNo} onClose={() => setView(null)}>
          <p className="text-sm text-slate-500 mb-3">{customerName(view.customerId)} · {fmtDate(view.date)} · {view.reason}</p>
          <Table columns={['Item', 'Qty', 'Rate', 'Amount']}>
            {view.lines.map((l, i) => <tr key={i}><td className="py-2 px-3">{l.description || productName(l.productId)}</td><td className="py-2 px-3">{l.qty}</td><td className="py-2 px-3">{currency(l.rate)}</td><td className="py-2 px-3">{currency(l.qty * l.rate)}</td></tr>)}
          </Table>
          <p className="text-right text-base font-bold mt-3">Total {currency(view.total)}</p>
        </Modal>
      )}
    </div>
  )
}

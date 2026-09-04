import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { COLLECTIONS, getAll } from '../../lib/db'
import { Badge, Card, currency, EmptyState, fmtDate, PageHeader, StatusBadge, Table } from '../../components/ui'
import type { Customer, Invoice, PaymentReceipt, Quotation } from '../../lib/types'

export default function CustomerDetail() {
  const { id } = useParams()
  const customer = getAll<Customer>(COLLECTIONS.customers).find((c) => c.id === id)
  if (!customer) return <EmptyState title="Customer not found" />

  const invoices = getAll<Invoice>(COLLECTIONS.invoices).filter((i) => i.customerId === id).sort((a, b) => b.date.localeCompare(a.date))
  const receipts = getAll<PaymentReceipt>(COLLECTIONS.paymentReceipts).filter((r) => r.customerId === id)
  const quotes = getAll<Quotation>(COLLECTIONS.quotations).filter((q) => q.customerId === id)
  const billed = invoices.filter((i) => i.status !== 'DRAFT').reduce((s, i) => s + i.total, 0)
  const paid = invoices.reduce((s, i) => s + i.amountPaid, 0)
  const due = billed - paid + customer.openingBalance

  return (
    <div>
      <PageHeader
        title={customer.name}
        subtitle={`${customer.type} · ${customer.city} · ${customer.gstin || 'Unregistered'}`}
        actions={<Link to="/customers" className="text-sm text-brand-600 hover:underline">← All customers</Link>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Lifetime billed</p><p className="text-xl font-bold">{currency(billed)}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Received</p><p className="text-xl font-bold">{currency(paid)}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Outstanding</p><p className={`text-xl font-bold ${due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{currency(Math.max(0, due))}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Credit limit</p><p className="text-xl font-bold">{customer.creditLimit ? currency(customer.creditLimit) : '—'}</p></Card>
      </div>

      {customer.notes && <Card className="p-3 mb-4 text-sm text-slate-600">📝 {customer.notes}</Card>}

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-3">Invoices</h3>
          {invoices.length === 0 ? <EmptyState title="No invoices" /> : (
            <Table columns={['Invoice', 'Date', 'Total', 'Paid', 'Status']}>
              {invoices.slice(0, 40).map((i) => (
                <tr key={i.id}>
                  <td className="py-2 px-3"><Link to={`/invoices/${i.id}`} className="text-brand-600 hover:underline">{i.invoiceNo}</Link></td>
                  <td className="py-2 px-3 text-slate-500">{fmtDate(i.date)}</td>
                  <td className="py-2 px-3">{currency(i.total)}</td>
                  <td className="py-2 px-3 text-slate-500">{currency(i.amountPaid)}</td>
                  <td className="py-2 px-3"><StatusBadge status={i.status} /></td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Contact</h3>
          <dl className="text-sm space-y-1.5">
            <div><dt className="text-slate-400 text-xs">Contact person</dt><dd>{customer.contactPerson || '—'}</dd></div>
            <div><dt className="text-slate-400 text-xs">Phone</dt><dd>{customer.phone}</dd></div>
            <div><dt className="text-slate-400 text-xs">Email</dt><dd className="truncate">{customer.email}</dd></div>
            <div><dt className="text-slate-400 text-xs">Billing address</dt><dd>{customer.billingAddress}</dd></div>
            <div><dt className="text-slate-400 text-xs">Tier</dt><dd><Badge tone="blue">{customer.priceTier}</Badge></dd></div>
          </dl>
          <h3 className="font-semibold text-slate-800 mt-4 mb-2">Recent receipts</h3>
          <div className="space-y-1 text-sm">
            {receipts.slice(0, 6).map((r) => (
              <div key={r.id} className="flex justify-between"><span className="text-slate-500">{fmtDate(r.date)} · {r.mode}</span><span className="font-medium">{currency(r.amount)}</span></div>
            ))}
            {receipts.length === 0 && <p className="text-xs text-slate-400">None yet</p>}
          </div>
          <p className="text-xs text-slate-400 mt-3">{quotes.length} quotation(s) on file</p>
        </Card>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { COLLECTIONS, genId, getAll, load, saveAll } from '../../lib/db'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { productName } from '../../lib/selectors'
import { Button, Card, currency, EmptyState, fmtDate, inputCls, PageHeader, StatusBadge, Table, Toast } from '../../components/ui'
import type { Company, Customer, Invoice, PaymentReceipt } from '../../lib/types'

export default function InvoiceDetail() {
  const { id } = useParams()
  const { user, can } = useAuth()
  const company = load<Company>(COLLECTIONS.company, {} as Company)
  const [inv, setInv] = useState<Invoice | undefined>(() => getAll<Invoice>(COLLECTIONS.invoices).find((i) => i.id === id))
  const [pay, setPay] = useState(0)
  const [msg, setMsg] = useState('')
  if (!inv) return <EmptyState title="Invoice not found" />
  const customer = getAll<Customer>(COLLECTIONS.customers).find((c) => c.id === inv.customerId)
  const receipts = getAll<PaymentReceipt>(COLLECTIONS.paymentReceipts).filter((r) => r.invoiceId === inv.id)
  const due = inv.total - inv.amountPaid

  const persist = (next: Invoice) => {
    saveAll(COLLECTIONS.invoices, getAll<Invoice>(COLLECTIONS.invoices).map((i) => (i.id === next.id ? next : i)))
    setInv(next)
  }

  const recordPayment = () => {
    const amt = pay || due
    if (amt <= 0) return
    const receiptsAll = getAll<PaymentReceipt>(COLLECTIONS.paymentReceipts)
    receiptsAll.push({ id: genId('rc'), receiptNo: `ST/RCPT/${String(receiptsAll.length + 1).padStart(4, '0')}`, invoiceId: inv.id, customerId: inv.customerId, amount: amt, mode: 'UPI', reference: `PAY${Math.floor(Math.random() * 900000 + 100000)}`, date: new Date().toISOString().slice(0, 10), note: '', sentWhatsapp: false, createdByUserId: user?.id ?? 'system' })
    saveAll(COLLECTIONS.paymentReceipts, receiptsAll)
    const paidNow = inv.amountPaid + amt
    persist({ ...inv, amountPaid: paidNow, status: paidNow >= inv.total ? 'PAID' : 'PARTIAL' })
    logAudit(user, 'Billing', 'PAYMENT_RECEIVED', inv.invoiceNo, { detail: currency(amt) })
    setPay(0)
    setMsg('Payment recorded.')
  }

  return (
    <div>
      <PageHeader
        title={inv.invoiceNo}
        subtitle={`${customer?.name} · ${fmtDate(inv.date)}`}
        actions={
          <div className="flex gap-2 no-print">
            <Link to="/invoices" className="text-sm text-brand-600 hover:underline self-center">← All</Link>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>Print</Button>
          </div>
        }
      />

      <div id="print-area">
        <Card className="p-6">
          <div className="flex justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-lg font-bold text-slate-900">{company.legalName}</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">{company.address}, {company.city}, {company.state} — {company.pincode}</p>
              <p className="text-xs text-slate-500">GSTIN {company.gstin} · {company.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-slate-900">TAX INVOICE</p>
              <p className="text-sm text-slate-600">{inv.invoiceNo}</p>
              <p className="text-xs text-slate-500">Date {fmtDate(inv.date)} · Due {fmtDate(inv.dueDate)}</p>
              <div className="mt-1"><StatusBadge status={inv.status} /></div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 py-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Bill to</p>
              <p className="font-medium text-slate-800">{customer?.name}</p>
              <p className="text-xs text-slate-500">{customer?.billingAddress}, {customer?.city}</p>
              <p className="text-xs text-slate-500">{customer?.gstin ? `GSTIN ${customer.gstin}` : 'Unregistered'}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold text-slate-400 uppercase">Place of supply</p>
              <p className="text-slate-700">{inv.placeOfSupply}</p>
            </div>
          </div>

          <Table columns={['#', 'Item', 'Qty', 'Rate', 'Disc %', 'GST %', 'Amount']}>
            {inv.lines.map((l, i) => (
              <tr key={i}>
                <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                <td className="py-2 px-3 text-slate-800">{l.description || productName(l.productId)}</td>
                <td className="py-2 px-3">{l.qty}</td>
                <td className="py-2 px-3">{currency(l.rate)}</td>
                <td className="py-2 px-3 text-slate-500">{l.discountPct}%</td>
                <td className="py-2 px-3 text-slate-500">{l.gstRate}%</td>
                <td className="py-2 px-3">{currency(l.qty * l.rate * (1 - l.discountPct / 100))}</td>
              </tr>
            ))}
          </Table>

          <div className="flex justify-end pt-4">
            <div className="w-full sm:w-72 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Taxable value</span><span>{currency(inv.subtotal - inv.discountTotal)}</span></div>
              {inv.igst > 0 ? (
                <div className="flex justify-between"><span className="text-slate-500">IGST</span><span>{currency(inv.igst)}</span></div>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-slate-500">CGST</span><span>{currency(inv.cgst)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">SGST</span><span>{currency(inv.sgst)}</span></div>
                </>
              )}
              <div className="flex justify-between"><span className="text-slate-500">Round off</span><span>{currency(inv.roundOff)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-1"><span>Total</span><span>{currency(inv.total)}</span></div>
              <div className="flex justify-between text-emerald-600"><span>Paid</span><span>{currency(inv.amountPaid)}</span></div>
              <div className="flex justify-between font-semibold text-red-600"><span>Balance due</span><span>{currency(Math.max(0, due))}</span></div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-6 border-t border-slate-100 pt-3">
            Bank: {company.bankName} · A/C {company.bankAccount} · IFSC {company.bankIfsc} · UPI {company.upiId}
          </p>
        </Card>
      </div>

      {can('billing', 'edit') && due > 0 && inv.status !== 'CANCELLED' && (
        <div className="flex items-end gap-2 mt-4 no-print">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Record payment (blank = full {currency(due)})</label>
            <input type="number" className={inputCls + ' w-48'} value={pay} onChange={(e) => setPay(Number(e.target.value))} />
          </div>
          <Button onClick={recordPayment}>Record payment</Button>
          {inv.status === 'DRAFT' && <Button variant="secondary" onClick={() => persist({ ...inv, status: 'SENT' })}>Mark sent</Button>}
        </div>
      )}

      {receipts.length > 0 && (
        <Card className="p-4 mt-4 no-print">
          <h3 className="font-semibold text-slate-800 mb-2">Receipts</h3>
          {receipts.map((r) => (
            <div key={r.id} className="flex justify-between text-sm py-1"><span className="text-slate-500">{r.receiptNo} · {fmtDate(r.date)} · {r.mode}</span><span className="font-medium">{currency(r.amount)}</span></div>
          ))}
        </Card>
      )}
      {msg && <Toast message={msg} onClose={() => setMsg('')} />}
    </div>
  )
}

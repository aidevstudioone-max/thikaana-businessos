import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { COLLECTIONS, genId, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { computeTotals, splitGst } from '../../lib/docmath'
import { customerName, employeeName } from '../../lib/selectors'
import { load } from '../../lib/db'
import { Button, Card, currency, EmptyState, Field, fmtDate, inputCls, Modal, PageHeader, Select, StatCard, StatusBadge, Table } from '../../components/ui'
import type { Company, Customer, DocLine, Employee, Invoice, Product, Settings, Warehouse } from '../../lib/types'

export default function Invoices() {
  const { items, upsert } = useCollection<Invoice>(COLLECTIONS.invoices)
  const { can, user } = useAuth()
  const customers = getAll<Customer>(COLLECTIONS.customers).filter((c) => c.status === 'ACTIVE')
  const products = getAll<Product>(COLLECTIONS.products).filter((p) => p.status === 'ACTIVE')
  const warehouses = getAll<Warehouse>(COLLECTIONS.warehouses)
  const employees = getAll<Employee>(COLLECTIONS.employees)
  const company = load<Company>(COLLECTIONS.company, {} as Company)
  const settings = load<Settings>(COLLECTIONS.settings, {} as Settings)
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState<Invoice | null>(null)

  const filtered = useMemo(
    () => [...items].reverse().filter((i) => (!status || i.status === status) && `${i.invoiceNo} ${customerName(i.customerId)}`.toLowerCase().includes(q.toLowerCase())),
    [items, status, q]
  )
  const outstanding = items.reduce((s, i) => s + (['DRAFT', 'CANCELLED'].includes(i.status) ? 0 : i.total - i.amountPaid), 0)
  const overdue = items.filter((i) => i.status === 'OVERDUE').reduce((s, i) => s + (i.total - i.amountPaid), 0)
  const thisMonth = items.filter((i) => i.date.slice(0, 7) === new Date().toISOString().slice(0, 7) && i.status !== 'DRAFT').reduce((s, i) => s + i.total, 0)

  const newDraft = (): Invoice => ({
    id: genId('inv'), invoiceNo: `${settings.invoicePrefix}/26-27/${String(items.length + 1).padStart(4, '0')}`, type: 'TAX',
    customerId: customers[0]?.id ?? '', salesOrderId: null, warehouseId: warehouses[0]?.id ?? '', date: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10), placeOfSupply: settings.placeOfSupply, status: 'DRAFT',
    lines: [{ productId: '', description: '', qty: 1, rate: 0, discountPct: 0, gstRate: 18 }],
    subtotal: 0, discountTotal: 0, cgst: 0, sgst: 0, igst: 0, roundOff: 0, total: 0, amountPaid: 0,
    salespersonEmployeeId: employees[0]?.id ?? '', notes: '', createdByUserId: user?.id ?? 'system', createdAt: new Date().toISOString()
  })

  const recalc = (d: Invoice): Invoice => {
    const cust = customers.find((c) => c.id === d.customerId)
    const t = computeTotals(d.lines)
    const inter = !!cust && cust.state !== company.state
    const { cgst, sgst, igst } = splitGst(t.taxTotal, inter)
    const raw = t.taxableValue + t.taxTotal
    const total = settings.enableRoundOff ? Math.round(raw) : raw
    return { ...d, subtotal: t.subtotal, discountTotal: t.discountTotal, cgst, sgst, igst, roundOff: Math.round(total - raw), total, placeOfSupply: cust?.state ?? d.placeOfSupply }
  }
  const setLine = (i: number, patch: Partial<DocLine>) =>
    setDraft((d) => (d ? recalc({ ...d, lines: d.lines.map((l, li) => (li === i ? { ...l, ...patch } : l)) }) : d))

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${items.length} invoices`}
        actions={can('billing', 'create') && <Button onClick={() => setDraft(newDraft())}>+ New invoice</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Billed this month" value={currency(thisMonth)} tone="good" />
        <StatCard label="Outstanding" value={currency(outstanding)} tone={outstanding ? 'warn' : 'default'} />
        <StatCard label="Overdue" value={currency(overdue)} tone={overdue ? 'danger' : 'default'} />
      </div>
      <Card className="p-3 mb-4 flex flex-wrap gap-2">
        <input className={inputCls + ' max-w-xs'} placeholder="Search invoice / customer…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onChange={setStatus} className="max-w-[160px]"><option value="">All statuses</option>{['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'].map((s) => <option key={s}>{s}</option>)}</Select>
      </Card>
      <Card>
        {filtered.length === 0 ? <EmptyState title="No invoices" /> : (
          <Table columns={['Invoice', 'Customer', 'Date', 'Due', 'Total', 'Balance', 'Status', '']}>
            {filtered.slice(0, 150).map((i) => (
              <tr key={i.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium">{i.invoiceNo}</td>
                <td className="py-2.5 px-3 text-slate-600">{customerName(i.customerId)}</td>
                <td className="py-2.5 px-3 text-slate-500">{fmtDate(i.date)}</td>
                <td className="py-2.5 px-3 text-slate-500">{fmtDate(i.dueDate)}</td>
                <td className="py-2.5 px-3">{currency(i.total)}</td>
                <td className={`py-2.5 px-3 ${i.total - i.amountPaid > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>{currency(i.total - i.amountPaid)}</td>
                <td className="py-2.5 px-3"><StatusBadge status={i.status} /></td>
                <td className="py-2.5 px-3 text-right"><Link to={`/invoices/${i.id}`} className="text-xs text-brand-600 hover:underline">Open →</Link></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {draft && (
        <Modal title="New GST invoice" onClose={() => setDraft(null)} wide>
          <div className="grid sm:grid-cols-3 gap-x-4">
            <Field label="Customer"><Select value={draft.customerId} onChange={(v) => setDraft((d) => (d ? recalc({ ...d, customerId: v }) : d))}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Invoice date"><input type="date" className={inputCls} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
            <Field label="Due date"><input type="date" className={inputCls} value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} /></Field>
            <Field label="Warehouse"><Select value={draft.warehouseId} onChange={(v) => setDraft({ ...draft, warehouseId: v })}>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
            <Field label="Salesperson"><Select value={draft.salespersonEmployeeId} onChange={(v) => setDraft({ ...draft, salespersonEmployeeId: v })}>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field>
            <Field label="Place of supply"><input className={inputCls} value={draft.placeOfSupply} disabled /></Field>
          </div>
          <p className="text-xs font-medium text-slate-500 mb-1">Line items</p>
          {draft.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_56px_80px_52px_48px] gap-1.5 mb-1.5">
              <Select value={l.productId} onChange={(v) => { const p = products.find((x) => x.id === v); setLine(i, { productId: v, description: p?.name ?? '', rate: p?.sellingPrice ?? 0, gstRate: p?.gstRate ?? 18 }) }}><option value="">Product…</option>{products.slice(0, 300).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
              <input type="number" title="Qty" className={inputCls} value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} />
              <input type="number" title="Rate" className={inputCls} value={l.rate} onChange={(e) => setLine(i, { rate: Number(e.target.value) })} />
              <input type="number" title="Disc %" className={inputCls} value={l.discountPct} onChange={(e) => setLine(i, { discountPct: Number(e.target.value) })} />
              <input type="number" title="GST %" className={inputCls} value={l.gstRate} onChange={(e) => setLine(i, { gstRate: Number(e.target.value) })} />
            </div>
          ))}
          <button className="text-xs text-brand-600 hover:underline" onClick={() => setDraft({ ...draft, lines: [...draft.lines, { productId: '', description: '', qty: 1, rate: 0, discountPct: 0, gstRate: 18 }] })}>+ Add line</button>
          <div className="text-right text-sm mt-3 space-y-0.5">
            <p>Taxable <b>{currency(draft.subtotal - draft.discountTotal)}</b></p>
            {draft.igst > 0 ? <p>IGST <b>{currency(draft.igst)}</b></p> : <p>CGST + SGST <b>{currency(draft.cgst + draft.sgst)}</b></p>}
            <p>Round off <b>{currency(draft.roundOff)}</b></p>
            <p className="text-base">Total <b>{currency(draft.total)}</b></p>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="secondary" onClick={() => { upsert(recalc(draft)); setDraft(null) }}>Save draft</Button>
            <Button onClick={() => { upsert({ ...recalc(draft), status: 'SENT' }); logAudit(user, 'Billing', 'INVOICE_CREATED', draft.invoiceNo, { detail: currency(draft.total) }); setDraft(null) }} disabled={draft.total <= 0}>Save &amp; mark sent</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

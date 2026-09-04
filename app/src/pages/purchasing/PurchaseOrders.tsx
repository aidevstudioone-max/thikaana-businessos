import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { COLLECTIONS, genId, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { supplierName, warehouseName } from '../../lib/selectors'
import { Button, Card, currency, EmptyState, Field, fmtDate, inputCls, Modal, PageHeader, Select, StatusBadge, Table } from '../../components/ui'
import type { Product, PurchaseOrder, PurchaseOrderLine, Supplier, Warehouse } from '../../lib/types'

export default function PurchaseOrders() {
  const { items, upsert } = useCollection<PurchaseOrder>(COLLECTIONS.purchaseOrders)
  const { can, user } = useAuth()
  const suppliers = getAll<Supplier>(COLLECTIONS.suppliers).filter((s) => s.status === 'ACTIVE')
  const warehouses = getAll<Warehouse>(COLLECTIONS.warehouses)
  const products = getAll<Product>(COLLECTIONS.products).filter((p) => p.status === 'ACTIVE')
  const [status, setStatus] = useState('')
  const [draft, setDraft] = useState<PurchaseOrder | null>(null)

  const filtered = useMemo(() => [...items].reverse().filter((p) => !status || p.status === status), [items, status])
  const open = items.filter((p) => ['ORDERED', 'PARTIAL'].includes(p.status))
  const openValue = open.reduce((s, p) => s + (p.total - p.amountPaid), 0)

  const newDraft = (): PurchaseOrder => ({
    id: genId('po'), poNo: `ST/PO/${String(items.length + 1).padStart(4, '0')}`, supplierId: suppliers[0]?.id ?? '',
    warehouseId: warehouses[0]?.id ?? '', orderDate: new Date().toISOString().slice(0, 10), expectedDate: new Date(Date.now() + 6 * 864e5).toISOString().slice(0, 10),
    status: 'DRAFT', lines: [{ productId: '', qty: 0, receivedQty: 0, rate: 0, gstRate: 18 }], subtotal: 0, taxTotal: 0, total: 0, amountPaid: 0, notes: '',
    createdByUserId: user?.id ?? 'system', createdAt: new Date().toISOString()
  })

  const recalc = (d: PurchaseOrder): PurchaseOrder => {
    const subtotal = d.lines.reduce((s, l) => s + l.qty * l.rate, 0)
    const taxTotal = d.lines.reduce((s, l) => s + (l.qty * l.rate * l.gstRate) / 100, 0)
    return { ...d, subtotal: Math.round(subtotal), taxTotal: Math.round(taxTotal), total: Math.round(subtotal + taxTotal) }
  }
  const setLine = (i: number, patch: Partial<PurchaseOrderLine>) =>
    setDraft((d) => (d ? recalc({ ...d, lines: d.lines.map((l, li) => (li === i ? { ...l, ...patch } : l)) }) : d))

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle={`${open.length} open · ${currency(openValue)} yet to pay`}
        actions={can('purchasing', 'create') && <Button onClick={() => setDraft(newDraft())}>+ New PO</Button>}
      />
      <Card className="p-3 mb-4 flex gap-2">
        <Select value={status} onChange={setStatus} className="max-w-[180px]"><option value="">All statuses</option>{['DRAFT', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED'].map((s) => <option key={s}>{s}</option>)}</Select>
      </Card>
      <Card>
        {filtered.length === 0 ? <EmptyState title="No purchase orders" /> : (
          <Table columns={['PO', 'Supplier', 'Warehouse', 'Ordered', 'Total', 'Paid', 'Status', '']}>
            {filtered.slice(0, 150).map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium">{p.poNo}</td>
                <td className="py-2.5 px-3 text-slate-600">{supplierName(p.supplierId)}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{warehouseName(p.warehouseId)}</td>
                <td className="py-2.5 px-3 text-slate-500">{fmtDate(p.orderDate)}</td>
                <td className="py-2.5 px-3">{currency(p.total)}</td>
                <td className="py-2.5 px-3 text-slate-500">{currency(p.amountPaid)}</td>
                <td className="py-2.5 px-3"><StatusBadge status={p.status} /></td>
                <td className="py-2.5 px-3 text-right"><Link to={`/purchase-orders/${p.id}`} className="text-xs text-brand-600 hover:underline">Open →</Link></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {draft && (
        <Modal title="New purchase order" onClose={() => setDraft(null)} wide>
          <div className="grid sm:grid-cols-2 gap-x-4">
            <Field label="Supplier"><Select value={draft.supplierId} onChange={(v) => setDraft({ ...draft, supplierId: v })}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="Deliver to"><Select value={draft.warehouseId} onChange={(v) => setDraft({ ...draft, warehouseId: v })}>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
            <Field label="Order date"><input type="date" className={inputCls} value={draft.orderDate} onChange={(e) => setDraft({ ...draft, orderDate: e.target.value })} /></Field>
            <Field label="Expected date"><input type="date" className={inputCls} value={draft.expectedDate} onChange={(e) => setDraft({ ...draft, expectedDate: e.target.value })} /></Field>
          </div>
          <p className="text-xs font-medium text-slate-500 mb-1">Lines</p>
          {draft.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px_90px_70px] gap-2 mb-2">
              <Select value={l.productId} onChange={(v) => { const p = products.find((x) => x.id === v); setLine(i, { productId: v, rate: p?.costPrice ?? 0, gstRate: p?.gstRate ?? 18 }) }}><option value="">Product…</option>{products.slice(0, 300).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
              <input type="number" placeholder="Qty" className={inputCls} value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} />
              <input type="number" placeholder="Rate" className={inputCls} value={l.rate} onChange={(e) => setLine(i, { rate: Number(e.target.value) })} />
              <input type="number" className={inputCls} value={l.gstRate} onChange={(e) => setLine(i, { gstRate: Number(e.target.value) })} />
            </div>
          ))}
          <button className="text-xs text-brand-600 hover:underline" onClick={() => setDraft({ ...draft, lines: [...draft.lines, { productId: '', qty: 0, receivedQty: 0, rate: 0, gstRate: 18 }] })}>+ Add line</button>
          <div className="text-right text-sm mt-3 space-y-0.5">
            <p>Subtotal <b>{currency(draft.subtotal)}</b></p>
            <p>GST <b>{currency(draft.taxTotal)}</b></p>
            <p className="text-base">Total <b>{currency(draft.total)}</b></p>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={() => { upsert({ ...draft, status: 'DRAFT' }); logAudit(user, 'Purchasing', 'PO_CREATED', draft.poNo); setDraft(null) }} disabled={draft.total <= 0}>Save PO</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

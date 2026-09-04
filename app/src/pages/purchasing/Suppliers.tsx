import React, { useMemo, useState } from 'react'
import { COLLECTIONS, genId, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { Button, Card, currency, EmptyState, Field, inputCls, Modal, PageHeader, Select, StatusBadge, Table } from '../../components/ui'
import type { PurchaseOrder, Supplier, SupplierPayment } from '../../lib/types'

const blank = (): Supplier => ({
  id: genId('sup'), name: '', contactPerson: '', phone: '', email: '', gstin: '', address: '', city: '', state: 'West Bengal',
  paymentTerms: 'Net 30', openingBalance: 0, status: 'ACTIVE', createdAt: new Date().toISOString()
})

export default function Suppliers() {
  const { items, upsert } = useCollection<Supplier>(COLLECTIONS.suppliers)
  const { can, user } = useAuth()
  const pos = getAll<PurchaseOrder>(COLLECTIONS.purchaseOrders)
  const pays = getAll<SupplierPayment>(COLLECTIONS.supplierPayments)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Supplier | null>(null)

  const dueFor = (id: string) => {
    const billed = pos.filter((p) => p.supplierId === id && p.status !== 'DRAFT' && p.status !== 'CANCELLED').reduce((s, p) => s + p.total, 0)
    const paid = pays.filter((p) => p.supplierId === id).reduce((s, p) => s + p.amount, 0)
    return billed - paid + (items.find((s) => s.id === id)?.openingBalance ?? 0)
  }

  const filtered = useMemo(() => items.filter((s) => `${s.name} ${s.city} ${s.contactPerson}`.toLowerCase().includes(q.toLowerCase())), [items, q])

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle={`${items.length} vendors`}
        actions={can('suppliers', 'create') && <Button onClick={() => setEditing(blank())}>+ New supplier</Button>}
      />
      <Card className="p-3 mb-4"><input className={inputCls + ' max-w-sm'} placeholder="Search suppliers…" value={q} onChange={(e) => setQ(e.target.value)} /></Card>
      <Card>
        {filtered.length === 0 ? <EmptyState title="No suppliers" /> : (
          <Table columns={['Supplier', 'Contact', 'City', 'Terms', 'POs', 'Outstanding', 'Status', '']}>
            {filtered.map((s) => {
              const due = dueFor(s.id)
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3"><p className="font-medium text-slate-800">{s.name}</p><p className="text-xs text-slate-400">{s.gstin || 'Unregistered'}</p></td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs">{s.contactPerson}<br />{s.phone}</td>
                  <td className="py-2.5 px-3 text-slate-500">{s.city}</td>
                  <td className="py-2.5 px-3 text-slate-500">{s.paymentTerms}</td>
                  <td className="py-2.5 px-3">{pos.filter((p) => p.supplierId === s.id).length}</td>
                  <td className={`py-2.5 px-3 font-medium ${due > 0 ? 'text-red-600' : 'text-slate-500'}`}>{currency(Math.max(0, due))}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={s.status} /></td>
                  <td className="py-2.5 px-3 text-right">{can('suppliers', 'edit') && <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(s)}>Edit</button>}</td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>

      {editing && (
        <Modal title={editing.name ? 'Edit supplier' : 'New supplier'} onClose={() => setEditing(null)} wide>
          <div className="grid sm:grid-cols-2 gap-x-4">
            <Field label="Name" required><input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Contact person"><input className={inputCls} value={editing.contactPerson} onChange={(e) => setEditing({ ...editing, contactPerson: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputCls} value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <Field label="Email"><input className={inputCls} value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="GSTIN"><input className={inputCls} value={editing.gstin} onChange={(e) => setEditing({ ...editing, gstin: e.target.value })} /></Field>
            <Field label="City"><input className={inputCls} value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></Field>
            <Field label="State"><input className={inputCls} value={editing.state} onChange={(e) => setEditing({ ...editing, state: e.target.value })} /></Field>
            <Field label="Payment terms"><Select value={editing.paymentTerms} onChange={(v) => setEditing({ ...editing, paymentTerms: v as Supplier['paymentTerms'] })}>{['Advance', 'Net 7', 'Net 15', 'Net 30', 'Net 45'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Opening balance"><input type="number" className={inputCls} value={editing.openingBalance} onChange={(e) => setEditing({ ...editing, openingBalance: Number(e.target.value) })} /></Field>
            <Field label="Status"><Select value={editing.status} onChange={(v) => setEditing({ ...editing, status: v as Supplier['status'] })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select></Field>
          </div>
          <Field label="Address"><input className={inputCls} value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => { upsert(editing); logAudit(user, 'Suppliers', 'SUPPLIER_SAVED', editing.name); setEditing(null) }} disabled={!editing.name}>Save</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

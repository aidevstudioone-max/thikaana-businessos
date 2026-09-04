import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { COLLECTIONS, genId, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { receivables } from '../../lib/selectors'
import { Badge, Button, Card, currency, EmptyState, Field, inputCls, Modal, PageHeader, Select, StatusBadge, Table } from '../../components/ui'
import type { Customer, Invoice } from '../../lib/types'

const blank = (): Customer => ({
  id: genId('cus'), name: '', type: 'Retail', contactPerson: '', phone: '', email: '', gstin: '', billingAddress: '', shippingAddress: '', city: '', state: 'West Bengal',
  creditLimit: 0, openingBalance: 0, priceTier: 'Standard', notes: '', status: 'ACTIVE', createdAt: new Date().toISOString()
})

export default function Customers() {
  const { items, upsert } = useCollection<Customer>(COLLECTIONS.customers)
  const { can, user } = useAuth()
  const invoices = getAll<Invoice>(COLLECTIONS.invoices)
  const ar = receivables().byCustomer
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [editing, setEditing] = useState<Customer | null>(null)

  const filtered = useMemo(
    () => items.filter((c) => (!type || c.type === type) && `${c.name} ${c.city} ${c.phone}`.toLowerCase().includes(q.toLowerCase())),
    [items, q, type]
  )

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${items.length} customers · ${currency(Object.values(ar).reduce((s, v) => s + v, 0))} receivable`}
        actions={can('customers', 'create') && <Button onClick={() => setEditing(blank())}>+ New customer</Button>}
      />
      <Card className="p-3 mb-4 flex flex-wrap gap-2">
        <input className={inputCls + ' max-w-sm'} placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={type} onChange={setType} className="max-w-[170px]"><option value="">All types</option>{['Retail', 'Wholesale', 'Distributor', 'Corporate'].map((t) => <option key={t}>{t}</option>)}</Select>
      </Card>
      <Card>
        {filtered.length === 0 ? <EmptyState title="No customers" /> : (
          <Table columns={['Customer', 'Type', 'City', 'Tier', 'Invoices', 'Outstanding', 'Credit limit', 'Status', '']}>
            {filtered.slice(0, 200).map((c) => {
              const due = ar[c.id] ?? 0
              const overLimit = c.creditLimit > 0 && due > c.creditLimit
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3"><Link to={`/customers/${c.id}`} className="font-medium text-slate-800 hover:text-brand-600">{c.name}</Link><div className="text-xs text-slate-400">{c.gstin || 'Unregistered'}</div></td>
                  <td className="py-2.5 px-3 text-slate-500">{c.type}</td>
                  <td className="py-2.5 px-3 text-slate-500">{c.city}</td>
                  <td className="py-2.5 px-3"><Badge tone={c.priceTier === 'Gold' ? 'amber' : c.priceTier === 'Silver' ? 'slate' : 'blue'}>{c.priceTier}</Badge></td>
                  <td className="py-2.5 px-3">{invoices.filter((i) => i.customerId === c.id).length}</td>
                  <td className={`py-2.5 px-3 font-medium ${overLimit ? 'text-red-600' : due > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{currency(due)}{overLimit && ' ⚠'}</td>
                  <td className="py-2.5 px-3 text-slate-500">{c.creditLimit ? currency(c.creditLimit) : '—'}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={c.status} /></td>
                  <td className="py-2.5 px-3 text-right">{can('customers', 'edit') && <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(c)}>Edit</button>}</td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>

      {editing && (
        <Modal title={editing.name ? 'Edit customer' : 'New customer'} onClose={() => setEditing(null)} wide>
          <div className="grid sm:grid-cols-2 gap-x-4">
            <Field label="Name" required><input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Type"><Select value={editing.type} onChange={(v) => setEditing({ ...editing, type: v as Customer['type'] })}>{['Retail', 'Wholesale', 'Distributor', 'Corporate'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Contact person"><input className={inputCls} value={editing.contactPerson} onChange={(e) => setEditing({ ...editing, contactPerson: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputCls} value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <Field label="Email"><input className={inputCls} value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="GSTIN"><input className={inputCls} value={editing.gstin} onChange={(e) => setEditing({ ...editing, gstin: e.target.value })} /></Field>
            <Field label="City"><input className={inputCls} value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></Field>
            <Field label="State"><input className={inputCls} value={editing.state} onChange={(e) => setEditing({ ...editing, state: e.target.value })} /></Field>
            <Field label="Price tier"><Select value={editing.priceTier} onChange={(v) => setEditing({ ...editing, priceTier: v as Customer['priceTier'] })}>{['Standard', 'Silver', 'Gold'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Credit limit"><input type="number" className={inputCls} value={editing.creditLimit} onChange={(e) => setEditing({ ...editing, creditLimit: Number(e.target.value) })} /></Field>
            <Field label="Opening balance"><input type="number" className={inputCls} value={editing.openingBalance} onChange={(e) => setEditing({ ...editing, openingBalance: Number(e.target.value) })} /></Field>
            <Field label="Status"><Select value={editing.status} onChange={(v) => setEditing({ ...editing, status: v as Customer['status'] })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select></Field>
          </div>
          <Field label="Billing address"><input className={inputCls} value={editing.billingAddress} onChange={(e) => setEditing({ ...editing, billingAddress: e.target.value, shippingAddress: e.target.value })} /></Field>
          <Field label="Notes"><input className={inputCls} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => { upsert(editing); logAudit(user, 'Customers', 'CUSTOMER_SAVED', editing.name); setEditing(null) }} disabled={!editing.name}>Save</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { COLLECTIONS, genId, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { Badge, Button, Card, currency, Field, inputCls, Modal, PageHeader, StatusBadge } from '../../components/ui'
import type { Product, StockLevel, Warehouse } from '../../lib/types'

export default function Warehouses() {
  const { items, upsert } = useCollection<Warehouse>(COLLECTIONS.warehouses)
  const { can } = useAuth()
  const levels = getAll<StockLevel>(COLLECTIONS.stockLevels)
  const products = getAll<Product>(COLLECTIONS.products)
  const [editing, setEditing] = useState<Warehouse | null>(null)

  const statsFor = (id: string) => {
    const ls = levels.filter((l) => l.warehouseId === id)
    const units = ls.reduce((s, l) => s + l.onHand, 0)
    const value = ls.reduce((s, l) => s + l.onHand * (products.find((p) => p.id === l.productId)?.costPrice ?? 0), 0)
    return { skus: ls.filter((l) => l.onHand > 0).length, units, value }
  }

  return (
    <div>
      <PageHeader
        title="Warehouses"
        subtitle={`${items.length} stock locations`}
        actions={can('warehouses', 'create') && <Button onClick={() => setEditing({ id: genId('wh'), name: '', code: '', address: '', city: '', isPrimary: false, status: 'ACTIVE' })}>+ New warehouse</Button>}
      />
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((w) => {
          const s = statsFor(w.id)
          return (
            <Card key={w.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{w.name} {w.isPrimary && <Badge tone="green">Primary</Badge>}</p>
                  <p className="text-xs text-slate-400">{w.code} · {w.address}, {w.city}</p>
                </div>
                <StatusBadge status={w.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div><p className="text-lg font-bold text-slate-800">{s.skus}</p><p className="text-[11px] text-slate-400">SKUs</p></div>
                <div><p className="text-lg font-bold text-slate-800">{s.units.toLocaleString('en-IN')}</p><p className="text-[11px] text-slate-400">Units</p></div>
                <div><p className="text-lg font-bold text-slate-800">{currency(s.value)}</p><p className="text-[11px] text-slate-400">Stock value</p></div>
              </div>
              {can('warehouses', 'edit') && <button className="text-xs text-brand-600 hover:underline mt-3" onClick={() => setEditing(w)}>Edit</button>}
            </Card>
          )
        })}
      </div>

      {editing && (
        <Modal title={editing.name ? 'Edit warehouse' : 'New warehouse'} onClose={() => setEditing(null)}>
          <Field label="Name" required><input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
          <Field label="Code" required><input className={inputCls} value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></Field>
          <Field label="Address"><input className={inputCls} value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></Field>
          <Field label="City"><input className={inputCls} value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></Field>
          <div className="flex gap-4 text-sm mb-3">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={editing.isPrimary} onChange={(e) => setEditing({ ...editing, isPrimary: e.target.checked })} /> Primary</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={editing.status === 'ACTIVE'} onChange={(e) => setEditing({ ...editing, status: e.target.checked ? 'ACTIVE' : 'INACTIVE' })} /> Active</label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => { upsert(editing); setEditing(null) }} disabled={!editing.name || !editing.code}>Save</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

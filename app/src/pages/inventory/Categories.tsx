import React, { useState } from 'react'
import { COLLECTIONS, genId, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, EmptyState, Field, inputCls, Modal, PageHeader, Select } from '../../components/ui'
import type { Category, Product } from '../../lib/types'

export default function Categories() {
  const { items, upsert, remove } = useCollection<Category>(COLLECTIONS.categories)
  const { can } = useAuth()
  const products = getAll<Product>(COLLECTIONS.products)
  const [editing, setEditing] = useState<Category | null>(null)

  const parents = items.filter((c) => !c.parentId)
  const countFor = (catId: string) => {
    const childIds = items.filter((c) => c.parentId === catId).map((c) => c.id)
    return products.filter((p) => p.categoryId === catId || childIds.includes(p.categoryId)).length
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle={`${parents.length} top-level · ${items.length - parents.length} sub-categories`}
        actions={can('inventory', 'create') && <Button onClick={() => setEditing({ id: genId('cat'), name: '', parentId: null, hsn: '', createdAt: new Date().toISOString() })}>+ New category</Button>}
      />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {parents.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">{p.name}</p>
                <p className="text-xs text-slate-400">HSN {p.hsn} · {countFor(p.id)} products</p>
              </div>
              {can('inventory', 'edit') && <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(p)}>Edit</button>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {items.filter((c) => c.parentId === p.id).map((c) => (
                <button key={c.id} onClick={() => can('inventory', 'edit') && setEditing(c)} className="text-xs bg-slate-100 hover:bg-slate-200 rounded-full px-2.5 py-1 text-slate-600">
                  {c.name} · {countFor(c.id)}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
      {items.length === 0 && <EmptyState title="No categories yet" />}

      {editing && (
        <Modal title={editing.name ? 'Edit category' : 'New category'} onClose={() => setEditing(null)}>
          <Field label="Name" required><input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
          <Field label="Parent category"><Select value={editing.parentId ?? ''} onChange={(v) => setEditing({ ...editing, parentId: v || null })}><option value="">— none (top level)</option>{parents.filter((p) => p.id !== editing.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="HSN code"><input className={inputCls} value={editing.hsn} onChange={(e) => setEditing({ ...editing, hsn: e.target.value })} /></Field>
          <div className="flex justify-between mt-2">
            {editing.name && can('inventory', 'delete') && countFor(editing.id) === 0 ? (
              <Button variant="danger" size="sm" onClick={() => { remove(editing.id); setEditing(null) }}>Delete</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => { upsert(editing); setEditing(null) }} disabled={!editing.name}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

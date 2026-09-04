import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { COLLECTIONS, genId, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { categoryPath, stockForProduct } from '../../lib/selectors'
import {
  Badge,
  Button,
  Card,
  currency,
  EmptyState,
  Field,
  inputCls,
  Modal,
  PageHeader,
  Select,
  StatusBadge,
  Table
} from '../../components/ui'
import type { Category, Product, Supplier } from '../../lib/types'

const UNITS: Product['unit'][] = ['PCS', 'BOX', 'KG', 'LTR', 'MTR', 'PKT', 'SET', 'DOZ']
const blank = (): Product => ({
  id: genId('prd'),
  name: '',
  sku: '',
  barcode: '',
  categoryId: '',
  brand: '',
  hsn: '',
  unit: 'PCS',
  gstRate: 18,
  costPrice: 0,
  sellingPrice: 0,
  mrp: 0,
  reorderLevel: 20,
  trackBatches: false,
  trackSerials: false,
  hasVariants: false,
  variants: [],
  primarySupplierId: '',
  status: 'ACTIVE',
  createdAt: new Date().toISOString()
})

export default function Products() {
  const { items, upsert } = useCollection<Product>(COLLECTIONS.products)
  const { can, user } = useAuth()
  const categories = getAll<Category>(COLLECTIONS.categories)
  const suppliers = getAll<Supplier>(COLLECTIONS.suppliers)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)

  const parents = categories.filter((c) => !c.parentId)

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (q && !`${p.name} ${p.sku} ${p.brand} ${p.barcode}`.toLowerCase().includes(q.toLowerCase())) return false
      if (cat) {
        const c = categories.find((x) => x.id === p.categoryId)
        if (!(p.categoryId === cat || c?.parentId === cat)) return false
      }
      if (status && p.status !== status) return false
      return true
    })
  }, [items, q, cat, status, categories])

  const save = () => {
    if (!editing) return
    upsert(editing)
    logAudit(user, 'Inventory', editing.name ? 'PRODUCT_SAVED' : 'PRODUCT_CREATED', editing.name || editing.sku)
    setEditing(null)
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${items.length} SKUs across ${parents.length} categories`}
        actions={can('inventory', 'create') && <Button onClick={() => setEditing(blank())}>+ New product</Button>}
      />

      <Card className="p-3 mb-4 flex flex-wrap gap-2 items-center">
        <input className={inputCls + ' max-w-xs'} placeholder="Search name / SKU / barcode…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={cat} onChange={setCat} className="max-w-[200px]">
          <option value="">All categories</option>
          {parents.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select value={status} onChange={setStatus} className="max-w-[160px]">
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="DISCONTINUED">Discontinued</option>
        </Select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} shown</span>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="No products match" />
        ) : (
          <Table columns={['Product', 'Category', 'Unit', 'Cost', 'Selling', 'In stock', 'GST', 'Status', '']}>
            {filtered.slice(0, 200).map((p) => {
              const st = stockForProduct(p.id).total
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    <Link to={`/products/${p.id}`} className="font-medium text-slate-800 hover:text-brand-600">{p.name}</Link>
                    <div className="text-xs text-slate-400">{p.sku}{p.hasVariants && ' · variants'}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs">{categoryPath(p.categoryId)}</td>
                  <td className="py-2.5 px-3 text-slate-500">{p.unit}</td>
                  <td className="py-2.5 px-3">{currency(p.costPrice)}</td>
                  <td className="py-2.5 px-3">{currency(p.sellingPrice)}</td>
                  <td className={`py-2.5 px-3 font-medium ${st <= p.reorderLevel ? 'text-amber-600' : 'text-slate-700'}`}>{st}</td>
                  <td className="py-2.5 px-3 text-slate-500">{p.gstRate}%</td>
                  <td className="py-2.5 px-3"><StatusBadge status={p.status} /></td>
                  <td className="py-2.5 px-3 text-right">
                    {can('inventory', 'edit') && (
                      <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(p)}>Edit</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
        {filtered.length > 200 && <p className="text-xs text-slate-400 p-3">Showing first 200 of {filtered.length}.</p>}
      </Card>

      {editing && (
        <Modal title={editing.name ? 'Edit product' : 'New product'} onClose={() => setEditing(null)} wide>
          <div className="grid sm:grid-cols-2 gap-x-4">
            <Field label="Name" required><input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Brand"><input className={inputCls} value={editing.brand} onChange={(e) => setEditing({ ...editing, brand: e.target.value })} /></Field>
            <Field label="SKU" required><input className={inputCls} value={editing.sku} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} /></Field>
            <Field label="Barcode"><input className={inputCls} value={editing.barcode} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} /></Field>
            <Field label="Category" required>
              <Select value={editing.categoryId} onChange={(v) => setEditing({ ...editing, categoryId: v })}>
                <option value="">Select…</option>
                {categories.filter((c) => c.parentId).map((c) => (
                  <option key={c.id} value={c.id}>{categoryPath(c.id)}</option>
                ))}
              </Select>
            </Field>
            <Field label="HSN"><input className={inputCls} value={editing.hsn} onChange={(e) => setEditing({ ...editing, hsn: e.target.value })} /></Field>
            <Field label="Unit">
              <Select value={editing.unit} onChange={(v) => setEditing({ ...editing, unit: v as Product['unit'] })}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </Select>
            </Field>
            <Field label="GST rate %">
              <Select value={String(editing.gstRate)} onChange={(v) => setEditing({ ...editing, gstRate: Number(v) })}>
                {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
              </Select>
            </Field>
            <Field label="Cost price"><input type="number" className={inputCls} value={editing.costPrice} onChange={(e) => setEditing({ ...editing, costPrice: Number(e.target.value) })} /></Field>
            <Field label="Selling price"><input type="number" className={inputCls} value={editing.sellingPrice} onChange={(e) => setEditing({ ...editing, sellingPrice: Number(e.target.value) })} /></Field>
            <Field label="MRP"><input type="number" className={inputCls} value={editing.mrp} onChange={(e) => setEditing({ ...editing, mrp: Number(e.target.value) })} /></Field>
            <Field label="Reorder level"><input type="number" className={inputCls} value={editing.reorderLevel} onChange={(e) => setEditing({ ...editing, reorderLevel: Number(e.target.value) })} /></Field>
            <Field label="Primary supplier">
              <Select value={editing.primarySupplierId} onChange={(v) => setEditing({ ...editing, primarySupplierId: v })}>
                <option value="">—</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={editing.status} onChange={(v) => setEditing({ ...editing, status: v as Product['status'] })}>
                <option value="ACTIVE">Active</option>
                <option value="DISCONTINUED">Discontinued</option>
              </Select>
            </Field>
          </div>
          <div className="flex gap-3 text-sm mt-1 mb-3">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={editing.trackBatches} onChange={(e) => setEditing({ ...editing, trackBatches: e.target.checked })} /> Track batches / expiry</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={editing.trackSerials} onChange={(e) => setEditing({ ...editing, trackSerials: e.target.checked })} /> Track serial numbers</label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={!editing.name || !editing.sku || !editing.categoryId}>Save product</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

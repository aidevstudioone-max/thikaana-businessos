import React, { useState } from 'react'
import { COLLECTIONS, genId, getAll, saveAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { productName, warehouseName } from '../../lib/selectors'
import { Button, Card, EmptyState, Field, fmtDate, inputCls, Modal, PageHeader, Select, StatusBadge, Table } from '../../components/ui'
import type { Product, StockLevel, StockMove, StockTransfer, Warehouse } from '../../lib/types'

export default function Transfers() {
  const { items, upsert, setItems } = useCollection<StockTransfer>(COLLECTIONS.stockTransfers)
  const { user, can } = useAuth()
  const warehouses = getAll<Warehouse>(COLLECTIONS.warehouses)
  const products = getAll<Product>(COLLECTIONS.products).filter((p) => p.status === 'ACTIVE')
  const [draft, setDraft] = useState<StockTransfer | null>(null)

  const newDraft = (): StockTransfer => ({
    id: genId('tr'),
    transferNo: `ST/TR/${String(items.length + 1).padStart(4, '0')}`,
    fromWarehouseId: warehouses[0]?.id ?? '',
    toWarehouseId: warehouses[1]?.id ?? '',
    date: new Date().toISOString().slice(0, 10),
    status: 'DRAFT',
    lines: [{ productId: '', qty: 0 }],
    note: '',
    createdByUserId: user?.id ?? 'system',
    createdAt: new Date().toISOString()
  })

  const complete = (t: StockTransfer) => {
    const levels = getAll<StockLevel>(COLLECTIONS.stockLevels)
    const moves = getAll<StockMove>(COLLECTIONS.stockMoves)
    const adj = (pid: string, wid: string, delta: number) => {
      let lv = levels.find((l) => l.productId === pid && l.warehouseId === wid)
      if (!lv) { lv = { id: genId('lvl'), productId: pid, warehouseId: wid, onHand: 0, reserved: 0 }; levels.push(lv) }
      lv.onHand = Math.max(0, lv.onHand + delta)
      moves.push({ id: genId('mv'), ts: new Date().toISOString(), productId: pid, warehouseId: wid, type: delta < 0 ? 'TRANSFER_OUT' : 'TRANSFER_IN', qty: delta, balanceAfter: lv.onHand, refType: 'Transfer', refId: t.id, refLabel: t.transferNo, userId: user?.id ?? 'system', userName: user?.name ?? 'System' })
    }
    for (const l of t.lines) {
      if (!l.productId || l.qty <= 0) continue
      adj(l.productId, t.fromWarehouseId, -l.qty)
      adj(l.productId, t.toWarehouseId, l.qty)
    }
    saveAll(COLLECTIONS.stockLevels, levels)
    saveAll(COLLECTIONS.stockMoves, moves)
    const next = items.map((x) => (x.id === t.id ? { ...t, status: 'COMPLETED' as const } : x))
    setItems(next)
    saveAll(COLLECTIONS.stockTransfers, next)
    logAudit(user, 'Warehouses', 'TRANSFER_COMPLETED', t.transferNo)
  }

  return (
    <div>
      <PageHeader
        title="Stock Transfers"
        subtitle="Move stock between warehouses. Completing a transfer posts matched OUT / IN movements."
        actions={can('warehouses', 'create') && <Button onClick={() => setDraft(newDraft())}>+ New transfer</Button>}
      />
      <Card>
        {items.length === 0 ? <EmptyState title="No transfers yet" subtitle="Create one to rebalance stock between locations." /> : (
          <Table columns={['Transfer', 'Date', 'From', 'To', 'Items', 'Status', '']}>
            {items.slice().reverse().map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium">{t.transferNo}</td>
                <td className="py-2.5 px-3 text-slate-500">{fmtDate(t.date)}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{warehouseName(t.fromWarehouseId)}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{warehouseName(t.toWarehouseId)}</td>
                <td className="py-2.5 px-3">{t.lines.filter((l) => l.productId).length}</td>
                <td className="py-2.5 px-3"><StatusBadge status={t.status} /></td>
                <td className="py-2.5 px-3 text-right">
                  {t.status !== 'COMPLETED' && can('warehouses', 'edit') && (
                    <button className="text-xs text-brand-600 hover:underline" onClick={() => complete(t)}>Complete →</button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {draft && (
        <Modal title="New stock transfer" onClose={() => setDraft(null)} wide>
          <div className="grid sm:grid-cols-2 gap-x-4">
            <Field label="From warehouse"><Select value={draft.fromWarehouseId} onChange={(v) => setDraft({ ...draft, fromWarehouseId: v })}>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
            <Field label="To warehouse"><Select value={draft.toWarehouseId} onChange={(v) => setDraft({ ...draft, toWarehouseId: v })}>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
          </div>
          <p className="text-xs font-medium text-slate-500 mb-1">Lines</p>
          {draft.lines.map((l, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Select value={l.productId} onChange={(v) => setDraft({ ...draft, lines: draft.lines.map((x, xi) => (xi === i ? { ...x, productId: v } : x)) })} className="flex-1"><option value="">Product…</option>{products.slice(0, 300).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
              <input type="number" className={inputCls + ' w-24'} value={l.qty} onChange={(e) => setDraft({ ...draft, lines: draft.lines.map((x, xi) => (xi === i ? { ...x, qty: Number(e.target.value) } : x)) })} />
            </div>
          ))}
          <button className="text-xs text-brand-600 hover:underline mb-3" onClick={() => setDraft({ ...draft, lines: [...draft.lines, { productId: '', qty: 0 }] })}>+ Add line</button>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={() => { upsert(draft); setDraft(null) }} disabled={draft.fromWarehouseId === draft.toWarehouseId}>Save draft</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

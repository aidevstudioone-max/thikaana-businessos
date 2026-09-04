import React, { useState } from 'react'
import { COLLECTIONS, genId, getAll, saveAll } from '../../lib/db'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { Button, Card, Field, inputCls, PageHeader, Select, Table, Toast } from '../../components/ui'
import type { Product, StockLevel, StockMove, Warehouse } from '../../lib/types'

export default function StockAdjust() {
  const { user } = useAuth()
  const products = getAll<Product>(COLLECTIONS.products).filter((p) => p.status === 'ACTIVE')
  const warehouses = getAll<Warehouse>(COLLECTIONS.warehouses)
  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '')
  const [mode, setMode] = useState<'SET' | 'DELTA'>('DELTA')
  const [value, setValue] = useState(0)
  const [reason, setReason] = useState('Cycle count correction')
  const [msg, setMsg] = useState('')
  const [recent, setRecent] = useState<StockMove[]>(() =>
    getAll<StockMove>(COLLECTIONS.stockMoves).filter((m) => m.type === 'ADJUSTMENT').slice(-8).reverse()
  )

  const currentOnHand = () => {
    const lv = getAll<StockLevel>(COLLECTIONS.stockLevels).find((l) => l.productId === productId && l.warehouseId === warehouseId)
    return lv?.onHand ?? 0
  }

  const apply = () => {
    if (!productId || !warehouseId) return
    const levels = getAll<StockLevel>(COLLECTIONS.stockLevels)
    let lv = levels.find((l) => l.productId === productId && l.warehouseId === warehouseId)
    if (!lv) {
      lv = { id: genId('lvl'), productId, warehouseId, onHand: 0, reserved: 0 }
      levels.push(lv)
    }
    const before = lv.onHand
    const after = mode === 'SET' ? value : before + value
    if (after < 0) {
      setMsg('Adjustment would make stock negative.')
      return
    }
    lv.onHand = after
    saveAll(COLLECTIONS.stockLevels, levels)
    const moves = getAll<StockMove>(COLLECTIONS.stockMoves)
    const move: StockMove = {
      id: genId('mv'),
      ts: new Date().toISOString(),
      productId,
      warehouseId,
      type: 'ADJUSTMENT',
      qty: after - before,
      balanceAfter: after,
      refType: 'Adjustment',
      refLabel: reason,
      reason,
      userId: user?.id ?? 'system',
      userName: user?.name ?? 'System'
    }
    moves.push(move)
    saveAll(COLLECTIONS.stockMoves, moves)
    logAudit(user, 'Inventory', 'STOCK_ADJUSTED', products.find((p) => p.id === productId)?.name ?? '', { detail: `${before} → ${after} (${reason})` })
    setRecent([move, ...recent].slice(0, 8))
    setValue(0)
    setMsg(`Stock updated: ${before} → ${after}`)
  }

  return (
    <div>
      <PageHeader title="Stock Adjustment" subtitle="Correct on-hand quantities after a physical count, damage or write-off. Every change is logged." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <Field label="Product" required>
            <Select value={productId} onChange={setProductId}><option value="">Select product…</option>{products.slice(0, 400).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</Select>
          </Field>
          <Field label="Warehouse" required>
            <Select value={warehouseId} onChange={setWarehouseId}>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
          </Field>
          {productId && <p className="text-sm text-slate-500 -mt-1 mb-3">Current on hand: <b className="text-slate-800">{currentOnHand()}</b></p>}
          <Field label="Adjustment type">
            <Select value={mode} onChange={(v) => setMode(v as 'SET' | 'DELTA')}><option value="DELTA">Add / remove (±)</option><option value="SET">Set exact quantity</option></Select>
          </Field>
          <Field label={mode === 'SET' ? 'New quantity' : 'Change (use − for removal)'} required>
            <input type="number" className={inputCls} value={value} onChange={(e) => setValue(Number(e.target.value))} />
          </Field>
          <Field label="Reason" required>
            <Select value={reason} onChange={setReason}>{['Cycle count correction', 'Damaged goods write-off', 'Expired stock removal', 'Theft / shrinkage', 'Found stock', 'Sample / marketing use'].map((r) => <option key={r}>{r}</option>)}</Select>
          </Field>
          <Button onClick={apply} disabled={!productId}>Apply adjustment</Button>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Recent adjustments</h3>
          <Table columns={['Product', 'Qty', 'Balance', 'Reason']}>
            {recent.map((m) => (
              <tr key={m.id}>
                <td className="py-2 px-3 text-slate-700">{getAll<Product>(COLLECTIONS.products).find((p) => p.id === m.productId)?.name}</td>
                <td className={`py-2 px-3 font-medium ${m.qty < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{m.qty > 0 ? '+' : ''}{m.qty}</td>
                <td className="py-2 px-3">{m.balanceAfter}</td>
                <td className="py-2 px-3 text-xs text-slate-500">{m.reason}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
      {msg && <Toast message={msg} onClose={() => setMsg('')} />}
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { COLLECTIONS, getAll } from '../../lib/db'
import { productName, warehouseName } from '../../lib/selectors'
import { Card, EmptyState, fmtDateTime, inputCls, PageHeader, Select, StatusBadge, Table } from '../../components/ui'
import type { StockMove, Warehouse } from '../../lib/types'

export default function StockLedger() {
  const moves = getAll<StockMove>(COLLECTIONS.stockMoves)
  const warehouses = getAll<Warehouse>(COLLECTIONS.warehouses)
  const [q, setQ] = useState('')
  const [wh, setWh] = useState('')
  const [type, setType] = useState('')

  const filtered = useMemo(() => {
    return [...moves]
      .reverse()
      .filter((m) => {
        if (wh && m.warehouseId !== wh) return false
        if (type && m.type !== type) return false
        if (q && !`${productName(m.productId)} ${m.refLabel ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false
        return true
      })
      .slice(0, 300)
  }, [moves, q, wh, type])

  return (
    <div>
      <PageHeader title="Stock Ledger" subtitle="Every stock movement — opening, purchases, sales, transfers and adjustments." />
      <Card className="p-3 mb-4 flex flex-wrap gap-2">
        <input className={inputCls + ' max-w-xs'} placeholder="Search product / reference…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={wh} onChange={setWh} className="max-w-[220px]"><option value="">All warehouses</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
        <Select value={type} onChange={setType} className="max-w-[170px]"><option value="">All types</option>{['OPENING', 'PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'RETURN_IN', 'RETURN_OUT'].map((t) => <option key={t}>{t}</option>)}</Select>
      </Card>
      <Card>
        {filtered.length === 0 ? <EmptyState title="No movements" /> : (
          <Table columns={['When', 'Product', 'Type', 'Warehouse', 'Qty', 'Balance', 'Reference', 'By']}>
            {filtered.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="py-2 px-3 text-xs text-slate-500">{fmtDateTime(m.ts)}</td>
                <td className="py-2 px-3 text-slate-800">{productName(m.productId)}</td>
                <td className="py-2 px-3"><StatusBadge status={m.type} /></td>
                <td className="py-2 px-3 text-slate-500 text-xs">{warehouseName(m.warehouseId)}</td>
                <td className={`py-2 px-3 font-medium ${m.qty < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{m.qty > 0 ? '+' : ''}{m.qty}</td>
                <td className="py-2 px-3">{m.balanceAfter}</td>
                <td className="py-2 px-3 text-xs text-slate-500">{m.refLabel ?? m.reason ?? '—'}</td>
                <td className="py-2 px-3 text-xs text-slate-400">{m.userName}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

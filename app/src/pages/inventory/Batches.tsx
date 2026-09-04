import React, { useMemo, useState } from 'react'
import { COLLECTIONS, getAll } from '../../lib/db'
import { productName, warehouseName } from '../../lib/selectors'
import { Badge, Card, EmptyState, inputCls, PageHeader, Select, StatCard, Table } from '../../components/ui'
import type { Batch } from '../../lib/types'

function daysToExpiry(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

export default function Batches() {
  const batches = getAll<Batch>(COLLECTIONS.batches)
  const [q, setQ] = useState('')
  const [bucket, setBucket] = useState('')

  const rows = useMemo(() => {
    return batches
      .map((b) => ({ ...b, dte: daysToExpiry(b.expiryDate) }))
      .filter((b) => {
        if (q && !productName(b.productId).toLowerCase().includes(q.toLowerCase()) && !b.batchNo.toLowerCase().includes(q.toLowerCase())) return false
        if (bucket === 'expired' && b.dte >= 0) return false
        if (bucket === 'soon' && !(b.dte >= 0 && b.dte < 45)) return false
        if (bucket === 'ok' && b.dte < 45) return false
        return true
      })
      .sort((a, b) => a.dte - b.dte)
  }, [batches, q, bucket])

  const expired = batches.filter((b) => daysToExpiry(b.expiryDate) < 0).length
  const soon = batches.filter((b) => { const d = daysToExpiry(b.expiryDate); return d >= 0 && d < 45 }).length

  return (
    <div>
      <PageHeader title="Batches & Expiry" subtitle="FEFO view of every tracked batch across warehouses." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Tracked batches" value={String(batches.length)} />
        <StatCard label="Expiring < 45 days" value={String(soon)} tone={soon ? 'warn' : 'default'} />
        <StatCard label="Expired on shelf" value={String(expired)} tone={expired ? 'danger' : 'default'} />
        <StatCard label="Units at risk" value={String(batches.filter((b) => daysToExpiry(b.expiryDate) < 45).reduce((s, b) => s + b.qty, 0))} />
      </div>
      <Card className="p-3 mb-4 flex flex-wrap gap-2">
        <input className={inputCls + ' max-w-xs'} placeholder="Search product / batch no…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={bucket} onChange={setBucket} className="max-w-[200px]"><option value="">All batches</option><option value="expired">Expired</option><option value="soon">Expiring soon</option><option value="ok">Healthy</option></Select>
      </Card>
      <Card>
        {rows.length === 0 ? <EmptyState title="No batches match" /> : (
          <Table columns={['Batch no', 'Product', 'Warehouse', 'Qty', 'Mfg', 'Expiry', 'Status']}>
            {rows.slice(0, 250).map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="py-2 px-3 font-medium">{b.batchNo}</td>
                <td className="py-2 px-3 text-slate-700">{productName(b.productId)}</td>
                <td className="py-2 px-3 text-slate-500 text-xs">{warehouseName(b.warehouseId)}</td>
                <td className="py-2 px-3">{b.qty}</td>
                <td className="py-2 px-3 text-slate-500">{b.mfgDate}</td>
                <td className="py-2 px-3">{b.expiryDate}</td>
                <td className="py-2 px-3">
                  {b.dte < 0 ? <Badge tone="red">Expired {Math.abs(b.dte)}d ago</Badge> : b.dte < 45 ? <Badge tone="amber">{b.dte}d left</Badge> : <Badge tone="green">{b.dte}d left</Badge>}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { COLLECTIONS, genId, getAll, saveAll } from '../../lib/db'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { productName, supplierName, warehouseName } from '../../lib/selectors'
import { Button, Card, currency, EmptyState, fmtDate, inputCls, PageHeader, StatusBadge, Table, Toast } from '../../components/ui'
import type { PurchaseOrder, StockLevel, StockMove, Supplier, SupplierPayment } from '../../lib/types'

export default function PurchaseOrderDetail() {
  const { id } = useParams()
  const { user, can } = useAuth()
  const [po, setPo] = useState<PurchaseOrder | undefined>(() => getAll<PurchaseOrder>(COLLECTIONS.purchaseOrders).find((p) => p.id === id))
  const [msg, setMsg] = useState('')
  const [payAmt, setPayAmt] = useState(0)
  if (!po) return <EmptyState title="Purchase order not found" />

  const supplier = getAll<Supplier>(COLLECTIONS.suppliers).find((s) => s.id === po.supplierId)
  const save = (next: PurchaseOrder) => {
    const all = getAll<PurchaseOrder>(COLLECTIONS.purchaseOrders).map((p) => (p.id === next.id ? next : p))
    saveAll(COLLECTIONS.purchaseOrders, all)
    setPo(next)
  }

  const receiveAll = () => {
    const levels = getAll<StockLevel>(COLLECTIONS.stockLevels)
    const moves = getAll<StockMove>(COLLECTIONS.stockMoves)
    for (const l of po.lines) {
      const pending = l.qty - l.receivedQty
      if (pending <= 0) continue
      let lv = levels.find((x) => x.productId === l.productId && x.warehouseId === po.warehouseId)
      if (!lv) { lv = { id: genId('lvl'), productId: l.productId, warehouseId: po.warehouseId, onHand: 0, reserved: 0 }; levels.push(lv) }
      lv.onHand += pending
      moves.push({ id: genId('mv'), ts: new Date().toISOString(), productId: l.productId, warehouseId: po.warehouseId, type: 'PURCHASE', qty: pending, balanceAfter: lv.onHand, refType: 'PurchaseOrder', refId: po.id, refLabel: po.poNo, userId: user?.id ?? 'system', userName: user?.name ?? 'System' })
      l.receivedQty = l.qty
    }
    saveAll(COLLECTIONS.stockLevels, levels)
    saveAll(COLLECTIONS.stockMoves, moves)
    save({ ...po, status: 'RECEIVED', lines: [...po.lines] })
    logAudit(user, 'Purchasing', 'PO_RECEIVED', po.poNo)
    setMsg('Goods received — stock updated.')
  }

  const recordPayment = () => {
    if (payAmt <= 0) return
    const pays = getAll<SupplierPayment>(COLLECTIONS.supplierPayments)
    pays.push({ id: genId('spay'), paymentNo: `ST/SP/${String(pays.length + 1).padStart(4, '0')}`, supplierId: po.supplierId, purchaseOrderId: po.id, amount: payAmt, mode: 'Bank Transfer', reference: `TXN${Math.floor(Math.random() * 900000 + 100000)}`, date: new Date().toISOString().slice(0, 10), note: '', createdByUserId: user?.id ?? 'system' })
    saveAll(COLLECTIONS.supplierPayments, pays)
    save({ ...po, amountPaid: po.amountPaid + payAmt })
    logAudit(user, 'Purchasing', 'SUPPLIER_PAID', po.poNo, { detail: currency(payAmt) })
    setPayAmt(0)
    setMsg('Payment recorded.')
  }

  const due = po.total - po.amountPaid

  return (
    <div>
      <PageHeader
        title={po.poNo}
        subtitle={`${supplierName(po.supplierId)} · ${warehouseName(po.warehouseId)}`}
        actions={<Link to="/purchase-orders" className="text-sm text-brand-600 hover:underline">← All POs</Link>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Status</p><div className="mt-1"><StatusBadge status={po.status} /></div></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Order / Expected</p><p className="text-sm font-semibold">{fmtDate(po.orderDate)} → {fmtDate(po.expectedDate)}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Total</p><p className="text-xl font-bold">{currency(po.total)}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Balance due</p><p className={`text-xl font-bold ${due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{currency(Math.max(0, due))}</p></Card>
      </div>

      <Card className="mb-4">
        <Table columns={['Product', 'Ordered', 'Received', 'Rate', 'GST', 'Line total']}>
          {po.lines.map((l, i) => (
            <tr key={i}>
              <td className="py-2 px-3 text-slate-700">{productName(l.productId)}</td>
              <td className="py-2 px-3">{l.qty}</td>
              <td className="py-2 px-3">{l.receivedQty}{l.receivedQty < l.qty && <span className="text-amber-600"> / {l.qty}</span>}</td>
              <td className="py-2 px-3">{currency(l.rate)}</td>
              <td className="py-2 px-3 text-slate-500">{l.gstRate}%</td>
              <td className="py-2 px-3">{currency(l.qty * l.rate * (1 + l.gstRate / 100))}</td>
            </tr>
          ))}
        </Table>
      </Card>

      {can('purchasing', 'edit') && (
        <div className="flex flex-wrap gap-3 items-end">
          {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
            <Button onClick={receiveAll}>Receive all &amp; add to stock</Button>
          )}
          {po.status === 'DRAFT' && <Button variant="secondary" onClick={() => save({ ...po, status: 'ORDERED' })}>Mark as ordered</Button>}
          {due > 0 && po.status !== 'CANCELLED' && (
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Record payment</label>
                <input type="number" className={inputCls + ' w-40'} value={payAmt} onChange={(e) => setPayAmt(Number(e.target.value))} placeholder={String(due)} />
              </div>
              <Button variant="secondary" onClick={recordPayment}>Pay</Button>
            </div>
          )}
        </div>
      )}
      {msg && <Toast message={msg} onClose={() => setMsg('')} />}
    </div>
  )
}

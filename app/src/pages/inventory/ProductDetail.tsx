import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { COLLECTIONS, getAll } from '../../lib/db'
import { categoryPath, supplierName, warehouseName } from '../../lib/selectors'
import { Badge, Card, currency, EmptyState, fmtDateTime, PageHeader, StatusBadge, Table } from '../../components/ui'
import type { Batch, Invoice, Product, StockLevel, StockMove } from '../../lib/types'

export default function ProductDetail() {
  const { id } = useParams()
  const product = getAll<Product>(COLLECTIONS.products).find((p) => p.id === id)
  if (!product) return <EmptyState title="Product not found" />

  const levels = getAll<StockLevel>(COLLECTIONS.stockLevels).filter((l) => l.productId === id)
  const moves = getAll<StockMove>(COLLECTIONS.stockMoves).filter((m) => m.productId === id).slice(-40).reverse()
  const batches = getAll<Batch>(COLLECTIONS.batches).filter((b) => b.productId === id)
  const invoices = getAll<Invoice>(COLLECTIONS.invoices)
  const soldQty = invoices.reduce((s, inv) => s + inv.lines.filter((l) => l.productId === id).reduce((q, l) => q + l.qty, 0), 0)
  const totalStock = levels.reduce((s, l) => s + l.onHand, 0)

  return (
    <div>
      <PageHeader
        title={product.name}
        subtitle={`${product.sku} · ${product.brand} · ${categoryPath(product.categoryId)}`}
        actions={<Link to="/products" className="text-sm text-brand-600 hover:underline">← All products</Link>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">In stock</p><p className="text-xl font-bold">{totalStock} {product.unit}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Reorder at</p><p className="text-xl font-bold">{product.reorderLevel}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Cost / Selling</p><p className="text-sm font-bold">{currency(product.costPrice)} / {currency(product.sellingPrice)}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Units sold (12mo)</p><p className="text-xl font-bold">{soldQty}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Supplier</p><p className="text-sm font-bold truncate">{supplierName(product.primarySupplierId)}</p></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Stock by warehouse</h3>
          <Table columns={['Warehouse', 'On hand', 'Reserved']}>
            {levels.map((l) => (
              <tr key={l.id}>
                <td className="py-2 px-3">{warehouseName(l.warehouseId)}</td>
                <td className="py-2 px-3 font-medium">{l.onHand}</td>
                <td className="py-2 px-3 text-slate-500">{l.reserved}</td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Pricing & tax</h3>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-slate-500">MRP</dt><dd>{currency(product.mrp)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">GST rate</dt><dd>{product.gstRate}%</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">HSN</dt><dd>{product.hsn}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Margin</dt><dd>{Math.round(((product.sellingPrice - product.costPrice) / product.costPrice) * 100)}%</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Tracking</dt><dd className="flex gap-1">{product.trackBatches && <Badge tone="blue">Batch</Badge>}{product.trackSerials && <Badge tone="purple">Serial</Badge>}{!product.trackBatches && !product.trackSerials && '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={product.status} /></dd></div>
          </dl>
        </Card>
      </div>

      {product.hasVariants && product.variants.length > 0 && (
        <Card className="p-4 mt-4">
          <h3 className="font-semibold text-slate-800 mb-3">Variants</h3>
          <Table columns={['SKU', 'Attributes', 'Cost', 'Selling', 'MRP']}>
            {product.variants.map((v) => (
              <tr key={v.id}>
                <td className="py-2 px-3">{v.sku}</td>
                <td className="py-2 px-3 text-slate-500">{Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' · ')}</td>
                <td className="py-2 px-3">{currency(v.costPrice)}</td>
                <td className="py-2 px-3">{currency(v.sellingPrice)}</td>
                <td className="py-2 px-3">{currency(v.mrp)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {batches.length > 0 && (
        <Card className="p-4 mt-4">
          <h3 className="font-semibold text-slate-800 mb-3">Batches</h3>
          <Table columns={['Batch no', 'Warehouse', 'Qty', 'Mfg', 'Expiry']}>
            {batches.map((b) => (
              <tr key={b.id}>
                <td className="py-2 px-3">{b.batchNo}</td>
                <td className="py-2 px-3 text-slate-500">{warehouseName(b.warehouseId)}</td>
                <td className="py-2 px-3">{b.qty}</td>
                <td className="py-2 px-3 text-slate-500">{b.mfgDate}</td>
                <td className="py-2 px-3">{b.expiryDate}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Card className="p-4 mt-4">
        <h3 className="font-semibold text-slate-800 mb-3">Recent stock movement</h3>
        {moves.length === 0 ? (
          <EmptyState title="No movement recorded" />
        ) : (
          <Table columns={['When', 'Type', 'Warehouse', 'Qty', 'Balance', 'Reference']}>
            {moves.map((m) => (
              <tr key={m.id}>
                <td className="py-2 px-3 text-slate-500 text-xs">{fmtDateTime(m.ts)}</td>
                <td className="py-2 px-3"><StatusBadge status={m.type} /></td>
                <td className="py-2 px-3 text-slate-500">{warehouseName(m.warehouseId)}</td>
                <td className={`py-2 px-3 font-medium ${m.qty < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{m.qty > 0 ? '+' : ''}{m.qty}</td>
                <td className="py-2 px-3">{m.balanceAfter}</td>
                <td className="py-2 px-3 text-slate-500 text-xs">{m.refLabel ?? '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

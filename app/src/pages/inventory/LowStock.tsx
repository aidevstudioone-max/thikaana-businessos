import React from 'react'
import { Link } from 'react-router-dom'
import { lowStockItems, supplierName } from '../../lib/selectors'
import { Badge, Card, currency, EmptyState, PageHeader, Table } from '../../components/ui'

export default function LowStock() {
  const rows = lowStockItems()
  const critical = rows.filter((r) => r.onHand === 0).length

  return (
    <div>
      <PageHeader
        title="Low Stock"
        subtitle={`${rows.length} SKUs at or below their reorder level · ${critical} out of stock`}
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Everything is above its reorder level" />
        ) : (
          <Table columns={['Product', 'On hand', 'Reorder level', 'Shortfall', 'Suggested order', 'Supplier', 'Est. cost']}>
            {rows.map(({ product, onHand }) => {
              const shortfall = product.reorderLevel - onHand
              const suggested = Math.max(product.reorderLevel * 2 - onHand, shortfall)
              return (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    <Link to={`/products/${product.id}`} className="font-medium text-slate-800 hover:text-brand-600">{product.name}</Link>
                    <div className="text-xs text-slate-400">{product.sku}</div>
                  </td>
                  <td className="py-2.5 px-3">{onHand === 0 ? <Badge tone="red">0</Badge> : <span className="font-medium text-amber-600">{onHand}</span>}</td>
                  <td className="py-2.5 px-3 text-slate-500">{product.reorderLevel}</td>
                  <td className="py-2.5 px-3 text-red-600">{shortfall}</td>
                  <td className="py-2.5 px-3 font-medium">{suggested} {product.unit}</td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs">{supplierName(product.primarySupplierId)}</td>
                  <td className="py-2.5 px-3">{currency(suggested * product.costPrice)}</td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>
      <p className="text-xs text-slate-400 mt-3">Turn on <b>AI Demand Forecasting</b> for reorder quantities based on 12-month sales velocity and lead time.</p>
    </div>
  )
}

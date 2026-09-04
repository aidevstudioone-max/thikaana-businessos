import React, { useMemo, useState } from 'react'
import { COLLECTIONS, getAll } from '../../lib/db'
import { currency, currencyK, fmtDate, monthLabel } from '../../lib/format'
import { BarChart, Card, EmptyState, PageHeader, Select, StatCard, StatusBadge, Table } from '../../components/ui'
import type { PlatformInvoice, Workspace } from '../../lib/types'

export default function PlatformBilling() {
  const invoices = getAll<PlatformInvoice>(COLLECTIONS.platformInvoices)
  const workspaces = getAll<Workspace>(COLLECTIONS.workspaces)
  const wsName = (id: string) => workspaces.find((w) => w.id === id)?.companyName ?? '—'
  const [status, setStatus] = useState('')

  const rows = useMemo(() => [...invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)).filter((i) => !status || i.status === status), [invoices, status])
  const collected = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0)
  const due = invoices.filter((i) => i.status !== 'PAID').reduce((s, i) => s + i.amount, 0)

  const byMonth: Record<string, number> = {}
  for (const i of invoices) if (i.status === 'PAID') byMonth[i.period] = (byMonth[i.period] ?? 0) + i.amount
  const chart = Object.entries(byMonth).sort().slice(-8).map(([m, v]) => ({ label: monthLabel(m), value: v }))

  return (
    <div>
      <PageHeader title="Platform Billing" subtitle="Invoices raised to customer workspaces." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Collected" value={currencyK(collected)} tone="good" />
        <StatCard label="Outstanding" value={currencyK(due)} tone={due ? 'warn' : 'default'} />
        <StatCard label="Invoices" value={String(invoices.length)} />
      </div>
      <Card className="p-4 mb-4">
        <h3 className="font-semibold text-slate-800 mb-3">Collected by month</h3>
        <BarChart data={chart} format={(n) => currencyK(n)} height={160} />
      </Card>
      <Card className="p-3 mb-4"><Select value={status} onChange={setStatus} className="max-w-[160px]"><option value="">All statuses</option>{['PAID', 'DUE', 'FAILED'].map((s) => <option key={s}>{s}</option>)}</Select></Card>
      <Card>
        {rows.length === 0 ? <EmptyState title="No invoices" /> : (
          <Table columns={['Invoice', 'Workspace', 'Period', 'Amount', 'Issued', 'Status']}>
            {rows.slice(0, 200).map((i) => (
              <tr key={i.id} className="hover:bg-slate-50">
                <td className="py-2 px-3 font-medium text-xs">{i.invoiceNo}</td>
                <td className="py-2 px-3 text-slate-700">{wsName(i.workspaceId)}</td>
                <td className="py-2 px-3 text-slate-500">{monthLabel(i.period)}</td>
                <td className="py-2 px-3">{currency(i.amount)}</td>
                <td className="py-2 px-3 text-slate-500 text-xs">{fmtDate(i.issuedAt)}</td>
                <td className="py-2 px-3"><StatusBadge status={i.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

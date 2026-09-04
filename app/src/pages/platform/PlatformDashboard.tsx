import React from 'react'
import { Link } from 'react-router-dom'
import { COLLECTIONS, getAll } from '../../lib/db'
import { currency, currencyK } from '../../lib/format'
import { BarChart, Card, PageHeader, StatCard } from '../../components/ui'
import type { PlatformInvoice, SupportTicket, Workspace } from '../../lib/types'

export default function PlatformDashboard() {
  const workspaces = getAll<Workspace>(COLLECTIONS.workspaces)
  const invoices = getAll<PlatformInvoice>(COLLECTIONS.platformInvoices)
  const tickets = getAll<SupportTicket>(COLLECTIONS.supportTickets)

  const active = workspaces.filter((w) => w.status === 'ACTIVE')
  const mrr = active.reduce((s, w) => s + w.mrr, 0)
  const trials = workspaces.filter((w) => w.status === 'TRIAL').length
  const dueInvoices = invoices.filter((i) => i.status !== 'PAID')
  const openTickets = tickets.filter((t) => t.status !== 'RESOLVED').length

  const byPlan = ['Starter', 'Growth', 'Enterprise'].map((p) => ({ label: p, value: workspaces.filter((w) => w.plan === p).length }))

  return (
    <div>
      <PageHeader title="Platform Overview" subtitle="Thikaana BusinessOS — all customer workspaces at a glance." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="MRR" value={currencyK(mrr)} tone="good" hint={`ARR ${currencyK(mrr * 12)}`} />
        <StatCard label="Active workspaces" value={String(active.length)} hint={`${trials} on trial`} />
        <StatCard label="Unpaid invoices" value={String(dueInvoices.length)} tone={dueInvoices.length ? 'warn' : 'default'} />
        <StatCard label="Open tickets" value={String(openTickets)} tone={openTickets ? 'warn' : 'default'} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Workspaces by plan</h3>
          <BarChart data={byPlan} height={160} />
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-slate-800">Newest workspaces</h3><Link to="/platform/workspaces" className="text-xs text-brand-600 hover:underline">All →</Link></div>
          <div className="space-y-2">
            {[...workspaces].sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)).slice(0, 6).map((w) => (
              <div key={w.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 truncate">{w.companyName}</span>
                <span className="text-xs text-slate-400 shrink-0 ml-2">{w.plan} · {currency(w.mrr)}/mo</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { COLLECTIONS, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { fmtDate } from '../../lib/format'
import { Badge, Card, EmptyState, PageHeader, Select, StatCard, StatusBadge, Table } from '../../components/ui'
import type { SupportTicket, Workspace } from '../../lib/types'

export default function Support() {
  const { items, upsert } = useCollection<SupportTicket>(COLLECTIONS.supportTickets)
  const workspaces = getAll<Workspace>(COLLECTIONS.workspaces)
  const wsName = (id: string) => workspaces.find((w) => w.id === id)?.companyName ?? '—'
  const [status, setStatus] = useState('')

  const rows = useMemo(() => [...items].sort((a, b) => b.openedAt.localeCompare(a.openedAt)).filter((t) => !status || t.status === status), [items, status])
  const open = items.filter((t) => t.status === 'OPEN').length
  const high = items.filter((t) => t.priority === 'High' && t.status !== 'RESOLVED').length

  return (
    <div>
      <PageHeader title="Support" subtitle="Tickets raised by customer workspaces." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Open" value={String(open)} tone={open ? 'warn' : 'default'} />
        <StatCard label="In progress" value={String(items.filter((t) => t.status === 'IN_PROGRESS').length)} />
        <StatCard label="High priority open" value={String(high)} tone={high ? 'danger' : 'default'} />
        <StatCard label="Resolved" value={String(items.filter((t) => t.status === 'RESOLVED').length)} tone="good" />
      </div>
      <Card className="p-3 mb-4"><Select value={status} onChange={setStatus} className="max-w-[170px]"><option value="">All statuses</option>{['OPEN', 'IN_PROGRESS', 'RESOLVED'].map((s) => <option key={s}>{s}</option>)}</Select></Card>
      <Card>
        {rows.length === 0 ? <EmptyState title="No tickets" /> : (
          <Table columns={['Ticket', 'Workspace', 'Subject', 'Priority', 'Opened', 'Status', 'Action']}>
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium">{t.ticketNo}</td>
                <td className="py-2.5 px-3 text-slate-700">{wsName(t.workspaceId)}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{t.subject}</td>
                <td className="py-2.5 px-3"><Badge tone={t.priority === 'High' ? 'red' : t.priority === 'Medium' ? 'amber' : 'slate'}>{t.priority}</Badge></td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{fmtDate(t.openedAt)}</td>
                <td className="py-2.5 px-3"><StatusBadge status={t.status} /></td>
                <td className="py-2.5 px-3">
                  <Select value={t.status} onChange={(v) => upsert({ ...t, status: v as SupportTicket['status'] })} className="text-xs !py-1 w-32">
                    {['OPEN', 'IN_PROGRESS', 'RESOLVED'].map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { COLLECTIONS, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { daysUntil } from '../../lib/format'
import { Badge, Card, EmptyState, fmtDate, PageHeader, Select, StatCard, Table } from '../../components/ui'
import type { FollowUp, Lead } from '../../lib/types'

export default function FollowUps() {
  const { items, upsert } = useCollection<FollowUp>(COLLECTIONS.followUps)
  const { can } = useAuth()
  const leads = getAll<Lead>(COLLECTIONS.leads)
  const leadLabel = (id: string) => { const l = leads.find((x) => x.id === id); return l ? l.company || l.name : '—' }
  const [filter, setFilter] = useState('open')

  const rows = useMemo(() => {
    return [...items]
      .filter((f) => (filter === 'open' ? !f.done : filter === 'done' ? f.done : true))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [items, filter])

  const overdue = items.filter((f) => !f.done && daysUntil(f.dueDate) < 0).length
  const today = items.filter((f) => !f.done && daysUntil(f.dueDate) === 0).length

  return (
    <div>
      <PageHeader title="Follow-ups" subtitle="Scheduled touchpoints across the pipeline." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Open" value={String(items.filter((f) => !f.done).length)} />
        <StatCard label="Overdue" value={String(overdue)} tone={overdue ? 'danger' : 'default'} />
        <StatCard label="Due today" value={String(today)} tone={today ? 'warn' : 'default'} />
        <StatCard label="Completed" value={String(items.filter((f) => f.done).length)} tone="good" />
      </div>
      <Card className="p-3 mb-4"><Select value={filter} onChange={setFilter} className="max-w-[160px]"><option value="open">Open</option><option value="done">Completed</option><option value="all">All</option></Select></Card>
      <Card>
        {rows.length === 0 ? <EmptyState title="Nothing scheduled" /> : (
          <Table columns={['Due', 'Lead', 'Channel', 'Note', 'Status', 'Action']}>
            {rows.slice(0, 200).map((f) => {
              const d = daysUntil(f.dueDate)
              return (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    {f.done ? <span className="text-slate-400 text-xs">{fmtDate(f.dueDate)}</span> : d < 0 ? <Badge tone="red">{Math.abs(d)}d overdue</Badge> : d === 0 ? <Badge tone="amber">Today</Badge> : <span className="text-slate-500 text-xs">in {d}d</span>}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800">{leadLabel(f.leadId)}</td>
                  <td className="py-2.5 px-3 text-slate-500">{f.channel}</td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs">{f.note}</td>
                  <td className="py-2.5 px-3">{f.done ? <Badge tone="green">Done</Badge> : <Badge tone="slate">Open</Badge>}</td>
                  <td className="py-2.5 px-3">
                    {!f.done && can('crm', 'edit') && (
                      <button className="text-xs text-brand-600 hover:underline" onClick={() => upsert({ ...f, done: true })}>Mark done</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>
    </div>
  )
}

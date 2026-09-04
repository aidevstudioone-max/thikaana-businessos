import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { COLLECTIONS, getAll, saveAll } from '../../lib/db'
import { fmtDateTime } from '../../lib/format'
import { Badge, Button, Card, EmptyState, PageHeader } from '../../components/ui'
import type { Notification } from '../../lib/types'

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>(() => getAll<Notification>(COLLECTIONS.notifications).sort((a, b) => b.ts.localeCompare(a.ts)))

  const markAll = () => {
    const next = items.map((n) => ({ ...n, read: true }))
    setItems(next)
    saveAll(COLLECTIONS.notifications, next)
  }
  const toggle = (id: string) => {
    const next = items.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    setItems(next)
    saveAll(COLLECTIONS.notifications, next)
  }

  const tone = (s: string) => (s === 'critical' ? 'red' : s === 'warning' ? 'amber' : 'blue')

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${items.filter((n) => !n.read).length} unread`}
        actions={<Button variant="secondary" onClick={markAll}>Mark all read</Button>}
      />
      <Card>
        {items.length === 0 ? (
          <EmptyState title="All clear" />
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((n) => (
              <div key={n.id} className={`p-4 flex items-start gap-3 ${n.read ? 'opacity-60' : ''}`}>
                <Badge tone={tone(n.severity)}>{n.severity}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                  <p className="text-sm text-slate-500">{n.message}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{fmtDateTime(n.ts)} · via {n.channel}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {n.link && <Link to={n.link} className="text-xs text-brand-600 hover:underline">Open</Link>}
                  <button className="text-xs text-slate-400 hover:text-slate-700" onClick={() => toggle(n.id)}>{n.read ? 'Unread' : 'Read'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

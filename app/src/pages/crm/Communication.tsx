import React, { useState } from 'react'
import { COLLECTIONS, genId, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { fmtDateTime } from '../../lib/format'
import { Badge, Button, Card, EmptyState, Field, inputCls, Modal, PageHeader, Select, StatCard, StatusBadge, Table } from '../../components/ui'
import type { Channel, CommMessage } from '../../lib/types'

const AUDIENCES = ['All active customers', 'Overdue customers', 'Distributors', 'Wholesale customers', 'Gold tier customers', 'Leads — Proposal stage']

export default function Communication() {
  const { items, upsert } = useCollection<CommMessage>(COLLECTIONS.commMessages)
  const { user, can } = useAuth()
  const [compose, setCompose] = useState<CommMessage | null>(null)

  const sent30 = items.filter((m) => Date.now() - new Date(m.ts).getTime() < 30 * 864e5).reduce((s, m) => s + m.recipientCount, 0)
  const byChannel = (c: Channel) => items.filter((m) => m.channel === c).length

  const send = () => {
    if (!compose) return
    upsert({ ...compose, ts: new Date().toISOString(), status: 'SENT', recipientCount: compose.recipientCount || Math.floor(Math.random() * 120 + 20) })
    logAudit(user, 'Communication', 'BROADCAST_SENT', compose.category, { detail: compose.audience })
    setCompose(null)
  }

  return (
    <div>
      <PageHeader
        title="Customer Communication"
        subtitle="WhatsApp, SMS and email broadcasts (simulated in the demo)."
        actions={can('communication', 'create') && <Button onClick={() => setCompose({ id: genId('cm'), ts: new Date().toISOString(), channel: 'whatsapp', category: 'Promotion', audience: AUDIENCES[0], recipientCount: 0, body: '', sentByUserId: user?.id ?? 'system', status: 'QUEUED' })}>+ New broadcast</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Recipients (30d)" value={sent30.toLocaleString('en-IN')} />
        <StatCard label="WhatsApp" value={String(byChannel('whatsapp'))} />
        <StatCard label="SMS" value={String(byChannel('sms'))} />
        <StatCard label="Email" value={String(byChannel('email'))} />
      </div>
      <Card>
        {items.length === 0 ? <EmptyState title="No messages sent" /> : (
          <Table columns={['Sent', 'Channel', 'Category', 'Audience', 'Recipients', 'Message', 'Status']}>
            {[...items].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 150).map((m) => (
              <tr key={m.id} className="hover:bg-slate-50 align-top">
                <td className="py-2.5 px-3 text-xs text-slate-500">{fmtDateTime(m.ts)}</td>
                <td className="py-2.5 px-3"><Badge tone={m.channel === 'whatsapp' ? 'green' : m.channel === 'email' ? 'blue' : 'amber'}>{m.channel}</Badge></td>
                <td className="py-2.5 px-3 text-slate-600 text-xs">{m.category}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{m.audience}</td>
                <td className="py-2.5 px-3">{m.recipientCount}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs max-w-xs">{m.body}</td>
                <td className="py-2.5 px-3"><StatusBadge status={m.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {compose && (
        <Modal title="New broadcast" onClose={() => setCompose(null)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Channel"><Select value={compose.channel} onChange={(v) => setCompose({ ...compose, channel: v as Channel })}>{['whatsapp', 'sms', 'email'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Category"><Select value={compose.category} onChange={(v) => setCompose({ ...compose, category: v as CommMessage['category'] })}>{['Payment Reminder', 'Promotion', 'Order Update', 'Lead Follow-up', 'General'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
          </div>
          <Field label="Audience"><Select value={compose.audience} onChange={(v) => setCompose({ ...compose, audience: v })}>{AUDIENCES.map((a) => <option key={a}>{a}</option>)}</Select></Field>
          <Field label="Message"><textarea className={inputCls} rows={4} value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setCompose(null)}>Cancel</Button><Button onClick={send} disabled={!compose.body}>Send broadcast</Button></div>
        </Modal>
      )}
    </div>
  )
}

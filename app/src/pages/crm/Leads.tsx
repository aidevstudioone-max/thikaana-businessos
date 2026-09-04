import React, { useMemo, useState } from 'react'
import { COLLECTIONS, genId, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { employeeName } from '../../lib/selectors'
import { Badge, Button, Card, currency, currencyK, EmptyState, Field, inputCls, Modal, PageHeader, Select } from '../../components/ui'
import type { Employee, Lead, LeadStage } from '../../lib/types'

const STAGES: LeadStage[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']
const stageTone: Record<string, any> = { NEW: 'blue', CONTACTED: 'blue', QUALIFIED: 'indigo', PROPOSAL: 'purple', NEGOTIATION: 'amber', WON: 'green', LOST: 'red' }

export default function Leads() {
  const { items, upsert } = useCollection<Lead>(COLLECTIONS.leads)
  const { can, user } = useAuth()
  const employees = getAll<Employee>(COLLECTIONS.employees)
  const [editing, setEditing] = useState<Lead | null>(null)

  const board = useMemo(() => {
    const map: Record<string, Lead[]> = {}
    for (const s of STAGES) map[s] = []
    for (const l of items) (map[l.stage] ??= []).push(l)
    return map
  }, [items])

  const openValue = items.filter((l) => !['WON', 'LOST'].includes(l.stage)).reduce((s, l) => s + l.estimatedValue, 0)
  const wonValue = items.filter((l) => l.stage === 'WON').reduce((s, l) => s + l.estimatedValue, 0)
  const winRate = items.filter((l) => ['WON', 'LOST'].includes(l.stage)).length
    ? Math.round((items.filter((l) => l.stage === 'WON').length / items.filter((l) => ['WON', 'LOST'].includes(l.stage)).length) * 100)
    : 0

  const move = (l: Lead, dir: 1 | -1) => {
    const idx = STAGES.indexOf(l.stage)
    const next = STAGES[Math.max(0, Math.min(STAGES.length - 1, idx + dir))]
    upsert({ ...l, stage: next, updatedAt: new Date().toISOString() })
    logAudit(user, 'CRM', 'LEAD_STAGE', l.name, { detail: next })
  }

  return (
    <div>
      <PageHeader
        title="Leads & Pipeline"
        subtitle={`${items.length} leads · ${currencyK(openValue)} open pipeline`}
        actions={can('crm', 'create') && <Button onClick={() => setEditing({ id: genId('lead'), name: '', company: '', phone: '', email: '', source: 'Website', stage: 'NEW', estimatedValue: 50000, ownerEmployeeId: employees[0]?.id ?? '', customerId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })}>+ New lead</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Open pipeline</p><p className="text-xl font-bold">{currencyK(openValue)}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Won value</p><p className="text-xl font-bold text-emerald-600">{currencyK(wonValue)}</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Win rate</p><p className="text-xl font-bold">{winRate}%</p></Card>
        <Card className="p-3"><p className="text-[11px] uppercase text-slate-400">Active leads</p><p className="text-xl font-bold">{items.filter((l) => !['WON', 'LOST'].includes(l.stage)).length}</p></Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-7 sm:grid-cols-2 grid-cols-1">
        {STAGES.map((s) => (
          <div key={s} className="min-w-0">
            <div className="flex items-center justify-between mb-2">
              <Badge tone={stageTone[s]}>{s}</Badge>
              <span className="text-xs text-slate-400">{board[s]?.length ?? 0}</span>
            </div>
            <div className="space-y-2">
              {(board[s] ?? []).slice(0, 20).map((l) => (
                <Card key={l.id} className="p-2.5">
                  <p className="text-sm font-medium text-slate-800 truncate">{l.company || l.name}</p>
                  <p className="text-xs text-slate-400 truncate">{l.name} · {l.source}</p>
                  <p className="text-xs font-medium text-slate-600 mt-1">{currency(l.estimatedValue)}</p>
                  <p className="text-[11px] text-slate-400 truncate">{employeeName(l.ownerEmployeeId)}</p>
                  {can('crm', 'edit') && (
                    <div className="flex justify-between mt-1.5">
                      <button className="text-[11px] text-slate-400 hover:text-slate-700" onClick={() => move(l, -1)}>←</button>
                      <button className="text-[11px] text-brand-600 hover:underline" onClick={() => setEditing(l)}>edit</button>
                      <button className="text-[11px] text-slate-400 hover:text-slate-700" onClick={() => move(l, 1)}>→</button>
                    </div>
                  )}
                </Card>
              ))}
              {(board[s]?.length ?? 0) === 0 && <p className="text-[11px] text-slate-300 text-center py-2">—</p>}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing.name ? 'Edit lead' : 'New lead'} onClose={() => setEditing(null)}>
          <Field label="Contact name" required><input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
          <Field label="Company"><input className={inputCls} value={editing.company} onChange={(e) => setEditing({ ...editing, company: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><input className={inputCls} value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <Field label="Email"><input className={inputCls} value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Source"><Select value={editing.source} onChange={(v) => setEditing({ ...editing, source: v as Lead['source'] })}>{['Website', 'Referral', 'Cold Call', 'Exhibition', 'WhatsApp', 'Walk-in'].map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Stage"><Select value={editing.stage} onChange={(v) => setEditing({ ...editing, stage: v as LeadStage })}>{STAGES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Estimated value"><input type="number" className={inputCls} value={editing.estimatedValue} onChange={(e) => setEditing({ ...editing, estimatedValue: Number(e.target.value) })} /></Field>
            <Field label="Owner"><Select value={editing.ownerEmployeeId} onChange={(v) => setEditing({ ...editing, ownerEmployeeId: v })}>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field>
          </div>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={() => { upsert({ ...editing, updatedAt: new Date().toISOString() }); setEditing(null) }} disabled={!editing.name}>Save</Button></div>
        </Modal>
      )}
    </div>
  )
}

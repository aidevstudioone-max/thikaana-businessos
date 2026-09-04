import React, { useMemo, useState } from 'react'
import { COLLECTIONS, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { currency, fmtDate } from '../../lib/format'
import { Badge, Card, EmptyState, inputCls, PageHeader, Select, StatusBadge, Table } from '../../components/ui'
import type { Workspace } from '../../lib/types'

export default function Workspaces() {
  const { items, upsert } = useCollection<Workspace>(COLLECTIONS.workspaces)
  const [q, setQ] = useState('')
  const [plan, setPlan] = useState('')
  const [status, setStatus] = useState('')

  const rows = useMemo(
    () => items.filter((w) => (!plan || w.plan === plan) && (!status || w.status === status) && `${w.companyName} ${w.ownerName} ${w.city}`.toLowerCase().includes(q.toLowerCase())),
    [items, q, plan, status]
  )

  return (
    <div>
      <PageHeader title="Workspaces" subtitle={`${items.length} customer companies on Thikaana BusinessOS`} />
      <Card className="p-3 mb-4 flex flex-wrap gap-2">
        <input className={inputCls + ' max-w-xs'} placeholder="Search company / owner / city…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={plan} onChange={setPlan} className="max-w-[150px]"><option value="">All plans</option>{['Starter', 'Growth', 'Enterprise'].map((p) => <option key={p}>{p}</option>)}</Select>
        <Select value={status} onChange={setStatus} className="max-w-[150px]"><option value="">Any status</option>{['ACTIVE', 'TRIAL', 'SUSPENDED'].map((s) => <option key={s}>{s}</option>)}</Select>
      </Card>
      <Card>
        {rows.length === 0 ? <EmptyState title="No workspaces" /> : (
          <Table columns={['Company', 'Owner', 'Industry', 'City', 'Plan', 'Seats', 'Modules', 'MRR', 'Renews', 'Status', '']}>
            {rows.map((w) => (
              <tr key={w.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium">{w.companyName}</td>
                <td className="py-2.5 px-3 text-slate-500">{w.ownerName}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{w.industry}</td>
                <td className="py-2.5 px-3 text-slate-500">{w.city}</td>
                <td className="py-2.5 px-3"><Badge tone={w.plan === 'Enterprise' ? 'purple' : w.plan === 'Growth' ? 'indigo' : 'slate'}>{w.plan}</Badge></td>
                <td className="py-2.5 px-3">{w.seats}</td>
                <td className="py-2.5 px-3">{w.modulesEnabled}</td>
                <td className="py-2.5 px-3">{currency(w.mrr)}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{fmtDate(w.renewsAt)}</td>
                <td className="py-2.5 px-3"><StatusBadge status={w.status} /></td>
                <td className="py-2.5 px-3 text-right">
                  <Select value={w.status} onChange={(v) => upsert({ ...w, status: v as Workspace['status'], mrr: v === 'TRIAL' ? 0 : w.mrr })} className="text-xs !py-1 w-28">
                    {['ACTIVE', 'TRIAL', 'SUSPENDED'].map((s) => <option key={s}>{s}</option>)}
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

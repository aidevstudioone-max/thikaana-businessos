import React, { useMemo, useState } from 'react'
import { COLLECTIONS, getAll } from '../../lib/db'
import { fmtDateTime } from '../../lib/format'
import { Card, EmptyState, inputCls, PageHeader, Select, Table } from '../../components/ui'
import type { AuditLogEntry } from '../../lib/types'

export default function AuditLog() {
  const entries = getAll<AuditLogEntry>(COLLECTIONS.auditLog)
  const [q, setQ] = useState('')
  const [mod, setMod] = useState('')
  const modules = Array.from(new Set(entries.map((e) => e.module))).sort()

  const rows = useMemo(
    () => entries.filter((e) => (!mod || e.module === mod) && `${e.userName} ${e.action} ${e.entity} ${e.detail ?? ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 400),
    [entries, q, mod]
  )

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Every create, edit and privileged action, newest first." />
      <Card className="p-3 mb-4 flex flex-wrap gap-2">
        <input className={inputCls + ' max-w-sm'} placeholder="Search user / action / entity…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={mod} onChange={setMod} className="max-w-[180px]"><option value="">All modules</option>{modules.map((m) => <option key={m}>{m}</option>)}</Select>
      </Card>
      <Card>
        {rows.length === 0 ? <EmptyState title="No matching entries" /> : (
          <Table columns={['When', 'User', 'Module', 'Action', 'Entity', 'Detail']}>
            {rows.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="py-2 px-3 text-xs text-slate-500">{fmtDateTime(e.ts)}</td>
                <td className="py-2 px-3 text-slate-700">{e.userName}</td>
                <td className="py-2 px-3 text-slate-500 text-xs">{e.module}</td>
                <td className="py-2 px-3 text-xs font-medium text-slate-600">{e.action}</td>
                <td className="py-2 px-3 text-slate-600">{e.entity}</td>
                <td className="py-2 px-3 text-xs text-slate-400">{e.detail ?? '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { COLLECTIONS, getAll, saveAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { employeeName } from '../../lib/selectors'
import { Badge, Button, Card, EmptyState, fmtDate, PageHeader, Select, StatCard, StatusBadge, Table } from '../../components/ui'
import type { LeaveRequest } from '../../lib/types'

export default function LeaveRequests() {
  const { items, setItems } = useCollection<LeaveRequest>(COLLECTIONS.leaveRequests)
  const { user, can } = useAuth()
  const [status, setStatus] = useState('PENDING')

  const filtered = useMemo(() => [...items].sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)).filter((l) => !status || l.status === status), [items, status])
  const pending = items.filter((l) => l.status === 'PENDING').length

  const decide = (l: LeaveRequest, decision: 'APPROVED' | 'REJECTED') => {
    const next = items.map((x) => (x.id === l.id ? { ...x, status: decision, decidedAt: new Date().toISOString() } : x))
    setItems(next); saveAll(COLLECTIONS.leaveRequests, next)
    logAudit(user, 'Leave', `LEAVE_${decision}`, employeeName(l.employeeId))
  }

  return (
    <div>
      <PageHeader title="Leave Requests" subtitle="Approval workflow for sick, casual and paid leave." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Pending" value={String(pending)} tone={pending ? 'warn' : 'default'} />
        <StatCard label="Approved" value={String(items.filter((l) => l.status === 'APPROVED').length)} tone="good" />
        <StatCard label="Rejected" value={String(items.filter((l) => l.status === 'REJECTED').length)} />
        <StatCard label="Total requests" value={String(items.length)} />
      </div>
      <Card className="p-3 mb-4"><Select value={status} onChange={setStatus} className="max-w-[180px]"><option value="">All</option>{['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((s) => <option key={s}>{s}</option>)}</Select></Card>
      <Card>
        {filtered.length === 0 ? <EmptyState title="Nothing here" /> : (
          <Table columns={['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Action']}>
            {filtered.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 text-slate-800">{employeeName(l.employeeId)}</td>
                <td className="py-2.5 px-3"><Badge tone={l.type === 'Sick' ? 'red' : l.type === 'Paid' ? 'green' : 'blue'}>{l.type}</Badge></td>
                <td className="py-2.5 px-3 text-slate-500">{fmtDate(l.fromDate)}</td>
                <td className="py-2.5 px-3 text-slate-500">{fmtDate(l.toDate)}</td>
                <td className="py-2.5 px-3">{l.days}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{l.reason}</td>
                <td className="py-2.5 px-3"><StatusBadge status={l.status} /></td>
                <td className="py-2.5 px-3">
                  {l.status === 'PENDING' && can('leave', 'edit') ? (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => decide(l, 'APPROVED')}>Approve</Button>
                      <Button size="sm" variant="danger" onClick={() => decide(l, 'REJECTED')}>Reject</Button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">{l.decidedAt ? fmtDate(l.decidedAt) : '—'}</span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

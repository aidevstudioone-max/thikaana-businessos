import React, { useState } from 'react'
import { COLLECTIONS, genId, getAll, saveAll } from '../../lib/db'
import { useMyEmployee } from '../../lib/portal'
import { logAudit } from '../../lib/audit'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, EmptyState, Field, inputCls, Modal, PageHeader, Select, StatCard, StatusBadge, Table } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import type { LeaveBalance, LeaveRequest, LeaveType } from '../../lib/types'

export default function MyLeave() {
  const { employee } = useMyEmployee()
  const { user } = useAuth()
  const [items, setItems] = useState<LeaveRequest[]>(() =>
    getAll<LeaveRequest>(COLLECTIONS.leaveRequests).filter((l) => l.employeeId === employee?.id).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
  )
  const [apply, setApply] = useState(false)
  const [form, setForm] = useState({ type: 'Casual' as LeaveType, fromDate: new Date().toISOString().slice(0, 10), toDate: new Date().toISOString().slice(0, 10), reason: '' })
  if (!employee) return <EmptyState title="No employee record linked" />

  const bal = getAll<LeaveBalance>(COLLECTIONS.leaveBalances).find((b) => b.employeeId === employee.id)

  const submit = () => {
    const days = Math.max(1, Math.round((new Date(form.toDate).getTime() - new Date(form.fromDate).getTime()) / 864e5) + 1)
    const req: LeaveRequest = {
      id: genId('lv'), employeeId: employee.id, type: form.type, fromDate: form.fromDate, toDate: form.toDate, days,
      reason: form.reason, status: 'PENDING', approverEmployeeId: employee.reportingManagerId, appliedAt: new Date().toISOString(), decidedAt: null
    }
    const all = [req, ...getAll<LeaveRequest>(COLLECTIONS.leaveRequests)]
    saveAll(COLLECTIONS.leaveRequests, all)
    setItems(all.filter((l) => l.employeeId === employee.id).sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)))
    logAudit(user, 'Leave', 'LEAVE_APPLIED', `${form.type} ${days}d`)
    setApply(false)
    setForm({ ...form, reason: '' })
  }

  return (
    <div>
      <PageHeader title="My Leave" subtitle="Apply for leave and track approvals." actions={<Button onClick={() => setApply(true)}>+ Apply for leave</Button>} />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="Sick leave" value={String(bal?.sick ?? 0)} />
        <StatCard label="Casual leave" value={String(bal?.casual ?? 0)} />
        <StatCard label="Paid leave" value={String(bal?.paid ?? 0)} />
      </div>
      <Card>
        {items.length === 0 ? <EmptyState title="No leave applied" /> : (
          <Table columns={['Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Decided']}>
            {items.map((l) => (
              <tr key={l.id}>
                <td className="py-2 px-3">{l.type}</td>
                <td className="py-2 px-3 text-slate-500">{fmtDate(l.fromDate)}</td>
                <td className="py-2 px-3 text-slate-500">{fmtDate(l.toDate)}</td>
                <td className="py-2 px-3">{l.days}</td>
                <td className="py-2 px-3 text-slate-500 text-xs">{l.reason}</td>
                <td className="py-2 px-3"><StatusBadge status={l.status} /></td>
                <td className="py-2 px-3 text-xs text-slate-400">{l.decidedAt ? fmtDate(l.decidedAt) : '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {apply && (
        <Modal title="Apply for leave" onClose={() => setApply(false)}>
          <Field label="Type"><Select value={form.type} onChange={(v) => setForm({ ...form, type: v as LeaveType })}>{['Sick', 'Casual', 'Paid', 'Unpaid'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From"><input type="date" className={inputCls} value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} /></Field>
            <Field label="To"><input type="date" className={inputCls} value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></Field>
          </div>
          <Field label="Reason" required><textarea className={inputCls} rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setApply(false)}>Cancel</Button><Button onClick={submit} disabled={!form.reason}>Submit request</Button></div>
        </Modal>
      )}
    </div>
  )
}

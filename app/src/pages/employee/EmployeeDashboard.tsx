import React from 'react'
import { Link } from 'react-router-dom'
import { useMyEmployee } from '../../lib/portal'
import { COLLECTIONS, getAll } from '../../lib/db'
import { currency, fmtDate } from '../../lib/format'
import { Card, EmptyState, PageHeader, StatCard, StatusBadge } from '../../components/ui'
import type { AttendanceRecord, LeaveBalance, LeaveRequest, Payslip } from '../../lib/types'

export default function EmployeeDashboard() {
  const { employee, department, manager } = useMyEmployee()
  if (!employee) return <EmptyState title="No employee record linked to this account" />

  const att = getAll<AttendanceRecord>(COLLECTIONS.attendance).filter((a) => a.employeeId === employee.id)
  const today = new Date().toISOString().slice(0, 10)
  const todayRec = att.find((a) => a.date === today)
  const monthRecs = att.filter((a) => a.date.slice(0, 7) === today.slice(0, 7))
  const present = monthRecs.filter((a) => a.status === 'PRESENT' || a.status === 'HALF_DAY').length
  const bal = getAll<LeaveBalance>(COLLECTIONS.leaveBalances).find((b) => b.employeeId === employee.id)
  const leaves = getAll<LeaveRequest>(COLLECTIONS.leaveRequests).filter((l) => l.employeeId === employee.id)
  const slips = getAll<Payslip>(COLLECTIONS.payslips).filter((p) => p.employeeId === employee.id).sort((a, b) => b.period.localeCompare(a.period))

  return (
    <div>
      <PageHeader title={`Hi, ${employee.name.split(' ')[0]}`} subtitle={`${employee.designation} · ${department?.name} · reports to ${manager?.name ?? '—'}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Today" value={todayRec ? todayRec.status.replace('_', ' ') : 'Not marked'} tone={todayRec?.status === 'PRESENT' ? 'good' : 'default'} />
        <StatCard label="Present this month" value={String(present)} />
        <StatCard label="Leave balance" value={String((bal?.sick ?? 0) + (bal?.casual ?? 0) + (bal?.paid ?? 0))} hint={`SL ${bal?.sick ?? 0} · CL ${bal?.casual ?? 0} · PL ${bal?.paid ?? 0}`} />
        <StatCard label="Last net pay" value={currency(slips[0]?.netPay ?? 0)} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-slate-800">Recent leave</h3><Link to="/me/leave" className="text-xs text-brand-600 hover:underline">Manage →</Link></div>
          {leaves.length === 0 ? <EmptyState title="No leave applied" /> : (
            <div className="space-y-2">
              {leaves.slice(0, 5).map((l) => (
                <div key={l.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{l.type} · {fmtDate(l.fromDate)} ({l.days}d)</span>
                  <StatusBadge status={l.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-slate-800">Recent payslips</h3><Link to="/me/payslips" className="text-xs text-brand-600 hover:underline">All →</Link></div>
          <div className="space-y-2">
            {slips.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{s.period}</span>
                <span className="font-medium">{currency(s.netPay)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { COLLECTIONS, getAll } from '../../lib/db'
import { employeeName } from '../../lib/selectors'
import { Avatar, Badge, Card, currency, EmptyState, fmtDate, PageHeader, StatusBadge, Table } from '../../components/ui'
import type { AttendanceRecord, Department, Employee, LeaveRequest, Payslip } from '../../lib/types'

export default function EmployeeDetail() {
  const { id } = useParams()
  const emp = getAll<Employee>(COLLECTIONS.employees).find((e) => e.id === id)
  if (!emp) return <EmptyState title="Employee not found" />
  const dept = getAll<Department>(COLLECTIONS.departments).find((d) => d.id === emp.departmentId)
  const att = getAll<AttendanceRecord>(COLLECTIONS.attendance).filter((a) => a.employeeId === id)
  const leaves = getAll<LeaveRequest>(COLLECTIONS.leaveRequests).filter((l) => l.employeeId === id)
  const slips = getAll<Payslip>(COLLECTIONS.payslips).filter((p) => p.employeeId === id).sort((a, b) => b.period.localeCompare(a.period))
  const present = att.filter((a) => a.status === 'PRESENT' || a.status === 'HALF_DAY').length
  const monthly = emp.ctcAnnual / 12

  return (
    <div>
      <PageHeader
        title={emp.name}
        subtitle={`${emp.empCode} · ${emp.designation} · ${dept?.name}`}
        actions={<Link to="/employees" className="text-sm text-brand-600 hover:underline">← All employees</Link>}
      />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3"><Avatar name={emp.name} size={52} /><div><p className="font-semibold text-slate-800">{emp.name}</p><StatusBadge status={emp.status} /></div></div>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-slate-400">Email</dt><dd className="truncate max-w-[60%]">{emp.email}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Mobile</dt><dd>{emp.mobile}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Reports to</dt><dd>{emp.reportingManagerId ? employeeName(emp.reportingManagerId) : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Type</dt><dd>{emp.employmentType}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Joined</dt><dd>{fmtDate(emp.joiningDate)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">PAN</dt><dd>{emp.pan}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">PF / ESI</dt><dd>{emp.pfNumber ? 'Yes' : 'No'} / {emp.esiNumber ? 'Yes' : 'No'}</dd></div>
          </dl>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-2">Salary structure</h3>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-slate-500">Annual CTC</dt><dd className="font-medium">{currency(emp.ctcAnnual)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Monthly gross</dt><dd>{currency(monthly)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Basic ({emp.basicPct}%)</dt><dd>{currency(monthly * emp.basicPct / 100)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">HRA ({emp.hraPct}%)</dt><dd>{currency(monthly * emp.hraPct / 100)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Special allowance</dt><dd>{currency(monthly * (100 - emp.basicPct - emp.hraPct) / 100)}</dd></div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5">{emp.documents.map((d) => <Badge key={d.id} tone="slate">{d.type}</Badge>)}</div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-2">Attendance (last 62d)</h3>
          <p className="text-3xl font-bold text-brand-600">{att.length ? Math.round((present / att.filter((a) => a.status !== 'WEEK_OFF').length) * 100) : 0}%</p>
          <p className="text-xs text-slate-400">{present} present · {att.filter((a) => a.status === 'LEAVE').length} leave · {att.filter((a) => a.status === 'ABSENT').length} absent</p>
          <h3 className="font-semibold text-slate-800 mt-4 mb-2">Leave</h3>
          <p className="text-sm text-slate-500">{leaves.filter((l) => l.status === 'APPROVED').length} approved · {leaves.filter((l) => l.status === 'PENDING').length} pending</p>
        </Card>
      </div>

      <Card className="p-4 mt-4">
        <h3 className="font-semibold text-slate-800 mb-3">Recent payslips</h3>
        {slips.length === 0 ? <EmptyState title="No payslips" /> : (
          <Table columns={['Period', 'Paid days', 'Gross', 'Deductions', 'Net pay', 'Status']}>
            {slips.slice(0, 12).map((s) => (
              <tr key={s.id}>
                <td className="py-2 px-3 font-medium">{s.period}</td>
                <td className="py-2 px-3 text-slate-500">{s.paidDays}/{s.workingDays}</td>
                <td className="py-2 px-3">{currency(s.grossEarnings)}</td>
                <td className="py-2 px-3 text-red-600">{currency(s.totalDeductions)}</td>
                <td className="py-2 px-3 font-medium">{currency(s.netPay)}</td>
                <td className="py-2 px-3"><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

import React from 'react'
import { useMyEmployee } from '../../lib/portal'
import { employeeName } from '../../lib/selectors'
import { Avatar, Badge, Card, currency, EmptyState, fmtDate, PageHeader } from '../../components/ui'

export default function MyProfile() {
  const { employee, department, manager } = useMyEmployee()
  if (!employee) return <EmptyState title="No employee record linked to this account" />
  const monthly = employee.ctcAnnual / 12

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your record as held by HR. Contact HR to correct any details." />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3"><Avatar name={employee.name} size={52} /><div><p className="font-semibold text-slate-800">{employee.name}</p><p className="text-xs text-slate-400">{employee.empCode}</p><Badge tone="green">{employee.status}</Badge></div></div>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-slate-400">Designation</dt><dd>{employee.designation}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Department</dt><dd>{department?.name}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Reports to</dt><dd>{manager?.name ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Type</dt><dd>{employee.employmentType}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-400">Joined</dt><dd>{fmtDate(employee.joiningDate)}</dd></div>
          </dl>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-2">Contact</h3>
          <dl className="text-sm space-y-1.5">
            <div><dt className="text-slate-400 text-xs">Email</dt><dd className="truncate">{employee.email}</dd></div>
            <div><dt className="text-slate-400 text-xs">Mobile</dt><dd>{employee.mobile}</dd></div>
            <div><dt className="text-slate-400 text-xs">Address</dt><dd>{employee.address}</dd></div>
            <div><dt className="text-slate-400 text-xs">PAN</dt><dd>{employee.pan}</dd></div>
            <div><dt className="text-slate-400 text-xs">Bank</dt><dd>{employee.bankIfsc} · ••••{String(employee.bankAccount).slice(-4)}</dd></div>
          </dl>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-2">Compensation</h3>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-slate-500">Annual CTC</dt><dd className="font-medium">{currency(employee.ctcAnnual)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Monthly gross</dt><dd>{currency(monthly)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Basic</dt><dd>{currency(monthly * employee.basicPct / 100)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">HRA</dt><dd>{currency(monthly * employee.hraPct / 100)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">PF / ESI</dt><dd>{employee.pfNumber ? 'Enrolled' : 'No'} / {employee.esiNumber ? 'Enrolled' : 'No'}</dd></div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5">{employee.documents.map((d) => <Badge key={d.id} tone="slate">{d.type}</Badge>)}</div>
        </Card>
      </div>
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { COLLECTIONS, genId, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { Avatar, Button, Card, currency, EmptyState, Field, inputCls, Modal, PageHeader, Select, StatusBadge, Table } from '../../components/ui'
import type { Department, Employee } from '../../lib/types'

const blank = (): Employee => ({
  id: genId('emp'), empCode: '', name: '', photoUrl: '', gender: 'Male', dob: '1995-01-01', email: '', mobile: '', address: '',
  departmentId: '', designation: '', reportingManagerId: null, employmentType: 'Full-time', joiningDate: new Date().toISOString().slice(0, 10),
  ctcAnnual: 360000, basicPct: 45, hraPct: 20, pan: '', pfNumber: '', esiNumber: '', bankAccount: '', bankIfsc: '', status: 'ACTIVE', documents: [], createdAt: new Date().toISOString()
})

export default function Employees() {
  const { items, upsert } = useCollection<Employee>(COLLECTIONS.employees)
  const { can, user } = useAuth()
  const departments = getAll<Department>(COLLECTIONS.departments)
  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? '—'
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('')
  const [editing, setEditing] = useState<Employee | null>(null)

  const filtered = useMemo(
    () => items.filter((e) => (!dept || e.departmentId === dept) && `${e.name} ${e.empCode} ${e.designation}`.toLowerCase().includes(q.toLowerCase())),
    [items, q, dept]
  )
  const active = items.filter((e) => e.status === 'ACTIVE').length

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${active} active of ${items.length} · ${departments.length} departments`}
        actions={can('employees', 'create') && <Button onClick={() => setEditing(blank())}>+ New employee</Button>}
      />
      <Card className="p-3 mb-4 flex flex-wrap gap-2">
        <input className={inputCls + ' max-w-sm'} placeholder="Search name / code / role…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={dept} onChange={setDept} className="max-w-[200px]"><option value="">All departments</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
      </Card>
      <Card>
        {filtered.length === 0 ? <EmptyState title="No employees" /> : (
          <Table columns={['Employee', 'Department', 'Designation', 'Type', 'Joined', 'CTC (annual)', 'Status', '']}>
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3"><div className="flex items-center gap-2"><Avatar name={e.name} size={30} /><div><Link to={`/employees/${e.id}`} className="font-medium text-slate-800 hover:text-brand-600">{e.name}</Link><div className="text-xs text-slate-400">{e.empCode}</div></div></div></td>
                <td className="py-2.5 px-3 text-slate-500">{deptName(e.departmentId)}</td>
                <td className="py-2.5 px-3 text-slate-500">{e.designation}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{e.employmentType}</td>
                <td className="py-2.5 px-3 text-slate-500">{e.joiningDate}</td>
                <td className="py-2.5 px-3">{currency(e.ctcAnnual)}</td>
                <td className="py-2.5 px-3"><StatusBadge status={e.status} /></td>
                <td className="py-2.5 px-3 text-right">{can('employees', 'edit') && <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(e)}>Edit</button>}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {editing && (
        <Modal title={editing.name ? 'Edit employee' : 'New employee'} onClose={() => setEditing(null)} wide>
          <div className="grid sm:grid-cols-2 gap-x-4">
            <Field label="Name" required><input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Employee code" required><input className={inputCls} value={editing.empCode} onChange={(e) => setEditing({ ...editing, empCode: e.target.value })} /></Field>
            <Field label="Email"><input className={inputCls} value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Mobile"><input className={inputCls} value={editing.mobile} onChange={(e) => setEditing({ ...editing, mobile: e.target.value })} /></Field>
            <Field label="Department"><Select value={editing.departmentId} onChange={(v) => setEditing({ ...editing, departmentId: v })}><option value="">Select…</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
            <Field label="Designation"><input className={inputCls} value={editing.designation} onChange={(e) => setEditing({ ...editing, designation: e.target.value })} /></Field>
            <Field label="Reporting manager"><Select value={editing.reportingManagerId ?? ''} onChange={(v) => setEditing({ ...editing, reportingManagerId: v || null })}><option value="">—</option>{items.filter((x) => x.id !== editing.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
            <Field label="Employment type"><Select value={editing.employmentType} onChange={(v) => setEditing({ ...editing, employmentType: v as Employee['employmentType'] })}>{['Full-time', 'Part-time', 'Contract', 'Intern'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Joining date"><input type="date" className={inputCls} value={editing.joiningDate} onChange={(e) => setEditing({ ...editing, joiningDate: e.target.value })} /></Field>
            <Field label="Annual CTC"><input type="number" className={inputCls} value={editing.ctcAnnual} onChange={(e) => setEditing({ ...editing, ctcAnnual: Number(e.target.value) })} /></Field>
            <Field label="PAN"><input className={inputCls} value={editing.pan} onChange={(e) => setEditing({ ...editing, pan: e.target.value })} /></Field>
            <Field label="Status"><Select value={editing.status} onChange={(v) => setEditing({ ...editing, status: v as Employee['status'] })}><option value="ACTIVE">Active</option><option value="ON_NOTICE">On notice</option><option value="EXITED">Exited</option></Select></Field>
          </div>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={() => { upsert(editing); logAudit(user, 'Employees', 'EMPLOYEE_SAVED', editing.name); setEditing(null) }} disabled={!editing.name || !editing.empCode}>Save</Button></div>
        </Modal>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { COLLECTIONS, genId, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { employeeName } from '../../lib/selectors'
import { Avatar, Button, Card, currency, Field, inputCls, Modal, PageHeader, Select } from '../../components/ui'
import type { Department, Employee } from '../../lib/types'

export default function Departments() {
  const { items, upsert } = useCollection<Department>(COLLECTIONS.departments)
  const { can } = useAuth()
  const employees = getAll<Employee>(COLLECTIONS.employees)
  const [editing, setEditing] = useState<Department | null>(null)

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle={`${items.length} departments · ${employees.filter((e) => e.status !== 'EXITED').length} people`}
        actions={can('employees', 'create') && <Button onClick={() => setEditing({ id: genId('dep'), name: '', headEmployeeId: null })}>+ New department</Button>}
      />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((d) => {
          const people = employees.filter((e) => e.departmentId === d.id && e.status !== 'EXITED')
          const cost = people.reduce((s, e) => s + e.ctcAnnual / 12, 0)
          return (
            <Card key={d.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{d.name}</p>
                  <p className="text-xs text-slate-400">Head: {d.headEmployeeId ? employeeName(d.headEmployeeId) : '—'}</p>
                </div>
                {can('employees', 'edit') && <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(d)}>Edit</button>}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex -space-x-2">{people.slice(0, 5).map((p) => <Avatar key={p.id} name={p.name} size={26} />)}</div>
                <span className="text-sm text-slate-500">{people.length} people</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Monthly salary cost ≈ {currency(cost)}</p>
            </Card>
          )
        })}
      </div>

      {editing && (
        <Modal title={editing.name ? 'Edit department' : 'New department'} onClose={() => setEditing(null)}>
          <Field label="Name" required><input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
          <Field label="Department head"><Select value={editing.headEmployeeId ?? ''} onChange={(v) => setEditing({ ...editing, headEmployeeId: v || null })}><option value="">—</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={() => { upsert(editing); setEditing(null) }} disabled={!editing.name}>Save</Button></div>
        </Modal>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { COLLECTIONS, genId, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { Avatar, Button, Card, EmptyState, Field, inputCls, Modal, PageHeader, Select, StatusBadge, Table } from '../../components/ui'
import type { Employee, Role, User } from '../../lib/types'

export default function Users() {
  const { items, upsert, refresh } = useCollection<User>(COLLECTIONS.users)
  const { user, refreshUsers } = useAuth()
  const roles = getAll<Role>(COLLECTIONS.roles)
  const employees = getAll<Employee>(COLLECTIONS.employees)
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? '—'
  const [editing, setEditing] = useState<User | null>(null)

  const save = () => {
    if (!editing) return
    upsert(editing)
    refreshUsers()
    logAudit(user, 'Users', 'USER_SAVED', editing.name)
    setEditing(null)
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={`${items.length} accounts`}
        actions={<Button onClick={() => setEditing({ id: genId('usr'), name: '', username: '', email: '', mobile: '', password: 'welcome123', roleId: roles.find((r) => r.portal === 'ADMIN')?.id ?? roles[0].id, status: 'ACTIVE', createdAt: new Date().toISOString() })}>+ New user</Button>}
      />
      <Card>
        {items.length === 0 ? <EmptyState title="No users" /> : (
          <Table columns={['User', 'Username', 'Role', 'Linked employee', 'Status', '']}>
            {items.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3"><div className="flex items-center gap-2"><Avatar name={u.name} size={30} /><div><p className="font-medium text-slate-800">{u.name}</p><p className="text-xs text-slate-400">{u.email}</p></div></div></td>
                <td className="py-2.5 px-3 text-slate-500">{u.username}</td>
                <td className="py-2.5 px-3 text-slate-600">{roleName(u.roleId)}</td>
                <td className="py-2.5 px-3 text-slate-500 text-xs">{u.linkedEmployeeId ? employees.find((e) => e.id === u.linkedEmployeeId)?.name : '—'}</td>
                <td className="py-2.5 px-3"><StatusBadge status={u.status} /></td>
                <td className="py-2.5 px-3 text-right"><button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(u)}>Edit</button></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {editing && (
        <Modal title={editing.name ? 'Edit user' : 'New user'} onClose={() => setEditing(null)}>
          <Field label="Full name" required><input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Username" required><input className={inputCls} value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} /></Field>
            <Field label="Password" required><input className={inputCls} value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><input className={inputCls} value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Mobile"><input className={inputCls} value={editing.mobile} onChange={(e) => setEditing({ ...editing, mobile: e.target.value })} /></Field>
          </div>
          <Field label="Role"><Select value={editing.roleId} onChange={(v) => setEditing({ ...editing, roleId: v })}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.portal}</option>)}</Select></Field>
          <Field label="Linked employee (for Employee role)"><Select value={editing.linkedEmployeeId ?? ''} onChange={(v) => setEditing({ ...editing, linkedEmployeeId: v || undefined })}><option value="">—</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field>
          <Field label="Status"><Select value={editing.status} onChange={(v) => setEditing({ ...editing, status: v as User['status'] })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select></Field>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save} disabled={!editing.name || !editing.username}>Save</Button></div>
        </Modal>
      )}
    </div>
  )
}

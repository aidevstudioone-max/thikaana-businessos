import React, { useState } from 'react'
import { COLLECTIONS, getAll, saveAll } from '../../lib/db'
import { useAuth } from '../../context/AuthContext'
import { MODULE_DEFS, CATEGORY_LABELS, CATEGORY_ORDER } from '../../lib/modules'
import { Badge, Button, Card, Modal, PageHeader, Table } from '../../components/ui'
import type { ModulePermission, Role } from '../../lib/types'

const ACTIONS: (keyof Omit<ModulePermission, 'actions'>)[] = ['view', 'create', 'edit', 'delete']

export default function Roles() {
  const { roles, refreshRoles } = useAuth()
  const [editing, setEditing] = useState<Role | null>(null)

  const toggle = (moduleId: string, action: keyof Omit<ModulePermission, 'actions'>) => {
    if (!editing || editing.isSuperAdmin) return
    const cur = editing.permissions[moduleId] ?? { view: false, create: false, edit: false, delete: false, actions: {} }
    setEditing({ ...editing, permissions: { ...editing.permissions, [moduleId]: { ...cur, [action]: !cur[action] } } })
  }

  const save = () => {
    if (!editing) return
    saveAll(COLLECTIONS.roles, getAll<Role>(COLLECTIONS.roles).map((r) => (r.id === editing.id ? editing : r)))
    refreshRoles()
    setEditing(null)
  }

  return (
    <div>
      <PageHeader title="Roles & Permissions" subtitle="Seven built-in roles. A user's effective access = enabled module × role permission × module dependency." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {roles.map((r) => {
          const grants = Object.values(r.permissions).filter((p) => p.view).length
          return (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.portal} portal</p>
                </div>
                {r.isSuperAdmin ? <Badge tone="purple">All access</Badge> : <Badge tone="slate">{grants} modules</Badge>}
              </div>
              <p className="text-xs text-slate-500 mt-2">{r.description}</p>
              <button className="text-xs text-brand-600 hover:underline mt-3" onClick={() => setEditing(structuredClone(r))}>{r.isSuperAdmin ? 'View' : 'Edit permissions'}</button>
            </Card>
          )
        })}
      </div>

      {editing && (
        <Modal title={`${editing.name} · permissions`} onClose={() => setEditing(null)} wide>
          {editing.isSuperAdmin && <p className="text-sm text-amber-600 mb-3">Super Admin always has full access; this is read-only.</p>}
          {CATEGORY_ORDER.map((cat) => (
            <div key={cat} className="mb-4">
              <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1">{CATEGORY_LABELS[cat]}</h4>
              <Table columns={['Module', 'View', 'Create', 'Edit', 'Delete']}>
                {MODULE_DEFS.filter((m) => m.category === cat).map((m) => {
                  const p = editing.permissions[m.id] ?? { view: false, create: false, edit: false, delete: false, actions: {} }
                  return (
                    <tr key={m.id}>
                      <td className="py-1.5 px-3 text-slate-700 text-sm">{m.name}</td>
                      {ACTIONS.map((a) => (
                        <td key={a} className="py-1.5 px-3">
                          <input type="checkbox" checked={p[a]} disabled={editing.isSuperAdmin} onChange={() => toggle(m.id, a)} />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </Table>
            </div>
          ))}
          {!editing.isSuperAdmin && (
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save permissions</Button></div>
          )}
        </Modal>
      )}
    </div>
  )
}

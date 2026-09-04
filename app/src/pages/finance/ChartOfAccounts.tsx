import React, { useState } from 'react'
import { COLLECTIONS, genId } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { accountBalances } from '../../lib/selectors'
import { Badge, Button, Card, currency, Field, inputCls, Modal, PageHeader, Select, Table } from '../../components/ui'
import type { Account } from '../../lib/types'

const TYPES: Account['type'][] = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']
const tone: Record<string, any> = { ASSET: 'blue', LIABILITY: 'amber', EQUITY: 'purple', INCOME: 'green', EXPENSE: 'red' }

export default function ChartOfAccounts() {
  const { items, upsert } = useCollection<Account>(COLLECTIONS.accounts)
  const { can } = useAuth()
  const bal = accountBalances()
  const [editing, setEditing] = useState<Account | null>(null)

  return (
    <div>
      <PageHeader
        title="Chart of Accounts"
        subtitle={`${items.length} ledger accounts`}
        actions={can('accounting', 'create') && <Button onClick={() => setEditing({ id: genId('acc'), code: '', name: '', type: 'EXPENSE', parentId: null, isSystem: false })}>+ New account</Button>}
      />
      {TYPES.map((t) => (
        <Card key={t} className="p-4 mb-3">
          <div className="flex items-center gap-2 mb-2"><Badge tone={tone[t]}>{t}</Badge></div>
          <Table columns={['Code', 'Account', 'Balance', '']}>
            {items.filter((a) => a.type === t).sort((a, b) => a.code.localeCompare(b.code)).map((a) => (
              <tr key={a.id}>
                <td className="py-2 px-3 text-slate-400 text-xs">{a.code}</td>
                <td className="py-2 px-3 text-slate-800">{a.name} {a.isSystem && <span className="text-[10px] text-slate-300">system</span>}</td>
                <td className="py-2 px-3 font-medium">{currency(Math.abs(bal[a.id] ?? 0))}</td>
                <td className="py-2 px-3 text-right">{can('accounting', 'edit') && !a.isSystem && <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(a)}>Edit</button>}</td>
              </tr>
            ))}
          </Table>
        </Card>
      ))}

      {editing && (
        <Modal title={editing.name ? 'Edit account' : 'New account'} onClose={() => setEditing(null)}>
          <Field label="Code" required><input className={inputCls} value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></Field>
          <Field label="Name" required><input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
          <Field label="Type"><Select value={editing.type} onChange={(v) => setEditing({ ...editing, type: v as Account['type'] })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={() => { upsert(editing); setEditing(null) }} disabled={!editing.code || !editing.name}>Save</Button></div>
        </Modal>
      )}
    </div>
  )
}

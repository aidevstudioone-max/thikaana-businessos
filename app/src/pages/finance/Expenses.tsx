import React, { useMemo, useState } from 'react'
import { COLLECTIONS, genId, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { Button, Card, currency, EmptyState, Field, fmtDate, inputCls, Modal, PageHeader, Select, StatCard, Table } from '../../components/ui'
import type { Account, ExpenseRecord } from '../../lib/types'

export default function Expenses() {
  const { items, upsert } = useCollection<ExpenseRecord>(COLLECTIONS.expenses)
  const { can, user } = useAuth()
  const accounts = getAll<Account>(COLLECTIONS.accounts).filter((a) => a.type === 'EXPENSE')
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—'
  const [month, setMonth] = useState('')
  const [editing, setEditing] = useState<ExpenseRecord | null>(null)

  const months = Array.from(new Set(items.map((e) => e.date.slice(0, 7)))).sort().reverse()
  const filtered = useMemo(() => [...items].sort((a, b) => b.date.localeCompare(a.date)).filter((e) => !month || e.date.slice(0, 7) === month), [items, month])
  const thisMonthTotal = items.filter((e) => e.date.slice(0, 7) === (months[0] ?? '')).reduce((s, e) => s + e.amount, 0)
  const total = items.reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Operating spend recorded against expense accounts, with GST input where applicable."
        actions={can('expenses', 'create') && <Button onClick={() => setEditing({ id: genId('exp'), expenseNo: `ST/EXP/${String(items.length + 1).padStart(4, '0')}`, date: new Date().toISOString().slice(0, 10), categoryAccountId: accounts[0]?.id ?? '', paidToName: '', amount: 0, gstRate: 0, mode: 'Bank Transfer', reference: '', note: '', createdByUserId: user?.id ?? 'system' })}>+ New expense</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label={`Latest month (${months[0] ?? '—'})`} value={currency(thisMonthTotal)} />
        <StatCard label="Total (12 mo)" value={currency(total)} />
        <StatCard label="Entries" value={String(items.length)} />
      </div>
      <Card className="p-3 mb-4"><Select value={month} onChange={setMonth} className="max-w-[180px]"><option value="">All months</option>{months.map((m) => <option key={m}>{m}</option>)}</Select></Card>
      <Card>
        {filtered.length === 0 ? <EmptyState title="No expenses" /> : (
          <Table columns={['Ref', 'Date', 'Paid to', 'Category', 'Mode', 'GST', 'Amount']}>
            {filtered.slice(0, 250).map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="py-2 px-3 font-medium text-xs">{e.expenseNo}</td>
                <td className="py-2 px-3 text-slate-500">{fmtDate(e.date)}</td>
                <td className="py-2 px-3 text-slate-700">{e.paidToName}</td>
                <td className="py-2 px-3 text-slate-500 text-xs">{accName(e.categoryAccountId)}</td>
                <td className="py-2 px-3 text-slate-500">{e.mode}</td>
                <td className="py-2 px-3 text-slate-400 text-xs">{e.gstRate ? `${e.gstRate}%` : '—'}</td>
                <td className="py-2 px-3 font-medium">{currency(e.amount)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {editing && (
        <Modal title="New expense" onClose={() => setEditing(null)}>
          <Field label="Date"><input type="date" className={inputCls} value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></Field>
          <Field label="Paid to" required><input className={inputCls} value={editing.paidToName} onChange={(e) => setEditing({ ...editing, paidToName: e.target.value })} /></Field>
          <Field label="Category"><Select value={editing.categoryAccountId} onChange={(v) => setEditing({ ...editing, categoryAccountId: v })}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
          <Field label="Amount" required><input type="number" className={inputCls} value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="GST rate %"><Select value={String(editing.gstRate)} onChange={(v) => setEditing({ ...editing, gstRate: Number(v) })}>{[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}</Select></Field>
            <Field label="Mode"><Select value={editing.mode} onChange={(v) => setEditing({ ...editing, mode: v as ExpenseRecord['mode'] })}>{['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'].map((m) => <option key={m}>{m}</option>)}</Select></Field>
          </div>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={() => { upsert(editing); logAudit(user, 'Expenses', 'EXPENSE_ADDED', editing.paidToName, { detail: currency(editing.amount) }); setEditing(null) }} disabled={!editing.paidToName || editing.amount <= 0}>Save</Button></div>
        </Modal>
      )}
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { COLLECTIONS, genId, getAll } from '../../lib/db'
import { useCollection } from '../../lib/useCollection'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { Button, Card, currency, EmptyState, Field, fmtDate, inputCls, Modal, PageHeader, Select, Table } from '../../components/ui'
import type { Account, JournalEntry } from '../../lib/types'

export default function Journal() {
  const { items, upsert } = useCollection<JournalEntry>(COLLECTIONS.journalEntries)
  const { can, user } = useAuth()
  const accounts = getAll<Account>(COLLECTIONS.accounts)
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id
  const [source, setSource] = useState('')
  const [draft, setDraft] = useState<JournalEntry | null>(null)

  const filtered = useMemo(() => [...items].sort((a, b) => b.date.localeCompare(a.date)).filter((j) => !source || j.source === source).slice(0, 200), [items, source])

  const newDraft = (): JournalEntry => ({
    id: genId('je'), entryNo: `JE-${String(items.length + 1).padStart(5, '0')}`, date: new Date().toISOString().slice(0, 10),
    narration: '', source: 'MANUAL', refId: null,
    lines: [{ accountId: '', debit: 0, credit: 0 }, { accountId: '', debit: 0, credit: 0 }],
    createdByUserId: user?.id ?? 'system', createdAt: new Date().toISOString()
  })
  const dr = draft?.lines.reduce((s, l) => s + l.debit, 0) ?? 0
  const cr = draft?.lines.reduce((s, l) => s + l.credit, 0) ?? 0

  return (
    <div>
      <PageHeader
        title="Journal"
        subtitle={`${items.length} entries — auto-posted from invoices, purchases, payments and payroll, plus manual entries.`}
        actions={can('accounting', 'create') && <Button onClick={() => setDraft(newDraft())}>+ Manual entry</Button>}
      />
      <Card className="p-3 mb-4"><Select value={source} onChange={setSource} className="max-w-[180px]"><option value="">All sources</option>{['MANUAL', 'INVOICE', 'PURCHASE', 'PAYMENT', 'PAYROLL', 'EXPENSE'].map((s) => <option key={s}>{s}</option>)}</Select></Card>
      <Card>
        {filtered.length === 0 ? <EmptyState title="No entries" /> : (
          <Table columns={['Entry', 'Date', 'Narration', 'Source', 'Debit', 'Credit']}>
            {filtered.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50 align-top">
                <td className="py-2 px-3 font-medium text-xs">{j.entryNo}</td>
                <td className="py-2 px-3 text-slate-500 text-xs">{fmtDate(j.date)}</td>
                <td className="py-2 px-3">
                  <p className="text-slate-700 text-sm">{j.narration}</p>
                  <div className="text-xs text-slate-400 mt-0.5">{j.lines.map((l, i) => <div key={i}>{accName(l.accountId)} {l.debit ? `Dr ${currency(l.debit)}` : `Cr ${currency(l.credit)}`}</div>)}</div>
                </td>
                <td className="py-2 px-3 text-xs text-slate-400">{j.source}</td>
                <td className="py-2 px-3 text-sm">{currency(j.lines.reduce((s, l) => s + l.debit, 0))}</td>
                <td className="py-2 px-3 text-sm">{currency(j.lines.reduce((s, l) => s + l.credit, 0))}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {draft && (
        <Modal title="Manual journal entry" onClose={() => setDraft(null)} wide>
          <div className="grid sm:grid-cols-2 gap-x-4">
            <Field label="Date"><input type="date" className={inputCls} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
            <Field label="Narration"><input className={inputCls} value={draft.narration} onChange={(e) => setDraft({ ...draft, narration: e.target.value })} /></Field>
          </div>
          {draft.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_100px_100px] gap-2 mb-2">
              <Select value={l.accountId} onChange={(v) => setDraft({ ...draft, lines: draft.lines.map((x, xi) => (xi === i ? { ...x, accountId: v } : x)) })}><option value="">Account…</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</Select>
              <input type="number" placeholder="Debit" className={inputCls} value={l.debit} onChange={(e) => setDraft({ ...draft, lines: draft.lines.map((x, xi) => (xi === i ? { ...x, debit: Number(e.target.value) } : x)) })} />
              <input type="number" placeholder="Credit" className={inputCls} value={l.credit} onChange={(e) => setDraft({ ...draft, lines: draft.lines.map((x, xi) => (xi === i ? { ...x, credit: Number(e.target.value) } : x)) })} />
            </div>
          ))}
          <button className="text-xs text-brand-600 hover:underline" onClick={() => setDraft({ ...draft, lines: [...draft.lines, { accountId: '', debit: 0, credit: 0 }] })}>+ Add line</button>
          <p className={`text-sm mt-3 ${dr === cr && dr > 0 ? 'text-emerald-600' : 'text-red-600'}`}>Debit {currency(dr)} · Credit {currency(cr)} {dr === cr ? '· balanced' : '· not balanced'}</p>
          <div className="flex justify-end gap-2 mt-2"><Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button><Button onClick={() => { upsert(draft); logAudit(user, 'Accounting', 'JOURNAL_POSTED', draft.entryNo); setDraft(null) }} disabled={dr !== cr || dr === 0}>Post entry</Button></div>
        </Modal>
      )}
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { COLLECTIONS, getAll } from '../../lib/db'
import { Card, currency, EmptyState, fmtDate, PageHeader, Select, Table } from '../../components/ui'
import type { Account, JournalEntry } from '../../lib/types'

export default function Ledger() {
  const accounts = getAll<Account>(COLLECTIONS.accounts).sort((a, b) => a.code.localeCompare(b.code))
  const journal = getAll<JournalEntry>(COLLECTIONS.journalEntries)
  const [accId, setAccId] = useState(accounts.find((a) => a.code === '4000')?.id ?? accounts[0]?.id ?? '')

  const account = accounts.find((a) => a.id === accId)
  const rows = useMemo(() => {
    const entries = journal
      .filter((j) => j.lines.some((l) => l.accountId === accId))
      .sort((a, b) => a.date.localeCompare(b.date))
    const debitPositive = account && (account.type === 'ASSET' || account.type === 'EXPENSE')
    let running = 0
    return entries.map((j) => {
      const line = j.lines.find((l) => l.accountId === accId)!
      running += (debitPositive ? 1 : -1) * (line.debit - line.credit)
      return { j, debit: line.debit, credit: line.credit, running }
    })
  }, [journal, accId, account])

  const totalDr = rows.reduce((s, r) => s + r.debit, 0)
  const totalCr = rows.reduce((s, r) => s + r.credit, 0)

  return (
    <div>
      <PageHeader title="General Ledger" subtitle="Every posting to a single account, with a running balance." />
      <Card className="p-3 mb-4">
        <Select value={accId} onChange={setAccId} className="max-w-sm">
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
        </Select>
      </Card>
      <Card>
        {rows.length === 0 ? <EmptyState title="No postings to this account" /> : (
          <>
            <Table columns={['Date', 'Entry', 'Narration', 'Debit', 'Credit', 'Balance']}>
              {rows.slice(-300).map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-500 text-xs">{fmtDate(r.j.date)}</td>
                  <td className="py-2 px-3 text-xs">{r.j.entryNo}</td>
                  <td className="py-2 px-3 text-slate-600 text-sm">{r.j.narration}</td>
                  <td className="py-2 px-3">{r.debit ? currency(r.debit) : '—'}</td>
                  <td className="py-2 px-3">{r.credit ? currency(r.credit) : '—'}</td>
                  <td className="py-2 px-3 font-medium">{currency(Math.abs(r.running))}</td>
                </tr>
              ))}
            </Table>
            <div className="flex justify-end gap-6 p-3 text-sm border-t border-slate-100">
              <span>Total Dr <b>{currency(totalDr)}</b></span>
              <span>Total Cr <b>{currency(totalCr)}</b></span>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

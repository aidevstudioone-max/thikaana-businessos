import React, { useState } from 'react'
import { balanceSheet, monthlySales, profitAndLoss } from '../../lib/selectors'
import { BarChart, Card, currency, monthLabel, PageHeader, Tabs } from '../../components/ui'

export default function Financials() {
  const [tab, setTab] = useState('Profit & Loss')
  const pl = profitAndLoss()
  const bs = balanceSheet()
  const ms = monthlySales()

  return (
    <div>
      <PageHeader title="Financial Statements" subtitle="Derived live from the journal — no period close required in the demo." />
      <Tabs tabs={['Profit & Loss', 'Balance Sheet', 'Cash Flow']} active={tab} onChange={setTab} />

      {tab === 'Profit & Loss' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Income</h3>
            {pl.income.map((r) => (
              <div key={r.account.id} className="flex justify-between text-sm py-1"><span className="text-slate-600">{r.account.name}</span><span>{currency(r.amount)}</span></div>
            ))}
            <div className="flex justify-between font-semibold border-t border-slate-200 mt-2 pt-2"><span>Total income</span><span>{currency(pl.totalIncome)}</span></div>
            <h3 className="font-semibold text-slate-800 mt-5 mb-3">Expenses</h3>
            {pl.expense.map((r) => (
              <div key={r.account.id} className="flex justify-between text-sm py-1"><span className="text-slate-600">{r.account.name}</span><span>{currency(r.amount)}</span></div>
            ))}
            <div className="flex justify-between font-semibold border-t border-slate-200 mt-2 pt-2"><span>Total expenses</span><span>{currency(pl.totalExpense)}</span></div>
            <div className={`flex justify-between font-bold text-lg mt-3 pt-2 border-t-2 border-slate-300 ${pl.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              <span>Net {pl.netProfit >= 0 ? 'profit' : 'loss'}</span><span>{currency(Math.abs(pl.netProfit))}</span>
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Monthly gross profit</h3>
            <BarChart data={ms.map((m) => ({ label: monthLabel(m.month), value: Math.round(m.grossProfit) }))} format={(n) => currency(n)} height={200} tone="blue" />
          </Card>
        </div>
      )}

      {tab === 'Balance Sheet' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Assets</h3>
            {bs.assets.map((r) => <div key={r.account.id} className="flex justify-between text-sm py-1"><span className="text-slate-600">{r.account.name}</span><span>{currency(r.amount)}</span></div>)}
            <div className="flex justify-between font-bold border-t-2 border-slate-300 mt-2 pt-2"><span>Total assets</span><span>{currency(bs.totalAssets)}</span></div>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Liabilities</h3>
            {bs.liabilities.map((r) => <div key={r.account.id} className="flex justify-between text-sm py-1"><span className="text-slate-600">{r.account.name}</span><span>{currency(r.amount)}</span></div>)}
            <div className="flex justify-between font-semibold border-t border-slate-200 mt-2 pt-2"><span>Total liabilities</span><span>{currency(bs.totalLiabilities)}</span></div>
            <h3 className="font-semibold text-slate-800 mt-5 mb-3">Equity</h3>
            {bs.equity.map((r) => <div key={r.account.id} className="flex justify-between text-sm py-1"><span className="text-slate-600">{r.account.name}</span><span>{currency(r.amount)}</span></div>)}
            <div className="flex justify-between text-sm py-1"><span className="text-slate-600">Retained earnings (period)</span><span>{currency(bs.totalEquity - bs.equity.reduce((s, r) => s + r.amount, 0))}</span></div>
            <div className="flex justify-between font-bold border-t-2 border-slate-300 mt-2 pt-2"><span>Liabilities + equity</span><span>{currency(bs.totalLiabilities + bs.totalEquity)}</span></div>
          </Card>
        </div>
      )}

      {tab === 'Cash Flow' && (
        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Indicative monthly cash movement</h3>
          <p className="text-xs text-slate-400 mb-3">Net of collections in and expenses / payroll / supplier payments out.</p>
          <BarChart
            data={ms.map((m) => ({ label: monthLabel(m.month), value: Math.round(m.revenue - m.cogs - m.revenue * 0.18) }))}
            format={(n) => currency(n)}
            height={200}
          />
        </Card>
      )}
    </div>
  )
}

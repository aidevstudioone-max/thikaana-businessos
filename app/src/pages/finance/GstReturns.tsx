import React, { useState } from 'react'
import { gstReturns } from '../../lib/selectors'
import { Button, Card, currency, monthLabel, PageHeader, Tabs, Table, Toast } from '../../components/ui'

export default function GstReturns() {
  const rows = gstReturns()
  const [tab, setTab] = useState('Summary')
  const [msg, setMsg] = useState('')
  const latest = rows[rows.length - 1]
  const totalOutput = latest.cgst + latest.sgst + latest.igst
  const netPayable = Math.max(0, totalOutput - latest.inputCredit)

  return (
    <div>
      <PageHeader
        title="GST Returns"
        subtitle="GSTR-1 (outward supplies) and GSTR-3B (summary) built from your invoices, purchases and expenses."
        actions={<Button variant="secondary" onClick={() => setMsg('CA-ready export generated (demo).')}>Export for CA</Button>}
      />
      <Tabs tabs={['Summary', 'GSTR-1', 'GSTR-3B']} active={tab} onChange={setTab} />

      {tab === 'Summary' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Card className="p-4"><p className="text-[11px] uppercase text-slate-400">Period</p><p className="text-lg font-bold">{monthLabel(latest.period)}</p></Card>
            <Card className="p-4"><p className="text-[11px] uppercase text-slate-400">Output tax</p><p className="text-lg font-bold">{currency(totalOutput)}</p></Card>
            <Card className="p-4"><p className="text-[11px] uppercase text-slate-400">Input credit</p><p className="text-lg font-bold text-emerald-600">{currency(latest.inputCredit)}</p></Card>
            <Card className="p-4"><p className="text-[11px] uppercase text-slate-400">Net payable</p><p className="text-lg font-bold text-red-600">{currency(netPayable)}</p></Card>
          </div>
          <Card>
            <Table columns={['Period', 'Taxable value', 'CGST', 'SGST', 'IGST', 'Invoices', 'Input credit', 'Net payable']}>
              {rows.slice().reverse().map((r) => {
                const out = r.cgst + r.sgst + r.igst
                return (
                  <tr key={r.period} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium">{monthLabel(r.period)}</td>
                    <td className="py-2 px-3">{currency(r.taxableValue)}</td>
                    <td className="py-2 px-3">{currency(r.cgst)}</td>
                    <td className="py-2 px-3">{currency(r.sgst)}</td>
                    <td className="py-2 px-3">{currency(r.igst)}</td>
                    <td className="py-2 px-3 text-slate-500">{r.invoiceCount}</td>
                    <td className="py-2 px-3 text-emerald-600">{currency(r.inputCredit)}</td>
                    <td className="py-2 px-3 font-medium">{currency(Math.max(0, out - r.inputCredit))}</td>
                  </tr>
                )
              })}
            </Table>
          </Card>
        </>
      )}

      {tab === 'GSTR-1' && (
        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-1">GSTR-1 · {monthLabel(latest.period)}</h3>
          <p className="text-xs text-slate-400 mb-3">Table-wise outward supplies summary.</p>
          <Table columns={['Table', 'Description', 'Taxable value', 'Tax']}>
            <tr><td className="py-2 px-3">4A / 4B</td><td className="py-2 px-3 text-slate-600">B2B invoices</td><td className="py-2 px-3">{currency(latest.taxableValue * 0.7)}</td><td className="py-2 px-3">{currency((latest.cgst + latest.sgst + latest.igst) * 0.7)}</td></tr>
            <tr><td className="py-2 px-3">5 / 7</td><td className="py-2 px-3 text-slate-600">B2C (large + small)</td><td className="py-2 px-3">{currency(latest.taxableValue * 0.3)}</td><td className="py-2 px-3">{currency((latest.cgst + latest.sgst + latest.igst) * 0.3)}</td></tr>
            <tr><td className="py-2 px-3">9B</td><td className="py-2 px-3 text-slate-600">Credit / debit notes</td><td className="py-2 px-3 text-slate-400">—</td><td className="py-2 px-3 text-slate-400">—</td></tr>
          </Table>
          <Button className="mt-4" onClick={() => setMsg('GSTR-1 JSON prepared for upload (demo).')}>Prepare filing JSON</Button>
        </Card>
      )}

      {tab === 'GSTR-3B' && (
        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 mb-1">GSTR-3B · {monthLabel(latest.period)}</h3>
          <div className="text-sm mt-3 space-y-1 max-w-md">
            <div className="flex justify-between"><span className="text-slate-600">3.1(a) Outward taxable supplies</span><span>{currency(latest.taxableValue)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Output CGST + SGST</span><span>{currency(latest.cgst + latest.sgst)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Output IGST</span><span>{currency(latest.igst)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-1"><span className="text-slate-600">4. Eligible ITC</span><span className="text-emerald-600">{currency(latest.inputCredit)}</span></div>
            <div className="flex justify-between font-bold border-t-2 border-slate-300 pt-1"><span>Net tax payable in cash</span><span>{currency(netPayable)}</span></div>
          </div>
          <Button className="mt-4" onClick={() => setMsg('GSTR-3B marked ready to file (demo).')}>Mark ready to file</Button>
        </Card>
      )}
      {msg && <Toast message={msg} onClose={() => setMsg('')} />}
    </div>
  )
}

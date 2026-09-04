import React, { useState } from 'react'
import { COLLECTIONS, getAll, load } from '../../lib/db'
import { useMyEmployee } from '../../lib/portal'
import { Button, Card, currency, EmptyState, Modal, PageHeader, Table } from '../../components/ui'
import type { Company, Payslip } from '../../lib/types'

export default function MyPayslips() {
  const { employee } = useMyEmployee()
  const company = load<Company>(COLLECTIONS.company, {} as Company)
  const [view, setView] = useState<Payslip | null>(null)
  if (!employee) return <EmptyState title="No employee record linked" />

  const slips = getAll<Payslip>(COLLECTIONS.payslips).filter((p) => p.employeeId === employee.id).sort((a, b) => b.period.localeCompare(a.period))

  return (
    <div>
      <PageHeader title="My Payslips" subtitle={`${slips.length} payslips on file`} />
      <Card>
        {slips.length === 0 ? <EmptyState title="No payslips" /> : (
          <Table columns={['Period', 'Paid days', 'Gross', 'Deductions', 'Net pay', 'Status', '']}>
            {slips.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium">{s.period}</td>
                <td className="py-2.5 px-3 text-slate-500">{s.paidDays}/{s.workingDays}</td>
                <td className="py-2.5 px-3">{currency(s.grossEarnings)}</td>
                <td className="py-2.5 px-3 text-red-600">{currency(s.totalDeductions)}</td>
                <td className="py-2.5 px-3 font-medium">{currency(s.netPay)}</td>
                <td className="py-2.5 px-3 text-xs text-slate-400">{s.status}</td>
                <td className="py-2.5 px-3 text-right"><button className="text-xs text-brand-600 hover:underline" onClick={() => setView(s)}>View →</button></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {view && (
        <Modal title={`Payslip · ${view.period}`} onClose={() => setView(null)}>
          <div id="print-area">
            <p className="font-bold text-slate-900">{company.legalName}</p>
            <p className="text-xs text-slate-500 mb-3">Payslip for {view.period} · {employee.name} ({employee.empCode})</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Earnings</p>
                {view.earnings.map((e) => <div key={e.label} className="flex justify-between text-sm py-0.5"><span className="text-slate-600">{e.label}</span><span>{currency(e.amount)}</span></div>)}
                <div className="flex justify-between text-sm font-semibold border-t border-slate-200 mt-1 pt-1"><span>Gross</span><span>{currency(view.grossEarnings)}</span></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Deductions</p>
                {view.deductions.length === 0 && <p className="text-sm text-slate-400">None</p>}
                {view.deductions.map((d) => <div key={d.label} className="flex justify-between text-sm py-0.5"><span className="text-slate-600">{d.label}</span><span>{currency(d.amount)}</span></div>)}
                <div className="flex justify-between text-sm font-semibold border-t border-slate-200 mt-1 pt-1"><span>Total</span><span>{currency(view.totalDeductions)}</span></div>
              </div>
            </div>
            <div className="flex justify-between text-lg font-bold border-t-2 border-slate-300 mt-3 pt-2"><span>Net pay</span><span>{currency(view.netPay)}</span></div>
            <p className="text-[11px] text-slate-400 mt-3">{load<any>(COLLECTIONS.settings, {}).payslipNote}</p>
          </div>
          <div className="flex justify-end mt-3 no-print"><Button variant="secondary" onClick={() => window.print()}>Print / Save PDF</Button></div>
        </Modal>
      )}
    </div>
  )
}

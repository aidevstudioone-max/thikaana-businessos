import React, { useState } from 'react'
import { COLLECTIONS, genId, getAll, saveAll } from '../../lib/db'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { employeeName } from '../../lib/selectors'
import { payrollCostByMonth } from '../../lib/selectors'
import { BarChart, Button, Card, currency, EmptyState, Modal, monthLabel, PageHeader, StatCard, StatusBadge, Table, Toast } from '../../components/ui'
import type { Employee, PayrollRun, Payslip } from '../../lib/types'

export default function Payroll() {
  const { user, can } = useAuth()
  const [runs, setRuns] = useState<PayrollRun[]>(() => getAll<PayrollRun>(COLLECTIONS.payrollRuns).sort((a, b) => b.period.localeCompare(a.period)))
  const [slips, setSlips] = useState<Payslip[]>(() => getAll<Payslip>(COLLECTIONS.payslips))
  const [viewPeriod, setViewPeriod] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const employees = getAll<Employee>(COLLECTIONS.employees)
  const cost = payrollCostByMonth()

  const nextPeriod = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
  const alreadyRun = runs.some((r) => r.period === nextPeriod)

  const runPayroll = () => {
    const active = employees.filter((e) => e.status !== 'EXITED')
    const workingDays = 26
    const newSlips: Payslip[] = active.map((e) => {
      const monthly = e.ctcAnnual / 12
      const basic = Math.round(monthly * (e.basicPct / 100))
      const hra = Math.round(monthly * (e.hraPct / 100))
      const special = Math.round(monthly - basic - hra)
      const pf = e.pfNumber ? Math.round(Math.min(basic, 15000) * 0.12) : 0
      const esi = e.esiNumber ? Math.round((basic + hra + special) * 0.0075) : 0
      const tds = monthly > 100000 ? Math.round(monthly * 0.1) : monthly > 60000 ? Math.round(monthly * 0.05) : 0
      const gross = basic + hra + special
      const ded = pf + esi + tds
      return {
        id: genId('ps'), employeeId: e.id, period: nextPeriod, workingDays, paidDays: workingDays, lopDays: 0,
        earnings: [{ label: 'Basic', amount: basic, kind: 'EARNING' }, { label: 'HRA', amount: hra, kind: 'EARNING' }, { label: 'Special Allowance', amount: special, kind: 'EARNING' }],
        deductions: [...(pf ? [{ label: 'Provident Fund', amount: pf, kind: 'DEDUCTION' as const }] : []), ...(esi ? [{ label: 'ESI', amount: esi, kind: 'DEDUCTION' as const }] : []), ...(tds ? [{ label: 'TDS', amount: tds, kind: 'DEDUCTION' as const }] : [])],
        grossEarnings: gross, totalDeductions: ded, netPay: gross - ded, status: 'PROCESSED', processedAt: new Date().toISOString(), paidAt: null
      }
    })
    const run: PayrollRun = {
      id: genId('pr'), period: nextPeriod, status: 'PROCESSED', employeeCount: newSlips.length,
      grossTotal: newSlips.reduce((s, x) => s + x.grossEarnings, 0), deductionTotal: newSlips.reduce((s, x) => s + x.totalDeductions, 0),
      netTotal: newSlips.reduce((s, x) => s + x.netPay, 0), processedByUserId: user?.id ?? 'system', processedAt: new Date().toISOString()
    }
    const allSlips = [...getAll<Payslip>(COLLECTIONS.payslips), ...newSlips]
    const allRuns = [run, ...getAll<PayrollRun>(COLLECTIONS.payrollRuns)]
    saveAll(COLLECTIONS.payslips, allSlips)
    saveAll(COLLECTIONS.payrollRuns, allRuns)
    setSlips(allSlips); setRuns(allRuns.sort((a, b) => b.period.localeCompare(a.period)))
    logAudit(user, 'Payroll', 'PAYROLL_PROCESSED', nextPeriod, { detail: currency(run.netTotal) })
    setMsg(`Payroll for ${nextPeriod} processed — ${newSlips.length} payslips, net ${currency(run.netTotal)}.`)
  }

  const periodSlips = viewPeriod ? slips.filter((s) => s.period === viewPeriod) : []

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Monthly salary processing with PF, ESI and TDS."
        actions={can('payroll', 'create') && !alreadyRun && <Button onClick={runPayroll}>Run payroll · {nextPeriod}</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Last net payout" value={currency(runs[0]?.netTotal ?? 0)} />
        <StatCard label="Employees on payroll" value={String(runs[0]?.employeeCount ?? 0)} />
        <StatCard label="Runs on file" value={String(runs.length)} />
      </div>

      <Card className="p-4 mb-4">
        <h3 className="font-semibold text-slate-800 mb-3">Monthly payroll cost</h3>
        <BarChart data={cost.map((c) => ({ label: monthLabel(c.month), value: Math.round(c.net) }))} format={(n) => currency(n)} height={180} tone="amber" />
      </Card>

      <Card>
        {runs.length === 0 ? <EmptyState title="No payroll runs" /> : (
          <Table columns={['Period', 'Employees', 'Gross', 'Deductions', 'Net payout', 'Status', '']}>
            {runs.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium">{monthLabel(r.period)}</td>
                <td className="py-2.5 px-3">{r.employeeCount}</td>
                <td className="py-2.5 px-3">{currency(r.grossTotal)}</td>
                <td className="py-2.5 px-3 text-red-600">{currency(r.deductionTotal)}</td>
                <td className="py-2.5 px-3 font-medium">{currency(r.netTotal)}</td>
                <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                <td className="py-2.5 px-3 text-right"><button className="text-xs text-brand-600 hover:underline" onClick={() => setViewPeriod(r.period)}>Payslips →</button></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {viewPeriod && (
        <Modal title={`Payslips · ${viewPeriod}`} onClose={() => setViewPeriod(null)} wide>
          <Table columns={['Employee', 'Paid days', 'Gross', 'Deductions', 'Net pay']}>
            {periodSlips.map((s) => (
              <tr key={s.id}>
                <td className="py-2 px-3">{employeeName(s.employeeId)}</td>
                <td className="py-2 px-3 text-slate-500">{s.paidDays}/{s.workingDays}</td>
                <td className="py-2 px-3">{currency(s.grossEarnings)}</td>
                <td className="py-2 px-3 text-red-600">{currency(s.totalDeductions)}</td>
                <td className="py-2 px-3 font-medium">{currency(s.netPay)}</td>
              </tr>
            ))}
          </Table>
        </Modal>
      )}
      {msg && <Toast message={msg} onClose={() => setMsg('')} />}
    </div>
  )
}

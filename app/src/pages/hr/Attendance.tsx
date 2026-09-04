import React, { useMemo, useState } from 'react'
import { COLLECTIONS, getAll } from '../../lib/db'
import { employeeName } from '../../lib/selectors'
import { last12Months } from '../../lib/format'
import { Badge, Card, EmptyState, PageHeader, ProgressBar, Select, StatCard, Table } from '../../components/ui'
import type { AttendanceRecord, Employee } from '../../lib/types'

const tone: Record<string, any> = { PRESENT: 'green', ABSENT: 'red', HALF_DAY: 'amber', LEAVE: 'purple', WEEK_OFF: 'slate', HOLIDAY: 'blue' }

export default function Attendance() {
  const records = getAll<AttendanceRecord>(COLLECTIONS.attendance)
  const employees = getAll<Employee>(COLLECTIONS.employees).filter((e) => e.status !== 'EXITED')
  const months = Array.from(new Set(records.map((r) => r.date.slice(0, 7)))).sort().reverse()
  const [month, setMonth] = useState(months[0] ?? '')
  const [q, setQ] = useState('')

  const monthRecords = useMemo(() => records.filter((r) => r.date.slice(0, 7) === month), [records, month])
  const byEmp = useMemo(() => {
    const map: Record<string, { present: number; absent: number; leave: number; half: number; ot: number; working: number }> = {}
    for (const r of monthRecords) {
      const m = (map[r.employeeId] ??= { present: 0, absent: 0, leave: 0, half: 0, ot: 0, working: 0 })
      if (r.status !== 'WEEK_OFF' && r.status !== 'HOLIDAY') m.working++
      if (r.status === 'PRESENT') m.present++
      else if (r.status === 'ABSENT') m.absent++
      else if (r.status === 'LEAVE') m.leave++
      else if (r.status === 'HALF_DAY') m.half++
      m.ot += r.overtimeHours
    }
    return map
  }, [monthRecords])

  const rows = employees.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()))
  const avgPresence = rows.length
    ? Math.round(
        rows.reduce((s, e) => {
          const m = byEmp[e.id]
          return s + (m && m.working ? ((m.present + m.half * 0.5) / m.working) * 100 : 0)
        }, 0) / rows.length
      )
    : 0
  const totalOt = monthRecords.reduce((s, r) => s + r.overtimeHours, 0)
  const geoFlags = monthRecords.filter((r) => !r.withinGeofence && (r.status === 'PRESENT' || r.status === 'HALF_DAY')).length

  return (
    <div>
      <PageHeader title="Attendance & Shifts" subtitle="Web / mobile check-in with geo-fencing and overtime capture." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Avg presence" value={`${avgPresence}%`} tone={avgPresence > 90 ? 'good' : 'warn'} />
        <StatCard label="Overtime hours" value={String(totalOt)} />
        <StatCard label="Off-geofence check-ins" value={String(geoFlags)} tone={geoFlags ? 'warn' : 'default'} />
        <StatCard label="Headcount" value={String(employees.length)} />
      </div>
      <Card className="p-3 mb-4 flex flex-wrap gap-2">
        <Select value={month} onChange={setMonth} className="max-w-[160px]">{months.map((m) => <option key={m}>{m}</option>)}</Select>
        <input className="border border-slate-300 rounded-lg px-3 py-2 text-sm max-w-xs" placeholder="Search employee…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Card>
      <Card>
        {rows.length === 0 ? <EmptyState title="No employees" /> : (
          <Table columns={['Employee', 'Present', 'Half', 'Leave', 'Absent', 'OT hrs', 'Presence']}>
            {rows.map((e) => {
              const m = byEmp[e.id] ?? { present: 0, absent: 0, leave: 0, half: 0, ot: 0, working: 0 }
              const p = m.working ? Math.round(((m.present + m.half * 0.5) / m.working) * 100) : 0
              return (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-800">{e.name}</td>
                  <td className="py-2 px-3"><Badge tone="green">{m.present}</Badge></td>
                  <td className="py-2 px-3">{m.half || '—'}</td>
                  <td className="py-2 px-3">{m.leave || '—'}</td>
                  <td className="py-2 px-3">{m.absent ? <Badge tone="red">{m.absent}</Badge> : '—'}</td>
                  <td className="py-2 px-3 text-slate-500">{m.ot || '—'}</td>
                  <td className="py-2 px-3 w-40"><div className="flex items-center gap-2"><ProgressBar value={p} tone={p > 90 ? 'green' : p > 75 ? 'amber' : 'red'} /><span className="text-xs text-slate-500 w-9">{p}%</span></div></td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>
    </div>
  )
}

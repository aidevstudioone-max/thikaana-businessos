import React, { useState } from 'react'
import { COLLECTIONS, genId, getAll, saveAll } from '../../lib/db'
import { useMyEmployee } from '../../lib/portal'
import { Badge, Button, Card, EmptyState, PageHeader, StatCard, Table, Toast } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import type { AttendanceRecord, Shift } from '../../lib/types'

const tone: Record<string, any> = { PRESENT: 'green', ABSENT: 'red', HALF_DAY: 'amber', LEAVE: 'purple', WEEK_OFF: 'slate', HOLIDAY: 'blue' }

export default function MyAttendance() {
  const { employee } = useMyEmployee()
  const [records, setRecords] = useState<AttendanceRecord[]>(() =>
    getAll<AttendanceRecord>(COLLECTIONS.attendance).filter((a) => a.employeeId === employee?.id).sort((a, b) => b.date.localeCompare(a.date))
  )
  const [msg, setMsg] = useState('')
  if (!employee) return <EmptyState title="No employee record linked" />

  const today = new Date().toISOString().slice(0, 10)
  const todayRec = records.find((r) => r.date === today)
  const shifts = getAll<Shift>(COLLECTIONS.shifts)

  const checkIn = () => {
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const all = getAll<AttendanceRecord>(COLLECTIONS.attendance)
    let rec = all.find((r) => r.employeeId === employee.id && r.date === today)
    if (rec && rec.checkIn) {
      rec = { ...rec, checkOut: time }
      setMsg(`Checked out at ${time}.`)
    } else {
      rec = { id: rec?.id ?? genId('att'), employeeId: employee.id, date: today, shiftId: shifts[0]?.id ?? '', checkIn: time, checkOut: '', status: 'PRESENT', source: 'WEB', withinGeofence: true, overtimeHours: 0 }
      setMsg(`Checked in at ${time}.`)
    }
    const next = [rec!, ...all.filter((r) => !(r.employeeId === employee.id && r.date === today))]
    saveAll(COLLECTIONS.attendance, next)
    setRecords(next.filter((a) => a.employeeId === employee.id).sort((a, b) => b.date.localeCompare(a.date)))
  }

  const monthRecs = records.filter((r) => r.date.slice(0, 7) === today.slice(0, 7))
  const present = monthRecs.filter((r) => r.status === 'PRESENT' || r.status === 'HALF_DAY').length

  return (
    <div>
      <PageHeader
        title="My Attendance"
        subtitle="Web check-in — the mobile app adds GPS geo-fencing."
        actions={<Button onClick={checkIn}>{todayRec?.checkIn && !todayRec?.checkOut ? 'Check out' : 'Check in'}</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Today" value={todayRec ? `${todayRec.checkIn || '—'}${todayRec.checkOut ? ` – ${todayRec.checkOut}` : ''}` : 'Not marked'} />
        <StatCard label="Present this month" value={String(present)} />
        <StatCard label="Records" value={String(records.length)} />
      </div>
      <Card>
        {records.length === 0 ? <EmptyState title="No records" /> : (
          <Table columns={['Date', 'Status', 'Check in', 'Check out', 'Source', 'OT']}>
            {records.slice(0, 60).map((r) => (
              <tr key={r.id}>
                <td className="py-2 px-3 text-slate-600">{fmtDate(r.date)}</td>
                <td className="py-2 px-3"><Badge tone={tone[r.status]}>{r.status.replace('_', ' ')}</Badge></td>
                <td className="py-2 px-3 text-slate-500">{r.checkIn || '—'}</td>
                <td className="py-2 px-3 text-slate-500">{r.checkOut || '—'}</td>
                <td className="py-2 px-3 text-slate-400 text-xs">{r.source}{!r.withinGeofence && ' · off-site'}</td>
                <td className="py-2 px-3 text-slate-500">{r.overtimeHours || '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {msg && <Toast message={msg} onClose={() => setMsg('')} />}
    </div>
  )
}

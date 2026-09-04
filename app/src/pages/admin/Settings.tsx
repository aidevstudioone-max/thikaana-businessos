import React, { useState } from 'react'
import { COLLECTIONS, load, resetAll, save } from '../../lib/db'
import { seedAll } from '../../lib/seed'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, Field, inputCls, PageHeader, Select, Toast } from '../../components/ui'
import type { Settings as S } from '../../lib/types'

export default function Settings() {
  const { role } = useAuth()
  const readOnly = role?.id !== 'role_owner' && !role?.isSuperAdmin
  const [s, setS] = useState<S>(() => load<S>(COLLECTIONS.settings, {} as S))
  const [msg, setMsg] = useState('')

  const persist = () => {
    save(COLLECTIONS.settings, s)
    setMsg('Settings saved.')
  }
  const reset = () => {
    if (!confirm('Reset ALL demo data back to the seeded dataset? This cannot be undone.')) return
    resetAll(seedAll)
    location.hash = '/'
    location.reload()
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Numbering, tax defaults and demo controls." />
      <Card className="p-5 mb-4">
        <div className="grid sm:grid-cols-2 gap-x-5">
          <Field label="Currency"><input className={inputCls} disabled value={s.currency} /></Field>
          <Field label="Place of supply"><input className={inputCls} disabled={readOnly} value={s.placeOfSupply} onChange={(e) => setS({ ...s, placeOfSupply: e.target.value })} /></Field>
          <Field label="Invoice prefix"><input className={inputCls} disabled={readOnly} value={s.invoicePrefix} onChange={(e) => setS({ ...s, invoicePrefix: e.target.value })} /></Field>
          <Field label="Quotation prefix"><input className={inputCls} disabled={readOnly} value={s.quotePrefix} onChange={(e) => setS({ ...s, quotePrefix: e.target.value })} /></Field>
          <Field label="Purchase order prefix"><input className={inputCls} disabled={readOnly} value={s.poPrefix} onChange={(e) => setS({ ...s, poPrefix: e.target.value })} /></Field>
          <Field label="Receipt prefix"><input className={inputCls} disabled={readOnly} value={s.receiptPrefix} onChange={(e) => setS({ ...s, receiptPrefix: e.target.value })} /></Field>
          <Field label="Default GST rate %"><Select value={String(s.defaultGstRate)} onChange={(v) => setS({ ...s, defaultGstRate: Number(v) })}>{[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}</Select></Field>
          <Field label="Global low-stock threshold"><input type="number" className={inputCls} disabled={readOnly} value={s.lowStockGlobalThreshold} onChange={(e) => setS({ ...s, lowStockGlobalThreshold: Number(e.target.value) })} /></Field>
          <Field label="WhatsApp sender name"><input className={inputCls} disabled={readOnly} value={s.whatsappSenderName} onChange={(e) => setS({ ...s, whatsappSenderName: e.target.value })} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" disabled={readOnly} checked={s.enableRoundOff} onChange={(e) => setS({ ...s, enableRoundOff: e.target.checked })} /> Round off invoice totals to the nearest rupee</label>
        {!readOnly && <Button onClick={persist}>Save settings</Button>}
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-800 mb-1">Demo data</h3>
        <p className="text-sm text-slate-500 mb-3">This deployment has no live database. Everything lives in your browser and can be reset to the original seeded dataset (500 products, 100 customers, 50 employees, 12 months of history).</p>
        <Button variant="danger" onClick={reset}>Reset demo data</Button>
      </Card>
      {msg && <Toast message={msg} onClose={() => setMsg('')} />}
    </div>
  )
}

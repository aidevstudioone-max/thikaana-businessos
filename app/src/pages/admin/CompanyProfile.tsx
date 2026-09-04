import React, { useState } from 'react'
import { COLLECTIONS, load, save } from '../../lib/db'
import { useAuth } from '../../context/AuthContext'
import { logAudit } from '../../lib/audit'
import { Button, Card, Field, inputCls, PageHeader, Toast } from '../../components/ui'
import type { Company } from '../../lib/types'

export default function CompanyProfile() {
  const { user, role } = useAuth()
  const readOnly = role?.id !== 'role_owner' && !role?.isSuperAdmin
  const [c, setC] = useState<Company>(() => load<Company>(COLLECTIONS.company, {} as Company))
  const [msg, setMsg] = useState('')

  const set = (k: keyof Company, v: string) => setC({ ...c, [k]: v })

  const persist = () => {
    save(COLLECTIONS.company, c)
    logAudit(user, 'Company', 'COMPANY_UPDATED', c.name)
    setMsg('Company profile saved.')
  }

  return (
    <div>
      <PageHeader title="Company Profile" subtitle="Appears on invoices, quotations, purchase orders and payslips." />
      <Card className="p-5">
        <div className="grid sm:grid-cols-2 gap-x-5">
          <Field label="Trading name"><input className={inputCls} disabled={readOnly} value={c.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Legal name"><input className={inputCls} disabled={readOnly} value={c.legalName} onChange={(e) => set('legalName', e.target.value)} /></Field>
          <Field label="Tagline"><input className={inputCls} disabled={readOnly} value={c.tagline} onChange={(e) => set('tagline', e.target.value)} /></Field>
          <Field label="Industry"><input className={inputCls} disabled={readOnly} value={c.industry} onChange={(e) => set('industry', e.target.value)} /></Field>
          <Field label="GSTIN"><input className={inputCls} disabled={readOnly} value={c.gstin} onChange={(e) => set('gstin', e.target.value)} /></Field>
          <Field label="PAN"><input className={inputCls} disabled={readOnly} value={c.pan} onChange={(e) => set('pan', e.target.value)} /></Field>
          <Field label="Phone"><input className={inputCls} disabled={readOnly} value={c.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Email"><input className={inputCls} disabled={readOnly} value={c.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Website"><input className={inputCls} disabled={readOnly} value={c.website} onChange={(e) => set('website', e.target.value)} /></Field>
          <Field label="Financial year"><input className={inputCls} disabled={readOnly} value={c.financialYear} onChange={(e) => set('financialYear', e.target.value)} /></Field>
        </div>
        <Field label="Registered address"><input className={inputCls} disabled={readOnly} value={c.address} onChange={(e) => set('address', e.target.value)} /></Field>
        <div className="grid sm:grid-cols-3 gap-x-5">
          <Field label="City"><input className={inputCls} disabled={readOnly} value={c.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="State"><input className={inputCls} disabled={readOnly} value={c.state} onChange={(e) => set('state', e.target.value)} /></Field>
          <Field label="Pincode"><input className={inputCls} disabled={readOnly} value={c.pincode} onChange={(e) => set('pincode', e.target.value)} /></Field>
        </div>
        <h3 className="text-sm font-semibold text-slate-700 mt-2 mb-2">Bank details</h3>
        <div className="grid sm:grid-cols-2 gap-x-5">
          <Field label="Bank name"><input className={inputCls} disabled={readOnly} value={c.bankName} onChange={(e) => set('bankName', e.target.value)} /></Field>
          <Field label="Account number"><input className={inputCls} disabled={readOnly} value={c.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} /></Field>
          <Field label="IFSC"><input className={inputCls} disabled={readOnly} value={c.bankIfsc} onChange={(e) => set('bankIfsc', e.target.value)} /></Field>
          <Field label="UPI ID"><input className={inputCls} disabled={readOnly} value={c.upiId} onChange={(e) => set('upiId', e.target.value)} /></Field>
        </div>
        {!readOnly && <Button onClick={persist}>Save profile</Button>}
        {readOnly && <p className="text-sm text-amber-600">Only the Company Owner can edit the company profile.</p>}
      </Card>
      {msg && <Toast message={msg} onClose={() => setMsg('')} />}
    </div>
  )
}

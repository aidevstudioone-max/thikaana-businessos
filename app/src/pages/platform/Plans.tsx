import React from 'react'
import { COLLECTIONS, getAll } from '../../lib/db'
import { currency } from '../../lib/format'
import { Card, PageHeader } from '../../components/ui'
import type { PlatformPlan, Workspace } from '../../lib/types'

export default function Plans() {
  const plans = getAll<PlatformPlan>(COLLECTIONS.platformPlans)
  const workspaces = getAll<Workspace>(COLLECTIONS.workspaces)

  return (
    <div>
      <PageHeader title="Subscription Plans" subtitle="What Thikaana sells. Module limits map to the in-app module engine." />
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const count = workspaces.filter((w) => w.plan === p.name).length
          return (
            <Card key={p.id} className="p-5">
              <p className="font-bold text-lg text-slate-900">{p.name}</p>
              <p className="text-2xl font-bold text-brand-600 mt-1">{currency(p.pricePerMonth)}<span className="text-sm text-slate-400 font-normal">/mo</span></p>
              <p className="text-xs text-slate-400 mt-1">{count} workspace{count === 1 ? '' : 's'} on this plan</p>
              <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                <li>👥 {p.seatLimit === -1 ? 'Unlimited' : p.seatLimit} users</li>
                <li>🧩 {p.moduleLimit === -1 ? 'All' : `Up to ${p.moduleLimit}`} modules</li>
                {p.features.map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

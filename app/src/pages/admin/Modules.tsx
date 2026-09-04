import React, { useState } from 'react'
import { useModules } from '../../context/ModuleContext'
import { useAuth } from '../../context/AuthContext'
import { CATEGORY_LABELS, CATEGORY_ORDER, MODULE_DEFS, MODULE_MAP, PHASE_LABELS } from '../../lib/modules'
import { Badge, Card, PageHeader, Toast } from '../../components/ui'

export default function Modules() {
  const { isEnabled, enableModule, disableModule } = useModules()
  const { role, isSuperAdmin } = useAuth()
  const canToggle = isSuperAdmin || role?.id === 'role_owner'
  const [msg, setMsg] = useState('')

  const toggle = (id: string) => {
    const res = isEnabled(id) ? disableModule(id) : enableModule(id)
    if (!res.ok) setMsg(`${res.error}${res.blockers?.length ? ` (${res.blockers.join(', ')})` : ''}`)
    else setMsg('')
  }

  const enabledCount = MODULE_DEFS.filter((m) => isEnabled(m.id)).length

  return (
    <div>
      <PageHeader
        title="Modules"
        subtitle={`${enabledCount} of ${MODULE_DEFS.length} capabilities on. A module needs its dependencies enabled first — this is what lets one product fit a corner shop and a manufacturing SME.`}
      />
      {!canToggle && <p className="text-sm text-amber-600 mb-3">Only the Company Owner (or Thikaana Super Admin) can change modules.</p>}

      {CATEGORY_ORDER.map((cat) => (
        <div key={cat} className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{CATEGORY_LABELS[cat]}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {MODULE_DEFS.filter((m) => m.category === cat).map((m) => {
              const on = isEnabled(m.id)
              return (
                <Card key={m.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800">{m.name}</p>
                        <Badge tone="slate">{PHASE_LABELS[m.phase].split('·')[0].trim()}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                      {m.dependsOn.length > 0 && (
                        <p className="text-[11px] text-slate-400 mt-1">Needs: {m.dependsOn.map((d) => MODULE_MAP[d].name).join(', ')}</p>
                      )}
                    </div>
                    <button
                      disabled={!canToggle}
                      onClick={() => toggle(m.id)}
                      className={`shrink-0 w-11 h-6 rounded-full transition-colors relative disabled:opacity-40 ${on ? 'bg-brand-600' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                  <div className="mt-2"><Badge tone={on ? 'green' : 'slate'}>{on ? 'Enabled' : 'Disabled'}</Badge></div>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
      {msg && <Toast message={msg} onClose={() => setMsg('')} />}
    </div>
  )
}

import React, { createContext, useContext, useState } from 'react'
import { COLLECTIONS, getAll, saveAll } from '../lib/db'
import { MODULE_MAP, missingDependencies, transitiveDependents } from '../lib/modules'
import { logAudit } from '../lib/audit'
import { useAuth } from './AuthContext'
import type { ModuleState } from '../lib/types'

export interface ToggleResult {
  ok: boolean
  error?: string
  blockers?: string[]
}

interface ModuleCtx {
  states: ModuleState[]
  isEnabled: (id: string) => boolean
  enableModule: (id: string) => ToggleResult
  disableModule: (id: string) => ToggleResult
  refresh: () => void
}

const Ctx = createContext<ModuleCtx | null>(null)

export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, role } = useAuth()
  const canToggle = isSuperAdmin || role?.id === 'role_owner'
  const [states, setStates] = useState<ModuleState[]>(() => getAll<ModuleState>(COLLECTIONS.moduleStates))

  const persist = (next: ModuleState[]) => {
    saveAll(COLLECTIONS.moduleStates, next)
    setStates(next)
  }

  const isEnabled = (id: string) => states.find((s) => s.id === id)?.status === 'ENABLED'

  const enableModule = (id: string): ToggleResult => {
    if (!canToggle) return { ok: false, error: 'Only the Company Owner can enable or disable modules.' }
    const missing = missingDependencies(id, states)
    if (missing.length) {
      return {
        ok: false,
        error: `Cannot enable ${MODULE_MAP[id].name} until its dependencies are enabled first.`,
        blockers: missing.map((m) => m.name)
      }
    }
    persist(
      states.map((s) =>
        s.id === id ? { ...s, status: 'ENABLED' as const, enabledAt: new Date().toISOString() } : s
      )
    )
    logAudit(user, 'Modules', 'MODULE_ENABLED', MODULE_MAP[id].name)
    return { ok: true }
  }

  const disableModule = (id: string): ToggleResult => {
    if (!canToggle) return { ok: false, error: 'Only the Company Owner can enable or disable modules.' }
    const dependents = transitiveDependents(id, states)
    if (dependents.length) {
      return {
        ok: false,
        error: `${MODULE_MAP[id].name} cannot be disabled because other enabled modules depend on it.`,
        blockers: dependents.map((d) => d.name)
      }
    }
    persist(
      states.map((s) =>
        s.id === id ? { ...s, status: 'DISABLED' as const, disabledAt: new Date().toISOString() } : s
      )
    )
    logAudit(user, 'Modules', 'MODULE_DISABLED', MODULE_MAP[id].name)
    return { ok: true }
  }

  return (
    <Ctx.Provider
      value={{
        states,
        isEnabled,
        enableModule,
        disableModule,
        refresh: () => setStates(getAll<ModuleState>(COLLECTIONS.moduleStates))
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useModules(): ModuleCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useModules must be used within ModuleProvider')
  return ctx
}

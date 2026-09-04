import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useModules } from '../context/ModuleContext'
import { MODULE_MAP } from '../lib/modules'
import { AccessDeniedNotice, ModuleDisabledNotice } from './ui'

export default function Gate({
  moduleId,
  action = 'view',
  selfService = false,
  children
}: {
  moduleId: string
  action?: string
  // selfService pages ("My Workspace") only require the module to be switched on —
  // any linked employee may use them regardless of their role permissions.
  selfService?: boolean
  children: React.ReactNode
}) {
  const { isEnabled } = useModules()
  const { can } = useAuth()
  if (!isEnabled(moduleId)) return <ModuleDisabledNotice moduleName={MODULE_MAP[moduleId]?.name ?? moduleId} />
  if (!selfService && !can(moduleId, action)) return <AccessDeniedNotice />
  return <>{children}</>
}

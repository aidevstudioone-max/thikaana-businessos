import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useModules } from '../context/ModuleContext'
import { MODULE_MAP } from '../lib/modules'
import { AccessDeniedNotice, ModuleDisabledNotice } from './ui'

export default function Gate({
  moduleId,
  action = 'view',
  children
}: {
  moduleId: string
  action?: string
  children: React.ReactNode
}) {
  const { isEnabled } = useModules()
  const { can } = useAuth()
  if (!isEnabled(moduleId)) return <ModuleDisabledNotice moduleName={MODULE_MAP[moduleId]?.name ?? moduleId} />
  if (!can(moduleId, action)) return <AccessDeniedNotice />
  return <>{children}</>
}

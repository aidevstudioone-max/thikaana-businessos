import { COLLECTIONS, genId, getAll, saveAll } from './db'
import type { AuditLogEntry, User } from './types'

export function logAudit(
  user: User | null,
  module: string,
  action: string,
  entity: string,
  extra: Partial<AuditLogEntry> = {}
): void {
  const entries = getAll<AuditLogEntry>(COLLECTIONS.auditLog)
  entries.unshift({
    id: genId('audit'),
    ts: new Date().toISOString(),
    userId: user?.id ?? 'system',
    userName: user?.name ?? 'System',
    module,
    action,
    entity,
    ...extra
  })
  saveAll(COLLECTIONS.auditLog, entries.slice(0, 2000))
}

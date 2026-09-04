import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { COLLECTIONS, getAll, load, save } from '../lib/db'
import { hasPermission } from '../lib/permissions'
import { logAudit } from '../lib/audit'
import type { Role, User } from '../lib/types'

interface AuthCtx {
  user: User | null
  role: Role | null
  users: User[]
  roles: Role[]
  login: (identifier: string, password: string) => { ok: boolean; error?: string }
  logout: () => void
  can: (moduleId: string, action: string) => boolean
  isSuperAdmin: boolean
  refreshUsers: () => void
  refreshRoles: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => load<User | null>(COLLECTIONS.session, null))
  const [users, setUsers] = useState<User[]>(() => getAll<User>(COLLECTIONS.users))
  const [roles, setRoles] = useState<Role[]>(() => getAll<Role>(COLLECTIONS.roles))

  useEffect(() => {
    save(COLLECTIONS.session, user)
  }, [user])

  const role = useMemo(() => roles.find((r) => r.id === user?.roleId) ?? null, [roles, user])

  const login = (identifier: string, password: string) => {
    const id = identifier.trim().toLowerCase()
    const found = users.find(
      (u) =>
        (u.username.toLowerCase() === id || u.email.toLowerCase() === id || u.mobile === identifier.trim()) &&
        u.password === password
    )
    if (!found) return { ok: false, error: 'Invalid credentials. Try one of the demo accounts below.' }
    if (found.status !== 'ACTIVE') return { ok: false, error: 'This account is inactive. Contact your administrator.' }
    setUser(found)
    logAudit(found, 'Auth', 'LOGIN', 'Session')
    return { ok: true }
  }

  const logout = () => {
    if (user) logAudit(user, 'Auth', 'LOGOUT', 'Session')
    setUser(null)
  }

  const can = (moduleId: string, action: string) => hasPermission(role ?? undefined, moduleId, action)

  return (
    <Ctx.Provider
      value={{
        user,
        role,
        users,
        roles,
        login,
        logout,
        can,
        isSuperAdmin: !!role?.isSuperAdmin,
        refreshUsers: () => setUsers(getAll<User>(COLLECTIONS.users)),
        refreshRoles: () => setRoles(getAll<Role>(COLLECTIONS.roles))
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

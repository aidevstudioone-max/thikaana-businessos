import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { ADMIN_NAV } from '../lib/nav'
import { useAuth } from '../context/AuthContext'
import { useModules } from '../context/ModuleContext'
import { COLLECTIONS, getAll, load } from '../lib/db'
import type { Company, Notification } from '../lib/types'

function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as any)[name] || Icons.Circle
  return <Cmp className={className} size={17} strokeWidth={2} />
}

export default function Layout() {
  const { user, role, logout } = useAuth()
  const { isEnabled } = useModules()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const company = load<Company>(COLLECTIONS.company, {} as Company)
  const unread = getAll<Notification>(COLLECTIONS.notifications).filter((n) => !n.read).length

  const visibleSections = ADMIN_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.moduleId === null || isEnabled(item.moduleId))
  })).filter((s) => s.items.length > 0)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const sidebar = (
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-200 flex flex-col h-full">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-800 shrink-0">
        <span className="text-xl">🧩</span>
        <span className="font-bold text-white text-sm leading-tight">Thikaana BusinessOS</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {visibleSections.map((section, i) => (
          <div key={i}>
            {section.title && (
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                      isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon name={item.icon} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 py-2 border-t border-slate-800 text-[11px] text-slate-500">
        Demo data · no live database
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      <div className="hidden lg:block">{sidebar}</div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden text-slate-500" onClick={() => setOpen(true)}>
              <Icon name="Menu" />
            </button>
            <div className="text-sm text-slate-500 truncate">
              {company.name} <span className="text-slate-300 hidden sm:inline">/ {company.tagline}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <NavLink to="/notifications" className="relative text-slate-500 hover:text-slate-800">
              <Icon name="Bell" />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {unread}
                </span>
              )}
            </NavLink>
            <div className="text-right leading-tight hidden sm:block">
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-400">{role?.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg px-3 py-1.5"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

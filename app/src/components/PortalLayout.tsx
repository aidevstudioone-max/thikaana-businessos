import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useModules } from '../context/ModuleContext'
import type { NavItem } from '../lib/nav'

function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as any)[name] || Icons.Circle
  return <Cmp className={className} size={16} strokeWidth={2} />
}

export default function PortalLayout({ nav, brand, emoji }: { nav: NavItem[]; brand: string; emoji: string }) {
  const { user, role, logout } = useAuth()
  const { isEnabled } = useModules()
  const navigate = useNavigate()

  const items = nav.filter((i) => i.moduleId === null || isEnabled(i.moduleId))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">{emoji}</span>
            <span className="font-bold text-sm text-slate-900 truncate">{brand}</span>
          </div>
          <div className="flex items-center gap-3">
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
        </div>
        <nav className="max-w-5xl mx-auto px-2 flex gap-1 overflow-x-auto border-t border-slate-100">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5">
        <Outlet />
      </main>
      <footer className="text-center text-[11px] text-slate-400 py-3">
        Thikaana BusinessOS · demo data, no live database
      </footer>
    </div>
  )
}

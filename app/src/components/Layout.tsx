import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { ADMIN_NAV, MY_WORKSPACE_NAV, type NavSection } from '../lib/nav'
import { useAuth } from '../context/AuthContext'
import { useModules } from '../context/ModuleContext'
import { COLLECTIONS, getAll, load } from '../lib/db'
import type { Company, Notification } from '../lib/types'

function Icon({ name, className, size = 17 }: { name: string; className?: string; size?: number }) {
  const Cmp = (Icons as any)[name] || Icons.Circle
  return <Cmp className={className} size={size} strokeWidth={2} />
}

function itemMatches(path: string, pathname: string) {
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(path + '/')
}

const navItemCls = (isActive: boolean, muted = false) =>
  `flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm nav-liquid ${
    isActive
      ? 'nav-liquid-active text-white'
      : muted
      ? 'text-slate-400 hover:text-slate-100'
      : 'text-slate-200 hover:text-white'
  }`

export default function Layout() {
  const { user, role, logout, can, isSuperAdmin } = useAuth()
  const { isEnabled } = useModules()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false) // mobile drawer
  const company = load<Company>(COLLECTIONS.company, {} as Company)
  const unread = getAll<Notification>(COLLECTIONS.notifications).filter((n) => !n.read).length

  const isAdminUser = role?.id === 'role_owner' || isSuperAdmin

  const visibleSections: NavSection[] = ADMIN_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.adminOnly && !isAdminUser) return false
      if (item.moduleId === null) return true
      return isEnabled(item.moduleId) && can(item.moduleId, 'view')
    })
  })).filter((s) => s.items.length > 0)

  // Self-service section for anyone attached to an employee record.
  if (user?.linkedEmployeeId) {
    const items = MY_WORKSPACE_NAV.filter((it) => it.moduleId === null || isEnabled(it.moduleId))
    if (items.length) visibleSections.push({ title: 'My Workspace', items })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const sectionActive = (items: { path: string }[]) => items.some((it) => itemMatches(it.path, pathname))

  // Exclusive accordion: whichever section holds the current route opens by default;
  // opening any section (by click) closes every other one, since only one title is ever tracked.
  const activeSectionTitle = visibleSections.find((s) => s.title && sectionActive(s.items))?.title ?? null
  const [openSection, setOpenSection] = useState<string | null>(activeSectionTitle)
  const [manuallyClosed, setManuallyClosed] = useState(false)

  useEffect(() => {
    setOpenSection(activeSectionTitle)
    setManuallyClosed(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const isExpanded = (title: string) => !manuallyClosed && openSection === title

  const toggleSection = (title: string) => {
    if (isExpanded(title)) {
      setManuallyClosed(true)
    } else {
      setOpenSection(title)
      setManuallyClosed(false)
    }
  }

  const sidebar = (
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-200 flex flex-col h-full">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-800 shrink-0">
        <span className="text-xl">🧩</span>
        <span className="font-bold text-white text-sm leading-tight">Thikaana BusinessOS</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1.5">
        {visibleSections.map((section, i) => {
          if (!section.title) {
            return (
              <div key={i} className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) => navItemCls(isActive)}
                  >
                    <Icon name={item.icon} />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )
          }

          const isActiveSection = sectionActive(section.items)
          const expanded = isExpanded(section.title)

          return (
            <div key={i}>
              <button
                onClick={() => toggleSection(section.title)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl nav-liquid text-xs font-extrabold uppercase tracking-wider ${
                  expanded || isActiveSection ? 'text-brand-300' : 'text-brand-400'
                }`}
              >
                <span>{section.title}</span>
                <Icon
                  name="ChevronDown"
                  size={13}
                  className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                />
              </button>
              {expanded && (
                <div className="space-y-1 pt-1 pl-1" style={{ animation: 'popUp .18s ease both' }}>
                  {section.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/' || section.items.some((o) => o.path !== item.path && o.path.startsWith(item.path + '/'))}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) => navItemCls(isActive, true)}
                    >
                      <Icon name={item.icon} size={16} />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      <div className="px-3 py-2 border-t border-slate-800 text-[11px] text-slate-500">Demo data · no live database</div>
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

import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { inputCls } from '../components/ui'

const DEMO_USERS = [
  { label: 'Super Admin (Thikaana)', user: 'superadmin', pass: 'super123', hint: 'Platform / SaaS console' },
  { label: 'Company Owner', user: 'owner', pass: 'owner123', hint: 'Full business access' },
  { label: 'Manager', user: 'manager', pass: 'manager123', hint: 'Inventory · sales · purchasing' },
  { label: 'HR', user: 'hr', pass: 'hr123', hint: 'Employees · attendance · payroll' },
  { label: 'Accountant', user: 'accountant', pass: 'account123', hint: 'Billing · accounting · GST' },
  { label: 'Sales Executive', user: 'sales', pass: 'sales123', hint: 'Leads · quotes · orders' },
  { label: 'Employee', user: 'employee', pass: 'employee123', hint: 'Self-service portal' }
]

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const res = login(identifier, password)
    if (!res.ok) setError(res.error ?? 'Login failed')
    else navigate('/')
  }

  const fillDemo = (u: string, p: string) => {
    setIdentifier(u)
    setPassword(p)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="hidden md:flex flex-col justify-between bg-brand-700 text-white p-8">
          <div>
            <div className="text-3xl mb-2">🧩</div>
            <h1 className="text-xl font-bold">Thikaana BusinessOS</h1>
            <p className="text-brand-100 text-sm mt-2">
              Inventory · Billing · GST · Accounting · HR · Payroll · CRM · Analytics — one platform to run an entire
              business, for retailers, distributors, wholesalers, manufacturers and SMEs.
            </p>
          </div>
          <p className="text-xs text-brand-200">
            Enabled module + role permission + module dependency graph = what a user can do.
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 mb-6">Use your username, email or mobile.</p>
          <form onSubmit={submit}>
            <label className="block mb-3">
              <span className="block text-xs font-medium text-slate-600 mb-1">Username / Email / Mobile</span>
              <input
                className={inputCls}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="owner"
                autoFocus
              />
            </label>
            <label className="block mb-4">
              <span className="block text-xs font-medium text-slate-600 mb-1">Password</span>
              <input
                className={inputCls}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg py-2.5 text-sm"
            >
              Log in
            </button>
          </form>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-500 mb-2">
              Demo accounts — this deployment has no live database, all data is local &amp; resettable
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {DEMO_USERS.map((d) => (
                <button
                  key={d.user}
                  onClick={() => fillDemo(d.user, d.pass)}
                  className="text-left text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 flex items-center justify-between"
                >
                  <span className="font-medium text-slate-700">{d.label}</span>
                  <span className="text-slate-400">
                    {d.user} · {d.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

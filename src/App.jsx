import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { isRouteActive } from './lib/nav.js'
import { supabase } from './lib/supabase.js'
import {
  LayoutDashboard,
  ClipboardList,
  ClipboardPlus,
  Building2,
  Users,
  Settings,
  Scissors,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { useLive } from './lib/db.js'
import { nameInitial } from './lib/person.js'
import AuthGate from './components/AuthGate.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Records from './pages/Records.jsx'
import RecordForm from './pages/RecordForm.jsx'
import Consultants from './pages/Consultants.jsx'
import ConsultantDetail from './pages/ConsultantDetail.jsx'
import ConsultantForm from './pages/ConsultantForm.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import OtsPage from './pages/OtsPage.jsx'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/records/new', label: 'New Surgery', icon: ClipboardPlus },
  { to: '/records', label: 'Surgery Log', icon: ClipboardList },
  { to: '/ot-positions', label: 'OT & Positions', icon: Building2 },
  { to: '/consultants', label: 'Consultants', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
        <Scissors className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="text-white font-semibold truncate">OT Log</div>
        <div className="text-xs text-slate-400 truncate">Surgery Records</div>
      </div>
    </div>
  )
}

function NavItems({ pathname }) {
  return (
    <nav className="flex-1 p-3 space-y-1">
      {nav.map(({ to, label, icon: Icon }) => {
        const active = isRouteActive(to, pathname)
        return (
          <NavLink
            key={to}
            to={to}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-primary-600 text-white'
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function DoctorChip({ profile }) {
  return (
    <div className="p-3 pb-2">
      <NavLink
        to="/profile"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isActive ? 'bg-primary-600' : 'hover:bg-slate-800'
          }`
        }
      >
        {profile?.photo ? (
          <img
            src={profile.photo}
            alt={profile.name || 'Doctor'}
            className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary-700 text-white flex items-center justify-center font-semibold text-sm shrink-0">
            {nameInitial(profile?.name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {profile?.name || 'Doctor'}
          </p>
          <p className="text-xs text-slate-400 truncate">
            {profile?.designation ||
              profile?.specialization ||
              'Tap to set up your profile'}
          </p>
        </div>
      </NavLink>
    </div>
  )
}

function LogoutRow() {
  return (
    <div className="px-3 pb-3">
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <LogOut className="w-[18px] h-[18px] shrink-0" />
        Sign out
      </button>
    </div>
  )
}

export default function App() {
  return (
    <AuthGate>
      <Shell />
    </AuthGate>
  )
}

function Shell() {
  const location = useLocation()
  const { profile } = useLive()
  const p = location.pathname
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => setDrawerOpen(false), [p])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    let shown = false
    const onStorageError = () => {
      if (shown) return
      shown = true
      window.alert(
        'Storage is full. Remove large attachments or export a backup and delete old records.',
      )
      setTimeout(() => (shown = false), 3000)
    }
    window.addEventListener('otlog-storage-error', onStorageError)
    return () => window.removeEventListener('otlog-storage-error', onStorageError)
  }, [])

  const AUTO_LOCK_MS = 15 * 60 * 1000
  useEffect(() => {
    let lastActivity = Date.now()
    const bump = () => (lastActivity = Date.now())
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart']
    events.forEach((ev) => window.addEventListener(ev, bump, { passive: true }))
    const check = setInterval(() => {
      if (Date.now() - lastActivity > AUTO_LOCK_MS) {
        clearInterval(check)
        supabase.auth.signOut()
      }
    }, 30000)
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, bump))
      clearInterval(check)
    }
  }, [])

  let title = 'OT Log'
  if (p === '/') title = 'Dashboard'
  else if (p === '/records/new') title = 'New Surgery Entry'
  else if (p.startsWith('/records')) title = 'Surgery Log'
  else if (p.startsWith('/ot-positions')) title = 'OT & Positions'
  else if (p === '/consultants/new') title = 'Add Consultant'
  else if (p.startsWith('/consultants')) title = 'Consultants'
  else if (p === '/profile') title = 'My Profile'
  else if (p === '/settings') title = 'Settings'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="lg:hidden sticky top-0 z-30 bg-slate-900 text-slate-300 shadow-lg shadow-slate-900/10">
        <div className="pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between gap-3 px-4 h-14">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-slate-800 text-slate-200"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <NavLink to="/" className="flex-1 min-w-0">
              <Brand />
            </NavLink>
            <NavLink
              to="/profile"
              aria-label="Profile"
              className="p-0.5 rounded-full hover:opacity-90"
            >
              {profile?.photo ? (
                <img
                  src={profile.photo}
                  alt={profile.name || 'Profile'}
                  className="w-8 h-8 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-700 text-white flex items-center justify-center font-semibold text-sm">
                  {nameInitial(profile?.name)}
                </div>
              )}
            </NavLink>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen">
        <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-slate-900 text-slate-300">
          <div className="px-5 py-5 border-b border-slate-800">
            <Brand />
          </div>
          <NavItems pathname={p} />
          <DoctorChip profile={profile} />
          <div className="border-t border-slate-800 mt-1">
            <LogoutRow />
          </div>
          <div className="px-4 pb-4 text-xs text-slate-500">
            Data synced to your account
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] lg:pb-8">
            <h1 className="text-2xl font-semibold text-slate-900 mb-6">
              {title}
            </h1>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/records" element={<Records />} />
              <Route path="/records/new" element={<RecordForm />} />
              <Route path="/records/:id/edit" element={<RecordForm />} />
              <Route path="/consultants" element={<Consultants />} />
              <Route
                path="/consultants/new"
                element={<ConsultantForm key="new" />}
              />
              <Route path="/consultants/:id" element={<ConsultantDetail />} />
              <Route
                path="/consultants/:id/edit"
                element={<ConsultantForm key="edit" />}
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/ot-positions" element={<OtsPage />} />
            </Routes>
          </div>
        </main>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
              <Brand />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 -mr-2 rounded-lg hover:bg-slate-800 text-slate-200"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavItems pathname={p} />
            <DoctorChip profile={profile} />
            <div className="border-t border-slate-800 mt-1">
              <LogoutRow />
            </div>
            <div className="px-4 pb-4 text-xs text-slate-500">
              Data synced to your account
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Stethoscope, CalendarDays, Plus, TrendingUp, UserRound } from 'lucide-react'
import { useLive, db } from '../lib/db.js'
import { toLocalISO } from '../lib/date.js'
import { cleanName } from '../lib/person.js'

const COLORS = [
  '#1f5fe8', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

export default function Dashboard() {
  const { records, ots, profile } = useLive()
  const [selectedOT, setSelectedOT] = useState('all')

  const counts = useMemo(() => {
    const map = new Map()
    for (const r of records) {
      const name = r.otName || 'Unspecified'
      map.set(name, (map.get(name) || 0) + 1)
    }
    return [...map.entries()].map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [records])

  const filteredRecords = useMemo(
    () =>
      selectedOT === 'all'
        ? records
        : records.filter((r) => (r.otName || 'Unspecified') === selectedOT),
    [records, selectedOT],
  )

  const filteredCounts = useMemo(
    () =>
      selectedOT === 'all'
        ? counts
        : counts.filter((c) => c.name === selectedOT),
    [counts, selectedOT],
  )

  const total = records.length
  const filteredTotal = filteredRecords.length
  const thisMonth = useMemo(() => {
    const now = new Date()
    return records.filter((r) => {
      const d = new Date(r.date)
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      )
    }).length
  }, [records])

  const last7 = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayStr = toLocalISO(d)
      const label = d.toLocaleDateString('en-US', { weekday: 'short' })
      const dayCount = filteredRecords.filter(
        (r) => (r.date || '').slice(0, 10) === dayStr,
      ).length
      days.push({ day: label, surgeries: dayCount })
    }
    return days
  }, [filteredRecords])

  const uniqueOTs = useMemo(
    () => [...new Set(records.map((r) => r.otName || 'Unspecified'))],
    [records],
  )

  const consultantStats = useMemo(() => {
    const map = new Map()
    for (const r of filteredRecords) {
      if (!r.consultantName) continue
      map.set(r.consultantName, (map.get(r.consultantName) || 0) + 1)
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [filteredRecords])

  if (total === 0) {
    return (
      <div className="card p-12 text-center max-w-xl mx-auto mt-10">
        <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
          <Stethoscope className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          {profile?.name
            ? `Welcome, ${cleanName(profile.name).split(' ')[0]}`
            : 'Welcome to OT Log'}
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          No surgeries recorded yet. Add your first surgery entry to see
          statistics on the dashboard.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/records/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Add First Surgery
          </Link>
          {!profile && (
            <Link to="/profile" className="btn-outline">
              <UserRound className="w-4 h-4" /> Set up profile
            </Link>
          )}
        </div>
      </div>
    )
  }

  const firstName = profile?.name ? cleanName(profile.name).split(' ')[0] : null
  const sub = [
    profile?.designation,
    profile?.specialization,
    profile?.degrees,
    profile?.affiliation,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-6">
      {firstName && (
        <div className="flex items-center gap-3">
          {profile?.photo ? (
            <img
              src={profile.photo}
              alt={profile.name}
              className="w-11 h-11 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold">
              {firstName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-slate-900 truncate">
              Welcome back, {firstName}
            </p>
            {sub && <p className="text-xs text-slate-500 truncate">{sub}</p>}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4 col-span-2 sm:col-span-1">
          <div className="w-11 h-11 rounded-lg bg-primary-50 flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">
              {filteredTotal}
            </p>
            <p className="text-xs text-slate-500">
              Surgeries{selectedOT !== 'all' ? ` (${selectedOT})` : ' total'}
            </p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">{thisMonth}</p>
            <p className="text-xs text-slate-500">This month</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">
              {uniqueOTs.length}
            </p>
            <p className="text-xs text-slate-500">OTs in use</p>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-slate-700">
            OT Distribution
          </h2>
          <select
            value={selectedOT}
            onChange={(e) => setSelectedOT(e.target.value)}
            className="input !w-auto text-sm h-9"
          >
            <option value="all">All OTs</option>
            {uniqueOTs.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="min-w-0">
            <h3 className="text-xs font-medium text-slate-500 mb-2">
              Share of Surgeries (%)
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch gap-4">
              <div className="h-56 sm:h-64 w-full sm:w-auto sm:flex-1 sm:min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={counts}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {counts.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={COLORS[i % COLORS.length]}
                          stroke="#fff"
                          strokeWidth={2}
                          onClick={() => setSelectedOT(
                            selectedOT === entry.name ? 'all' : entry.name,
                          )}
                          className="cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} (${(
                          (value / Math.max(total, 1)) * 100
                        ).toFixed(1)}%)`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full sm:w-52 shrink-0 max-h-44 sm:max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/70 p-2">
                <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-1 pb-1.5">
                  Legend
                </h4>
                <ul className="space-y-1">
                  {counts.map((entry, i) => {
                    const dimmed = selectedOT !== 'all' && selectedOT !== entry.name
                    const active = selectedOT === entry.name
                    return (
                      <li key={entry.name}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedOT(active ? 'all' : entry.name)
                          }
                          title={`${entry.name}: ${entry.count} surgeries`}
                          className={`w-full flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors ${
                            active
                              ? 'bg-white ring-1 ring-primary-200'
                              : dimmed
                                ? 'opacity-45 hover:opacity-80'
                                : 'hover:bg-white'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          <span className="flex-1 min-w-0 text-xs text-slate-700 truncate">
                            {entry.name}
                          </span>
                          <span className="text-[11px] text-slate-500 shrink-0">
                            {entry.count}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-xs font-medium text-slate-500 mb-2">
              Surgeries per OT
            </h3>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredCounts} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    height={filteredCounts.length > 3 ? 44 : 24}
                    angle={filteredCounts.length > 3 ? -28 : 0}
                    textAnchor={filteredCounts.length > 3 ? 'end' : 'middle'}
                    tickFormatter={(v) =>
                      v.length > 14 ? v.slice(0, 13) + '…' : v
                    }
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: 'rgba(31, 95, 232, 0.06)' }} />
                <Bar dataKey="count" name="Surgeries" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {filteredCounts.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[i % COLORS.length]}
                      fillOpacity={0.9}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Last 7 Days
            {selectedOT !== 'all' ? ` — ${selectedOT}` : ''}
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: 'rgba(31, 95, 232, 0.06)' }} />
                <Bar dataKey="surgeries" name="Surgeries" radius={[6, 6, 0, 0]} fill="#10b981" maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Top Consultants
          </h2>
          {consultantStats.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              No consultant data yet
            </p>
          ) : (
            <ul className="space-y-3">
              {consultantStats.map((c, i) => {
                const pct = (c.count / filteredTotal) * 100
                return (
                  <li key={c.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 font-medium truncate">
                        {c.name}
                      </span>
                      <span className="text-slate-500 text-xs shrink-0 ml-2">
                        {c.count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Search, Pencil, Trash2, Eye, Paperclip,
  ChevronLeft, ChevronRight, ChevronDown, CalendarDays, ArrowDownUp,
} from 'lucide-react'
import { useLive, db } from '../lib/db.js'
import { ageLabel } from '../lib/format.js'
import RecordModal from '../components/RecordModal.jsx'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const dateKey = (y, m) => `${y}-${m}`

function parseParts(date) {
  if (!date) return null
  const d = new Date(date + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return null
  return { y: d.getFullYear(), m: d.getMonth() }
}

export default function Records() {
  const { records } = useLive()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [otFilter, setOtFilter] = useState('all')
  const [consultantFilter, setConsultantFilter] = useState('all')
  const [dir, setDir] = useState('desc')
  const [tab, setTab] = useState('month')
  const [expandedYear, setExpandedYear] = useState(null)
  const [viewing, setViewing] = useState(null)

  const now = new Date()
  const [activeMonth, setActiveMonth] = useState(() => ({
    y: now.getFullYear(),
    m: now.getMonth(),
  }))

  const otNames = useMemo(
    () => [...new Set(records.map((r) => r.otName).filter(Boolean))].sort(),
    [records],
  )
  const consultantNames = useMemo(
    () => [...new Set(records.map((r) => r.consultantName).filter(Boolean))].sort(),
    [records],
  )

  const scoped = useMemo(
    () =>
      records.filter((r) => {
        if (otFilter !== 'all' && r.otName !== otFilter) return false
        if (consultantFilter !== 'all' && r.consultantName !== consultantFilter)
          return false
        return true
      }),
    [records, otFilter, consultantFilter],
  )

  const searching = query.trim().length > 0

  const matches = useMemo(() => {
    const q = query.toLowerCase()
    return scoped.filter((r) =>
      (r.patientName || '').toLowerCase().includes(q) ||
      (r.diagnosis || '').toLowerCase().includes(q) ||
      (r.otName || '').toLowerCase().includes(q) ||
      (r.consultantName || '').toLowerCase().includes(q),
    )
  }, [scoped, query])

  const sortList = (list) =>
    [...list].sort((a, b) => {
      const aD = a.date || ''
      const bD = b.date || ''
      const c = aD < bD ? -1 : aD > bD ? 1 : 0
      return dir === 'asc' ? c : -c
    })

  const index = useMemo(() => {
    const map = new Map()
    for (const r of scoped) {
      const p = parseParts(r.date)
      if (!p) continue
      const key = `${p.y}`
      if (!map.has(key)) map.set(key, new Map())
      const months = map.get(key)
      months.set(p.m, (months.get(p.m) || 0) + 1)
    }
    return map
  }, [scoped])

  const years = useMemo(
    () =>
      [...index.keys()]
        .map(Number)
        .sort((a, b) => b - a),
    [index],
  )

  const monthsWithData = useMemo(() => {
    const arr = []
    for (const [yStr, months] of index.entries()) {
      const y = Number(yStr)
      for (const m of months.keys()) arr.push({ y, m })
    }
    arr.sort((a, b) => a.y * 12 + a.m - (b.y * 12 + b.m))
    return arr
  }, [index])

  const monthRecords = useMemo(() => {
    const key = dateKey(activeMonth.y, activeMonth.m)
    return sortList(scoped.filter((r) => {
      const p = parseParts(r.date)
      return p && dateKey(p.y, p.m) === key
    }))
  }, [scoped, activeMonth, dir])

  const totalMonths = monthsWithData.length
  const activeKey = dateKey(activeMonth.y, activeMonth.m)
  const activeIdx = monthsWithData.findIndex(
    (k) => dateKey(k.y, k.m) === activeKey,
  )
  const canPrev = activeIdx > 0
  const canNext = activeIdx >= 0 && activeIdx < monthsWithData.length - 1

  // When the selected month has no data (e.g. current month is empty, or a
  // filter hides it), jump to the most recent month that actually has records.
  useEffect(() => {
    if (!monthsWithData.length) return
    if (activeIdx === -1) {
      const latest = monthsWithData[monthsWithData.length - 1]
      setActiveMonth({ y: latest.y, m: latest.m })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, monthsWithData.length])

  const moveMonth = (step) => {
    const target = monthsWithData[activeIdx + step]
    if (target) setActiveMonth({ y: target.y, m: target.m })
  }

  const remove = (r) => {
    if (window.confirm(`Delete record for "${r.patientName}"?`)) {
      db.deleteRecord(r.id)
    }
  }

  const monthName = `${MONTHS[activeMonth.m]} ${activeMonth.y}`

  const renderTable = (list, emptyText) => (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Patient</th>
              <th className="px-4 py-3 font-semibold">Age</th>
              <th className="px-4 py-3 font-semibold">Diagnosis</th>
              <th className="px-4 py-3 font-semibold">OT</th>
              <th className="px-4 py-3 font-semibold">Consultant/Surgeon</th>
              <th className="px-4 py-3 font-semibold">Files</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">{r.date}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.patientName || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{ageLabel(r) || '—'}</td>
                <td className="px-4 py-3 max-w-[220px]">
                  <p className="truncate text-slate-600" title={r.diagnosis}>
                    {r.diagnosis || '—'}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                    {r.otName || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.consultantName || '—'}</td>
                <td className="px-4 py-3 text-slate-500">
                  {r.attachments?.length ? (
                    <span className="inline-flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5" /> {r.attachments.length}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => setViewing(r)}
                      className="p-1.5 rounded text-slate-400 hover:text-primary-600 hover:bg-primary-50"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/records/${r.id}/edit`)}
                      className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => remove(r)}
                      className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  if (scoped.length === 0) {
    return (
      <div className="card p-12 text-center max-w-xl mx-auto">
        <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
          <CalendarDays className="w-7 h-7 text-primary-600" />
        </div>
        <h2 className="text-base font-semibold text-slate-900 mb-1">No surgery records</h2>
        <p className="text-sm text-slate-500 mb-5">
          {otFilter !== 'all' || consultantFilter !== 'all'
            ? 'No records match the current filters.'
            : 'Add your first surgery entry to start the log.'}
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/records/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New Surgery
          </Link>
          {(otFilter !== 'all' || consultantFilter !== 'all') && (
            <button
              onClick={() => {
                setOtFilter('all')
                setConsultantFilter('all')
              }}
              className="btn-outline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by patient name, diagnosis, OT or consultant (all years)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="input !w-auto" value={otFilter} onChange={(e) => setOtFilter(e.target.value)}>
          <option value="all">All OTs</option>
          {otNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <select
          className="input !w-auto"
          value={consultantFilter}
          onChange={(e) => setConsultantFilter(e.target.value)}
        >
          <option value="all">All Consultants</option>
          {consultantNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button onClick={() => setDir((d) => (d === 'desc' ? 'asc' : 'desc'))} className="btn-outline">
          <ArrowDownUp className="w-4 h-4" />
          {dir === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>
        <Link to="/records/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Entry
        </Link>
      </div>

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 mb-4">
        <button
          onClick={() => setTab('month')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium ${
            tab === 'month' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Browse by month
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium ${
            tab === 'all' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          All records
        </button>
      </div>

      {searching ? (
        <>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Search results{' '}
              <span className="text-slate-400 font-normal">({matches.length})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Matching across all years — clear the search to browse by month.
            </p>
          </div>
          {renderTable(sortList(matches), 'No records match your search.')}
        </>
      ) : tab === 'month' ? (
        <>
          <div className="card p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-semibold text-slate-700">
                Browse by year &amp; month
              </h2>
              <span className="text-xs text-slate-400 ml-1">
                ({totalMonths} month{totalMonths === 1 ? '' : 's'} with records)
              </span>
            </div>
            {years.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No records in this filter yet
              </p>
            ) : (
              <ul className="space-y-1">
                {years.map((y) => {
                  const monthsMap = index.get(String(y))
                  const totalYear = [...monthsMap.values()].reduce((a, b) => a + b, 0)
                  const open = expandedYear === y
                  return (
                    <li key={y} className="rounded-lg border border-slate-100">
                      <button
                        type="button"
                        onClick={() => setExpandedYear(open ? null : y)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 rounded-lg"
                      >
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform ${
                            open ? '' : '-rotate-90'
                          }`}
                        />
                        <span className="font-semibold text-slate-800">{y}</span>
                        <span className="text-xs text-slate-400">
                          {totalYear} record{totalYear === 1 ? '' : 's'}
                        </span>
                      </button>
                      {open && (
                        <div className="px-4 pb-3 pt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                          {[...monthsMap.entries()]
                            .sort((a, b) => b[0] - a[0])
                            .map(([m, count]) => {
                              const active = activeMonth.y === y && activeMonth.m === m
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setActiveMonth({ y, m })}
                                  className={`px-2 py-1.5 rounded-md text-xs text-left flex justify-between gap-2 ${
                                    active
                                      ? 'bg-primary-600 text-white'
                                      : 'bg-slate-50 text-slate-700 hover:bg-primary-50'
                                  }`}
                                >
                                  <span>{MONTHS[m]}</span>
                                  <span className={active ? 'text-white/80' : 'text-slate-400'}>
                                    {count}
                                  </span>
                                </button>
                              )
                            })}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <button
              onClick={() => moveMonth(-1)}
              disabled={!canPrev}
              className="btn-outline !h-9 !px-3 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <div className="text-center">
              <h2 className="text-base font-semibold text-slate-900">{monthName}</h2>
              <p className="text-xs text-slate-400">
                {monthRecords.length} record{monthRecords.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              onClick={() => moveMonth(1)}
              disabled={!canNext}
              className="btn-outline !h-9 !px-3 disabled:opacity-40"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {renderTable(monthRecords, 'No records in this month.')}
        </>
      ) : (
        renderTable(sortList(scoped), 'No records found.')
      )}

      {viewing && <RecordModal record={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

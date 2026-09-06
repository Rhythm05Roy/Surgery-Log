import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Search, Pencil, Trash2, Eye, Paperclip, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useLive, db } from '../lib/db.js'
import RecordModal from '../components/RecordModal.jsx'

const PAGE_SIZE = 10

export default function Records() {
  const { records } = useLive()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [otFilter, setOtFilter] = useState('all')
  const [consultantFilter, setConsultantFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [viewing, setViewing] = useState(null)

  const otNames = useMemo(
    () => [...new Set(records.map((r) => r.otName).filter(Boolean))].sort(),
    [records],
  )
  const consultantNames = useMemo(
    () => [...new Set(records.map((r) => r.consultantName).filter(Boolean))].sort(),
    [records],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return records.filter((r) => {
      if (otFilter !== 'all' && r.otName !== otFilter) return false
      if (consultantFilter !== 'all' && r.consultantName !== consultantFilter)
        return false
      if (!q) return true
      return (
        (r.patientName || '').toLowerCase().includes(q) ||
        (r.diagnosis || '').toLowerCase().includes(q) ||
        (r.otName || '').toLowerCase().includes(q) ||
        (r.consultantName || '').toLowerCase().includes(q)
      )
    })
  }, [records, query, otFilter, consultantFilter])

  const pageCount = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1)
  const safePage = Math.min(page, pageCount - 1)
  const pageRecords = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  )

  const remove = (r) => {
    if (window.confirm(`Delete record for "${r.patientName}"?`)) {
      db.deleteRecord(r.id)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search patient, diagnosis, OT, consultant…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
          />
        </div>
        <select
          className="input !w-auto"
          value={otFilter}
          onChange={(e) => {
            setOtFilter(e.target.value)
            setPage(0)
          }}
        >
          <option value="all">All OTs</option>
          {otNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <select
          className="input !w-auto"
          value={consultantFilter}
          onChange={(e) => {
            setConsultantFilter(e.target.value)
            setPage(0)
          }}
        >
          <option value="all">All Consultants</option>
          {consultantNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <Link to="/records/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Entry
        </Link>
      </div>

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
              <th className="px-4 py-3 font-semibold">Consultant</th>
              <th className="px-4 py-3 font-semibold">Files</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRecords.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                  {r.date}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.patientName}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.age}</td>
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
                <td className="px-4 py-3 text-slate-600">
                  {r.consultantName || '—'}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {r.attachments?.length ? (
                    <span className="inline-flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5" />
                      {r.attachments.length}
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
            {pageRecords.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
          <span>
            Showing {safePage * PAGE_SIZE + 1}–
            {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of{' '}
            {filtered.length}
          </span>
          <div className="inline-flex gap-1">
            <button
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className="btn-outline !h-8 !px-2.5"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="btn-outline !h-8 !px-3 cursor-default">
              {safePage + 1} / {pageCount}
            </span>
            <button
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              className="btn-outline !h-8 !px-2.5"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {viewing && <RecordModal record={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import { useLive } from '../lib/db.js'

export default function Consultants() {
  const { consultants, records } = useLive()
  const [query, setQuery] = useState('')

  const surgeryCounts = useMemo(() => {
    const map = new Map()
    for (const r of records) {
      if (r.consultantId)
        map.set(r.consultantId, (map.get(r.consultantId) || 0) + 1)
    }
    return map
  }, [records])

  const filtered = consultants.filter((c) =>
    (c.name || '').toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search consultants…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Link to="/consultants/new" className="btn-primary">
          <Plus className="w-4 h-4" /> Add Consultant
        </Link>
      </div>

      {consultants.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-primary-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            No consultants yet
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Add consultants so you can quickly select them while logging
            surgeries.
          </p>
          <Link to="/consultants/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Add Consultant
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/consultants/${c.id}`}
              className="card p-5 flex gap-4 hover:ring-2 hover:ring-primary-400 transition-shadow"
            >
              {c.photo ? (
                <img
                  src={c.photo}
                  alt={c.name}
                  className="w-14 h-14 rounded-full object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-semibold text-lg shrink-0">
                  {(c.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">
                  {c.name}
                </h3>
                {c.designation && (
                  <p className="text-sm text-primary-600 truncate">{c.designation}</p>
                )}
                {c.expertise && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {c.expertise}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  {surgeryCounts.get(c.id) || 0} surgeries together
                </p>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 col-span-2 text-center py-8">
              No consultants match your search
            </p>
          )}
        </div>
      )}
    </div>
  )
}

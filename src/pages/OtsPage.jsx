import { useState } from 'react'
import { Plus, Trash2, Building2, UserCog, Sparkles } from 'lucide-react'
import { useLive, db } from '../lib/db.js'

function useUsage(records) {
  const otUsage = {}
  const posUsage = {}
  for (const r of records) {
    if (r.otName) otUsage[r.otName] = (otUsage[r.otName] || 0) + 1
    if (r.assistPositionName)
      posUsage[r.assistPositionName] = (posUsage[r.assistPositionName] || 0) + 1
  }
  return { otUsage, posUsage }
}

export default function OtsPage() {
  const { ots, positions, records } = useLive()
  const { otUsage, posUsage } = useUsage(records)
  const [otName, setOtName] = useState('')
  const [posName, setPosName] = useState('')

  const addOT = (e) => {
    e.preventDefault()
    if (otName.trim()) {
      db.addOT(otName)
      setOtName('')
    }
  }

  const addPos = (e) => {
    e.preventDefault()
    if (posName.trim()) {
      db.addPosition(posName)
      setPosName('')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="card p-6">
        <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
          <div className="w-11 h-11 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Operating Theatres
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              The operation theatres you work in. Add new ones here or type a
              new name while logging a surgery.
            </p>
          </div>
        </div>

        <form onSubmit={addOT} className="flex gap-2 mt-4">
          <input
            className="input"
            placeholder="e.g. OT-2, Endoscopy Suite…"
            value={otName}
            onChange={(e) => setOtName(e.target.value)}
          />
          <button
            type="submit"
            className="btn-primary whitespace-nowrap"
            disabled={!otName.trim()}
          >
            <Plus className="w-4 h-4" /> Add OT
          </button>
        </form>

        <div className="mt-4">
          {ots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
              <Sparkles className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
              <p className="text-sm text-slate-400">
                No OTs yet — add your first one above.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {ots.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-slate-800">
                      {o.name}
                    </span>
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-500 shrink-0">
                      {otUsage[o.name] || 0} surgeries
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove "${o.name}"? Existing records keep their OT name.`,
                        )
                      )
                        db.deleteOT(o.id)
                    }}
                    className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <UserCog className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Assist Positions
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Roles you scrub in with, e.g. First Assistant, Second Assistant.
            </p>
          </div>
        </div>

        <form onSubmit={addPos} className="flex gap-2 mt-4">
          <input
            className="input"
            placeholder="e.g. First Assistant, Scrub Nurse…"
            value={posName}
            onChange={(e) => setPosName(e.target.value)}
          />
          <button
            type="submit"
            className="btn-primary whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
            disabled={!posName.trim()}
          >
            <Plus className="w-4 h-4" /> Add Position
          </button>
        </form>

        <div className="mt-4">
          {positions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
              <Sparkles className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
              <p className="text-sm text-slate-400">
                No positions yet — add your first one above.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {positions.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-slate-800">
                      {p.name}
                    </span>
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-500 shrink-0">
                      {posUsage[p.name] || 0} surgeries
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove "${p.name}"? Existing records keep their position name.`,
                        )
                      )
                        db.deletePosition(p.id)
                    }}
                    className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

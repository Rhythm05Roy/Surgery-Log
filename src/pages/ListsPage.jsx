import { useMemo, useState } from 'react'
import {
  Plus, Check, X, Pencil, Trash2, Building2, UserCog,
  Stethoscope, HeartPulse, History,
} from 'lucide-react'
import { useLive, db } from '../lib/db.js'

const CATEGORIES = [
  { key: 'ots', label: 'OTs', singular: 'OT', icon: Building2, tag: false },
  {
    key: 'positions',
    label: 'Positions',
    singular: 'Assist position',
    icon: UserCog,
    tag: false,
  },
  {
    key: 'indication',
    label: 'Indications',
    singular: 'Diagnosis indication',
    icon: Stethoscope,
    tag: true,
  },
  {
    key: 'comorbidity',
    label: 'Comorbidities',
    singular: 'Comorbidity',
    icon: HeartPulse,
    tag: true,
  },
  {
    key: 'prehistory',
    label: 'Pre-history',
    singular: 'Pre-history item',
    icon: History,
    tag: true,
  },
]

export default function ListsPage() {
  const { records, ots, positions, tags } = useLive()
  const [cat, setCat] = useState('ots')
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const active = CATEGORIES.find((c) => c.key === cat)

  const items = useMemo(() => {
    if (cat === 'ots') return ots
    if (cat === 'positions') return positions
    return tags.filter((t) => t.type === cat)
  }, [cat, ots, positions, tags])

  const usage = (item) => {
    if (cat === 'ots') return records.filter((r) => r.otName === item.name).length
    if (cat === 'positions')
      return records.filter((r) => r.assistPositionName === item.name).length
    return records.filter((r) => (r.diagnosis || '').includes(item.name)).length
  }

  const duplicateOf = (name, exceptId) =>
    items.some(
      (i) =>
        i.id !== exceptId && i.name.toLowerCase() === name.trim().toLowerCase(),
    )

  const switchCat = (key) => {
    setCat(key)
    setEditingId(null)
    setEditValue('')
    setNewName('')
    setError(null)
  }

  const add = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    if (duplicateOf(name)) {
      setError(`"${name}" already exists in this list.`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (active.tag) await db.addTag(cat, name)
      else if (cat === 'ots') await db.addOT(name)
      else await db.addPosition(name)
      setNewName('')
    } catch (err) {
      setError(err?.message || 'Could not add.')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditValue(item.name)
    setError(null)
  }

  const saveEdit = async () => {
    const name = editValue.trim()
    if (!name) return
    if (duplicateOf(name, editingId)) {
      setError(`"${name}" already exists in this list.`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (active.tag) await db.updateTag(editingId, name)
      else if (cat === 'ots') await db.updateOT(editingId, name)
      else await db.updatePosition(editingId, name)
      setEditingId(null)
      setEditValue('')
    } catch (err) {
      setError(err?.message || 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item) => {
    const msg = active.tag
      ? `Delete "${item.name}"? Existing diagnosis sentences are not changed.`
      : `Delete "${item.name}"? Existing records keep this name.`
    if (!window.confirm(msg)) return
    setBusy(true)
    try {
      if (active.tag) await db.deleteTag(item.id)
      else if (cat === 'ots') await db.deleteOT(item.id)
      else await db.deletePosition(item.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORIES.map((c) => {
          const Icon = c.icon
          const isActive = c.key === cat
          const count =
            c.key === 'ots'
              ? ots.length
              : c.key === 'positions'
                ? positions.length
                : tags.filter((t) => t.type === c.key).length
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => switchCat(c.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isActive
                  ? 'bg-primary-600 border-primary-600 text-white shadow-sm shadow-primary-600/25'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {c.label}
              <span
                className={`text-xs rounded-full px-1.5 py-0.5 ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
            <active.icon className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {active.label}
            </h2>
            <p className="text-xs text-slate-400">
              {items.length} {active.singular.toLowerCase()}
              {items.length === 1 ? '' : 's'} · add, rename or remove — these
              feed the dropdowns in the surgery form
            </p>
          </div>
        </div>

        <form onSubmit={add} className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            className="input"
            placeholder={`Add a new ${active.singular.toLowerCase()}…`}
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value)
              setError(null)
            }}
          />
          <button
            type="submit"
            className="btn-primary whitespace-nowrap"
            disabled={busy || !newName.trim()}
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
        {error && <p className="text-xs text-red-600 -mt-2 mb-3">{error}</p>}

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
            <p className="text-sm text-slate-400">
              Nothing here yet — add your first {active.singular.toLowerCase()}{' '}
              above.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const isEditing = editingId === item.id
              if (isEditing) {
                return (
                  <li key={item.id} className="py-2.5 flex items-center gap-2">
                    <input
                      autoFocus
                      className="input flex-1"
                      value={editValue}
                      onChange={(e) => {
                        setEditValue(e.target.value)
                        setError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          saveEdit()
                        }
                        if (e.key === 'Escape') {
                          setEditingId(null)
                          setEditValue('')
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={busy || !editValue.trim()}
                      className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null)
                        setEditValue('')
                        setError(null)
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                )
              }
              const count = usage(item)
              return (
                <li
                  key={item.id}
                  className="py-2.5 flex items-center gap-3 group"
                >
                  <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate">
                    {item.name}
                  </span>
                  <span
                    className="shrink-0 inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-500"
                    title={active.tag ? 'Approximate — records mentioning this' : 'Records using this'}
                  >
                    {active.tag && count > 0 ? '≈' : ''}
                    {count} {count === 1 ? 'use' : 'uses'}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    disabled={busy}
                    className="p-1.5 rounded text-slate-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-40"
                    title="Rename"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    disabled={busy}
                    className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

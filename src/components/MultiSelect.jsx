import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, X } from 'lucide-react'

function normalized(s) {
  return String(s || '').toLowerCase().trim()
}

export default function MultiSelect({
  label,
  placeholder = 'Select or type new…',
  options,
  selected,
  onChange,
  onAdd,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState(null)
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  const selectedLower = (selected || []).map(normalized)
  const isSelected = (name) => selectedLower.includes(normalized(name))

  const filtered = (options || []).filter(
    (o) =>
      !isSelected(o.name) &&
      o.name.toLowerCase().includes(query.toLowerCase()),
  )

  const trimmedQuery = query.trim()
  const canAdd =
    trimmedQuery.length > 0 &&
    !selectedLower.includes(normalized(trimmedQuery)) &&
    !(options || []).some((o) => normalized(o.name) === normalized(trimmedQuery))

  useEffect(() => {
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const toggle = (name) => {
    const current = selected || []
    if (isSelected(name)) onChange(current.filter((s) => normalized(s) !== normalized(name)))
    else onChange([...current, name])
    setQuery('')
  }

  const addNew = async () => {
    if (!canAdd || adding) return
    setAdding(true)
    setErr(null)
    try {
      const item = await onAdd(trimmedQuery)
      if (item && !isSelected(item.name)) onChange([...(selected || []), item.name])
      setQuery('')
    } catch (e) {
      setErr(e?.message || 'Could not add')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {label && <label className="label">{label}</label>}
      <div
        onClick={() => {
          setOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className="min-h-10 cursor-pointer rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary-500"
      >
        {selected?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-md bg-primary-50 text-primary-700 text-xs font-medium pl-2 pr-1 py-0.5"
              >
                {name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(name)
                  }}
                  className="rounded p-0.5 hover:bg-primary-100"
                  aria-label={`Remove ${name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-slate-400 px-1">{placeholder}</span>
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b border-slate-100">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setErr(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canAdd) {
                  e.preventDefault()
                  addNew()
                }
                if (e.key === 'Escape') setOpen(false)
              }}
              placeholder={placeholder}
              className="w-full text-sm outline-none border border-slate-200 rounded-md px-2 py-1.5 focus:border-primary-500"
            />
          </div>
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.name)}
              className="w-full flex items-center justify-between text-left px-3 py-2 text-sm text-slate-700 hover:bg-primary-50"
            >
              <span className="truncate">{o.name}</span>
              <Check className="w-4 h-4 text-primary-600 shrink-0" />
            </button>
          ))}
          {canAdd && (
            <button
              type="button"
              onClick={addNew}
              disabled={adding}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-t border-slate-100 text-primary-600 hover:bg-primary-50 disabled:opacity-50"
            >
              <Plus className="w-4 h-4 shrink-0" />
              {adding ? 'Adding…' : `Add "${trimmedQuery}"`}
            </button>
          )}
          {!filtered.length && !canAdd && (
            <div className="px-3 py-2 text-sm text-slate-400">
              {query ? 'No matching options' : 'No options yet'}
            </div>
          )}
        </div>
      )}
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  )
}

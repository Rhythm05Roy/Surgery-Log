import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { uid } from '../lib/db.js'

export default function Combobox({
  label,
  placeholder,
  options,
  value,
  onChange,
  onAdd,
  addLabel,
  required,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(query.toLowerCase()),
  )
  const canAdd = query.trim() && !options.some(
    (o) => o.name.toLowerCase() === query.trim().toLowerCase(),
  )

  useEffect(() => {
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const select = (opt) => {
    onChange(opt)
    setQuery('')
    setOpen(false)
  }

  const addNew = async () => {
    const name = query.trim()
    if (!name) return
    const item = onAdd ? await onAdd(name) : { id: uid(), name }
    if (item) select(item)
  }

  const onInputKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const count = filtered.length + (canAdd ? 1 : 0)
      setHighlight((h) => (h + 1) % Math.max(count, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const count = filtered.length + (canAdd ? 1 : 0)
      setHighlight((h) => (h - 1 + Math.max(count, 1)) % Math.max(count, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (canAdd && highlight >= filtered.length) {
        addNew()
      } else if (filtered.length) {
        select(filtered[Math.min(highlight, filtered.length - 1)])
      }
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div
        className="input flex items-center cursor-pointer"
        onClick={() => {
          setOpen(true)
          inputRef.current?.focus()
        }}
      >
        {value ? (
          <span className="flex-1 truncate">{value.name}</span>
        ) : (
          <span className="flex-1 truncate text-slate-400">
            {placeholder || 'Select or type to add'}
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b border-slate-100">
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setHighlight(0)
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Search or type new…"
              className="w-full text-sm outline-none border border-slate-200 rounded-md px-2 py-1.5 focus:border-primary-500"
            />
          </div>
          {filtered.map((opt, i) => (
            <button
              key={opt.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(opt)}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                i === highlight ? 'bg-primary-50 text-primary-700' : 'text-slate-700'
              }`}
            >
              <span className="truncate">{opt.name}</span>
              {value?.id === opt.id && (
                <Check className="w-4 h-4 text-primary-600 shrink-0" />
              )}
            </button>
          ))}
          {canAdd && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={addNew}
              onMouseEnter={() => setHighlight(filtered.length)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-t border-slate-100 ${
                highlight === filtered.length
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-primary-600'
              }`}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate">
                Add {addLabel ? `"${query.trim()}"` : query.trim()}
              </span>
            </button>
          )}
          {!filtered.length && !canAdd && (
            <div className="px-3 py-2 text-sm text-slate-400">
              {query ? 'No match' : 'No options yet'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

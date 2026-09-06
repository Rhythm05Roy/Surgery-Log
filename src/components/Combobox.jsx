import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'

const norm = (s) => String(s || '').trim().toLowerCase()

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
  const [text, setText] = useState(value?.name ?? '')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [err, setErr] = useState(null)
  const inputRef = useRef(null)
  const rootRef = useRef(null)

  useEffect(() => {
    setText(value?.name ?? '')
  }, [value?.name])

  useEffect(() => {
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const query = text.trim()
  const matches = (options || []).filter((o) =>
    o.name.toLowerCase().includes(query.toLowerCase()),
  )
  const exact = matches.find((o) => norm(o.name) === norm(query))
  const canAdd =
    query.length > 0 &&
    !exact &&
    !(options || []).some((o) => norm(o.name) === norm(query))

  const select = (opt) => {
    onChange(opt)
    setText(opt.name)
    setOpen(false)
  }

  const addNew = async () => {
    if (!canAdd) return
    setErr(null)
    try {
      const item = onAdd ? await onAdd(query) : { id: 'tmp-' + Date.now(), name: query }
      if (item) select(item)
    } catch (e) {
      setErr(e?.message || 'Could not add')
    }
  }

  const commit = () => {
    if (exact) select(exact)
    else if (matches.length) select(matches[0])
    else if (canAdd) addNew()
  }

  const onKeyDown = (e) => {
    const total = matches.length + (canAdd ? 1 : 0)
    if (e.key === 'Escape') {
      setOpen(false)
      setText(value?.name ?? '')
      inputRef.current?.blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => (h + 1) % Math.max(total, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => (h - 1 + Math.max(total, 1)) % Math.max(total, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  const onBlur = () => {
    setOpen(false)
    const vName = value?.name ? norm(value.name) : ''
    const q = norm(query)
    if (vName && exact && q !== vName) {
      select(exact)
      return
    }
    if (vName && q !== vName && !canAdd) setText(value.name)
  }

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="input !pr-8"
          placeholder={placeholder || 'Select or type'}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setErr(null)
            setHighlight(0)
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-60 overflow-auto">
          {matches.map((opt, i) => (
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
              onMouseEnter={() => setHighlight(matches.length)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-t border-slate-100 ${
                highlight === matches.length
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-primary-600'
              }`}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate">
                Add {addLabel ? `"${query}"` : query}
              </span>
            </button>
          )}
          {!matches.length && !canAdd && (
            <div className="px-3 py-2 text-sm text-slate-400">
              {query ? 'No match' : 'No options yet'}
            </div>
          )}
        </div>
      )}
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  )
}

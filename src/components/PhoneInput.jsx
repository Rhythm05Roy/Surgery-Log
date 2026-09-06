const BD_CODE = '+880'
const MAX_LOCAL = 10

function localPart(value) {
  let d = String(value || '').replace(/\D/g, '')
  if (d.startsWith('880')) d = d.slice(3)
  if (d.startsWith('0')) d = d.slice(1)
  return d.slice(0, MAX_LOCAL)
}

function canonical(raw) {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith('880')) d = d.slice(3)
  if (d.startsWith('0')) d = d.slice(1)
  d = d.slice(0, MAX_LOCAL)
  return BD_CODE + d
}

export function formatPhone(value) {
  const s = String(value || '')
  if (s.startsWith(BD_CODE) && s.length > 4)
    return `${BD_CODE} ${s.slice(4)}`
  return s
}

export default function PhoneInput({
  label,
  value,
  onChange,
  placeholder = '1XXXXXXXXX',
  required,
}) {
  const local = localPart(value)
  const empty = local.length === 0
  const valid = !empty && local.length === MAX_LOCAL && local[0] === '1'
  const showHint = !empty && !valid

  return (
    <div>
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="flex">
        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 text-sm font-medium text-slate-600 select-none">
          {BD_CODE}
        </span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          className="input !rounded-l-none"
          placeholder={placeholder}
          value={local}
          maxLength={MAX_LOCAL}
          onChange={(e) => onChange(canonical(e.target.value))}
        />
      </div>
      {showHint && (
        <p className="text-xs text-amber-600 mt-1.5">
          {local[0] !== '1'
            ? 'Enter a valid Bangladesh mobile number'
            : `Must be ${MAX_LOCAL} digits after +880`}
        </p>
      )}
    </div>
  )
}

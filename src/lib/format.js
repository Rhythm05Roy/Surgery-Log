export const TAG_TYPES = {
  indication: 'indication',
  comorbidity: 'comorbidity',
  prehistory: 'prehistory',
}

function joinAnd(items) {
  const arr = items.filter((x) => x && String(x).trim())
  if (arr.length === 0) return ''
  if (arr.length === 1) return String(arr[0])
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`
  return `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`
}

export function buildDiagnosis({ indication, comorbidities, preHistories } = {}) {
  const flow = []
  if (indication && String(indication).trim()) flow.push(String(indication).trim())
  for (const c of comorbidities || []) {
    const v = String(c).trim()
    if (v) flow.push(v)
  }
  let sentence = flow.map((t, i) => (i === 0 ? t : `with ${t}`)).join(' ')
  const ph = joinAnd(preHistories || [])
  if (ph) sentence += (sentence ? ' with pre history of ' : 'pre history of ') + ph
  return sentence
}

export function ageLabel(record) {
  if (!record) return ''
  const years = record.ageYears ?? record.age
  const months = record.ageMonths
  const days = record.ageDays
  const parts = []
  if (years) parts.push(`${years}y`)
  if (months) parts.push(`${months}m`)
  if (days) parts.push(`${days}d`)
  if (parts.length) return parts.join(' ')
  if (record.age != null && record.age !== '') return `${record.age}y`
  return ''
}

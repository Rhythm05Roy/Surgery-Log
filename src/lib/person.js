export function cleanName(name = '') {
  return String(name).replace(/^(dr\.?|doctor)\s+/i, '').trim()
}

export function nameInitial(name = '', fallback = 'Dr') {
  const clean = cleanName(name)
  return clean ? clean.charAt(0).toUpperCase() : fallback.charAt(0).toUpperCase()
}

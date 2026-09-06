import { ageLabel } from './format.js'

function cell(value) {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

function toCsv(headers, rows) {
  const lines = [headers.map(cell).join(',')]
  for (const row of rows) lines.push(row.map(cell).join(','))
  // UTF-8 BOM so Excel renders non-ASCII (e.g. Bangla) correctly
  return '\uFEFF' + lines.join('\r\n') + '\r\n'
}

export function recordsToCsv(records) {
  const headers = [
    'Date',
    'Patient Name',
    'Age',
    'Diagnosis',
    'OT',
    'Assist Position',
    'Consultant/Surgeon',
    'Attachments',
  ]
  const rows = records.map((r) => [
    r.date || '',
    r.patientName || '',
    ageLabel(r),
    r.diagnosis || '',
    r.otName || '',
    r.assistPositionName || '',
    r.consultantName || '',
    (r.attachments || []).map((a) => a.name).join('; '),
  ])
  return toCsv(headers, rows)
}

export function consultantsToCsv(consultants) {
  const headers = [
    'Name',
    'Designation',
    'Area of Expertise',
    'Degrees',
    'Affiliation',
    'Phone',
    'Email',
    'Notes',
  ]
  const rows = consultants.map((c) => [
    c.name || '',
    c.designation || '',
    c.expertise || '',
    c.degrees || '',
    c.affiliation || '',
    c.phone || '',
    c.email || '',
    c.notes || '',
  ])
  return toCsv(headers, rows)
}

export function downloadFile(filename, content, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function dateStamp() {
  return new Date().toISOString().slice(0, 10)
}

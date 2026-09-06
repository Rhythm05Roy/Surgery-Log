import { ageLabel } from './format.js'

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

function groupByConsultant(records) {
  const map = new Map()
  for (const r of records) {
    const key = r.consultantName || 'Unspecified'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(r)
  }
  return [...map.entries()].map(([name, rows]) => ({ name, rows }))
}

export function buildReportHtml({
  periodLabel,
  consultantLabel,
  records,
  profile,
  consultants = [],
  consultant = null,
}) {
  const groups = consultant
    ? [{ name: consultant, rows: records }]
    : groupByConsultant(records)

  const total = records.length
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const detailsFor = (name) =>
    (consultants || []).find(
      (c) => String(c.name).toLowerCase() === String(name).toLowerCase(),
    )

  const verifyBlock = (g) => {
    const c = detailsFor(g.name)
    const contact = [c?.phone, c?.email].filter(Boolean).join(' · ')
    const line = (val, cls = 'vline') =>
      val ? `<div class="${cls}">${esc(val)}</div>` : ''
    return `
      <div class="verify">
        <div class="vtitle">Verified by Consultant/Surgeon</div>
        <div class="sigrule"></div>
        ${line(c?.name || g.name, 'vname')}
        ${line(c?.designation)}
        ${line(c?.affiliation)}
        ${line(contact)}
      </div>`
  }

  const rowsHtml = (rows) =>
    rows
      .map(
        (r, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td class="nowrap">${esc(r.date || '')}</td>
        <td>${esc(r.patientName || '')}</td>
        <td class="nowrap c">${esc(ageLabel(r))}</td>
        <td>${esc(r.diagnosis || '')}</td>
        <td>${esc(r.otName || '')}</td>
        <td>${esc(r.assistPositionName || '')}</td>
      </tr>`,
      )
      .join('')

  const sections = groups
    .map(
      (g, gi) => `
      <div class="group${gi > 0 ? ' page' : ''}">
        <div class="group-head">
          Consultant/Surgeon: <strong>${esc(g.name)}</strong>
          <span class="muted">(${g.rows.length} surgery record${g.rows.length === 1 ? '' : 's'})</span>
        </div>
        <table>
          <thead>
            <tr>
              <th class="c">#</th><th>Date</th><th>Patient</th><th class="c">Age</th>
              <th>Diagnosis</th><th>OT</th><th>Assist Position</th>
            </tr>
          </thead>
          <tbody>${rowsHtml(g.rows)}</tbody>
        </table>
        ${verifyBlock(g)}
      </div>`,
    )
    .join('')

  const ownerName = profile?.name || 'Junior Doctor'
  const ownerLines = [
    profile?.designation,
    profile?.specialization && profile.designation
      ? null
      : profile?.specialization,
    profile?.degrees,
    profile?.affiliation,
    [profile?.phone, profile?.email].filter(Boolean).join(' · '),
    profile?.registrationNo
      ? `License No: ${profile.registrationNo}`
      : null,
  ].filter(Boolean)

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Surgery Records Report</title>
<style>
  @page { size: A4 landscape; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
  .head { border-bottom: 2px solid #1f5fe8; padding-bottom: 10px; margin-bottom: 10px; }
  .head .eyebrow { font-size: 11px; color: #1f5fe8; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; text-align: center; }
  .head h1 { margin: 0; font-size: 21px; color: #0f172a; text-align: center; }
  .head .owner { margin: 4px auto 0; width: 70%; text-align: center; }
  .head .owner .oname { font-size: 15px; font-weight: 700; color: #1f5fe8; margin-bottom: 2px; }
  .head .owner .oline { font-size: 11.5px; color: #475569; line-height: 1.5; }
  .meta { display: flex; gap: 24px; flex-wrap: wrap; font-size: 12px; margin: 12px 0 4px; color: #334155; justify-content: center; }
  .meta b { font-weight: 600; }
  .group { margin-bottom: 8px; }
  .group.page { break-before: page; }
  .group-head { font-size: 13px; margin: 4px 0 6px; }
  .muted { color: #64748b; font-weight: normal; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; text-align: left; padding: 5px 6px; border: 1px solid #cbd5e1; }
  td { padding: 5px 6px; border: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .c { text-align: center; }
  .nowrap { white-space: nowrap; }
  .verify { margin-left: auto; width: 55%; margin-top: 34px; text-align: center; }
  .vtitle { font-size: 11px; font-weight: 700; color: #1f5fe8; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 10px; }
  .sigrule { border-bottom: 1px solid #334155; height: 24px; width: 58%; margin: 0 auto 2px; }
  .vname { font-size: 13px; font-weight: 700; color: #0f172a; margin: 4px 0 2px; }
  .vline { font-size: 11.5px; color: #475569; line-height: 1.5; }
  .foot { margin-top: 22px; font-size: 10px; color: #94a3b8; text-align: center; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="head">
    <div class="eyebrow">Surgery Records Report</div>
    <div class="owner">
      <div class="oname">${esc(ownerName)}</div>
      ${ownerLines.map((l) => `<div class="oline">${esc(l)}</div>`).join('')}
    </div>
  </div>

  <div class="meta">
    <span>Period: <b>${esc(periodLabel)}</b></span>
    <span>Consultant: <b>${esc(consultantLabel)}</b></span>
    <span>Total: <b>${total} record${total === 1 ? '' : 's'}</b></span>
    <span>Generated: <b>${esc(today)}</b></span>
  </div>

  ${sections}

  <div class="foot">Generated by OT Log &middot; ${esc(today)}</div>
</body>
</html>`
}

export function printReport(opts) {
  const html = buildReportHtml(opts)

  let frame = document.getElementById('otlog-print-frame')
  if (!frame) {
    frame = document.createElement('iframe')
    frame.id = 'otlog-print-frame'
    frame.setAttribute('aria-hidden', 'true')
    frame.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    document.body.appendChild(frame)
  }

  const doPrint = () => {
    try {
      frame.contentWindow.focus()
      frame.contentWindow.print()
    } catch {
      window.alert('Please press Ctrl/Cmd + P to print this report.')
    }
  }

  frame.onload = () => setTimeout(doPrint, 250)
  frame.srcdoc = html
}

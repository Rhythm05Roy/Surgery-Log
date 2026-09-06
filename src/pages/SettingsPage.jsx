import { useMemo, useRef, useState } from 'react'
import {
  Upload, Database, FileSpreadsheet, Download, FileText, KeyRound, ShieldAlert,
} from 'lucide-react'
import { db } from '../lib/db.js'
import { supabase } from '../lib/supabase.js'
import {
  recordsToCsv,
  consultantsToCsv,
  downloadFile,
  dateStamp,
} from '../lib/exportData.js'
import { toLocalISO } from '../lib/date.js'
import { printReport } from '../lib/reportPdf.js'

const PERIODS = [
  { value: 'month', label: 'This month' },
  { value: 'sixMonths', label: 'Last 6 months' },
  { value: 'year', label: 'Last 1 year' },
  { value: 'all', label: 'All time (full)' },
]

export default function SettingsPage() {
  const importRef = useRef(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [period, setPeriod] = useState('month')
  const [consFilter, setConsFilter] = useState('all')

  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwMsg, setPwMsg] = useState(null)
  const [pwBusy, setPwBusy] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const [delMsg, setDelMsg] = useState(null)

  const changePassword = async (e) => {
    e.preventDefault()
    if (pw1.length < 6) {
      setPwMsg({ kind: 'err', text: 'New password must be at least 6 characters.' })
      return
    }
    if (pw1 !== pw2) {
      setPwMsg({ kind: 'err', text: 'Passwords do not match.' })
      return
    }
    setPwBusy(true)
    setPwMsg(null)
    const { error } = await supabase.auth.updateUser({ password: pw1 })
    setPwBusy(false)
    if (error) {
      setPwMsg({ kind: 'err', text: error.message })
    } else {
      setPw1('')
      setPw2('')
      setPwMsg({ kind: 'ok', text: 'Password changed successfully.' })
    }
  }

  const deleteAccount = async () => {
    if (confirmText.trim().toLowerCase() !== 'delete my account') return
    if (
      !window.confirm(
        'This will permanently erase ALL your records, consultants, files and profile. This CANNOT be undone. Continue?',
      )
    )
      return
    setDelBusy(true)
    setDelMsg(null)
    const { error } = await supabase.rpc('delete_own_account')
    if (error) {
      setDelBusy(false)
      setDelMsg({
        kind: 'err',
        text: 'Could not delete account: ' + (error.message || 'unknown error'),
      })
      return
    }
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(db.exportAll(), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ot-log-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const consultantOptions = useMemo(() => {
    const names = new Set()
    db.consultants.forEach((c) => c.name && names.add(c.name))
    db.records.forEach((r) => r.consultantName && names.add(r.consultantName))
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [])

  const filteredRecords = useMemo(() => {
    const cutoff = (() => {
      const now = new Date()
      if (period === 'month') return toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1))
      if (period === 'sixMonths')
        return toLocalISO(new Date(now.getFullYear(), now.getMonth() - 5, 1))
      if (period === 'year')
        return toLocalISO(new Date(now.getFullYear(), now.getMonth() - 11, 1))
      return null
    })()
    return db.records.filter((r) => {
      if (cutoff && r.date && r.date < cutoff) return false
      if (consFilter !== 'all' && r.consultantName !== consFilter) return false
      return true
    })
  }, [period, consFilter])

  const exportFiltered = () => {
    const slug = { month: 'monthly', sixMonths: '6months', year: '1year', all: 'all' }[period]
    const cons = consFilter === 'all' ? 'all-consultants' : 'consultant'
    downloadFile(
      `ot-log-records-${slug}-${cons}-${dateStamp()}.csv`,
      recordsToCsv(filteredRecords),
    )
  }

  const rangeLabel = () => {
    const fmt = (iso) => {
      if (!iso) return ''
      const d = new Date(iso + 'T00:00:00')
      if (Number.isNaN(d.getTime())) return iso
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }
    const dates = filteredRecords
      .map((r) => r.date)
      .filter(Boolean)
      .sort()
    if (!dates.length) return '—'
    return `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`
  }

  const exportPdf = () => {
    const periodLabel = rangeLabel()
    const consultantLabel =
      consFilter === 'all' ? 'All consultants' : consFilter
    printReport({
      periodLabel,
      consultantLabel,
      records: filteredRecords,
      profile: db.profile,
      consultants: db.consultants,
      consultant: consFilter === 'all' ? null : consFilter,
    })
  }

  const onImportFile = async (file) => {
    setMsg(null)
    if (!file) return
    let text
    try {
      text = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('read failed'))
        reader.readAsText(file)
      })
    } catch {
      setMsg({ kind: 'err', text: 'Could not read that file.' })
      return
    }
    let data
    try {
      data = JSON.parse(text)
    } catch {
      setMsg({ kind: 'err', text: 'Invalid or unreadable backup file.' })
      return
    }
    if (
      window.confirm('Import this backup? This will replace all current data.')
    ) {
      setBusy(true)
      try {
        await db.importAll(data)
        setMsg({
          kind: 'ok',
          text: `Backup imported: ${data.records?.length || 0} records, ${data.consultants?.length || 0} consultants.`,
        })
      } catch (err) {
        setMsg({
          kind: 'err',
          text: 'Import failed: ' + (err?.message || 'unknown error'),
        })
      } finally {
        setBusy(false)
      }
    }
    if (importRef.current) importRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
            <Database className="w-5 h-5 text-violet-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            Data &amp; Backups
          </h2>
        </div>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          Export spreadsheets for Excel, or take a full JSON backup you can
          restore here at any time.
        </p>

        <div className="rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-700">
              Surgery Records
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[180px_1fr_auto] gap-3 items-end">
            <div>
              <label className="label">Time period</label>
              <select
                className="input"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Consultant</label>
              <select
                className="input"
                value={consFilter}
                onChange={(e) => setConsFilter(e.target.value)}
              >
                <option value="all">All consultants</option>
                {consultantOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
              <button
                onClick={exportFiltered}
                className="btn-primary whitespace-nowrap"
                disabled={busy || filteredRecords.length === 0}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={exportPdf}
                className="btn-outline whitespace-nowrap"
                disabled={busy || filteredRecords.length === 0}
              >
                <FileText className="w-4 h-4 text-red-600" />
                PDF Report
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2.5">
            {filteredRecords.length === 0
              ? 'No records match this selection.'
              : `${filteredRecords.length} record${filteredRecords.length === 1 ? '' : 's'} — grouped by consultant in the PDF report.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() =>
              downloadFile(
                `ot-log-consultants-${dateStamp()}.csv`,
                consultantsToCsv(db.consultants),
              )
            }
            className="btn-outline"
            disabled={busy}
          >
            <FileSpreadsheet className="w-4 h-4 text-sky-600" />
            Consultants CSV
          </button>
          <button onClick={exportData} className="btn-outline" disabled={busy}>
            <Database className="w-4 h-4 text-violet-600" />
            Full Backup (JSON)
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="btn-outline"
            disabled={busy}
          >
            <Upload className="w-4 h-4" /> Import JSON Backup
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => onImportFile(e.target.files?.[0])}
          />
        </div>
        {msg && (
          <p
            className={`text-sm mt-4 ${
              msg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {msg.text}
          </p>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-slate-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Account</h2>
        </div>

        <form onSubmit={changePassword} className="mt-4 max-w-md space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Change password</h3>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="input"
              placeholder="At least 6 characters"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="input"
              placeholder="Repeat the new password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
            />
          </div>
          {pwMsg && (
            <p
              className={`text-sm ${
                pwMsg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {pwMsg.text}
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={pwBusy}>
            {pwBusy ? 'Saving…' : 'Change password'}
          </button>
        </form>

        <div className="mt-8 rounded-xl border border-red-200 bg-red-50/60 p-4 max-w-md">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-semibold text-red-700">Delete account</h3>
          </div>
          <p className="text-xs text-red-600/90 mb-3">
            This permanently erases all your records, consultants, tags, files
            and profile from the database. This action cannot be undone. To
            confirm, type <b>delete my account</b> below.
          </p>
          <input
            type="text"
            className="input !border-red-300"
            placeholder='Type "delete my account"'
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value)
              setDelMsg(null)
            }}
          />
          {delMsg && <p className="text-xs text-red-600 mt-2">{delMsg.text}</p>}
          <button
            type="button"
            onClick={deleteAccount}
            disabled={delBusy || confirmText.trim().toLowerCase() !== 'delete my account'}
            className="mt-3 btn w-full bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {delBusy ? 'Deleting…' : 'Delete my account permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}

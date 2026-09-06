import { useRef, useState } from 'react'
import { Upload, Database, FileSpreadsheet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { db } from '../lib/db.js'
import {
  recordsToCsv,
  consultantsToCsv,
  downloadFile,
  dateStamp,
} from '../lib/exportData.js'

export default function SettingsPage() {
  const importRef = useRef(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() =>
              downloadFile(
                `ot-log-records-${dateStamp()}.csv`,
                recordsToCsv(db.records),
              )
            }
            className="btn-outline h-auto !py-3 flex-col gap-1.5"
            disabled={busy}
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span className="text-xs">Records</span>
            <span className="text-[11px] text-slate-400 font-normal">CSV / Excel</span>
          </button>
          <button
            onClick={() =>
              downloadFile(
                `ot-log-consultants-${dateStamp()}.csv`,
                consultantsToCsv(db.consultants),
              )
            }
            className="btn-outline h-auto !py-3 flex-col gap-1.5"
            disabled={busy}
          >
            <FileSpreadsheet className="w-5 h-5 text-sky-600" />
            <span className="text-xs">Consultants</span>
            <span className="text-[11px] text-slate-400 font-normal">CSV / Excel</span>
          </button>
          <button onClick={exportData} className="btn-outline h-auto !py-3 flex-col gap-1.5" disabled={busy}>
            <Database className="w-5 h-5 text-violet-600" />
            <span className="text-xs">Full Backup</span>
            <span className="text-[11px] text-slate-400 font-normal">JSON (restore)</span>
          </button>
        </div>
        <div className="mt-3">
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

      <div className="card p-5 flex items-center gap-3">
        <p className="text-sm text-slate-500">
          Operating theatres and assist positions are managed under{' '}
          <Link
            to="/ot-positions"
            className="font-medium text-primary-600 hover:underline"
          >
            OT &amp; Positions
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

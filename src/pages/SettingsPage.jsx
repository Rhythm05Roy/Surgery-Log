import { useRef, useState } from 'react'
import { Download, Upload, Database } from 'lucide-react'
import { Link } from 'react-router-dom'
import { db } from '../lib/db.js'

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
            Data Backup
          </h2>
        </div>
        <p className="text-sm text-slate-500 mt-1 mb-5">
          Your data is stored in the cloud under your account. Export a JSON
          backup regularly and keep it somewhere safe — you can restore it
          here at any time.
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportData} className="btn-primary" disabled={busy}>
            <Download className="w-4 h-4" /> Export Backup
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="btn-outline"
            disabled={busy}
          >
            <Upload className="w-4 h-4" /> Import Backup
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

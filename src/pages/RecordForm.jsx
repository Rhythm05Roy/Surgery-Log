import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Save, X } from 'lucide-react'
import { useLive, db } from '../lib/db.js'
import { toLocalISO } from '../lib/date.js'
import Combobox from '../components/Combobox.jsx'
import FileUpload from '../components/FileUpload.jsx'

const emptyForm = {
  date: toLocalISO(),
  patientName: '',
  age: '',
  diagnosis: '',
  ot: null,
  assistPosition: null,
  consultant: null,
  attachments: [],
}

export default function RecordForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { consultants, ots, positions } = useLive()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(() => ({
    ...emptyForm,
    date: toLocalISO(),
  }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit) {
      const rec = db.records.find((r) => r.id === id)
      if (rec) {
        setForm({
          date: rec.date || '',
          patientName: rec.patientName || '',
          age: rec.age ?? '',
          diagnosis: rec.diagnosis || '',
          ot: rec.otId ? { id: rec.otId, name: rec.otName } : null,
          assistPosition: rec.assistPositionId
            ? { id: rec.assistPositionId, name: rec.assistPositionName }
            : null,
          consultant: rec.consultantId
            ? { id: rec.consultantId, name: rec.consultantName }
            : null,
          attachments: rec.attachments || [],
        })
      }
    }
  }, [id, isEdit])

  const set = (field) => (e) => {
    const v = e.target.value
    setForm((f) => ({ ...f, [field]: v }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  const validate = () => {
    const er = {}
    if (!form.date) er.date = 'Date is required'
    if (!form.patientName.trim()) er.patientName = 'Patient name is required'
    if (form.age === '' || form.age < 0 || form.age > 120)
      er.age = 'Enter a valid age'
    if (!form.ot) er.ot = 'OT is required'
    if (!form.consultant) er.consultant = 'Consultant is required'
    return er
  }

  const submit = async (e) => {
    e.preventDefault()
    const er = validate()
    if (Object.keys(er).length) {
      setErrors(er)
      return
    }
    const payload = {
      date: form.date,
      patientName: form.patientName.trim(),
      age: Number(form.age),
      diagnosis: form.diagnosis.trim(),
      otId: form.ot.id,
      otName: form.ot.name,
      assistPositionId: form.assistPosition?.id || null,
      assistPositionName: form.assistPosition?.name || null,
      consultantId: form.consultant.id,
      consultantName: form.consultant.name,
      attachments: form.attachments,
    }
    setSaving(true)
    try {
      if (isEdit) await db.updateRecord(id, payload)
      else await db.addRecord(payload)
      navigate('/records')
    } catch (err) {
      window.alert('Could not save: ' + (err?.message || 'unknown error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">
          Surgery Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={set('date')}
            />
            {errors.date && (
              <p className="text-xs text-red-600 mt-1">{errors.date}</p>
            )}
          </div>
          <div>
            <label className="label">
              Patient Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. John Doe"
              value={form.patientName}
              onChange={set('patientName')}
            />
            {errors.patientName && (
              <p className="text-xs text-red-600 mt-1">{errors.patientName}</p>
            )}
          </div>
          <div>
            <label className="label">
              Age <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              max="120"
              className="input"
              placeholder="Years"
              value={form.age}
              onChange={set('age')}
            />
            {errors.age && (
              <p className="text-xs text-red-600 mt-1">{errors.age}</p>
            )}
          </div>
        </div>

        <div>
          <label className="label">Diagnosis</label>
          <textarea
            rows={3}
            className="input !h-auto py-2.5 resize-y"
            placeholder="Diagnosis / operative findings / notes…"
            value={form.diagnosis}
            onChange={set('diagnosis')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Combobox
            label="OT Name"
            required
            placeholder="Select or add OT"
            options={ots}
            value={form.ot}
            onChange={(opt) => {
              setForm((f) => ({ ...f, ot: opt }))
              setErrors((er) => ({ ...er, ot: undefined }))
            }}
            onAdd={(name) => db.addOT(name)}
            error={errors.ot}
          />
          <Combobox
            label="Assist Position"
            placeholder="Select or add position"
            options={positions}
            value={form.assistPosition}
            onChange={(opt) => setForm((f) => ({ ...f, assistPosition: opt }))}
            onAdd={(name) => db.addPosition(name)}
          />
          <Combobox
            label="Consultant"
            required
            placeholder="Select or add consultant"
            options={consultants}
            value={form.consultant}
            onChange={(opt) => {
              setForm((f) => ({ ...f, consultant: opt }))
              setErrors((er) => ({ ...er, consultant: undefined }))
            }}
            onAdd={async (name) => {
              const id = await db.addConsultant({ name })
              return { id, name }
            }}
            addLabel
          />
        </div>
        {errors.ot && <p className="text-xs text-red-600 -mt-2">{errors.ot}</p>}
        {errors.consultant && (
          <p className="text-xs text-red-600 -mt-2">{errors.consultant}</p>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-4">
          Additional Documents
        </h2>
        <FileUpload
          value={form.attachments}
          onChange={(attachments) => setForm((f) => ({ ...f, attachments }))}
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : isEdit ? 'Update Record' : 'Save Record'}
        </button>
        <Link to={isEdit ? `/records` : '/records'} className="btn-outline">
          <X className="w-4 h-4" /> Cancel
        </Link>
      </div>
    </form>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Save, X } from 'lucide-react'
import { useLive, db } from '../lib/db.js'
import { toLocalISO } from '../lib/date.js'
import { buildDiagnosis, TAG_TYPES } from '../lib/format.js'
import Combobox from '../components/Combobox.jsx'
import MultiSelect from '../components/MultiSelect.jsx'
import FileUpload from '../components/FileUpload.jsx'

const emptyForm = {
  date: toLocalISO(),
  patientName: '',
  ageYears: '',
  ageMonths: '',
  ageDays: '',
  ot: null,
  assistPosition: null,
  consultant: null,
  indication: null,
  comorbidities: [],
  preHistories: [],
  diagnosis: '',
  attachments: [],
}

const clampNum = (v, min, max) => {
  const n = v === '' ? '' : Number(v)
  if (n === '') return ''
  if (Number.isNaN(n)) return ''
  return Math.max(min, Math.min(max, Math.trunc(n))).toString()
}

export default function RecordForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { consultants, ots, positions, tags } = useLive()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(() => ({
    ...emptyForm,
    date: toLocalISO(),
  }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const tagsOf = (type) => tags.filter((t) => t.type === type)

  useEffect(() => {
    if (isEdit) {
      const rec = db.records.find((r) => r.id === id)
      if (rec) {
        setForm({
          ...emptyForm,
          date: rec.date || '',
          patientName: rec.patientName || '',
          ageYears: rec.ageYears != null ? rec.ageYears : rec.age ?? '',
          ageMonths: rec.ageMonths ?? '',
          ageDays: rec.ageDays ?? '',
          ot: rec.otName ? { id: rec.otId, name: rec.otName } : null,
          assistPosition: rec.assistPositionName
            ? { id: rec.assistPositionId, name: rec.assistPositionName }
            : null,
          consultant: rec.consultantId
            ? { id: rec.consultantId, name: rec.consultantName }
            : null,
          diagnosis: rec.diagnosis || '',
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

  const setAge = (field) => (e) =>
    setForm((f) => ({
      ...f,
      [field]: clampNum(e.target.value, 0, field === 'ageYears' ? 120 : field === 'ageMonths' ? 11 : 30),
    }))

  const rebuildSentence = (next, source) => {
    const sentence = buildDiagnosis({
      indication: next.indication ?? source.indication ?? '',
      comorbidities: next.comorbidities ?? source.comorbidities ?? [],
      preHistories: next.preHistories ?? source.preHistories ?? [],
    })
    return { ...next, diagnosis: sentence }
  }

  const setIndication = (opt) =>
    setForm((f) => {
      const next = { ...f, indication: opt?.name ?? null }
      return { ...rebuildSentence(next, f), indication: next.indication }
    })

  const setComorbidities = (names) =>
    setForm((f) => rebuildSentence({ ...f, comorbidities: names }, f))

  const setPreHistories = (names) =>
    setForm((f) => rebuildSentence({ ...f, preHistories: names }, f))

  const validate = () => {
    const er = {}
    if (!form.date) er.date = 'Date is required'
    if (!form.ot) er.ot = 'OT is required'
    if (!form.consultant) er.consultant = 'Consultant / Surgeon is required'
    if (form.ageYears !== '' && (form.ageYears < 0 || form.ageYears > 120))
      er.age = 'Enter a valid age'
    if (form.ageMonths !== '' && (form.ageMonths < 0 || form.ageMonths > 11))
      er.age = 'Months must be 0–11'
    if (form.ageDays !== '' && (form.ageDays < 0 || form.ageDays > 30))
      er.age = 'Days must be 0–30'
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
      ageYears: form.ageYears === '' ? null : Number(form.ageYears),
      ageMonths: form.ageMonths === '' ? null : Number(form.ageMonths),
      ageDays: form.ageDays === '' ? null : Number(form.ageDays),
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

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-3">
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
          <div className="md:col-span-5">
            <label className="label">Patient Name (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. John Doe"
              value={form.patientName}
              onChange={set('patientName')}
            />
          </div>
          <div className="md:col-span-4">
            <label className="label">Age (optional)</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="120"
                  inputMode="numeric"
                  className="input"
                  placeholder="Years"
                  value={form.ageYears}
                  onChange={setAge('ageYears')}
                />
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="11"
                  inputMode="numeric"
                  className="input"
                  placeholder="Months"
                  value={form.ageMonths}
                  onChange={setAge('ageMonths')}
                />
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="30"
                  inputMode="numeric"
                  className="input"
                  placeholder="Days"
                  value={form.ageDays}
                  onChange={setAge('ageDays')}
                />
              </div>
            </div>
            {errors.age && (
              <p className="text-xs text-red-600 mt-1">{errors.age}</p>
            )}
          </div>
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
            label="Consultant / Surgeon"
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

      <div className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">
          Diagnosis
        </h2>
        <p className="text-xs text-slate-500 -mt-2">
          Choose values below — they combine into a diagnosis sentence you can
          still edit.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Combobox
            label="Diagnosis indication"
            placeholder="Select or add indication"
            options={tagsOf(TAG_TYPES.indication)}
            value={
              form.indication
                ? { id: 'sel', name: form.indication }
                : null
            }
            onChange={setIndication}
            onAdd={(name) => db.addTag(TAG_TYPES.indication, name)}
          />
          <MultiSelect
            label="Comorbidities"
            options={tagsOf(TAG_TYPES.comorbidity)}
            selected={form.comorbidities}
            onChange={setComorbidities}
            onAdd={(name) => db.addTag(TAG_TYPES.comorbidity, name)}
          />
          <MultiSelect
            label="Pre-history"
            options={tagsOf(TAG_TYPES.prehistory)}
            selected={form.preHistories}
            onChange={setPreHistories}
            onAdd={(name) => db.addTag(TAG_TYPES.prehistory, name)}
          />
        </div>
        <div>
          <label className="label">Diagnosis sentence (editable)</label>
          <textarea
            rows={3}
            className="input !h-auto py-2.5 resize-y"
            placeholder="The sentence is built here automatically…"
            value={form.diagnosis}
            onChange={set('diagnosis')}
          />
        </div>
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

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Save, X, Camera } from 'lucide-react'
import { db } from '../lib/db.js'
import PhoneInput from '../components/PhoneInput.jsx'
import { compressImage, PHOTO_MAX_EDGE } from '../lib/image.js'

const MAX_IMAGE_MB = 40

const emptyForm = {
  name: '',
  designation: '',
  expertise: '',
  degrees: '',
  affiliation: '',
  phone: '',
  email: '',
  notes: '',
  photo: null,
}

export default function ConsultantForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const fileRef = useRef(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit) {
      const c = db.consultants.find((x) => x.id === id)
      if (c) setForm({ ...emptyForm, ...c })
    }
  }, [id, isEdit])

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const onPhoto = async (file) => {
    setError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_IMAGE_MB}MB`)
      return
    }
    const rawDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    try {
      const photo = await compressImage(rawDataUrl, { maxEdge: PHOTO_MAX_EDGE })
      setForm((f) => ({ ...f, photo }))
    } catch {
      setError('Could not process that image.')
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    const payload = {
      name: form.name.trim(),
      designation: form.designation.trim(),
      expertise: form.expertise.trim(),
      degrees: form.degrees.trim(),
      affiliation: form.affiliation.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      notes: form.notes.trim(),
      photo: form.photo,
    }
    setError(null)
    setSaving(true)
    try {
      if (isEdit) {
        await db.updateConsultant(id, payload)
        navigate(`/consultants/${id}`)
      } else {
        const newId = await db.addConsultant(payload)
        navigate(`/consultants/${newId}`)
      }
    } catch (err) {
      setError('Could not save: ' + (err?.message || 'unknown error'))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">
          {isEdit ? 'Edit Consultant' : 'Add Consultant'}
        </h2>

        <div className="flex items-center gap-5">
          {form.photo ? (
            <img
              src={form.photo}
              alt="Preview"
              className="w-20 h-20 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-semibold text-2xl">
              {(form.name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-outline"
            >
              <Camera className="w-4 h-4" />
              {form.photo ? 'Change Photo' : 'Upload Photo'}
            </button>
            {form.photo && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, photo: null }))}
                className="ml-2 text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            )}
            <p className="text-xs text-slate-400 mt-1.5">
              Auto-compressed (large photos OK)
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="Dr. Full Name"
              value={form.name}
              onChange={set('name')}
            />
          </div>
          <div>
            <label className="label">Designation</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Senior Consultant"
              value={form.designation}
              onChange={set('designation')}
            />
          </div>
          <div>
            <label className="label">Area of Expertise</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Laparoscopic Surgery"
              value={form.expertise}
              onChange={set('expertise')}
            />
          </div>
          <div>
            <label className="label">Degrees</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. MBBS, MS, FRCS"
              value={form.degrees}
              onChange={set('degrees')}
            />
          </div>
          <div>
            <label className="label">Affiliation</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. City General Hospital"
              value={form.affiliation}
              onChange={set('affiliation')}
            />
          </div>
          <div>
            <PhoneInput
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="e.g. doctor@example.com"
              value={form.email}
              onChange={set('email')}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea
              rows={3}
              className="input !h-auto py-2.5 resize-y"
              placeholder="Anything else worth remembering…"
              value={form.notes}
              onChange={set('notes')}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : isEdit ? 'Update Consultant' : 'Save Consultant'}
        </button>
        <Link
          to={isEdit ? `/consultants/${id}` : '/consultants'}
          className="btn-outline"
        >
          <X className="w-4 h-4" /> Cancel
        </Link>
      </div>
    </form>
  )
}

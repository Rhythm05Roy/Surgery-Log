import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Camera, ArrowLeft } from 'lucide-react'
import { useLive, db } from '../lib/db.js'
import PhoneInput from '../components/PhoneInput.jsx'

const MAX_IMAGE_MB = 5

const emptyForm = {
  name: '',
  designation: '',
  specialization: '',
  degrees: '',
  affiliation: '',
  registrationNo: '',
  phone: '',
  email: '',
  address: '',
  photo: null,
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { profile } = useLive()
  const fileRef = useRef(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) setForm({ ...emptyForm, ...profile })
    else setForm(emptyForm)
  }, [profile])

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const onPhoto = (file) => {
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
    const reader = new FileReader()
    reader.onload = () => setForm((f) => ({ ...f, photo: reader.result }))
    reader.readAsDataURL(file)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await db.saveProfile({
        name: form.name.trim(),
        designation: form.designation.trim(),
        specialization: form.specialization.trim(),
        degrees: form.degrees.trim(),
        affiliation: form.affiliation.trim(),
        registrationNo: form.registrationNo.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        photo: form.photo,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError('Could not save: ' + (err?.message || 'unknown error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">
            Doctor Profile
          </h2>
          {profile && (
            <span className="text-xs text-emerald-600 inline-flex items-center gap-1">
              Saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-5">
          {form.photo ? (
            <img
              src={form.photo}
              alt="Preview"
              className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-sm"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-semibold text-3xl border-4 border-slate-100">
              {(form.name || 'Dr').charAt(0).toUpperCase()}
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
              JPG/PNG up to {MAX_IMAGE_MB}MB
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
              Full Name <span className="text-red-500">*</span>
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
              placeholder="e.g. Senior Consultant Surgeon"
              value={form.designation}
              onChange={set('designation')}
            />
          </div>
          <div>
            <label className="label">Specialization</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Laparoscopic Surgery"
              value={form.specialization}
              onChange={set('specialization')}
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
            <label className="label">Hospital / Affiliation</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. City General Hospital"
              value={form.affiliation}
              onChange={set('affiliation')}
            />
          </div>
          <div>
            <label className="label">Registration No.</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. MCI-123456"
              value={form.registrationNo}
              onChange={set('registrationNo')}
            />
          </div>
          <div>
            <PhoneInput
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            />
          </div>
          <div className="sm:col-span-2">
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
            <label className="label">Clinic / Practice Address</label>
            <textarea
              rows={2}
              className="input !h-auto py-2.5 resize-y"
              placeholder="Address for the practice / clinic…"
              value={form.address}
              onChange={set('address')}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Profile'}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">
            Profile saved
          </span>
        )}
      </div>
    </form>
  )
}

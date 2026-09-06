import { X, Pencil, Paperclip, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAttachment, openAttachment } from '../lib/hooks.js'
import { ageLabel } from '../lib/format.js'

export default function RecordModal({ record, onClose }) {
  const navigate = useNavigate()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-slate-900">
            Surgery Record — {record.patientName}
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => navigate(`/records/${record.id}/edit`)}
              className="p-1.5 rounded text-slate-400 hover:text-primary-600 hover:bg-primary-50"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" value={record.date} />
            <Field label="Age" value={ageLabel(record) || '—'} />
            <Field label="Patient Name" value={record.patientName} />
            <Field label="OT Name" value={record.otName} />
            <Field label="Assist Position" value={record.assistPositionName || '—'} />
            <Field label="Consultant/Surgeon" value={record.consultantName} />
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Diagnosis
            </h3>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">
              {record.diagnosis || '—'}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Attachments
              {record.attachments?.length ? ` (${record.attachments.length})` : ''}
            </h3>
            {record.attachments?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {record.attachments.map((a) => (
                  <AttachmentCard key={a.id} a={a} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No attachments</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function AttachmentCard({ a }) {
  const { src } = useAttachment(a)
  return a.isImage ? (
    <button
      type="button"
      onClick={() => openAttachment(a)}
      disabled={!src}
      className="block w-full rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-primary-400 text-left disabled:opacity-60"
    >
      {src ? (
        <img src={src} alt={a.name} className="w-full h-28 object-cover" />
      ) : (
        <div className="w-full h-28 bg-slate-100 flex items-center justify-center">
          <FileText className="w-6 h-6 text-slate-400" />
        </div>
      )}
      <p className="text-xs text-slate-500 truncate px-2 py-1.5 bg-slate-50">
        {a.name}
      </p>
    </button>
  ) : (
    <button
      type="button"
      onClick={() => openAttachment(a)}
      className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 text-left"
    >
      <FileText className="w-5 h-5 text-slate-400 shrink-0" />
      <span className="text-xs text-slate-600 truncate">{a.name}</span>
    </button>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </h3>
      <p className="text-sm text-slate-800">{value || '—'}</p>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, Trash2, Phone, Mail, Building2, Award, Briefcase, Stethoscope, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLive, db } from '../lib/db.js'
import { formatPhone } from '../components/PhoneInput.jsx'
import RecordModal from '../components/RecordModal.jsx'

const PAGE_SIZE = 8

export default function ConsultantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { consultants, records } = useLive()
  const [viewing, setViewing] = useState(null)
  const [page, setPage] = useState(0)

  const consultant = consultants.find((c) => c.id === id)

  const related = useMemo(
    () => records.filter((r) => r.consultantId === id),
    [records, id],
  )

  const pageCount = Math.max(Math.ceil(related.length / PAGE_SIZE), 1)
  const safePage = Math.min(page, pageCount - 1)
  const pageRecords = related.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  )

  if (!consultant) {
    return (
      <div className="card p-12 text-center max-w-md mx-auto">
        <p className="text-sm text-slate-500 mb-4">
          Consultant not found or was deleted.
        </p>
        <Link to="/consultants" className="btn-primary">
          Back to Consultants
        </Link>
      </div>
    )
  }

  const remove = () => {
    if (
      window.confirm(
        `Delete ${consultant.name}? ${related.length} surgery record(s) will keep the name but lose the link.`,
      )
    ) {
      db.deleteConsultant(consultant.id)
      navigate('/consultants')
    }
  }

  return (
    <div>
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {consultant.photo ? (
            <img
              src={consultant.photo}
              alt={consultant.name}
              className="w-28 h-28 rounded-2xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center font-semibold text-4xl shrink-0">
              {(consultant.name || '?').charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-slate-900">
                  {consultant.name}
                </h2>
                {consultant.designation && (
                  <p className="text-sm text-primary-600 font-medium mt-0.5">
                    {consultant.designation}
                  </p>
                )}
                {consultant.expertise && (
                  <p className="text-sm text-slate-500 mt-1">
                    {consultant.expertise}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => navigate(`/consultants/${consultant.id}/edit`)}
                  className="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={remove}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <Info icon={Award} label="Degrees" value={consultant.degrees} />
              <Info icon={Building2} label="Affiliation" value={consultant.affiliation} />
              <Info icon={Phone} label="Phone" value={formatPhone(consultant.phone)} />
              <Info icon={Mail} label="Email" value={consultant.email} />
            </div>
          </div>
        </div>

        {consultant.notes && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Notes
            </h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {consultant.notes}
            </p>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-slate-700">
            Surgeries with {consultant.name}
          </h2>
          <span className="text-xs text-slate-400">
            ({related.length})
          </span>
        </div>
        {related.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">
            No surgeries logged with this consultant yet
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pageRecords.map((r) => (
              <li
                key={r.id}
                className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50/60 cursor-pointer"
                onClick={() => setViewing(r)}
              >
                <span className="text-sm text-slate-500 w-24 shrink-0">
                  {r.date}
                </span>
                <span className="text-sm font-medium text-slate-800">
                  {r.patientName}
                </span>
                <span className="text-sm text-slate-500 truncate hidden sm:block flex-1">
                  {r.diagnosis || '—'}
                </span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 shrink-0">
                  {r.otName}
                </span>
              </li>
            ))}
          </ul>
        )}
        {pageCount > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-1">
            <button
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className="p-1.5 rounded text-slate-400 hover:text-primary-600 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 px-2">
              {safePage + 1} / {pageCount}
            </span>
            <button
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              className="p-1.5 rounded text-slate-400 hover:text-primary-600 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {viewing && <RecordModal record={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm text-slate-700 break-words">
          {value || '—'}
        </p>
      </div>
    </div>
  )
}

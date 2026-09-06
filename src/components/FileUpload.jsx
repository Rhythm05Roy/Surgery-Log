import { useRef, useState } from 'react'
import { Paperclip, FileText, Trash2, Eye } from 'lucide-react'
import { uid } from '../lib/db.js'
import { useAttachment, openAttachment } from '../lib/hooks.js'
import { compressImage, dataUrlByteSize } from '../lib/image.js'

const MAX_FILE_MB = 10

async function fileToAttachment(file) {
  const isImage = file.type.startsWith('image/')
  if (!isImage && file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`${file.name} is larger than ${MAX_FILE_MB}MB`)
  }
  const rawDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  let dataUrl = rawDataUrl
  let type = file.type
  if (isImage) {
    dataUrl = await compressImage(rawDataUrl)
    type = 'image/jpeg'
  }
  return {
    id: uid(),
    name: file.name,
    type,
    size: isImage ? dataUrlByteSize(dataUrl) : file.size,
    isImage,
    dataUrl,
  }
}

export default function FileUpload({ label, value, onChange }) {
  const inputRef = useRef(null)
  const [error, setError] = useState(null)
  const attachments = value || []

  const onFiles = async (files) => {
    setError(null)
    const results = []
    for (const file of files) {
      try {
        results.push(await fileToAttachment(file))
      } catch (err) {
        setError(err.message)
      }
    }
    if (results.length) onChange([...attachments, ...results])
    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = (id) => onChange(attachments.filter((a) => a.id !== id))

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          onFiles([...e.dataTransfer.files])
        }}
        className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/40 transition-colors"
      >
        <Paperclip className="w-6 h-6 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-600">
          Click to upload or drag &amp; drop images / documents
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Images are auto-compressed; {MAX_FILE_MB}MB max for other files
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={(e) => onFiles([...e.target.files])}
        />
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      {attachments.length > 0 && (
        <ul className="mt-3 space-y-2">
          {attachments.map((a) => (
            <AttachmentRow key={a.id} a={a} onRemove={() => remove(a.id)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function AttachmentRow({ a, onRemove }) {
  const { src } = useAttachment(a)
  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
      {a.isImage ? (
        src ? (
          <img
            src={src}
            alt={a.name}
            className="w-10 h-10 rounded object-cover border border-slate-200"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
        )
      ) : (
        <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
          <FileText className="w-5 h-5 text-slate-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{a.name}</p>
        <p className="text-xs text-slate-400">
          {typeof a.size === 'number' ? `${(a.size / 1024).toFixed(1)} KB` : 'file'}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          openAttachment(a)
        }}
        className="p-1.5 rounded text-slate-400 hover:text-primary-600 hover:bg-primary-50"
        title="View"
      >
        <Eye className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
        title="Remove"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  )
}

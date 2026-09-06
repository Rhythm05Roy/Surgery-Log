import { supabase } from './supabase.js'

export { supabase }

const BUCKET = 'otlog'

/* ---------- signed URL helpers ---------- */
const urlCache = new Map()

export async function signedUrl(path, expires = 3600) {
  if (!path) return null
  const hit = urlCache.get(path)
  if (hit) return hit
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expires)
  const value = error ? null : data.signedUrl
  urlCache.set(path, value)
  return value
}

async function attachSigned(row, pathField, outField = 'photo') {
  if (!row) return row
  const path = row[pathField]
  const url = path ? await signedUrl(path) : null
  return { ...row, [outField]: url, [`${outField}Path`]: path }
}

/* ---------- row mappers ---------- */
export function recordFromDB(r) {
  const record = {
    id: r.id,
    date: r.record_date,
    patientName: r.patient_name,
    age: r.age,
    diagnosis: r.diagnosis,
    otName: r.ot_name,
    assistPositionName: r.assist_position_name,
    consultantId: r.consultant_id,
    consultantName: r.consultant_name,
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
    createdAt: r.created_at,
  }
  return record
}

export function recordToDB(r) {
  return {
    record_date: r.date,
    patient_name: r.patientName,
    age: r.age ?? null,
    diagnosis: r.diagnosis ?? '',
    ot_name: r.otName ?? '',
    assist_position_name: r.assistPositionName ?? '',
    consultant_id: r.consultantId || null,
    consultant_name: r.consultantName ?? '',
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
  }
}

export function consultantFromDB(r) {
  return {
    id: r.id,
    name: r.name,
    designation: r.designation,
    expertise: r.expertise,
    degrees: r.degrees,
    affiliation: r.affiliation,
    phone: r.phone,
    email: r.email,
    notes: r.notes,
    photoPath: r.photo_path,
    createdAt: r.created_at,
  }
}

export function consultantToDB(c) {
  return {
    name: c.name,
    designation: c.designation ?? '',
    expertise: c.expertise ?? '',
    degrees: c.degrees ?? '',
    affiliation: c.affiliation ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    notes: c.notes ?? '',
    photo_path: c.photoPath ?? null,
  }
}

export function profileFromDB(r) {
  if (!r) return null
  return {
    id: r.id,
    name: r.name,
    designation: r.designation,
    specialization: r.specialization,
    degrees: r.degrees,
    affiliation: r.affiliation,
    registrationNo: r.registration_no,
    phone: r.phone,
    email: r.email,
    address: r.address,
    photoPath: r.photo_path,
  }
}

export function profileToDB(p) {
  return {
    name: p.name ?? '',
    designation: p.designation ?? '',
    specialization: p.specialization ?? '',
    degrees: p.degrees ?? '',
    affiliation: p.affiliation ?? '',
    registration_no: p.registrationNo ?? '',
    phone: p.phone ?? '',
    email: p.email ?? '',
    address: p.address ?? '',
    photo_path: p.photoPath ?? null,
  }
}

export function listFromDB(r) {
  return { id: r.id, name: r.name, createdAt: r.created_at }
}

/* ---------- storage: photos & attachments ---------- */
function extFor(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || '')
  return m ? m[1].toLowerCase() : 'bin'
}

export async function uploadDataUrl(userId, kind, dataUrl, name = 'file') {
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const path = `${userId}/${kind}/${crypto.randomUUID()}.${extFor(name)}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: dataUrl.split(';')[0].split(':')[1] })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return path
}

export async function uploadFileObject(userId, kind, file) {
  const path = `${userId}/${kind}/${crypto.randomUUID()}.${extFor(file.name)}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return path
}

export async function removeObjects(paths) {
  const valid = (paths || []).filter(Boolean)
  if (!valid.length) return
  await supabase.storage.from(BUCKET).remove(valid)
}

/* ---------- auth ---------- */
export const auth = supabase.auth

export async function currentUser() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user ?? null
}

/* ---------- data fetching ---------- */
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  const mapped = profileFromDB(data)
  return mapped ? attachSigned(mapped, 'photoPath', 'photo') : null
}

export async function upsertProfile(userId, payload) {
  const row = profileToDB(payload)
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...row })
  if (error) throw error
  return fetchProfile(userId)
}

export async function listRecords() {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .order('record_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(recordFromDB)
}

export async function listConsultants() {
  const { data, error } = await supabase
    .from('consultants')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return Promise.all((data || []).map((c) => attachSigned(consultantFromDB(c), 'photoPath', 'photo')))
}

export async function listNames(table) {
  const { data, error } = await supabase
    .from(table)
    .select('id, name, created_at')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(listFromDB)
}

export async function insertRow(table, value) {
  const { data, error } = await supabase.from(table).insert(value).select().single()
  if (error) throw error
  return data
}

export async function updateRow(table, id, value) {
  const { data, error } = await supabase.from(table).update(value).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

import React from 'react'
import {
  supabase,
  currentUser,
  fetchProfile,
  upsertProfile,
  listRecords,
  listConsultants,
  listNames,
  insertRow,
  updateRow,
  deleteRow,
  recordToDB,
  consultantToDB,
  listFromDB,
  uploadDataUrl,
  removeObjects,
} from './api.js'

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`

const BUCKET_PATH = 'otlog'

/* ---------------- in-memory cache ---------------- */
let user = null
let cache = {
  records: [],
  consultants: [],
  ots: [],
  positions: [],
  profile: null,
}

const emit = () => window.dispatchEvent(new CustomEvent('otlog-change'))
const emitData = () => {
  window.dispatchEvent(new CustomEvent('otlog-change'))
  window.dispatchEvent(new CustomEvent('otlog-data'))
}

export const isSignedIn = () => Boolean(user)

async function refreshAll() {
  const [records, consultants, ots, positions, profile] = await Promise.all([
    listRecords(),
    listConsultants(),
    listNames('ots'),
    listNames('positions'),
    fetchProfile(user.id),
  ])
  cache = { records, consultants, ots, positions, profile }
}

/* Re-fetch and publish. */
async function reload() {
  try {
    await refreshAll()
  } catch (err) {
    console.error('refresh failed', err)
  }
  emitData()
}

export async function init() {
  user = await currentUser()
  if (!user) throw new Error('not-signed-in')
  await refreshAll()
  emitData()
}

/* ---------------- public db facade (same shape as before) ---------------- */

export const db = {
  get records() {
    return cache.records
  },
  get consultants() {
    return cache.consultants
  },
  get ots() {
    return cache.ots
  },
  get positions() {
    return cache.positions
  },
  get profile() {
    return cache.profile
  },

  async refresh() {
    await reload()
  },

  async saveProfile(profileForm) {
    const old = cache.profile
    let photoPath = old?.photoPath ?? null
    const newPhoto = profileForm.photo
    if (typeof newPhoto === 'string' && newPhoto.startsWith('data:')) {
      if (old?.photoPath) await removeObjects([old.photoPath])
      photoPath = await uploadDataUrl(user.id, 'profile', newPhoto, 'photo.jpg')
    } else if (!newPhoto) {
      if (old?.photoPath) await removeObjects([old.photoPath])
      photoPath = null
    }
    cache.profile = await upsertProfile(user.id, {
      ...profileForm,
      photoPath,
    })
    emitData()
  },

  async addRecord(form) {
    const row = {
      ...recordToDB(form),
      attachments: await storeAttachments(form.attachments),
    }
    await insertRow('records', row)
    await reload()
  },

  async updateRecord(id, form) {
    const old = cache.records.find((r) => r.id === id)
    const kept = form.attachments.filter((a) => a.path).map((a) => a.path)
    const removed = (old?.attachments || [])
      .filter((a) => a.path && !kept.includes(a.path))
      .map((a) => a.path)
    if (removed.length) await removeObjects(removed)
    const row = {
      ...recordToDB(form),
      attachments: await storeAttachments(form.attachments),
    }
    await updateRow('records', id, row)
    await reload()
  },

  async deleteRecord(id) {
    const rec = cache.records.find((r) => r.id === id)
    const paths = (rec?.attachments || []).map((a) => a.path).filter(Boolean)
    if (paths.length) await removeObjects(paths)
    await deleteRow('records', id)
    await reload()
  },

  async addConsultant(consultantForm) {
    const item = { id: uid(), ...consultantForm }
    const row = consultantToDB(item)
    if (typeof item.photo === 'string' && item.photo.startsWith('data:')) {
      row.photo_path = await uploadDataUrl(user.id, 'consultants', item.photo, 'photo.jpg')
    }
    const created = await insertRow('consultants', row)
    await reload()
    return created.id
  },

  async updateConsultant(id, consultantForm) {
    const old = cache.consultants.find((c) => c.id === id)
    let photoPath = old?.photoPath ?? null
    const newPhoto = consultantForm.photo
    if (typeof newPhoto === 'string' && newPhoto.startsWith('data:')) {
      if (old?.photoPath) await removeObjects([old.photoPath])
      photoPath = await uploadDataUrl(user.id, 'consultants', newPhoto, 'photo.jpg')
    } else if (!newPhoto) {
      if (old?.photoPath) await removeObjects([old.photoPath])
      photoPath = null
    }
    const row = consultantToDB({ ...consultantForm, photoPath })
    await updateRow('consultants', id, row)
    if (typeof consultantForm.name === 'string') {
      const { error } = await supabase
        .from('records')
        .update({ consultant_name: consultantForm.name.trim() })
        .eq('consultant_id', id)
      if (error) console.error('rename propagation failed', error)
    }
    await reload()
  },

  async deleteConsultant(id) {
    const cons = cache.consultants.find((c) => c.id === id)
    if (cons?.photoPath) await removeObjects([cons.photoPath])
    await deleteRow('consultants', id)
    await reload()
  },

  async addOT(name) {
    const trimmed = (name || '').trim()
    if (!trimmed) return null
    const existing = cache.ots.find((o) => o.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing
    const created = await insertRow('ots', { name: trimmed })
    await reload()
    return listFromDB(created)
  },

  async deleteOT(id) {
    await deleteRow('ots', id)
    await reload()
  },

  async addPosition(name) {
    const trimmed = (name || '').trim()
    if (!trimmed) return null
    const existing = cache.positions.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (existing) return existing
    const created = await insertRow('positions', { name: trimmed })
    await reload()
    return listFromDB(created)
  },

  async deletePosition(id) {
    await deleteRow('positions', id)
    await reload()
  },

  exportAll() {
    return {
      app: 'otlog',
      version: 2,
      exportedAt: new Date().toISOString(),
      records: cache.records,
      consultants: cache.consultants.map((c) => ({
        ...c,
        photo: c.photoPath,
        photoPath: undefined,
      })),
      ots: cache.ots,
      positions: cache.positions,
      profile: cache.profile
        ? { ...cache.profile, photo: cache.profile.photoPath, photoPath: undefined }
        : null,
    }
  },

  async importAll(data) {
    if (!data || typeof data !== 'object') throw new Error('Invalid backup file')
    await importBackup(data)
    await reload()
  },
}

const SENTINEL_ID = '00000000-0000-0000-0000-000000000000'

async function storeAttachments(attachments, { ownedOnly = false } = {}) {
  const stored = []
  for (const a of attachments || []) {
    if (a.path) {
      if (ownedOnly && !a.path.startsWith(user.id + '/')) continue
      stored.push({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        isImage: a.isImage,
        path: a.path,
      })
    } else if (typeof a.dataUrl === 'string' && a.dataUrl.startsWith('data:')) {
      const isImage = a.isImage || a.type?.startsWith('image/')
      const path = await uploadDataUrl(user.id, 'records', a.dataUrl, a.name)
      stored.push({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        isImage,
        path,
      })
    }
  }
  return stored
}

/* ---------------- backup import (remaps legacy ids & uploads files) ---------------- */

async function importBackup(data) {
  const wipe = (table) => supabase.from(table).delete().neq('id', SENTINEL_ID)
  await wipe('records')
  await wipe('consultants')
  await wipe('ots')
  await wipe('positions')

  const consultantIdMap = {}
  for (const c of data.consultants || []) {
    let photoPath = null
    if (typeof c.photo === 'string' && c.photo.startsWith('data:')) {
      photoPath = await uploadDataUrl(user.id, 'consultants', c.photo, 'photo.jpg')
    } else if (typeof c.photo === 'string' && c.photo.startsWith(user.id + '/')) {
      photoPath = c.photo
    }
    const { data: created, error } = await supabase
      .from('consultants')
      .insert({
        ...consultantToDB({ ...c, photoPath }),
      })
      .select('id, name')
      .single()
    if (error) throw error
    if (c.id) consultantIdMap[c.id] = created.id
  }

  for (const r of data.records || []) {
    const attachments = await storeAttachments(r.attachments || [], {
      ownedOnly: true,
    })
    const row = {
      ...recordToDB({
        ...r,
        date: r.date || r.record_date,
        consultantId: r.consultantId ? consultantIdMap[r.consultantId] || null : null,
      }),
      attachments,
    }
    const { error } = await supabase.from('records').insert(row)
    if (error) throw error
  }

  for (const table of ['ots', 'positions']) {
    for (const item of data[table] || []) {
      if (!item.name) continue
      const { error: insErr } = await supabase.from(table).insert({ name: item.name })
      if (insErr) throw insErr
    }
  }

  const profile = data.profile
  if (profile) {
    let photoPath = null
    const rawPhoto = profile.photo || profile.photoPath
    if (typeof rawPhoto === 'string' && rawPhoto.startsWith('data:')) {
      photoPath = await uploadDataUrl(user.id, 'profile', rawPhoto, 'photo.jpg')
    } else if (typeof rawPhoto === 'string' && rawPhoto.startsWith(`${user.id}/`)) {
      photoPath = rawPhoto
    }
    await upsertProfile(user.id, {
      ...profile,
      photoPath,
    })
  }
}

export function useLive() {
  const [data, setData] = React.useState(initializer)
  React.useEffect(() => {
    const handler = () => setData(initializer())
    window.addEventListener('otlog-change', handler)
    window.addEventListener('otlog-data', handler)
    return () => {
      window.removeEventListener('otlog-change', handler)
      window.removeEventListener('otlog-data', handler)
    }
  }, [])
  return data
}

function initializer() {
  return {
    records: cache.records,
    consultants: cache.consultants,
    ots: cache.ots,
    positions: cache.positions,
    profile: cache.profile,
  }
}


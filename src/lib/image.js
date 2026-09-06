export const ATTACHMENT_MAX_EDGE = 1600
export const PHOTO_MAX_EDGE = 900
const QUALITY = 0.82

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read image'))
    img.src = dataUrl
  })
}

async function toCanvas(dataUrl, maxEdge) {
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return canvas
}

export async function compressImage(dataUrl, { maxEdge = ATTACHMENT_MAX_EDGE, quality = QUALITY } = {}) {
  const canvas = await toCanvas(dataUrl, maxEdge)
  return canvas.toDataURL('image/jpeg', quality)
}

export function dataUrlByteSize(dataUrl) {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return 0
  const raw = dataUrl.slice(comma + 1)
  const padding = raw.endsWith('=') ? (raw.endsWith('==') ? 2 : 1) : 0
  return Math.floor((raw.length * 3) / 4) - padding
}

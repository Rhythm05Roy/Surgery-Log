import { useEffect, useState } from 'react'
import { signedUrl } from './api.js'

export function useSignedUrl(path) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let active = true
    if (!path) {
      setUrl(null)
      return
    }
    signedUrl(path).then((u) => active && setUrl(u))
    return () => {
      active = false
    }
  }, [path])
  return url
}

export function useAttachment(a) {
  const local = typeof a?.dataUrl === 'string' && a.dataUrl.startsWith('data:')
  const src = local ? a.dataUrl : useSignedUrl(local ? null : a?.path)
  return { src }
}

export async function openAttachment(a) {
  const local = typeof a?.dataUrl === 'string' && a.dataUrl.startsWith('data:')
  const url = local ? a.dataUrl : await signedUrl(a?.path)
  if (url) window.open(url, '_blank', 'noopener')
}

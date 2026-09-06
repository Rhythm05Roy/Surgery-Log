export function isRouteActive(to, pathname) {
  if (to === '/') return pathname === '/'
  if (to === '/records/new') return pathname === '/records/new'
  if (to === '/records')
    return pathname === '/records' || /^\/records\/[^/]+\/edit$/.test(pathname)
  return pathname === to || pathname.startsWith(to + '/')
}

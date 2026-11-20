export function inspectionNavigation(pathname, state) {
  if (pathname === '/production/reports/preview') return { title: 'PDF preview', backTo: ['/production/history', '/production/job-cards', '/production/maintenance'].includes(state?.returnTo) ? state.returnTo : '/production/history' }
  const match = pathname.match(/^\/production\/live\/([^/]+)\/hole-checks(\/preview)?\/?$/)
  if (!match) return null
  return match[2]
    ? { title: 'PDF preview', backTo: '/production/live/' + match[1] + '/hole-checks' }
    : { title: 'Hole checks', backTo: '/production/live' }
}

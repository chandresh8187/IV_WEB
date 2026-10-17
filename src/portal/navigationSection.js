const within = (pathname, section) => pathname === section || pathname.startsWith(section + '/');
const productionAliases = new Set(['planning', 'history', 'contract-production', 'expenses', 'zinc-stock', 'monthly-reports', 'rate-calculator', 'chemical-tracking', 'certificates', 'plant', 'shift']);

// Paths are relative to the workspace BrowserRouter basename.
export function navigationSection(unit, pathname) {
  if (within(pathname, '/settings')) return '/settings';
  if (within(pathname, '/production')) return '/production';
  if (unit === 'unit1') {
    if (within(pathname, '/coils') || within(pathname, '/scan/coil')) return '/production';
    return pathname === '/' ? '/' : null;
  }
  if (unit === 'unit2') {
    const first = pathname.split('/')[1];
    if (productionAliases.has(first)) return '/production';
    if (first === 'users' || first === 'control' || within(pathname, '/system/ota-update')) return '/settings';
    if (within(pathname, '/profile')) return '/profile';
    if (pathname === '/' || within(pathname, '/dashboard')) return '/dashboard';
  }
  return null;
}

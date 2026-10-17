import LoadingIndicator from "../components/LoadingIndicator";
import { navigationSection } from '../portal/navigationSection'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Link, Route, Routes, useLocation, useNavigate } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowLeft, CalendarDays, Factory, House, LogOut, Menu, Settings, X } from 'lucide-react'
import { getProfile, readSession } from './api/authApi'
import { clearAuth, setAuth, setNavigationOpen } from './store/authSlice'
import { queryClient } from './store/queryClient'
import { formatDate } from './utils/dateTime'
import HomeScreen from './screens/HomeScreen'
import LoginScreen from './screens/LoginScreen'
import CoilStockScreen from './screens/CoilStockScreen'
import CoilQrScreen from './screens/CoilQrScreen'
import CoilUsageScreen from './screens/CoilUsageScreen'
import ProductionScreen from './screens/ProductionScreen'
import SettingsScreen from './screens/SettingsScreen'
import MaterialsGradesScreen from './screens/MaterialsGradesScreen'
import QrScanSettingsScreen from './screens/QrScanSettingsScreen'
import CoilScanScreen from './screens/CoilScanScreen'
import MachinesScreen from './screens/MachinesScreen'
import UsersAccessScreen from './screens/UsersAccessScreen'
import ShiftSettingsScreen from './screens/ShiftSettingsScreen'
import NotificationTestScreen from './screens/NotificationTestScreen'
import Unit1RealtimeSync from './components/Unit1RealtimeSync'
import './App.css'
import './Unit2Layout.css'
import './Unit2Login.css'
import './Interface.css'

const LiveProductionScreen = lazy(() => import('./screens/LiveProductionScreen'))
const MachineProductionEntriesScreen = lazy(() => import('./screens/MachineProductionEntriesScreen'))
const JobCardsScreen = lazy(() => import('./screens/JobCardsScreen'))
const ProductionHistoryScreen = lazy(() => import('./screens/ProductionHistoryScreen'))

const links = [
  { to: '/', label: 'Home', icon: House },
  { to: '/production', label: 'Production', icon: Factory },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function AppShell() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, navigationOpen } = useSelector(state => state.auth)
  const [connected, setConnected] = useState(false)
  const location = useLocation()
  const activeSection = navigationSection('unit1', location.pathname)
  const titles = { '/': 'Home', '/production': 'Production', '/production/job-cards': 'Job cards', '/production/live': 'Live production', '/production/history': 'Production history', '/coils': 'Coil stock', '/coils/inward': 'Coil stock', '/settings': 'Settings', '/settings/materials-grades': 'Materials And Grades', '/settings/machines': 'Machines', '/settings/shifts': 'Shift times', '/settings/users': 'Users and access', '/settings/qr-scan': 'QR scan settings' }
  const screenTitle = titles[location.pathname] || (location.pathname.includes('/entries') ? 'Production entries' : location.pathname.includes('/usage') ? 'Coil usage' : location.pathname.includes('/qr') ? 'Coil QR' : 'Unit 1')
  const coilQrMatch = location.pathname.match(/^\/coils\/(\d+)\/qr$/)
  const backTo = coilQrMatch ? `/coils/${coilQrMatch[1]}/usage`
    : /^\/coils\/\d+\/usage$/.test(location.pathname) ? '/coils'
    : location.pathname === '/coils' || location.pathname === '/coils/inward' ? '/production'
    : /^\/production\/live\/[^/]+\/entries$/.test(location.pathname) ? '/production/live'
    : location.pathname.startsWith('/production/') ? '/production'
    : location.pathname.startsWith('/settings/') ? '/settings'
    : location.pathname.startsWith('/scan/coil/') ? '/'
    : null
  const initials = String(user?.name || 'IV').split(' ').filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase()
  useEffect(() => { dispatch(setNavigationOpen(false)) }, [location.pathname, dispatch])
  useEffect(() => { const update = event => setConnected(Boolean(event.detail?.connected)); window.addEventListener('unit1:connection', update); return () => window.removeEventListener('unit1:connection', update) }, [])

  function logout() {
    localStorage.removeItem('ivs1_session')
    queryClient.clear()
    dispatch(clearAuth())
    navigate('/login', { replace: true })
  }

  return (
    <div className="application-shell">
      <Unit1RealtimeSync />
      {navigationOpen && <button className="sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => dispatch(setNavigationOpen(false))} />}
      <aside className={`app-sidebar ${navigationOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand"><img src="/iv-logo.png" alt="IV Square Structure" /><div><strong>IV APP</strong><span>UNIT 1 · Production Management</span></div><button className="sidebar-close" type="button" aria-label="Close navigation" onClick={() => dispatch(setNavigationOpen(false))}><X size={20} /></button></div>
        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-navigation" aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} aria-current={activeSection === to ? "page" : undefined} onClick={() => dispatch(setNavigationOpen(false))} className={activeSection === to ? "sidebar-link active" : "sidebar-link"}>
              <Icon size={20} strokeWidth={1.8} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom"><div className={`backend-status ${connected ? 'connected' : 'disconnected'}`}><span className="backend-dot" /><div><strong>{connected ? 'Backend connected' : 'Reconnecting…'}</strong><small>{connected ? 'Live updates active' : 'Updates temporarily offline'}</small></div></div><div className="sidebar-profile"><div className="sidebar-avatar">{initials}</div><div className="sidebar-user-details"><strong>{user?.name || 'User'}</strong><small>{String(user?.role || '').replaceAll('_', ' ')}</small></div><button className="sidebar-logout" type="button" onClick={logout} aria-label="Log out" title="Log out"><LogOut size={18} /></button></div></div>
      </aside>
      <div className="application-main">
        <header className="application-header"><div className="header-title-area"><button className="mobile-menu-button" type="button" onClick={() => dispatch(setNavigationOpen(true))} aria-label="Open navigation"><Menu size={22} /></button>{backTo && <button className="header-back-button" type="button" onClick={() => navigate(backTo)} aria-label="Go back"><ArrowLeft size={20} /></button>}<div><span>IV Square Structure</span><h1>{screenTitle}</h1></div></div><div className="header-right"><div className={`header-live-status ${connected ? 'connected' : 'disconnected'}`}><span />{connected ? 'Live' : 'Offline'}</div><div className="header-date"><CalendarDays size={17} />{formatDate(new Date())}</div><div className="header-user"><div className="header-avatar">{initials}</div><span><strong>{user?.name || 'User'}</strong><small>{String(user?.role || '').replaceAll('_', ' ')}</small></span></div></div></header>
        <main className="application-content"><div className="page-content"><Routes><Route index element={<HomeScreen />} /><Route path="production" element={<ProductionScreen />} /><Route path="production/job-cards" element={<Suspense fallback={<LoadingIndicator label="Loading job cards…" />}><JobCardsScreen /></Suspense>} /><Route path="production/live" element={<Suspense fallback={<LoadingIndicator label="Loading live production…" />}><LiveProductionScreen /></Suspense>} /><Route path="production/history" element={<Suspense fallback={<LoadingIndicator label="Loading production history…" />}><ProductionHistoryScreen /></Suspense>} /><Route path="production/live/:machineId/entries" element={<Suspense fallback={<LoadingIndicator label="Loading production entries…" />}><MachineProductionEntriesScreen /></Suspense>} /><Route path="coils" element={<CoilStockScreen />} /><Route path="coils/inward" element={<CoilStockScreen />} /><Route path="coils/:id/usage" element={<CoilUsageScreen />} /><Route path="coils/:id/qr" element={<CoilQrScreen />} /><Route path="scan/coil/:internalId/:coilNumber" element={<CoilScanScreen />} /><Route path="settings" element={<SettingsScreen />} /><Route path="settings/materials-grades" element={<MaterialsGradesScreen />} /><Route path="settings/machines" element={<MachinesScreen />} /><Route path="settings/shifts" element={<ShiftSettingsScreen />} /><Route path="settings/notifications" element={<NotificationTestScreen />} /><Route path="settings/users" element={<UsersAccessScreen />} /><Route path="settings/qr-scan" element={<QrScanSettingsScreen />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></div></main>
      </div>
    </div>
  )
}

export default function App() {
  const dispatch = useDispatch()
  const location = useLocation()
  const { token, bootstrapping } = useSelector(state => state.auth)

  useEffect(() => {
    let cancelled = false
    const saved = readSession()
    if (!saved?.token) {
      dispatch(clearAuth())
      return
    }
    getProfile().then(response => {
      if (cancelled) return
      const user = response?.data?.user || response?.data || response?.user || saved.user
      dispatch(setAuth({ token: saved.token, user }))
    }).catch(error => {
      if (cancelled) return
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        localStorage.removeItem('ivs1_session')
        dispatch(clearAuth())
      } else {
        dispatch(setAuth(saved))
      }
    })
    return () => { cancelled = true }
  }, [dispatch])

  if (bootstrapping) return <div className="boot-screen"><div className="brand-mark">IV</div><LoadingIndicator label="Opening workspace…" /></div>

  return <Routes><Route path="/login" element={token ? <Navigate to={location.state?.from || '/'} replace /> : <LoginScreen />} /><Route path="/*" element={token ? <AppShell /> : <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />} /></Routes>
}




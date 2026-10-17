import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import { io } from 'socket.io-client'
import { getProfile } from '../api/authApi'
import { setAuth } from '../store/authSlice'
import { API_BASE_URL } from '../api/apiClient'

const keysByResource = {
  production: ['production-live', 'production-runs', 'unit1-machine-entries', 'unit1-job-cards', 'job-cards', 'job-card', 'coils', 'coil', 'coil-usage', 'available-production-coils', 'production-coil-used'],
  'job-cards': ['unit1-job-cards', 'job-cards', 'job-card', 'production-live', 'unit1-machine-entries'],
  machines: ['machines', 'production-live'],
  shifts: ['unit1-shifts', 'production-live'],
  coils: ['coils', 'coil', 'coil-usage', 'available-production-coils', 'production-coil-used', 'production-live'],
  materials: ['materials-grades'],
  'qr-settings': ['qr-scan-settings', 'coil-scan'],
  users: ['unit1-users', 'unit1-user-permissions'],
}

export default function Unit1RealtimeSync() {
  const token = useSelector(state => state.auth.token)
  const dispatch = useDispatch()
  const client = useQueryClient()

  useEffect(() => {
    if (!token) return undefined
    let active = true
    const socketRoot = String(import.meta.env.VITE_SOCKET_URL || '').trim()
      || new URL(API_BASE_URL, window.location.origin).origin
    const socket = io(socketRoot, { auth: { token }, transports: ['polling'] })
    const invalidate = resource => {
      const keys = resource ? keysByResource[resource] || [] : [...new Set(Object.values(keysByResource).flat())]
      keys.forEach(key => client.invalidateQueries({ queryKey: [key] }))
    }
    const refreshAccess = async () => {
      try {
        const response = await getProfile()
        const user = response?.user || response?.data?.user
        if (!active || !user) return
        dispatch(setAuth({ token, user }))
        localStorage.setItem('ivs1_session', JSON.stringify({ token, user }))
      } catch { /* Keep existing access while offline. */ }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') { invalidate(); refreshAccess() } }
    const reportConnection = connected => window.dispatchEvent(new CustomEvent('unit1:connection', { detail: { connected } }))
    socket.on('connect', () => { reportConnection(true); invalidate(); refreshAccess() })
    socket.on('disconnect', () => reportConnection(false))
    socket.on('connect_error', () => reportConnection(false))
    socket.on('unit1:data:changed', event => { invalidate(event?.resource); if (event?.resource === 'users') refreshAccess() })
    document.addEventListener('visibilitychange', onVisible)
    return () => { active = false; document.removeEventListener('visibilitychange', onVisible); reportConnection(false); socket.disconnect() }
  }, [token, client, dispatch])

  return null
}

import axios from 'axios'

// Development uses Vite's localhost:5000 proxy; production uses the live API.
export const API_BASE_URL = String(import.meta.env.VITE_UNIT1_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_AUTH_API_URL || '').trim().replace(/\/+$/, '')
  || (import.meta.env.DEV ? '/api' : 'https://app.ivsquarestructure.com/api')
const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 15000, headers: { 'Content-Type': 'application/json' } })

apiClient.interceptors.request.use(config => {
  try {
    const token = JSON.parse(localStorage.getItem('ivs1_session') || 'null')?.token
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch { localStorage.removeItem('ivs1_session') }
  return config
})

export default apiClient

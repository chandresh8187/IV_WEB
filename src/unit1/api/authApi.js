import apiClient from './apiClient'

export async function login(credentials) {
  const { data } = await apiClient.post('/unit1/auth/login', credentials)
  if (!data?.token || !data?.user) throw new Error('The server did not return a valid session.')
  localStorage.setItem('ivs1_session', JSON.stringify({ token: data.token, user: data.user }))
  return data
}

export function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem('ivs1_session') || 'null')
    if (session?.user?.scope === 'unit1') return session
    localStorage.removeItem('ivs1_session')
    return null
  }
  catch { localStorage.removeItem('ivs1_session'); return null }
}

export async function getProfile() {
  const { data } = await apiClient.get('/unit1/auth/profile')
  return data
}

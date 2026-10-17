import { createSlice } from '@reduxjs/toolkit'

const initialState = { token: null, user: null, bootstrapping: true, navigationOpen: false }
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action) {
      state.token = action.payload.token
      state.user = action.payload.user
      state.bootstrapping = false
    },
    clearAuth(state) {
      state.token = null
      state.user = null
      state.bootstrapping = false
      state.navigationOpen = false
    },
    setNavigationOpen(state, action) { state.navigationOpen = action.payload },
  },
})
export const { setAuth, clearAuth, setNavigationOpen } = authSlice.actions
export default authSlice.reducer

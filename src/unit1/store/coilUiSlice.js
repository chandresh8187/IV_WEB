import { createSlice } from '@reduxjs/toolkit'

const initialState = { search: '' }
const coilUiSlice = createSlice({
  name: 'coilUi', initialState,
  reducers: {
    setSearch(state, action) { state.search = action.payload },
    resetFilters() { return initialState },
  },
})
export const { setSearch, resetFilters } = coilUiSlice.actions
export default coilUiSlice.reducer

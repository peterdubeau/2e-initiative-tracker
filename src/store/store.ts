// src/store/store.ts
import { configureStore } from '@reduxjs/toolkit'
import roomReducer from './roomSlice'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'

// 1. Configure the store with your room slice
const store = configureStore({
  reducer: {
    room: roomReducer,
  },
})

// 2. Inferred types for RootState and AppDispatch
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// 3. Typed hooks for use throughout your app
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// 4. Default export for <Provider>
export default store

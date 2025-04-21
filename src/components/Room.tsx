// src/components/Room.tsx
import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../store/store'
import { setRoom, updateEntries, setTurnIndex } from '../store/roomSlice'
import { connect } from '../services/socket'
import GMView from './GMView'
import PlayerView from './PlayerView'

const Room: React.FC = () => {
  const { code } = useParams<{ code: string }>()
  const dispatch = useDispatch<AppDispatch>()

  // Compute GM flag from sessionStorage + URL
  const storedCode = sessionStorage.getItem('roomCode')
  const storedIsGM = sessionStorage.getItem('isGM') === 'true'
  const isGM = storedIsGM && storedCode === code

  // Pull entries & turn from Redux for rendering if needed
  const entries = useSelector((s: RootState) => s.room.entries)
  const currentTurnIndex = useSelector((s: RootState) => s.room.currentTurnIndex)

  useEffect(() => {
    if (!code) return

    // Persist roomCode; only keep isGM flag if codes match
    sessionStorage.setItem('roomCode', code)
    if (!isGM) {
      sessionStorage.removeItem('isGM')
    }

    // Initialize Redux state
    dispatch(setRoom({ code, isGM }))

    // Open socket with correct role
    const socket = connect(code, isGM)

    // Listen for updates
    socket.on('room-update', state => {
      dispatch(updateEntries(state.entries))
      dispatch(setTurnIndex(state.currentTurnIndex))
    })

    return () => {
      socket.disconnect()
    }
  }, [code, isGM, dispatch])

  // Render GM or Player view
  return isGM ? <GMView /> : <PlayerView />
}

export default Room

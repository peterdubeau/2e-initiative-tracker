// src/components/JoinRoom.tsx
import React, { useState, useEffect } from 'react'
import { Box, TextField, Button, Typography, Alert } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch } from '../store/store'
import { setRoom } from '../store/roomSlice'
import { connect, getSocket } from '../services/socket'

export default function JoinRoom() {
  const { code: urlCode } = useParams<{ code?: string }>()
  const [step, setStep] = useState<'enterCode' | 'details'>('enterCode')
  const [code, setCode] = useState(urlCode?.toUpperCase() || '')
  const [name, setName] = useState('')
  const [initiative, setInitiative] = useState<number>(0)
  const [color, setColor] = useState('#2196f3')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  // Attempt connection when URL contains a code
  useEffect(() => {
    if (urlCode) {
      setCode(urlCode.toUpperCase())
      handleConnect()
    }
    return () => {
      try {
        getSocket()?.disconnect()
      } catch {
        /* ignore */
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCode])

  function handleConnect() {
    setError('')
    setLoading(true)
    const socket = connect(code, false)
    socket.on('connect', () => {
      setLoading(false)
      setStep('details')
    })
    socket.on('connect_error', () => {
      setLoading(false)
      setError('Invalid room code or room is closed')
      socket.disconnect()
    })
  }

  function handleCodeSubmit() {
    if (code.trim().length !== 4) {
      setError('Room code must be 4 letters')
      return
    }
    handleConnect()
  }

  function handleJoin() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setError('')
    dispatch(setRoom({ code, isGM: false }))
    const socket = getSocket()!
    socket.emit('join-room', {
      name: name.trim(),
      roll: initiative,
      color
    })
    navigate(`/room/${code}`)
  }

  // Step 1: enter/validate room code
  if (step === 'enterCode') {
    return (
      <Box sx={{ p: 2, maxWidth: 360, mx: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Enter Room Code
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Room Code"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          inputProps={{ maxLength: 4 }}
          fullWidth
          margin="normal"
        />
        <Button
          variant="contained"
          fullWidth
          onClick={handleCodeSubmit}
          disabled={loading || code.length !== 4}
        >
          {loading ? 'Connecting…' : 'Connect'}
        </Button>
      </Box>
    )
  }

  // Step 2: collect player details
  return (
    <Box sx={{ p: 2, maxWidth: 360, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Join Game {code}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <TextField
        label="Character Name"
        value={name}
        onChange={e => setName(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Initiative Roll"
        type="number"
        value={initiative}
        onChange={e => setInitiative(parseInt(e.target.value, 10) || 0)}
        fullWidth
        margin="normal"
      />
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
        <Typography sx={{ mr: 1 }}>Color:</Typography>
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          style={{ width: 32, height: 32, border: 'none', padding: 0 }}
        />
      </Box>
      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        onClick={handleJoin}
      >
        Join Room
      </Button>
    </Box>
  )
}

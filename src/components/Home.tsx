import React from 'react'
import { Box, Button, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        gap: 2,
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Pathfinder 2e Tracker
      </Typography>
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={() => navigate('/create')}
      >
        Create Game
      </Button>
      <Button
        variant="outlined"
        size="large"
        fullWidth
        onClick={() => navigate('/join')}
      >
        Join Game
      </Button>
    </Box>
  )
}

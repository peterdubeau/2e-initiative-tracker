import React from 'react'
import { Box, Button, Typography, Card, CardContent, Container } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import GroupAddIcon from '@mui/icons-material/GroupAdd'

export default function Home() {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #00BCD4 50%, #2196F3 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradientShift 15s ease infinite',
        px: 2,
        py: 4,
        '@keyframes gradientShift': {
          '0%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: '100% 50%',
          },
          '100%': {
            backgroundPosition: '0% 50%',
          },
        },
      }}
    >
      <Container maxWidth="sm">
        <Card
          elevation={8}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box
              sx={{
                textAlign: 'center',
                mb: 4,
              }}
            >
              <Typography
                variant="h3"
                component="h1"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #00BCD4 0%, #2196F3 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                Pathfinder 2e
              </Typography>
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{ mb: 4 }}
              >
                Initiative Tracker
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<PlayArrowIcon />}
                onClick={() => navigate('/create')}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Create Game
              </Button>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                startIcon={<GroupAddIcon />}
                onClick={() => navigate('/join')}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                  },
                }}
              >
                Join Game
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}

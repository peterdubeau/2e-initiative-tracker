import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Card,
  CardContent,
  Container,
  InputAdornment,
  Alert,
  CircularProgress,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CreateIcon from "@mui/icons-material/Create";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store/store";
import { setRoom } from "../store/roomSlice";
import { api } from "../services/api";

const CreateRoom: React.FC = () => {
  const [roomCode, setRoomCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleCreate = async () => {
    localStorage.clear();
    sessionStorage.clear();
    setError("");
    setLoading(true);
    
    try {
      const resp = await api.post("/create-room");

      const code = resp.data.code as string;
      // persist GM status
      sessionStorage.setItem("roomCode", code);
      sessionStorage.setItem("isGM", "true");
      setRoomCode(code);
      dispatch(setRoom({ code, isGM: true }));
      
      // Navigate after a brief delay to show success
      setTimeout(() => {
        navigate(`/room/${code}`);
      }, 1500);
    } catch (error: any) {
      console.error('Create room error:', error);
      setError(error?.response?.data?.message || 'Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Card
          elevation={8}
          sx={{
            width: '100%',
            borderRadius: 4,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
                Create a Game Room
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start a new initiative tracking session
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {!roomCode ? (
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleCreate}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CreateIcon />}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                {loading ? 'Creating Room...' : 'Create Room'}
              </Button>
            ) : (
              <Box>
                <Alert
                  severity="success"
                  icon={<CheckCircleIcon />}
                  sx={{ mb: 3 }}
                >
                  Room created successfully! Redirecting...
                </Alert>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Share this room code with your players:
                </Typography>
                <TextField
                  value={roomCode}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleCopy}
                          edge="end"
                          color={copied ? 'success' : 'default'}
                        >
                          {copied ? <CheckCircleIcon /> : <ContentCopyIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      letterSpacing: '0.2em',
                      textAlign: 'center',
                      backgroundColor: 'primary.light',
                      color: 'primary.contrastText',
                      '& fieldset': {
                        borderColor: 'primary.main',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
                {copied && (
                  <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                    Copied to clipboard!
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default CreateRoom;

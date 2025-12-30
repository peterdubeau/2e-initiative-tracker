import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  Container,
  Alert,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CreateIcon from "@mui/icons-material/Create";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store/store";
import { setRoom } from "../store/roomSlice";
import { api } from "../services/api";

const CreateRoom: React.FC = () => {
  const [gmName, setGmName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [loggedIn, setLoggedIn] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    
    try {
      const resp = await api.post("/login-gm", {
        name: gmName,
        password: password,
      });

      if (resp.data.success) {
        const name = resp.data.gmName as string;
        // persist GM status
        sessionStorage.setItem("gmName", name);
        sessionStorage.setItem("isGM", "true");
        setLoggedIn(true);
        dispatch(setRoom({ gmName: name, isGM: true }));
        
        // Navigate after a brief delay to show success
        setTimeout(() => {
          navigate(`/room/${name}`);
        }, 1500);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error?.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
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

            {!loggedIn ? (
              <Box>
                <TextField
                  label="GM Name"
                  value={gmName}
                  onChange={(e) => setGmName(e.target.value)}
                  fullWidth
                  margin="normal"
                  sx={{ mb: 2 }}
                  required
                  autoComplete="username"
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  margin="normal"
                  sx={{ mb: 3 }}
                  required
                  autoComplete="current-password"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && gmName && password) {
                      handleLogin();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleLogin}
                  disabled={loading || !gmName || !password}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CreateIcon />}
                  sx={{
                    py: 1.5,
                    fontSize: '1.1rem',
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  {loading ? 'Logging in...' : 'Login & Create Room'}
                </Button>
              </Box>
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
                  Welcome, {gmName}! Your room is ready.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default CreateRoom;

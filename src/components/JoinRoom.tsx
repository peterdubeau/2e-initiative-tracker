// src/components/JoinRoom.tsx
import { useState, useEffect } from "react";
import { Box, TextField, Button, Typography, Alert, Card, CardContent, Container, Paper, CircularProgress } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../store/store";
import { setRoom } from "../store/roomSlice";
import { connect, getSocket } from "../services/socket";
import { updateEntries, setTurnIndex } from "../store/roomSlice";
import { api } from "../services/api";

export default function JoinRoom() {
  const [step, setStep] = useState<"selectGM" | "details">("selectGM");
  const [selectedGmName, setSelectedGmName] = useState<string>("");
  const [gmList, setGmList] = useState<string[]>([]);
  const [loadingGMs, setLoadingGMs] = useState(true);
  const [name, setName] = useState("");
  const [initiative, setInitiative] = useState<string>("");
  const [color, setColor] = useState("#2196f3");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Load saved player name from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem("playerName");
    if (savedName) {
      setName(savedName);
    }
  }, []);

  // Generate random hex color
  function generateRandomColor(): string {
    return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
  }

  // Fetch active GMs on mount
  useEffect(() => {
    const fetchActiveGMs = async () => {
      try {
        const resp = await api.get("/active-gms");
        setGmList(resp.data.gms || []);
      } catch (error) {
        console.error("Failed to fetch active GMs:", error);
        setError("Failed to load active game masters");
      } finally {
        setLoadingGMs(false);
      }
    };

    fetchActiveGMs();
    
    // Poll for active GMs every 5 seconds
    const interval = setInterval(fetchActiveGMs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Setup socket connection when GM is selected
  useEffect(() => {
    if (!selectedGmName) return;

    dispatch(setRoom({ gmName: selectedGmName, isGM: false }));

    // clear any leftover storage
    sessionStorage.removeItem("playerInfo");

    const socket = connect(selectedGmName, false);

    socket.on("room-update", (state) => {
      dispatch(updateEntries(state.entries));
      dispatch(setTurnIndex(state.currentTurnIndex));
    });

    socket.on("connect", () => {
      setLoading(false);
      const raw = sessionStorage.getItem("playerInfo");
      if (raw) {
        socket.emit("join-room", JSON.parse(raw));
        sessionStorage.removeItem("playerInfo");
      }
    });

    socket.on("connect_error", () => {
      setLoading(false);
      setError("Failed to connect to room");
      socket.disconnect();
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedGmName, dispatch]);

  function handleSelectGM(gmName: string) {
    setSelectedGmName(gmName);
    setError("");
    setLoading(true);
    setStep("details");
  }

  function handleJoin() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!initiative || initiative === "") {
      setError("Initiative is required");
      return;
    }
    
    setError("");
    
    // Save player name to localStorage
    localStorage.setItem("playerName", name.trim());
    
    // Assign random color if still using default
    const finalColor = color === "#2196f3" ? generateRandomColor() : color;
    
    dispatch(setRoom({ gmName: selectedGmName, isGM: false }));
    const socket = getSocket()!;
    const initiativeNumber = parseInt(initiative, 10);
    socket.emit("join-room", {
      name: name.trim(),
      roll: initiativeNumber,
      color: finalColor,
    });
    const pi = { name: name.trim(), roll: initiativeNumber, color: finalColor };
    Object.entries(pi).forEach(([key, value]) => {
      sessionStorage.setItem(key, value as string);
    });
    navigate(`/room/${selectedGmName}`);
  }

  // Step 1: Select GM
  if (step === "selectGM") {
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
                  Select Game Master
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose a Game Master to join their room
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {loadingGMs ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : gmList.length === 0 ? (
                <Alert severity="info" sx={{ mb: 3 }}>
                  No active game masters at the moment. Please wait for a GM to create a room.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {gmList.map((gmName) => (
                    <Paper
                      key={gmName}
                      elevation={2}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          elevation: 4,
                          backgroundColor: 'action.hover',
                        },
                      }}
                      onClick={() => handleSelectGM(gmName)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <PersonIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
                          {gmName}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  // Step 2: collect player details
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
                Join Game
              </Typography>
              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                Game Master: {selectedGmName}
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <TextField
              label="Character Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              margin="normal"
              sx={{ mb: 2 }}
              required
            />

            <TextField
              label="Initiative Roll"
              type="number"
              value={initiative}
              onChange={(e) => setInitiative(e.target.value)}
              fullWidth
              margin="normal"
              sx={{ mb: 3 }}
              inputProps={{ min: 0 }}
              required
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 3,
                p: 2,
                backgroundColor: 'background.default',
                borderRadius: 2,
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Character Color:
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    backgroundColor: color,
                    border: '2px solid',
                    borderColor: 'divider',
                    boxShadow: 2,
                  }}
                />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{
                    width: 50,
                    height: 40,
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                />
              </Box>
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleJoin}
              disabled={!name.trim() || !initiative || initiative === ""}
              sx={{
                py: 1.5,
                fontSize: '1.1rem',
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Join Room
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

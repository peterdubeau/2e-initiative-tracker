// src/components/JoinRoom.tsx
import { useState, useEffect } from "react";
import { Box, TextField, Button, Typography, Alert, Card, CardContent, Container, Paper, CircularProgress, FormControlLabel, Switch } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
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
  const [perceptionModifier, setPerceptionModifier] = useState<string>("");
  const [autoRoll, setAutoRoll] = useState<boolean>(false);
  const [color, setColor] = useState("#2196f3");
  const [textColor, setTextColor] = useState("#ffffff");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Load saved player name, perception modifier, and auto-roll preference from localStorage and colors from sessionStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem("playerName");
    if (savedName) {
      setName(savedName);
    }
    
    const savedPerceptionModifier = localStorage.getItem("perceptionModifier");
    if (savedPerceptionModifier) {
      setPerceptionModifier(savedPerceptionModifier);
    }
    
    const savedAutoRoll = localStorage.getItem("autoRoll");
    if (savedAutoRoll === "true") {
      setAutoRoll(true);
    }
    
    // Load saved colors from sessionStorage
    const savedColor = sessionStorage.getItem("color");
    const savedTextColor = sessionStorage.getItem("textColor");
    if (savedColor) {
      setColor(savedColor);
    }
    if (savedTextColor) {
      setTextColor(savedTextColor);
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
    
    // Determine initiative value based on auto-roll or manual entry
    let initiativeNumber: number;
    if (autoRoll) {
      // Calculate initiative roll when joining: 1d20 + perception modifier
      const modifier = parseInt(perceptionModifier || "0", 10);
      const d20Roll = Math.floor(Math.random() * 20) + 1;
      initiativeNumber = d20Roll + modifier;
    } else {
      if (!initiative || initiative === "") {
        setError("Initiative is required");
        return;
      }
      initiativeNumber = parseInt(initiative, 10);
    }
    
    setError("");
    
    // Save player name, perception modifier, and auto-roll preference to localStorage
    localStorage.setItem("playerName", name.trim());
    if (perceptionModifier) {
      localStorage.setItem("perceptionModifier", perceptionModifier);
    } else {
      localStorage.removeItem("perceptionModifier");
    }
    localStorage.setItem("autoRoll", autoRoll ? "true" : "false");
    
    // Assign random color if still using default
    const finalColor = color === "#2196f3" ? generateRandomColor() : color;
    const finalTextColor = textColor || "#ffffff";
    
    dispatch(setRoom({ gmName: selectedGmName, isGM: false }));
    const socket = getSocket()!;
    socket.emit("join-room", {
      name: name.trim(),
      roll: initiativeNumber,
      color: finalColor,
      textColor: finalTextColor,
    });
    // Save player info to sessionStorage
    sessionStorage.setItem("name", name.trim());
    sessionStorage.setItem("roll", initiativeNumber.toString());
    sessionStorage.setItem("color", finalColor);
    sessionStorage.setItem("textColor", finalTextColor);
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
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 1000,
            }}
          >
            <ThemeToggle />
          </Box>
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
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <ThemeToggle />
        </Box>
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

            <FormControlLabel
              control={
                <Switch
                  checked={autoRoll}
                  onChange={(e) => setAutoRoll(e.target.checked)}
                  data-testid="auto-roll-switch"
                />
              }
              label="Auto-roll Initiative (1d20 + Perception Modifier)"
              sx={{ mb: 2 }}
            />

            {autoRoll ? (
              <>
                <TextField
                  label="Perception Modifier"
                  type="number"
                  value={perceptionModifier}
                  onChange={(e) => setPerceptionModifier(e.target.value)}
                  fullWidth
                  margin="normal"
                  sx={{ mb: 2 }}
                  inputProps={{ step: 1 }}
                  helperText="Optional: Your perception modifier (can be negative)"
                />
                <Box sx={{ mb: 3 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      Initiative will be rolled automatically when you join
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      (1d20 + {parseInt(perceptionModifier || "0", 10)})
                    </Typography>
                  </Alert>
                </Box>
              </>
            ) : (
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
                data-testid="initiative-roll-input"
              />
            )}

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                mb: 3,
                p: 2,
                backgroundColor: 'background.default',
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Background Color:
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
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Text Color:
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
                      backgroundColor: textColor,
                      border: '2px solid',
                      borderColor: 'divider',
                      boxShadow: 2,
                    }}
                  />
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
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
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: color,
                  color: textColor,
                  textAlign: 'center',
                  mt: 1,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Preview: This is how your entry will look
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleJoin}
              disabled={!name.trim() || (!autoRoll && (!initiative || initiative === ""))}
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

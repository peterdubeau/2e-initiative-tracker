// src/components/JoinRoom.tsx
import { useState, useEffect } from "react";
import { Box, TextField, Button, Typography, Alert, Card, CardContent, Container } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch } from "../store/store";
import { setRoom } from "../store/roomSlice";
import { connect, getSocket } from "../services/socket";
import { updateEntries, setTurnIndex } from "../store/roomSlice";
import { Entry } from "../../init-server/roomManager";

export default function JoinRoom() {
  const { code: urlCode } = useParams<{ code?: string }>();
  const [step, setStep] = useState<"enterCode" | "details">("enterCode");
  const [code, setCode] = useState(urlCode?.toUpperCase() || "");
  const [name, setName] = useState("");
  const [initiative, setInitiative] = useState<number>(0);
  const [color, setColor] = useState("#2196f3");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isGM, setIsGM] = useState(false);

  // Attempt connection when URL contains a code
  useEffect(() => {
    dispatch(setRoom({ code: code, isGM }));

    // clear any leftover storage
    sessionStorage.removeItem("playerInfo");

    const socket = connect(code, isGM);

    socket.on("room-update", (state) => {
      dispatch(updateEntries(state.entries));
      dispatch(setTurnIndex(state.currentTurnIndex));
    });

    if (!isGM) {
      socket.on("connect", () => {
        const raw = sessionStorage.getItem("playerInfo");
        if (raw) {
          socket.emit("join-room", JSON.parse(raw));
          sessionStorage.removeItem("playerInfo");
        }
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [code, isGM, dispatch]);

  function handleConnect() {
    setError("");
    setLoading(true);
    const socket = connect(code, false);
    // 1) register your listener first
    socket.on("room-update", (state) => {
      console.log("⏳ client got room-update:");
      state.entries.map((e: Entry) => e.name);
      dispatch(updateEntries(state.entries));
      dispatch(setTurnIndex(state.currentTurnIndex));
    });

    // 2) ONLY AFTER the listener is set up, emit join for players
    if (!isGM) {
      socket.on("connect", () => {
        const raw = sessionStorage.getItem("playerInfo");
        if (raw) {
          socket.emit("join-room", JSON.parse(raw));
          sessionStorage.removeItem("playerInfo");
        }
      });
    }
    socket.on("connect", () => {
      setLoading(false);
      setStep("details");
    });
    socket.on("connect_error", () => {
      setLoading(false);
      setError("Invalid room code or room is closed");
      socket.disconnect();
    });
  }

  function handleCodeSubmit() {
    if (code.trim().length !== 4) {
      setError("Room code must be 4 letters");
      return;
    }
    handleConnect();
    sessionStorage.clear();
  }

  function handleJoin() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setError("");
    dispatch(setRoom({ code, isGM: false }));
    const socket = getSocket()!;
    console.log({
      name: name.trim(),
      roll: initiative,
      color,
    });
    socket.emit("join-room", {
      name: name.trim(),
      roll: initiative,
      color,
    });
    const pi = { name: name.trim(), roll: initiative, color };
    console.log(JSON.stringify(pi));
    Object.entries(pi).forEach(([key, value]) => {
      sessionStorage.setItem(key, value as string);
    });
    navigate(`/room/${code}`);
  }

  // Step 1: enter/validate room code
  if (step === "enterCode") {
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
                  Enter Room Code
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter the 4-letter code provided by your Game Master
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <TextField
                label="Room Code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                inputProps={{
                  maxLength: 4,
                  style: {
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                  },
                }}
                fullWidth
                margin="normal"
                sx={{ mb: 3 }}
              />

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleCodeSubmit}
                disabled={loading || code.length !== 4}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                {loading ? "Connecting…" : "Connect"}
              </Button>
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
              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600, letterSpacing: '0.2em' }}>
                {code}
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
              onChange={(e) => setInitiative(parseInt(e.target.value, 10) || 0)}
              fullWidth
              margin="normal"
              sx={{ mb: 3 }}
              inputProps={{ min: 0 }}
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
              disabled={!name.trim()}
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

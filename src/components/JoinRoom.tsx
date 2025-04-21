// src/components/JoinRoom.tsx
import { useState, useEffect } from "react";
import { Box, TextField, Button, Typography, Alert } from "@mui/material";
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
      <Box sx={{ p: 2, maxWidth: 360, mx: "auto" }}>
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
          onChange={(e) => setCode(e.target.value.toUpperCase())}
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
          {loading ? "Connecting…" : "Connect"}
        </Button>
      </Box>
    );
  }

  // Step 2: collect player details
  return (
    <Box sx={{ p: 2, maxWidth: 360, mx: "auto" }}>
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
        onChange={(e) => setName(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Initiative Roll"
        type="number"
        value={initiative}
        onChange={(e) => setInitiative(parseInt(e.target.value, 10) || 0)}
        fullWidth
        margin="normal"
      />
      <Box sx={{ mt: 2, display: "flex", alignItems: "center" }}>
        <Typography sx={{ mr: 1 }}>Color:</Typography>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: 32, height: 32, border: "none", padding: 0 }}
        />
      </Box>
      <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={handleJoin}>
        Join Room
      </Button>
    </Box>
  );
}

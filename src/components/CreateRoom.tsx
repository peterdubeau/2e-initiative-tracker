import React, { useState } from "react";
import { Box, Button, TextField, Typography, IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store/store";
import { setRoom } from "../store/roomSlice";
import { api } from "../services/api";

const CreateRoom: React.FC = () => {
  const [roomCode, setRoomCode] = useState<string>("");
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleCreate = async () => {
    localStorage.clear();
    sessionStorage.clear();
    // infer the API host from wherever the FE is running
    const resp = await api.post("/create-room");

    const code = resp.data.code as string;
    // persist GM status
    sessionStorage.setItem("roomCode", code);
    sessionStorage.setItem("isGM", "true");
    setRoomCode(code);
    dispatch(setRoom({ code, isGM: true }));
    navigate(`/room/${code}`);
  };

  return (
    <Box
      px={2}
      py={4}
      display="flex"
      flexDirection="column"
      alignItems="center"
      width="100%"
    >
      <Typography variant="h5" mb={2} align="center">
        Create a Game Room
      </Typography>
      <Button variant="contained" fullWidth onClick={handleCreate}>
        Create Room
      </Button>
      {roomCode && (
        <Box mt={2} display="flex" alignItems="center" width="100%">
          <TextField
            value={roomCode}
            InputProps={{ readOnly: true }}
            variant="outlined"
            fullWidth
          />
          <IconButton
            onClick={() => navigator.clipboard.writeText(roomCode)}
            sx={{ ml: 1 }}
          >
            <ContentCopyIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default CreateRoom;

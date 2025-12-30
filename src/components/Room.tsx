// src/components/Room.tsx
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../store/store";
import { setRoom, updateEntries, setTurnIndex } from "../store/roomSlice";
import { connect } from "../services/socket";
import GMView from "./GMView";
import PlayerView from "./PlayerView";

const Room: React.FC = () => {
  const { gmName } = useParams<{ gmName: string }>();
  const dispatch = useDispatch<AppDispatch>();

  // Compute GM flag from sessionStorage + URL
  const storedGmName = sessionStorage.getItem("gmName");
  const storedIsGM = sessionStorage.getItem("isGM") === "true";
  const isGM = storedIsGM && storedGmName === gmName;

  // Pull entries & turn from Redux for rendering if needed
  const entries = useSelector((s: RootState) => s.room.entries);
  const currentTurnIndex = useSelector(
    (s: RootState) => s.room.currentTurnIndex
  );

  useEffect(() => {
    if (!gmName) return;

    // Persist gmName; only keep isGM flag if GM names match
    sessionStorage.setItem("gmName", gmName);
    if (!isGM) {
      sessionStorage.removeItem("isGM");
    }

    // Initialize Redux state
    dispatch(setRoom({ gmName, isGM }));

    // Open socket with correct role
    const socket = connect(gmName, isGM);
    if (!isGM) {
      const raw = sessionStorage.getItem("playerInfo");
      if (raw) {
        const pi = JSON.parse(raw);
        socket.emit("join-room", pi);
        sessionStorage.removeItem("playerInfo");
      }
    }

    // Listen for updates
    socket.on("room-update", (state) => {
      dispatch(updateEntries(state.entries));
      dispatch(setTurnIndex(state.currentTurnIndex));
    });

    return () => {
      socket.disconnect();
    };
  }, [gmName, isGM, dispatch]);

  // Render GM or Player view
  return isGM ? <GMView /> : <PlayerView />;
};

export default Room;

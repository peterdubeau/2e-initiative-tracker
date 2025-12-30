// src/components/Room.tsx
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store/store";
import { setRoom, updateEntries, setTurnIndex } from "../store/roomSlice";
import { connect } from "../services/socket";
import GMView from "./GMView";
import PlayerView from "./PlayerView";

const Room: React.FC = () => {
  const { gmName } = useParams<{ gmName: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // Compute GM flag from sessionStorage + URL
  const storedGmName = sessionStorage.getItem("gmName");
  const storedIsGM = sessionStorage.getItem("isGM") === "true";
  const isGM = storedIsGM && storedGmName === gmName;

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
    
    // Remove any existing listeners to avoid duplicates
    socket.off("room-update");
    socket.off("kicked");
    
    // Listen for updates
    const handleRoomUpdate = (state: any) => {
      dispatch(updateEntries(state.entries));
      dispatch(setTurnIndex(state.currentTurnIndex));
    };
    socket.on("room-update", handleRoomUpdate);

    // Listen for kick event (when GM removes player)
    const handleKicked = () => {
      console.log("Player was kicked, navigating to join page");
      socket.off("room-update", handleRoomUpdate);
      socket.off("kicked", handleKicked);
      socket.disconnect();
      navigate("/join");
    };
    socket.on("kicked", handleKicked);

    // For players, ensure they're tracked with the socket
    if (!isGM) {
      const raw = sessionStorage.getItem("playerInfo");
      if (raw) {
        const pi = JSON.parse(raw);
        // Wait for socket to connect before emitting
        if (socket.connected) {
          socket.emit("join-room", pi);
          sessionStorage.removeItem("playerInfo");
        } else {
          socket.once("connect", () => {
            socket.emit("join-room", pi);
            sessionStorage.removeItem("playerInfo");
          });
        }
      } else {
        // Player info not in storage - check if we have it stored elsewhere
        // Try to get from sessionStorage individual items
        const playerName = sessionStorage.getItem("name");
        const playerRoll = sessionStorage.getItem("roll");
        const playerColor = sessionStorage.getItem("color");
        
        if (playerName && playerRoll && playerColor) {
          // We have player info, re-emit join-room to ensure tracking
          const pi = {
            name: playerName,
            roll: parseInt(playerRoll, 10),
            color: playerColor,
          };
          
          if (socket.connected) {
            socket.emit("join-room", pi);
          } else {
            socket.once("connect", () => {
              socket.emit("join-room", pi);
            });
          }
        }
      }
    }

    return () => {
      socket.off("room-update", handleRoomUpdate);
      socket.off("kicked", handleKicked);
      // Don't disconnect here - let the socket service manage it
    };
  }, [gmName, isGM, dispatch, navigate]);

  // Render GM or Player view
  return isGM ? <GMView /> : <PlayerView />;
};

export default Room;

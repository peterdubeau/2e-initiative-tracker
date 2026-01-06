// src/components/Room.tsx
import React, { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../store/store";
import { setRoom, updateEntries, setTurnIndex } from "../store/roomSlice";
import { connect } from "../services/socket";
import { sendNotificationToServiceWorker } from "../services/notificationService";
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

  // Track previous turn index to detect changes
  const prevTurnIndexRef = useRef<number>(-1);
  const prevEntriesRef = useRef<any[]>([]);

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
      const { entries, currentTurnIndex } = state;
      
      // Check if turn changed (for notification)
      const turnChanged = currentTurnIndex !== prevTurnIndexRef.current;
      const entriesChanged = JSON.stringify(entries) !== JSON.stringify(prevEntriesRef.current);
      
      // Only check for notifications if user is a player (not GM)
      if (!isGM && (turnChanged || entriesChanged)) {
        // Get player's entry ID from sessionStorage
        const playerName = sessionStorage.getItem("name");
        const playerEntry = playerName 
          ? entries.find((e: any) => !e.isMonster && e.name === playerName)
          : null;
        
        if (playerEntry && entries.length > 0) {
          // Calculate next turn index (similar to roomManager.nextTurn logic)
          const total = entries.length;
          let nextIdx = currentTurnIndex;
          
          // Find next non-hidden entry
          for (let i = 1; i <= total; i++) {
            const candidate = (currentTurnIndex + i) % total;
            if (!entries[candidate].hidden) {
              nextIdx = candidate;
              break;
            }
          }
          
          const nextEntry = entries[nextIdx];
          
          // Check if next entry is the player's entry and not a monster
          if (nextEntry && 
              nextEntry.id === playerEntry.id && 
              !nextEntry.isMonster) {
            // Player is next! Send notification
            console.log('🎯 Player is next! Sending notification...', {
              playerName: playerEntry.name,
              currentTurnIndex,
              nextIndex: nextIdx,
              nextEntry: nextEntry.name
            });
            sendNotificationToServiceWorker({
              type: 'turn-notification',
              message: `You are next in initiative!`,
              sound: true,
              vibrate: true,
            });
          }
        }
      }
      
      // Update refs
      prevTurnIndexRef.current = currentTurnIndex;
      prevEntriesRef.current = entries;
      
      // Update Redux state
      dispatch(updateEntries(entries));
      dispatch(setTurnIndex(currentTurnIndex));
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
        const playerTextColor = sessionStorage.getItem("textColor");
        
        if (playerName && playerRoll && playerColor) {
          // We have player info, re-emit join-room to ensure tracking
          const pi: any = {
            name: playerName,
            roll: parseInt(playerRoll, 10),
            color: playerColor,
          };
          if (playerTextColor) {
            pi.textColor = playerTextColor;
          }
          
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

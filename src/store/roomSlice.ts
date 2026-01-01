import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type Entry = {
  id: string;
  name: string;
  roll: number;
  color: string;
  textColor?: string;
  isMonster: boolean;
  hidden: boolean;
};

interface RoomState {
  code: string; // Keep for backward compatibility, but deprecated
  gmName: string;
  isGM: boolean;
  entries: Entry[];
  currentTurnIndex: number;
}

const initialState: RoomState = {
  code: "",
  gmName: "",
  isGM: false,
  entries: [],
  currentTurnIndex: 0,
};

const roomSlice = createSlice({
  name: "room",
  initialState,
  reducers: {
    setRoom(state, action: PayloadAction<{ gmName: string; isGM: boolean }>) {
      state.gmName = action.payload.gmName;
      state.code = action.payload.gmName; // Keep code for backward compatibility
      state.isGM = action.payload.isGM;
    },
    updateEntries(state, action: PayloadAction<Entry[]>) {
      state.entries = action.payload;
    },
    setTurnIndex(state, action: PayloadAction<number>) {
      state.currentTurnIndex = action.payload;
    },
  },
});

export const { setRoom, updateEntries, setTurnIndex } = roomSlice.actions;
export default roomSlice.reducer;

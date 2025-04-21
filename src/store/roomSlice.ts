import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Entry = {
  id: string;
  name: string;
  roll: number;
  color: string;
  isMonster: boolean;
  hidden: boolean;
};

interface RoomState {
  code: string;
  isGM: boolean;
  entries: Entry[];
  currentTurnIndex: number;
}

const initialState: RoomState = {
  code: '',
  isGM: false,
  entries: [],
  currentTurnIndex: 0
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setRoom(state, action: PayloadAction<{ code: string; isGM: boolean }>) {
      state.code = action.payload.code;
      state.isGM = action.payload.isGM;
    },
    updateEntries(state, action: PayloadAction<Entry[]>) {
      state.entries = action.payload;
    },
    setTurnIndex(state, action: PayloadAction<number>) {
      state.currentTurnIndex = action.payload;
    }
  }
});

export const { setRoom, updateEntries, setTurnIndex } = roomSlice.actions;
export default roomSlice.reducer;

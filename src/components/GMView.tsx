import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { getSocket } from "../services/socket";

// Sortable item wrapper
const SortableItem: React.FC<{
  id: string;
  isCurrent: boolean;
  hidden: boolean;
  color: string;
  name: string;
  roll: number;
}> = ({ id, isCurrent, hidden, color, name, roll }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: hidden ? "#e0e0e0" : color,
    padding: "8px",
    marginBottom: "8px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: isCurrent ? "5px 5px 5px black" : "",
  };

  const socket = getSocket();
  const handleRemove = () => socket.emit("remove-entry", id);
  const handleToggle = () => socket.emit("toggle-hidden", id);

  return (
    <Box ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Typography>
        {name} ({roll})
      </Typography>
      <Box>
        <IconButton onClick={handleToggle} size="small">
          {hidden ? (
            <VisibilityIcon fontSize="small" />
          ) : (
            <VisibilityOffIcon fontSize="small" />
          )}
        </IconButton>
        <IconButton onClick={handleRemove} size="small">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

const GMView: React.FC = () => {
  const entries = useSelector((state: RootState) => state.room.entries);
  const current = useSelector(
    (state: RootState) => state.room.currentTurnIndex
  );

  const [monsterName, setMonsterName] = useState("");
  const [monsterRoll, setMonsterRoll] = useState<number>(0);
  const [monsterColor, setMonsterColor] = useState("#888888");
  const [monsterHidden, setMonsterHidden] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleAddMonster = () => {
    const socket = getSocket();
    socket.emit("add-monster", {
      name: monsterName,
      roll: monsterRoll,
      color: monsterColor,
      hidden: monsterHidden,
    });
    setMonsterName("");
    setMonsterRoll(0);
    setMonsterHidden(false);
  };

  const handleNext = () => {
    const socket = getSocket();
    socket.emit("next-turn");
  };

  const handleDragEnd = (event: unknown) => {
    const socket = getSocket();
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = entries.findIndex((e) => e.id === active.id);
      const newIndex = entries.findIndex((e) => e.id === over.id);
      socket.emit("reorder-entries", { from: oldIndex, to: newIndex });
    }
  };

  return (
    <Box p={2}>
      <Typography variant="h6" mb={2}>
        GM Controls
      </Typography>

      <Box display="flex" flexDirection="column" gap={2} mb={4}>
        <TextField
          label="Monster Name"
          value={monsterName}
          onChange={(e) => setMonsterName(e.target.value)}
          fullWidth
        />
        <TextField
          label="Roll"
          type="number"
          value={monsterRoll}
          onChange={(e) => setMonsterRoll(Number(e.target.value))}
          fullWidth
        />
        <Box display="flex" alignItems="center">
          <Typography>Color:</Typography>
          <input
            type="color"
            value={monsterColor}
            onChange={(e) => setMonsterColor(e.target.value)}
            style={{ marginLeft: 8 }}
          />
        </Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={monsterHidden}
              onChange={(e) => setMonsterHidden(e.target.checked)}
            />
          }
          label="Hidden"
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddMonster}
          disabled={!monsterName}
        >
          Add Monster
        </Button>
      </Box>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={entries.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          {entries.map((e, idx) => (
            <SortableItem
              key={e.id}
              id={e.id}
              isCurrent={idx === current}
              hidden={e.hidden}
              color={e.color}
              name={e.name}
              roll={e.roll}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button variant="contained" fullWidth onClick={handleNext} sx={{ mt: 2 }}>
        Next Turn
      </Button>
    </Box>
  );
};

export default GMView;

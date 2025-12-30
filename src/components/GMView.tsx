import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Container,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import LinkIcon from "@mui/icons-material/Link";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SortIcon from "@mui/icons-material/Sort";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
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
  };

  const socket = getSocket();
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    socket.emit("remove-entry", id);
  };
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    socket.emit("toggle-hidden", id);
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      elevation={isCurrent ? 8 : 2}
      sx={{
        mb: 2,
        borderRadius: 3,
        overflow: 'hidden',
        border: isCurrent ? 3 : 0,
        borderColor: 'primary.main',
        position: 'relative',
        transition: 'all 0.3s ease',
        cursor: 'grab',
        '&:active': {
          cursor: 'grabbing',
        },
        '&:hover': {
          elevation: 4,
        },
      }}
    >
      <Box
        {...listeners}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          backgroundColor: hidden ? 'grey.300' : color,
          color: hidden ? 'text.secondary' : 'white',
          position: 'relative',
        }}
      >
        <DragIndicatorIcon
          sx={{
            mr: 1,
            opacity: 0.7,
            color: hidden ? 'text.secondary' : 'white',
          }}
        />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
          <Chip
            label={`Initiative: ${roll}`}
            size="small"
            sx={{
              mt: 0.5,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              color: 'white',
              fontWeight: 600,
            }}
          />
        </Box>
        {isCurrent && (
          <Chip
            icon={<PlayArrowIcon />}
            label="Current Turn"
            color="primary"
            sx={{
              mr: 1,
              fontWeight: 600,
              backgroundColor: 'white',
              color: 'primary.main',
            }}
          />
        )}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            onClick={handleToggle}
            size="small"
            sx={{
              color: hidden ? 'text.secondary' : 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            {hidden ? (
              <VisibilityIcon fontSize="small" />
            ) : (
              <VisibilityOffIcon fontSize="small" />
            )}
          </IconButton>
          <IconButton
            onClick={handleRemove}
            size="small"
            sx={{
              color: hidden ? 'text.secondary' : 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              '&:hover': {
                backgroundColor: 'rgba(255, 0, 0, 0.3)',
              },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

const GMView: React.FC = () => {
  const entries = useSelector((state: RootState) => state.room.entries);
  const gmName = useSelector((state: RootState) => state.room.gmName);
  const current = useSelector(
    (state: RootState) => state.room.currentTurnIndex
  );

  const [monsterName, setMonsterName] = useState("");
  const [monsterRoll, setMonsterRoll] = useState<number>(0);
  const [monsterColor, setMonsterColor] = useState("#888888");
  const [monsterHidden, setMonsterHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sortDialogOpen, setSortDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
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

  const handleDragEnd = (event: any) => {
    const socket = getSocket();
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = entries.findIndex((e) => e.id === active.id);
      const newIndex = entries.findIndex((e) => e.id === over.id);
      socket.emit("reorder-entries", { from: oldIndex, to: newIndex });
    }
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const joinUrl = `${window.location.origin}/join`;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = joinUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSortByInitiative = () => {
    setSortDialogOpen(true);
  };

  const handleConfirmSort = () => {
    const socket = getSocket();
    socket.emit("sort-by-initiative");
    setSortDialogOpen(false);
  };

  const handleCancelSort = () => {
    setSortDialogOpen(false);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4, touchAction: "none" }}>
        <Paper
          elevation={4}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #00BCD4 0%, #2196F3 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ color: 'white', opacity: 0.9, mb: 0.5 }}>
                Game Master
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {gmName}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={copied ? <CheckCircleIcon /> : <LinkIcon />}
              onClick={handleCopyLink}
              onMouseDown={(e) => e.preventDefault()}
              sx={{
                backgroundColor: 'white',
                color: 'primary.main',
                userSelect: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                },
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
              }}
            >
              {copied ? 'Link Copied!' : 'Copy Join Link'}
            </Button>
          </Box>
        </Paper>

        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
          GM Controls
        </Typography>

        <Card elevation={4} sx={{ mb: 4, borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
              Add Monster
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Monster Name"
                value={monsterName}
                onChange={(e) => setMonsterName(e.target.value)}
                fullWidth
                sx={{ mb: 1 }}
              />
              <TextField
                label="Initiative Roll"
                type="number"
                value={monsterRoll}
                onChange={(e) => setMonsterRoll(Number(e.target.value))}
                fullWidth
                inputProps={{ min: 0 }}
                sx={{ mb: 1 }}
              />
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  p: 2,
                  backgroundColor: 'background.default',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Color:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      backgroundColor: monsterColor,
                      border: '2px solid',
                      borderColor: 'divider',
                      boxShadow: 2,
                    }}
                  />
                  <input
                    type="color"
                    value={monsterColor}
                    onChange={(e) => setMonsterColor(e.target.value)}
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
              <FormControlLabel
                control={
                  <Checkbox
                    checked={monsterHidden}
                    onChange={(e) => setMonsterHidden(e.target.checked)}
                  />
                }
                label="Hidden from players"
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddMonster}
                disabled={!monsterName}
                fullWidth
                size="large"
                sx={{
                  py: 1.5,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Add Monster
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card elevation={4} sx={{ mb: 4, borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Initiative Order
              </Typography>
              <Button
                variant="outlined"
                startIcon={<SortIcon />}
                onClick={handleSortByInitiative}
                disabled={entries.length === 0}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              >
                Sort by Initiative
              </Button>
            </Box>
            {entries.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No entries yet. Add monsters or wait for players to join.
              </Typography>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Dialog
          open={sortDialogOpen}
          onClose={handleCancelSort}
          aria-labelledby="sort-dialog-title"
          aria-describedby="sort-dialog-description"
        >
          <DialogTitle id="sort-dialog-title">
            Sort by Initiative?
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="sort-dialog-description">
              This will sort all entries by initiative roll in descending order (highest first). 
              The current turn will be preserved if possible. Continue?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelSort} color="inherit">
              Cancel
            </Button>
            <Button onClick={handleConfirmSort} variant="contained" autoFocus>
              Sort
            </Button>
          </DialogActions>
        </Dialog>

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleNext}
          disabled={entries.length === 0}
          sx={{
            py: 1.5,
            fontSize: '1.1rem',
            borderRadius: 3,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Next Turn
        </Button>
      </Box>
    </Container>
  );
};

export default GMView;

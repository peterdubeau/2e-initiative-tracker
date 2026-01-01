import { useState, useEffect } from "react";
import { 
  Box, 
  Typography, 
  Paper, 
  Chip, 
  Container, 
  Button, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import LinkIcon from "@mui/icons-material/Link";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PaletteIcon from "@mui/icons-material/Palette";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useAppSelector } from "../store/store";
import { getSocket } from "../services/socket";
import { useThemeMode } from "../contexts/ThemeContext";

export default function PlayerView() {
  const entries = useAppSelector((state) => state.room.entries);
  const gmName = useAppSelector((state) => state.room.gmName);
  const currentTurnIndex = useAppSelector(
    (state) => state.room.currentTurnIndex
  );
  const [copied, setCopied] = useState(false);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState("#2196f3");
  const [editingTextColor, setEditingTextColor] = useState("#ffffff");
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const { mode, toggleTheme } = useThemeMode();
  const menuOpen = Boolean(menuAnchorEl);

  // 1. Determine which entry is "current" by id
  const currentEntryId = entries[currentTurnIndex]?.id;

  // 2. Filter out hidden entries for display
  const visibleEntries = entries.filter((entry) => !entry.hidden);

  // Find the player's own entry by matching name from sessionStorage
  const playerName = sessionStorage.getItem("name");
  const playerEntry = playerName ? entries.find(e => !e.isMonster && e.name === playerName) : null;

  // Initialize colors from sessionStorage or player entry
  useEffect(() => {
    if (playerEntry) {
      const savedColor = sessionStorage.getItem("color");
      const savedTextColor = sessionStorage.getItem("textColor");
      
      // If entry doesn't have textColor but we have it in sessionStorage, update it
      if (!playerEntry.textColor && savedTextColor) {
        const socket = getSocket();
        socket.emit("update-entry", {
          ...playerEntry,
          textColor: savedTextColor,
        });
      }
      
      // If entry color doesn't match sessionStorage, update it
      if (savedColor && playerEntry.color !== savedColor) {
        const socket = getSocket();
        socket.emit("update-entry", {
          ...playerEntry,
          color: savedColor,
          textColor: savedTextColor || playerEntry.textColor || '#ffffff',
        });
      }
    }
  }, [playerEntry]);

  const handleColorChangeClick = () => {
    if (playerEntry) {
      // Load from entry first, fallback to sessionStorage, then default
      const savedColor = sessionStorage.getItem("color");
      const savedTextColor = sessionStorage.getItem("textColor");
      setEditingColor(playerEntry.color || savedColor || '#2196f3');
      setEditingTextColor(playerEntry.textColor || savedTextColor || '#ffffff');
      setColorDialogOpen(true);
    }
  };

  const handleColorUpdate = () => {
    if (!playerEntry) return;
    
    // Save colors to sessionStorage
    sessionStorage.setItem("color", editingColor);
    sessionStorage.setItem("textColor", editingTextColor);
    
    const socket = getSocket();
    socket.emit("update-entry", {
      ...playerEntry,
      color: editingColor,
      textColor: editingTextColor,
    });
    setColorDialogOpen(false);
  };

  const handleCancelColorDialog = () => {
    setColorDialogOpen(false);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleColorChangeFromMenu = () => {
    handleMenuClose();
    handleColorChangeClick();
  };

  const handleCopyLinkFromMenu = async () => {
    handleMenuClose();
    await handleCopyLink();
  };

  const handleCopyLink = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
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
            <IconButton
              onClick={handleMenuClick}
              sx={{
                backgroundColor: 'white',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                },
              }}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchorEl}
              open={menuOpen}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={toggleTheme}>
                <ListItemIcon>
                  {mode === 'light' ? <Brightness4Icon fontSize="small" /> : <Brightness7Icon fontSize="small" />}
                </ListItemIcon>
                <ListItemText>{mode === 'light' ? 'Dark Mode' : 'Light Mode'}</ListItemText>
              </MenuItem>
              {playerEntry && (
                <>
                  <Divider />
                  <MenuItem onClick={handleColorChangeFromMenu}>
                    <ListItemIcon>
                      <PaletteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Change Colors</ListItemText>
                  </MenuItem>
                </>
              )}
              <Divider />
              <MenuItem onClick={handleCopyLinkFromMenu}>
                <ListItemIcon>
                  {copied ? <CheckCircleIcon fontSize="small" /> : <LinkIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText>{copied ? 'Link Copied!' : 'Copy Room Link'}</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Paper>

        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
          Initiative Tracker
        </Typography>

        {visibleEntries.length === 0 ? (
          <Paper
            elevation={2}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 3,
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Waiting for players to join...
            </Typography>
          </Paper>
        ) : (
          <Box>
            {visibleEntries.map((entry, index) => {
              const isCurrent = entry.id === currentEntryId;
              return (
                <Paper
                  key={entry.id}
                  elevation={isCurrent ? 8 : 2}
                  sx={{
                    mb: 2,
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: isCurrent ? 3 : 0,
                    borderColor: 'primary.main',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 2.5,
                      backgroundColor: entry.color,
                      color: entry.textColor || 'white',
                      position: 'relative',
                    }}
                  >
                    {isCurrent && (
                      <Chip
                        icon={<PlayArrowIcon />}
                        label="Current Turn"
                        color="primary"
                        sx={{
                          mr: 2,
                          fontWeight: 600,
                          backgroundColor: 'white',
                          color: 'primary.main',
                        }}
                      />
                    )}
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {entry.name}
                      </Typography>
                    <Chip
                      label={`Initiative: ${entry.roll}`}
                      size="small"
                      sx={{
                        mt: 0.5,
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        color: entry.textColor || 'white',
                        fontWeight: 600,
                      }}
                    />
                    </Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        opacity: 0.7,
                        minWidth: 40,
                        textAlign: 'center',
                      }}
                    >
                      #{index + 1}
                    </Typography>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}

        <Dialog
          open={colorDialogOpen}
          onClose={handleCancelColorDialog}
          aria-labelledby="color-dialog-title"
        >
          <DialogTitle id="color-dialog-title">
            Change Your Colors
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Background Color:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 1,
                      backgroundColor: editingColor,
                      border: '2px solid',
                      borderColor: 'divider',
                    }}
                  />
                  <TextField
                    type="color"
                    value={editingColor}
                    onChange={(e) => setEditingColor(e.target.value)}
                    sx={{
                      width: 100,
                      '& input': {
                        height: 60,
                        cursor: 'pointer',
                      },
                    }}
                  />
                  <TextField
                    label="Hex"
                    value={editingColor}
                    onChange={(e) => setEditingColor(e.target.value)}
                    size="small"
                    sx={{ flexGrow: 1 }}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Text Color:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 1,
                      backgroundColor: editingTextColor,
                      border: '2px solid',
                      borderColor: 'divider',
                    }}
                  />
                  <TextField
                    type="color"
                    value={editingTextColor}
                    onChange={(e) => setEditingTextColor(e.target.value)}
                    sx={{
                      width: 100,
                      '& input': {
                        height: 60,
                        cursor: 'pointer',
                      },
                    }}
                  />
                  <TextField
                    label="Hex"
                    value={editingTextColor}
                    onChange={(e) => setEditingTextColor(e.target.value)}
                    size="small"
                    sx={{ flexGrow: 1 }}
                  />
                </Box>
              </Box>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  backgroundColor: editingColor,
                  color: editingTextColor,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Preview
                </Typography>
                <Typography variant="body2">
                  This is how your entry will look
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelColorDialog} color="inherit">
              Cancel
            </Button>
            <Button onClick={handleColorUpdate} variant="contained" color="primary" autoFocus>
              Update Colors
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}

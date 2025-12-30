import { useState } from "react";
import { Box, Typography, Paper, Chip, Container, Button, IconButton } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LinkIcon from "@mui/icons-material/Link";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useAppSelector } from "../store/store";

export default function PlayerView() {
  const entries = useAppSelector((state) => state.room.entries);
  const gmName = useAppSelector((state) => state.room.gmName);
  const currentTurnIndex = useAppSelector(
    (state) => state.room.currentTurnIndex
  );
  const [copied, setCopied] = useState(false);

  // 1. Determine which entry is "current" by id
  const currentEntryId = entries[currentTurnIndex]?.id;

  // 2. Filter out hidden entries for display
  const visibleEntries = entries.filter((entry) => !entry.hidden);

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
                      color: 'white',
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
                          color: 'white',
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
      </Box>
    </Container>
  );
}

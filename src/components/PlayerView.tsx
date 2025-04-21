import { Box } from "@mui/material";
// import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useAppSelector } from "../store/store";

export default function PlayerView() {
  const entries = useAppSelector((state) => state.room.entries);
  const currentTurnIndex = useAppSelector(
    (state) => state.room.currentTurnIndex
  );

  // 1. Determine which entry is "current" by id
  const currentEntryId = entries[currentTurnIndex]?.id;

  // 2. Filter out hidden entries for display
  const visibleEntries = entries.filter((entry) => !entry.hidden);

  return (
    <Box sx={{ p: 2 }}>
      {visibleEntries.map((entry) => (
        <Box
          key={entry.id}
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              p: 1,
              backgroundColor: entry.color,
              borderRadius: 1,
              boxShadow: entry.id === currentEntryId ? "5px 5px 5px black" : "",
            }}
          >
            {entry.name} ({entry.roll})
          </Box>
          {/* 3. Show icon only for the current, visible entry
          {entry.id === currentEntryId && (
            <PlayArrowIcon
              color="primary"
              sx={{ mr: 1 }}
              style={{ transform: "rotate(180deg)" }}
            />
          )} */}
        </Box>
      ))}
    </Box>
  );
}

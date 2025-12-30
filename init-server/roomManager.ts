import { v4 as uuidv4 } from "uuid";

export type Entry = {
  id: string;
  name: string;
  roll: number;
  color: string;
  isMonster: boolean;
  hidden: boolean;
};

type Room = { gmName: string; entries: Entry[]; currentTurnIndex: number };

export class RoomManager {
  private rooms: Record<string, Room> = {};

  createRoom(gmName: string): void {
    this.rooms[gmName] = { gmName, entries: [], currentTurnIndex: 0 };
  }

  hasRoom(gmName: string): boolean {
    return Boolean(this.rooms[gmName]);
  }

  getRoomState(gmName: string): Room {
    return this.rooms[gmName];
  }

  getActiveGMs(): string[] {
    return Object.keys(this.rooms);
  }

  addPlayer(gmName: string, player: Omit<Entry, "id" | "isMonster" | "hidden">): Entry {
    const entry: Entry = {
      id: uuidv4(),
      ...player,
      isMonster: false,
      hidden: false,
    };
    this.rooms[gmName].entries.push(entry);
    return entry;
  }

  addMonster(
    gmName: string,
    monster: Omit<Entry, "id" | "isMonster"> & { hidden: boolean }
  ) {
    this.rooms[gmName].entries.push({
      id: uuidv4(),
      ...monster,
      isMonster: true,
    });
  }

  updateEntry(gmName: string, updated: Entry) {
    this.rooms[gmName].entries = this.rooms[gmName].entries.map((e) =>
      e.id === updated.id ? updated : e
    );
  }

  removeEntry(gmName: string, id: string) {
    this.rooms[gmName].entries = this.rooms[gmName].entries.filter(
      (e) => e.id !== id
    );
  }

  reorderEntries(gmName: string, from: number, to: number) {
    const entries = this.rooms[gmName].entries;
    const [moved] = entries.splice(from, 1);
    entries.splice(to, 0, moved);
  }

  nextTurn(gmName: string) {
    const room = this.rooms[gmName];
    if (!room) return;

    const { entries } = room;
    const total = entries.length;
    if (total === 0) return;

    // Try each subsequent index until we hit a non-hidden entry
    let nextIdx = room.currentTurnIndex;
    for (let i = 1; i <= total; i++) {
      const candidate = (room.currentTurnIndex + i) % total;
      if (!entries[candidate].hidden) {
        nextIdx = candidate;
        break;
      }
    }

    room.currentTurnIndex = nextIdx;
  }

  toggleHidden(gmName: string, id: string) {
    const entry = this.rooms[gmName].entries.find((e) => e.id === id);
    if (entry) entry.hidden = !entry.hidden;
  }

  sortByInitiative(gmName: string) {
    const room = this.rooms[gmName];
    if (!room) return;

    // Store the current entry ID before sorting
    const currentEntryId = room.entries[room.currentTurnIndex]?.id;

    // Sort entries by roll descending
    room.entries.sort((a, b) => b.roll - a.roll);

    // Find the new index of the current entry after sorting
    const newIndex = room.entries.findIndex((e) => e.id === currentEntryId);
    if (newIndex !== -1) {
      room.currentTurnIndex = newIndex;
    } else {
      // If current entry not found, reset to 0
      room.currentTurnIndex = 0;
    }
  }

  clearAllPlayers(gmName: string): string[] {
    const room = this.rooms[gmName];
    if (!room) return [];

    // Get IDs of all non-monster entries (players) before removing them
    const playerIds = room.entries
      .filter((e) => !e.isMonster)
      .map((e) => e.id);

    // Remove all entries (players and monsters)
    room.entries = [];

    // Reset turn index
    room.currentTurnIndex = 0;

    return playerIds;
  }

  getEntryById(gmName: string, id: string): Entry | undefined {
    const room = this.rooms[gmName];
    if (!room) return undefined;
    return room.entries.find((e) => e.id === id);
  }
}

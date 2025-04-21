import { v4 as uuidv4 } from "uuid";

export type Entry = {
  id: string;
  name: string;
  roll: number;
  color: string;
  isMonster: boolean;
  hidden: boolean;
};

type Room = { code: string; entries: Entry[]; currentTurnIndex: number };

export class RoomManager {
  private rooms: Record<string, Room> = {};

  createRoom(): string {
    let code: string;
    do {
      code = Array.from({ length: 4 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
      ).join("");
    } while (this.rooms[code]);
    this.rooms[code] = { code, entries: [], currentTurnIndex: 0 };
    return code;
  }

  hasRoom(code: string): boolean {
    return Boolean(this.rooms[code]);
  }

  getRoomState(code: string): Room {
    return this.rooms[code];
  }

  addPlayer(code: string, player: Omit<Entry, "id" | "isMonster" | "hidden">) {
    this.rooms[code].entries.push({
      id: uuidv4(),
      ...player,
      isMonster: false,
      hidden: false,
    });
  }

  addMonster(
    code: string,
    monster: Omit<Entry, "id" | "isMonster"> & { hidden: boolean }
  ) {
    this.rooms[code].entries.push({
      id: uuidv4(),
      ...monster,
      isMonster: true,
    });
  }

  updateEntry(code: string, updated: Entry) {
    this.rooms[code].entries = this.rooms[code].entries.map((e) =>
      e.id === updated.id ? updated : e
    );
  }

  removeEntry(code: string, id: string) {
    this.rooms[code].entries = this.rooms[code].entries.filter(
      (e) => e.id !== id
    );
  }

  reorderEntries(code: string, from: number, to: number) {
    const entries = this.rooms[code].entries;
    const [moved] = entries.splice(from, 1);
    entries.splice(to, 0, moved);
  }

  nextTurn(code: string) {
    const room = this.rooms[code];
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

  toggleHidden(code: string, id: string) {
    const entry = this.rooms[code].entries.find((e) => e.id === id);
    if (entry) entry.hidden = !entry.hidden;
  }
}

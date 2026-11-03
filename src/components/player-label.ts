import { DEBUG_PLAYERS } from "@/constants/game";

// "Player A" for the debug identities, a short id for everyone else.
export function playerLabel(playerId: string | null): string {
  if (playerId === null) {
    return "Deleted player";
  }
  for (const player of Object.values(DEBUG_PLAYERS)) {
    if (player.id === playerId) {
      return player.label;
    }
  }
  return `Player ${playerId.slice(0, 8)}`;
}

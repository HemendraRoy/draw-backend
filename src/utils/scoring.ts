import { Room } from "../types/game";

export function getPlayerCount(room: Room): number {
  return room.players.length;
}

function guessersInRoom(room: Room): number {
  return Math.max(0, getPlayerCount(room) - 1);
}

/** First guesser: 60×N, then −5×N per rank; minimum 40 points. */
export function getGuesserPoints(rank: number, totalPlayers: number): number {
  const multiplier = Math.max(0, 60 - rank * 5);
  const raw = multiplier * Math.max(0, totalPlayers);
  return Math.max(40, raw);
}

/** Drawer earns 160 × (fraction of guessers who got it right). */
export function getDrawerPoints(room: Room): number {
  const guessers = guessersInRoom(room);
  if (guessers === 0) return 0;

  const guessedCount = room.game.guessedPlayers.length;
  const fraction = guessedCount / guessers;
  return Math.max(0, Math.round(160 * fraction));
}

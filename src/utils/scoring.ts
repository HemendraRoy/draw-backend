import { Room } from "../types/game";
import { countWordLetters } from "./wordHint";

const CHAT_COOLDOWN_MS = 800;

/** Connected players who can guess (excludes drawer and offline/kicked players). */
export function getConnectedGuessers(room: Room) {
  return room.players.filter(
    (p) => p.connected && p.id !== room.game.currentDrawerId
  );
}

export function getDrawTimeRemainingSeconds(room: Room): number {
  if (!room.game.drawEndsAt) return 0;
  return Math.max(0, Math.ceil((room.game.drawEndsAt - Date.now()) / 1000));
}

export function isEasyWord(word: string): boolean {
  return countWordLetters(word) <= 5;
}

/** Easy (≤5 letters): (time left + 25) × 3. Hard (>5 letters): (time left + 25) × 4. */
export function getGuesserPoints(room: Room, word: string): number {
  const timeRemaining = getDrawTimeRemainingSeconds(room);
  const multiplier = isEasyWord(word) ? 3 : 4;
  return (timeRemaining + 25) * multiplier;
}

/** Drawer earns 120 × fraction of connected guessers who got it right. */
export function getDrawerPoints(room: Room): number {
  const guessers = getConnectedGuessers(room);
  if (guessers.length === 0) return 0;

  const guesserIds = new Set(guessers.map((p) => p.id));
  const guessedCount = room.game.guessedPlayers.filter((id) =>
    guesserIds.has(id)
  ).length;

  const fraction = guessedCount / guessers.length;
  return Math.max(0, Math.round(120 * fraction));
}

export { CHAT_COOLDOWN_MS };

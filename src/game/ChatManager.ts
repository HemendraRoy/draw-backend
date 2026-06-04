import { Server } from "socket.io";
import { Room } from "../types/game";
import { normalizeWord } from "../utils/normalizeWord";
import gameManager from "./GameManager";

const POINTS = [100, 80, 60, 40];

class ChatManager {
  handleMessage(io: Server, room: Room, playerId: string, message: string) {
    // If the game hasn't started, pass everything through as a regular chat
    if (!room.game.started) {
      return this.emitChatMessage(io, room.roomId, "chat", playerId, message);
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    const isDrawer = room.game.currentDrawerId === playerId;
    if (isDrawer && room.game.phase === "DRAWING") return; // Block drawers from chatting/spoiling

    const alreadyGuessed = room.game.guessedPlayers.includes(playerId);
    const normalizedGuess = normalizeWord(message);
    const normalizedTarget = normalizeWord(room.game.word || "");

    const isCorrectGuess = !isDrawer && !alreadyGuessed && normalizedTarget && normalizedGuess === normalizedTarget;

    if (isCorrectGuess) {
      this.processCorrectGuess(io, room, player, playerId);
      return;
    }

    // Regular in-game chat message if it wasn't a correct guess
    this.emitChatMessage(io, room.roomId, "chat", player.name, message);
  }

  // HELPER METHODS

  private processCorrectGuess(io: Server, room: Room, player: any, playerId: string) {
    room.game.guessedPlayers.push(playerId);

    // Calculate score based on rank
    const rank = room.game.guessedPlayers.length - 1;
    const points = POINTS[rank] || 40;
    player.score += points;

    room.game.lastTurnScores.push({ playerId, points });

    // Generate and emit updated leaderboard
    const leaderboard = room.players
      .map(p => ({ id: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);

    io.to(room.roomId).emit("leaderboard-update", leaderboard);
    this.emitChatMessage(io, room.roomId, "system", null, `${player.name} guessed the word!`);

    // Check if turn needs to end early
    if (gameManager.isRoundCompleted(room)) {
      clearTimeout(room.game.drawTimer);
      io.to(room.roomId).emit("all-players-guessed");
    }
  }

  private emitChatMessage(io: Server, roomId: string, type: "chat" | "system", from: string | null, message: string) {
    io.to(roomId).emit("chat-message", { type, ...(from && { from }), message });
  }
}

export default new ChatManager();
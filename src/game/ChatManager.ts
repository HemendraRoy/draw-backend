import { Server } from "socket.io";
import { Room } from "../types/game";
import { normalizeWord } from "../utils/normalizeWord";
import gameManager from "./GameManager";

const POINTS = [100, 80, 60, 40];

type SenderRole = "drawer" | "guessed" | "unguessed";

class ChatManager {
  handleMessage(io: Server, room: Room, playerId: string, message: string) {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    if (!room.game.started) {
      return this.emitChatMessage(io, room, "chat", player.name, message);
    }

    const isDrawer = room.game.currentDrawerId === playerId;
    const alreadyGuessed = room.game.guessedPlayers.includes(playerId);
    const normalizedGuess = normalizeWord(message);
    const normalizedTarget = normalizeWord(room.game.word || "");

    const isCorrectGuess =
      !isDrawer &&
      !alreadyGuessed &&
      normalizedTarget &&
      normalizedGuess === normalizedTarget;

    if (isCorrectGuess) {
      this.processCorrectGuess(io, room, player, playerId);
      return;
    }

    const senderRole: SenderRole = isDrawer
      ? "drawer"
      : alreadyGuessed
        ? "guessed"
        : "unguessed";

    this.emitChatMessage(io, room, "chat", player.name, message, senderRole);
  }

  private processCorrectGuess(
    io: Server,
    room: Room,
    player: { id: string; name: string; score: number },
    playerId: string
  ) {
    room.game.guessedPlayers.push(playerId);

    const rank = room.game.guessedPlayers.length - 1;
    const points = POINTS[rank] || 40;
    player.score += points;

    room.game.lastTurnScores.push({ playerId, points });

    const leaderboard = room.players
      .filter((p) => p.connected)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);

    io.to(room.roomId).emit("leaderboard-update", leaderboard);
    io.to(room.roomId).emit("guessed-players-update", {
      guessedPlayers: room.game.guessedPlayers,
    });
    this.emitChatMessage(
      io,
      room,
      "system",
      null,
      `${player.name} guessed the word!`
    );

    if (gameManager.isRoundCompleted(room)) {
      io.to(room.roomId).emit("all-players-guessed");
    }
  }

  private emitChatMessage(
    io: Server,
    room: Room,
    type: "chat" | "system",
    from: string | null,
    message: string,
    senderRole?: SenderRole
  ) {
    const payload: {
      type: "chat" | "system";
      message: string;
      from?: string;
      senderRole?: SenderRole;
    } = { type, message };

    if (from) payload.from = from;

    if (
      type === "chat" &&
      room.game.started &&
      room.game.phase === "DRAWING" &&
      senderRole
    ) {
      payload.senderRole = senderRole;
    }

    io.to(room.roomId).emit("chat-message", payload);
  }
}

export default new ChatManager();

import { Server } from "socket.io";
import { Room } from "../types/game";
import { normalizeWord } from "../utils/normalizeWord";
import { CHAT_COOLDOWN_MS, getGuesserPoints } from "../utils/scoring";
import gameManager from "./GameManager";

type SenderRole = "drawer" | "guessed" | "unguessed";

class ChatManager {
  private lastChatAt = new Map<string, number>();

  private chatKey(roomId: string, playerId: string) {
    return `${roomId}:${playerId}`;
  }

  private isRateLimited(roomId: string, playerId: string): boolean {
    const key = this.chatKey(roomId, playerId);
    const now = Date.now();
    const last = this.lastChatAt.get(key) ?? 0;
    if (now - last < CHAT_COOLDOWN_MS) return true;
    this.lastChatAt.set(key, now);
    return false;
  }

  handleMessage(io: Server, room: Room, playerId: string, message: string) {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    if (!room.game.started) {
      if (this.isRateLimited(room.roomId, playerId)) return;
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
      this.lastChatAt.set(this.chatKey(room.roomId, playerId), Date.now());
      this.processCorrectGuess(io, room, player, playerId);
      return;
    }

    if (this.isRateLimited(room.roomId, playerId)) return;

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

    const word = room.game.word || "";
    const points = getGuesserPoints(room, word);
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

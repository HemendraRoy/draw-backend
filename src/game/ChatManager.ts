import { Server } from "socket.io";
import { Room } from "../types/game";
import { normalizeWord } from "../utils/normalizeWord";
import gameManager from "./GameManager";

const POINTS = [100, 80, 60, 40];

class ChatManager {
  handleMessage(
    io: Server,
    room: Room,
    playerId: string,
    message: string
  ) {
    if (!room.game.started) {
      io.to(room.roomId).emit(
        "chat-message",
        {
          type: "chat",
          from: playerId,
          message
        }
      );
      return;
    }

    const player =
      room.players.find(
        p => p.id === playerId
      );

    if (!player) return;

    const isDrawer =
      room.game.currentDrawerId ===
      playerId;

    const alreadyGuessed =
      room.game.guessedPlayers.includes(
        playerId
      );

    const normalizedGuess =
      normalizeWord(message);

    const normalizedWord =
      normalizeWord(
        room.game.word || ""
      );

    if (
      !isDrawer &&
      !alreadyGuessed &&
      normalizedGuess ===
        normalizedWord
    ) {
      room.game.guessedPlayers.push(
        playerId
      );

      const rank =
        room.game.guessedPlayers.length - 1;

      const points =
        POINTS[rank] || 40;

      player.score += points;

      room.game.lastTurnScores.push({
        playerId,
        points
      });

      const leaderboard =
        room.players
          .map(p => ({
            id: p.id,
            name: p.name,
            score: p.score
          }))
          .sort(
            (a, b) =>
              b.score - a.score
          );

      io.to(room.roomId).emit(
        "leaderboard-update",
        leaderboard
      );

      io.to(room.roomId).emit(
        "chat-message",
        {
          type: "system",
          message: `${player.name} guessed the word!`
        }
      );

      if (
        gameManager.isRoundCompleted(
          room
        )
      ) {
        io.to(
          room.roomId
        ).emit(
          "all-players-guessed"
        );
      }

      return;
    }

    io.to(room.roomId).emit(
      "chat-message",
      {
        type: "chat",
        from: player.name,
        message
      }
    );
  }
}

export default new ChatManager();
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

    if (
      isDrawer &&
      room.game.phase ===
        "DRAWING"
    ) {
      return;
    }

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
      normalizedWord &&
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
        clearTimeout(
          room.game.drawTimer
        );

        room.game.phase =
          "RESULT";

        io.to(
          room.roomId
        ).emit(
          "turn-ended",
          {
            word:
              room.game.word,

            scores:
              room.game.lastTurnScores.map(
                s => ({
                  player:
                    room.players.find(
                      p =>
                        p.id ===
                        s.playerId
                    )?.name,
                  points:
                    s.points
                })
              )
          }
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
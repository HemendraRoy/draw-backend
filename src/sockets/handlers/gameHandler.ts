import { Server, Socket } from "socket.io";
import roomManager from "../../rooms/RoomManager";
import gameManager from "../../game/GameManager";
import chatManager from "../../game/ChatManager";
import { startChoosePhase, startDrawTimer } from "../utils/gameHelpers";

export default function registerGameHandlers(io: Server, socket: Socket) {
  // CHAT MESSAGE
  socket.on("chat-message", ({ roomId, message }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    chatManager.handleMessage(io, room, player.id, message);

    if (gameManager.isRoundCompleted(room) && room.game.phase === "DRAWING") {
      clearTimeout(room.game.drawTimer);
      room.game.phase = "RESULT";

      io.to(room.roomId).emit("turn-ended", {
        word: room.game.word,
        scores: room.game.lastTurnScores
      });

      room.game.resultTimer = setTimeout(() => {
        gameManager.resetTurn(room);
        const result = gameManager.nextDrawer(room);

        if (result.gameEnded) {
          io.to(room.roomId).emit("game-ended", { winner: result.winner, leaderboard: result.leaderboard });
          return;
        }
        startChoosePhase(io, room, result);
      }, 5000);
    }
  });

  // START GAME
  socket.on("start-game", ({ roomId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) {
      socket.emit("game-error", "Room not found");
      return;
    }

    if (!roomManager.isHolder(roomId, socket.id)) {
      socket.emit("game-error", "Only holder can start");
      return;
    }

    const result = gameManager.startGame(room);
    if (!result.success) {
      socket.emit("game-error", result.message);
      return;
    }

    io.to(roomId).emit("game-started", { round: room.game.currentRound });
    startChoosePhase(io, room, result);
  });

  // CHOOSE WORD
  socket.on("choose-word", ({ roomId, word }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const drawer = room.players.find(p => p.id === room.game.currentDrawerId);
    if (drawer?.socketId !== socket.id) return;

    clearTimeout(room.game.chooseTimer);
    gameManager.chooseWord(room, word);

    io.to(roomId).emit("drawing-started", { duration: 75 });
    io.to(roomId).emit("word-mask", {
      mask: room.game.word!.split("").map(c => c === " " ? " " : "_").join(" ")
    });

    startDrawTimer(io, room);
  });

  // RESTART GAME
  socket.on("restart-game", ({ roomId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room || !roomManager.isHolder(roomId, socket.id)) return;

    room.players.forEach(p => { p.score = 0; });
    room.game.currentRound = 1;
    room.game.playersWhoDrewThisRound = [];

    const result = gameManager.startGame(room);
    if (!result.success) return;

    io.to(roomId).emit("leaderboard-update", room.players
      .map(p => ({ id: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score)
    );

    startChoosePhase(io, room, result);
  });
}
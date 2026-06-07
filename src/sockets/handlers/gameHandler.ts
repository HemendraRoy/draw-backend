import { Server, Socket } from "socket.io";
import roomManager from "../../rooms/RoomManager";
import gameManager from "../../game/GameManager";
import chatManager from "../../game/ChatManager";
import {
  endTurn,
  resetGameToLobby,
  startChoosePhase,
  startDrawingPhase,
} from "../utils/gameHelpers";

export default function registerGameHandlers(io: Server, socket: Socket) {
  // CHAT MESSAGE
  socket.on("chat-message", ({ roomId, message }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;

    chatManager.handleMessage(io, room, player.id, message);

    if (gameManager.isRoundCompleted(room) && room.game.phase === "DRAWING") {
      endTurn(io, room);
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

    const drawer = room.players.find((p) => p.id === room.game.currentDrawerId);
    if (drawer?.socketId !== socket.id) return;

    clearTimeout(room.game.chooseTimer);
    gameManager.chooseWord(room, word);
    startDrawingPhase(io, room);
  });

  // RETURN TO LOBBY AFTER GAME OVER
  socket.on("return-to-lobby", ({ roomId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room || !roomManager.isHolder(roomId, socket.id)) return;

    resetGameToLobby(room);

    io.to(roomId).emit("returned-to-lobby");
    io.to(roomId).emit("leaderboard-update", roomManager.getLeaderboard(roomId));
  });
}

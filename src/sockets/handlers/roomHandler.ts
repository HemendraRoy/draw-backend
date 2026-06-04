import { Server, Socket } from "socket.io";
import roomManager from "../../rooms/RoomManager";
import gameManager from "../../game/GameManager";
import { startChoosePhase } from "../utils/gameHelpers";

export default function registerRoomHandlers(io: Server, socket: Socket) {
  // CREATE ROOM
  socket.on("create-room", ({ name, password }) => {
    const result = roomManager.createRoom(name, password, socket.id);
    socket.join(result.room.roomId);

    io.to(result.room.roomId).emit("players-update", roomManager.getConnectedPlayers(result.room.roomId));
    io.to(result.room.roomId).emit("holder-update", result.room.holderId);
    
    socket.emit("room-created", { roomId: result.room.roomId, holder: true });
    socket.emit("leaderboard-update", result.room.players
      .map(p => ({ id: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score)
    );
  });

  // JOIN ROOM
  socket.on("join-room", ({ roomId, name, password }) => {
    const result = roomManager.joinRoom(roomId, name, password, socket.id);
    if (!result.success) {
      socket.emit("join-error", result.message);
      return;
    }

    socket.join(roomId);
    const room = result.room!;

    io.to(roomId).emit("players-update", roomManager.getConnectedPlayers(roomId));
    io.to(roomId).emit("holder-update", room.holderId);
    socket.emit("room-joined", { roomId, reconnect: result.reconnect });
    
    socket.emit("game-state", {
      started: room.game.started,
      phase: room.game.phase,
      round: room.game.currentRound,
      drawerId: room.game.currentDrawerId,
      guessedPlayers: room.game.guessedPlayers,
      chooseEndsAt: room.game.chooseEndsAt,
      drawEndsAt: room.game.drawEndsAt,
      resultEndsAt: room.game.resultEndsAt
    });
    
    socket.emit("drawing-history", room.game.drawingHistory);
    socket.emit("canvas-sync", room.game.drawingEvents);
    socket.emit("leaderboard-update", room.players
      .map(p => ({ id: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score)
    );

    const drawer = room.players.find(p => p.id === room.game.currentDrawerId);
    socket.emit("drawer-update", { drawer: drawer?.name });

    if (room.game.phase === "DRAWING" && room.game.drawEndsAt) {
      socket.emit("drawing-started", {
        duration: Math.max(0, Math.floor((room.game.drawEndsAt - Date.now()) / 1000))
      });
    }
  });

  // KICK PLAYER
  socket.on("kick-player", ({ roomId, targetName }) => {
    const result = roomManager.kickPlayer(roomId, socket.id, targetName);
    if (!result.success) {
      socket.emit("kick-error", result.message);
      return;
    }

    const room = result.room!;
    const targetSocket = result.target!.socketId;

    if (targetSocket) io.to(targetSocket).emit("kicked");

    io.to(roomId).emit("players-update", roomManager.getConnectedPlayers(roomId));
    io.to(roomId).emit("holder-update", room.holderId);
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    const room = roomManager.disconnectPlayer(socket.id);
    if (!room) return;

    const disconnected = room.players.find(p => !p.connected);

    if (disconnected?.id === room.game.currentDrawerId && room.game.phase === "DRAWING") {
      clearTimeout(room.game.drawTimer);
      io.to(room.roomId).emit("drawer-skipped");
      room.game.phase = "RESULT";

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

    io.to(room.roomId).emit("players-update", roomManager.getConnectedPlayers(room.roomId));
    io.to(room.roomId).emit("holder-update", room.holderId);
  });
}
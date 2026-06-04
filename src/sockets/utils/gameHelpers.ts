import { Server } from "socket.io";
import { Room } from "../../types/game";
import gameManager from "../../game/GameManager";

export function startChoosePhase(io: Server, room: Room, result: any) {
  if (!result.drawer) return;

  const drawerSocket = result.drawer.socketId;

  io.to(room.roomId).emit("drawer-update", { drawer: result.drawer.name });

  room.game.chooseEndsAt = Date.now() + 10000;

  room.game.chooseTimer = setTimeout(() => {
    gameManager.autoChooseWord(room);

    io.to(room.roomId).emit("drawing-started", { duration: 75 });
    io.to(room.roomId).emit("word-mask", {
      mask: room.game.word!.split("").map(c => c === " " ? " " : "_").join(" ")
    });

    startDrawTimer(io, room);
  }, 10000);

  if (drawerSocket) {
    io.to(drawerSocket).emit("choose-word", {
      choices: result.choices,
      time: 10
    });
  }
}

export function startDrawTimer(io: Server, room: Room) {
  room.game.drawEndsAt = Date.now() + 75000;
  const word = room.game.word || "";
  const reveal1 = word[0] || "";
  const reveal2 = word[1] || "";

  const hint1 = setTimeout(() => {
    if (room.game.phase === "DRAWING") {
      io.to(room.roomId).emit("hint-update", { reveal: reveal1 });
    }
  }, 25000);

  const hint2 = setTimeout(() => {
    if (room.game.phase === "DRAWING") {
      io.to(room.roomId).emit("hint-update", { reveal: reveal1 + reveal2 });
    }
  }, 50000);

  room.game.drawTimer = setTimeout(() => {
    if (room.game.phase !== "DRAWING") return;

    clearTimeout(hint1);
    clearTimeout(hint2);

    const drawer = room.players.find(p => p.id === room.game.currentDrawerId);
    if (drawer) {
      const guessedCount = room.game.guessedPlayers.length;
      const drawerPoints = guessedCount * 50;
      drawer.score += drawerPoints;
      room.game.lastTurnScores.push({ playerId: drawer.id, points: drawerPoints });
    }

    const leaderboard = room.players
      .map(p => ({ id: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);

    io.to(room.roomId).emit("leaderboard-update", leaderboard);
    io.to(room.roomId).emit("turn-ended", {
      word: room.game.word,
      scores: room.game.lastTurnScores.map(s => ({
        player: room.players.find(p => p.id === s.playerId)?.name,
        points: s.points
      }))
    });

    room.game.phase = "RESULT";
    room.game.resultEndsAt = Date.now() + 5000;

    room.game.resultTimer = setTimeout(() => {
      gameManager.resetTurn(room);
      const result = gameManager.nextDrawer(room);

      if (result.gameEnded) {
        io.to(room.roomId).emit("game-ended", {
          winner: result.winner,
          leaderboard: result.leaderboard
        });
        return;
      }

      startChoosePhase(io, room, result);
    }, 5000);
  }, 75000);
}
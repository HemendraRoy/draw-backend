import { Server } from "socket.io";
import { Room } from "../../types/game";
import gameManager from "../../game/GameManager";
import { buildWordHintDisplay } from "../../utils/wordHint";

export function clearHintTimers(room: Room) {
  if (room.game.hintTimer1) clearTimeout(room.game.hintTimer1);
  if (room.game.hintTimer2) clearTimeout(room.game.hintTimer2);
  room.game.hintTimer1 = undefined;
  room.game.hintTimer2 = undefined;
}

export function awardDrawerPoints(room: Room) {
  const drawer = room.players.find((p) => p.id === room.game.currentDrawerId);
  if (!drawer) return;

  const alreadyScored = room.game.lastTurnScores.some(
    (s) => s.playerId === drawer.id
  );
  if (alreadyScored) return;

  const drawerPoints = room.game.guessedPlayers.length * 50;
  if (drawerPoints <= 0) return;

  drawer.score += drawerPoints;
  room.game.lastTurnScores.push({ playerId: drawer.id, points: drawerPoints });
}

export function emitLeaderboard(io: Server, room: Room) {
  const leaderboard = room.players
    .filter((p) => p.connected)
    .map((p) => ({ id: p.id, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);

  io.to(room.roomId).emit("leaderboard-update", leaderboard);
}

export function startDrawingPhase(io: Server, room: Room) {
  const word = room.game.word || "";
  room.game.hintReveal = "0";

  const drawer = room.players.find((p) => p.id === room.game.currentDrawerId);
  if (drawer?.socketId) {
    io.to(drawer.socketId).emit("drawer-word", { word });
  }

  io.to(room.roomId).emit("drawing-started", {
    duration: 75,
    hintDisplay: buildWordHintDisplay(word, 0),
  });

  startDrawTimer(io, room);
}

export function endTurn(io: Server, room: Room) {
  if (room.game.phase !== "DRAWING") return;

  clearHintTimers(room);
  clearTimeout(room.game.drawTimer);

  awardDrawerPoints(room);
  emitLeaderboard(io, room);

  io.to(room.roomId).emit("turn-ended", {
    word: room.game.word,
    scores: room.game.lastTurnScores.map((s) => ({
      player: room.players.find((p) => p.id === s.playerId)?.name,
      points: s.points,
    })),
  });

  room.game.phase = "RESULT";
  room.game.resultEndsAt = Date.now() + 5000;

  room.game.resultTimer = setTimeout(() => {
    gameManager.resetTurn(room);
    const result = gameManager.nextDrawer(room);

    if (result.gameEnded) {
      io.to(room.roomId).emit("game-ended", {
        winner: result.winner,
        leaderboard: result.leaderboard,
      });
      return;
    }

    startChoosePhase(io, room, result);
  }, 5000);
}

export function startChoosePhase(io: Server, room: Room, result: any) {
  if (!result.drawer) return;

  const drawerSocket = result.drawer.socketId;

  io.to(room.roomId).emit("round-update", { round: room.game.currentRound });
  io.to(room.roomId).emit("drawer-update", { drawer: result.drawer.name });

  room.game.chooseEndsAt = Date.now() + 10000;

  io.to(room.roomId).emit("choose-phase-started", {
    drawer: result.drawer.name,
    round: room.game.currentRound,
    time: 10,
    chooseEndsAt: room.game.chooseEndsAt,
  });

  room.game.chooseTimer = setTimeout(() => {
    gameManager.autoChooseWord(room);
    startDrawingPhase(io, room);
  }, 10000);

  if (drawerSocket) {
    io.to(drawerSocket).emit("choose-word", {
      choices: result.choices,
      time: 10,
    });
  }
}

export function startDrawTimer(io: Server, room: Room) {
  clearHintTimers(room);

  room.game.drawEndsAt = Date.now() + 75000;
  const word = room.game.word || "";

  room.game.hintTimer1 = setTimeout(() => {
    if (room.game.phase === "DRAWING") {
      room.game.hintReveal = "1";
      io.to(room.roomId).emit("hint-update", {
        hintDisplay: buildWordHintDisplay(word, 1),
      });
    }
  }, 25000);

  room.game.hintTimer2 = setTimeout(() => {
    if (room.game.phase === "DRAWING") {
      room.game.hintReveal = "2";
      io.to(room.roomId).emit("hint-update", {
        hintDisplay: buildWordHintDisplay(word, 2),
      });
    }
  }, 50000);

  room.game.drawTimer = setTimeout(() => {
    endTurn(io, room);
  }, 75000);
}

export function resetGameToLobby(room: Room) {
  clearHintTimers(room);
  clearTimeout(room.game.chooseTimer);
  clearTimeout(room.game.drawTimer);
  clearTimeout(room.game.resultTimer);

  room.players.forEach((p) => {
    p.score = 0;
  });

  room.game.started = false;
  room.game.currentRound = 1;
  room.game.phase = "WAITING";
  room.game.currentDrawerId = null;
  room.game.playersWhoDrewThisRound = [];
  room.game.lastTurnScores = [];
  room.game.drawingHistory = [];
  room.game.drawingEvents = [];
  room.game.word = null;
  room.game.wordChoices = [];
  room.game.guessedPlayers = [];
  room.game.chooseEndsAt = undefined;
  room.game.drawEndsAt = undefined;
  room.game.resultEndsAt = undefined;
  room.game.hintReveal = undefined;
}

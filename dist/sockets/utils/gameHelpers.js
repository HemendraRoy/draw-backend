"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearHintTimers = clearHintTimers;
exports.awardDrawerPoints = awardDrawerPoints;
exports.emitLeaderboard = emitLeaderboard;
exports.startDrawingPhase = startDrawingPhase;
exports.endTurn = endTurn;
exports.startChoosePhase = startChoosePhase;
exports.startDrawTimer = startDrawTimer;
exports.resetGameToLobby = resetGameToLobby;
const GameManager_1 = __importDefault(require("../../game/GameManager"));
const wordHint_1 = require("../../utils/wordHint");
const scoring_1 = require("../../utils/scoring");
function clearHintTimers(room) {
    if (room.game.hintTimer1)
        clearTimeout(room.game.hintTimer1);
    if (room.game.hintTimer2)
        clearTimeout(room.game.hintTimer2);
    room.game.hintTimer1 = undefined;
    room.game.hintTimer2 = undefined;
}
function awardDrawerPoints(room) {
    const drawer = room.players.find((p) => p.id === room.game.currentDrawerId);
    if (!drawer)
        return;
    const alreadyScored = room.game.lastTurnScores.some((s) => s.playerId === drawer.id);
    if (alreadyScored)
        return;
    const drawerPoints = (0, scoring_1.getDrawerPoints)(room);
    if (drawerPoints <= 0)
        return;
    drawer.score += drawerPoints;
    room.game.lastTurnScores.push({ playerId: drawer.id, points: drawerPoints });
}
function emitLeaderboard(io, room) {
    const leaderboard = room.players
        .filter((p) => p.connected)
        .map((p) => ({ id: p.id, name: p.name, score: p.score }))
        .sort((a, b) => b.score - a.score);
    io.to(room.roomId).emit("leaderboard-update", leaderboard);
}
function startDrawingPhase(io, room) {
    const word = room.game.word || "";
    const hintSlots = Math.min(2, (0, wordHint_1.countWordLetters)(word));
    room.game.hintRevealIndices = (0, wordHint_1.pickRandomLetterIndices)(word, hintSlots);
    room.game.hintRevealCount = 0;
    const drawer = room.players.find((p) => p.id === room.game.currentDrawerId);
    if (drawer?.socketId) {
        io.to(drawer.socketId).emit("drawer-word", { word });
    }
    io.to(room.roomId).emit("drawing-started", {
        duration: 75,
        hintDisplay: (0, wordHint_1.buildWordHintDisplay)(word, []),
    });
    startDrawTimer(io, room);
}
function endTurn(io, room) {
    if (room.game.phase !== "DRAWING")
        return;
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
        GameManager_1.default.resetTurn(room);
        const result = GameManager_1.default.nextDrawer(room);
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
function startChoosePhase(io, room, result) {
    if (!result.drawer)
        return;
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
        GameManager_1.default.autoChooseWord(room);
        startDrawingPhase(io, room);
    }, 10000);
    if (drawerSocket) {
        io.to(drawerSocket).emit("choose-word", {
            choices: result.choices,
            time: 10,
        });
    }
}
function startDrawTimer(io, room) {
    clearHintTimers(room);
    room.game.drawEndsAt = Date.now() + 75000;
    const word = room.game.word || "";
    room.game.hintTimer1 = setTimeout(() => {
        if (room.game.phase === "DRAWING" && room.game.hintRevealIndices?.length) {
            room.game.hintRevealCount = 1;
            const revealed = room.game.hintRevealIndices.slice(0, 1);
            io.to(room.roomId).emit("hint-update", {
                hintDisplay: (0, wordHint_1.buildWordHintDisplay)(word, revealed),
            });
        }
    }, 25000);
    room.game.hintTimer2 = setTimeout(() => {
        if (room.game.phase === "DRAWING" && room.game.hintRevealIndices?.length) {
            room.game.hintRevealCount = Math.min(2, room.game.hintRevealIndices.length);
            const revealed = room.game.hintRevealIndices.slice(0, room.game.hintRevealCount);
            io.to(room.roomId).emit("hint-update", {
                hintDisplay: (0, wordHint_1.buildWordHintDisplay)(word, revealed),
            });
        }
    }, 50000);
    room.game.drawTimer = setTimeout(() => {
        endTurn(io, room);
    }, 75000);
}
function resetGameToLobby(room) {
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
    room.game.hintRevealIndices = undefined;
    room.game.hintRevealCount = undefined;
}

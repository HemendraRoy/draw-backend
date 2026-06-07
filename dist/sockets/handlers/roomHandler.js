"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = registerRoomHandlers;
const RoomManager_1 = __importDefault(require("../../rooms/RoomManager"));
const GameManager_1 = __importDefault(require("../../game/GameManager"));
const gameHelpers_1 = require("../utils/gameHelpers");
const wordHint_1 = require("../../utils/wordHint");
function registerRoomHandlers(io, socket) {
    // CREATE ROOM
    socket.on("create-room", ({ name, password }) => {
        const result = RoomManager_1.default.createRoom(name, password, socket.id);
        socket.join(result.room.roomId);
        io.to(result.room.roomId).emit("players-update", RoomManager_1.default.getConnectedPlayersPublic(result.room.roomId));
        io.to(result.room.roomId).emit("holder-update", result.room.holderId);
        socket.emit("room-created", { roomId: result.room.roomId, holder: true });
        socket.emit("leaderboard-update", RoomManager_1.default.getLeaderboard(result.room.roomId));
    });
    // JOIN ROOM
    socket.on("join-room", ({ roomId, name, password }) => {
        const result = RoomManager_1.default.joinRoom(roomId, name, password, socket.id);
        if (!result.success) {
            socket.emit("join-error", result.message);
            return;
        }
        if (result.previousSocketId && result.previousSocketId !== socket.id) {
            io.to(result.previousSocketId).emit("session-replaced");
            io.sockets.sockets.get(result.previousSocketId)?.disconnect(true);
        }
        socket.join(roomId);
        const room = result.room;
        io.to(roomId).emit("players-update", RoomManager_1.default.getConnectedPlayersPublic(roomId));
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
        socket.emit("leaderboard-update", RoomManager_1.default.getLeaderboard(roomId));
        const drawer = room.players.find(p => p.id === room.game.currentDrawerId);
        if (drawer?.name) {
            socket.emit("drawer-update", { drawer: drawer.name });
        }
        if (room.game.phase === "CHOOSING" && room.game.chooseEndsAt) {
            socket.emit("choose-phase-started", {
                drawer: drawer?.name ?? "",
                round: room.game.currentRound,
                time: Math.max(0, Math.floor((room.game.chooseEndsAt - Date.now()) / 1000)),
                chooseEndsAt: room.game.chooseEndsAt,
            });
            if (drawer?.socketId === socket.id && room.game.wordChoices.length > 0) {
                socket.emit("choose-word", {
                    choices: room.game.wordChoices,
                    time: Math.max(0, Math.floor((room.game.chooseEndsAt - Date.now()) / 1000)),
                });
            }
        }
        if (room.game.phase === "DRAWING" && room.game.drawEndsAt && room.game.word) {
            const revealedCount = room.game.hintRevealCount ?? 0;
            const revealedIndices = room.game.hintRevealIndices?.slice(0, revealedCount) ?? [];
            socket.emit("drawing-started", {
                duration: Math.max(0, Math.floor((room.game.drawEndsAt - Date.now()) / 1000)),
                hintDisplay: (0, wordHint_1.buildWordHintDisplay)(room.game.word, revealedIndices),
            });
            if (drawer?.socketId === socket.id) {
                socket.emit("drawer-word", { word: room.game.word });
            }
        }
    });
    // KICK PLAYER
    socket.on("kick-player", ({ roomId, targetName }) => {
        const result = RoomManager_1.default.kickPlayer(roomId, socket.id, targetName);
        if (!result.success) {
            socket.emit("kick-error", result.message);
            return;
        }
        const room = result.room;
        const targetSocket = result.targetSocketId;
        if (targetSocket) {
            io.to(targetSocket).emit("kicked");
            const kickedSocket = io.sockets.sockets.get(targetSocket);
            kickedSocket?.leave(roomId);
            kickedSocket?.disconnect(true);
        }
        if (result.target.id === room.game.currentDrawerId &&
            room.game.started &&
            (room.game.phase === "DRAWING" || room.game.phase === "CHOOSING")) {
            clearTimeout(room.game.chooseTimer);
            (0, gameHelpers_1.clearHintTimers)(room);
            clearTimeout(room.game.drawTimer);
            io.to(room.roomId).emit("drawer-skipped");
            room.game.phase = "RESULT";
            room.game.resultTimer = setTimeout(() => {
                GameManager_1.default.resetTurn(room);
                const next = GameManager_1.default.nextDrawer(room);
                if (next.gameEnded) {
                    io.to(room.roomId).emit("game-ended", { winner: next.winner, leaderboard: next.leaderboard });
                    return;
                }
                (0, gameHelpers_1.startChoosePhase)(io, room, next);
            }, 5000);
        }
        io.to(roomId).emit("players-update", RoomManager_1.default.getConnectedPlayersPublic(roomId));
        io.to(roomId).emit("holder-update", room.holderId);
    });
    // LEAVE ROOM (explicit — e.g. user clicked Leave)
    socket.on("leave-room", ({ roomId }, ack) => {
        const room = RoomManager_1.default.getRoom(roomId);
        if (!room) {
            ack?.();
            return;
        }
        const player = room.players.find(p => p.socketId === socket.id);
        if (!player) {
            ack?.();
            return;
        }
        socket.leave(roomId);
        const updatedRoom = RoomManager_1.default.leaveRoom(socket.id);
        if (updatedRoom) {
            io.to(roomId).emit("players-update", RoomManager_1.default.getConnectedPlayersPublic(roomId));
            io.to(roomId).emit("holder-update", updatedRoom.holderId);
        }
        ack?.();
    });
    // DISCONNECT
    socket.on("disconnect", () => {
        const room = RoomManager_1.default.disconnectPlayer(socket.id);
        if (!room)
            return;
        const disconnected = room.players.find(p => !p.connected);
        if (disconnected?.id === room.game.currentDrawerId && room.game.phase === "DRAWING") {
            clearTimeout(room.game.drawTimer);
            (0, gameHelpers_1.clearHintTimers)(room);
            io.to(room.roomId).emit("drawer-skipped");
            room.game.phase = "RESULT";
            room.game.resultTimer = setTimeout(() => {
                GameManager_1.default.resetTurn(room);
                const next = GameManager_1.default.nextDrawer(room);
                if (next.gameEnded) {
                    io.to(room.roomId).emit("game-ended", { winner: next.winner, leaderboard: next.leaderboard });
                    return;
                }
                (0, gameHelpers_1.startChoosePhase)(io, room, next);
            }, 5000);
        }
        io.to(room.roomId).emit("players-update", RoomManager_1.default.getConnectedPlayersPublic(room.roomId));
        io.to(room.roomId).emit("holder-update", room.holderId);
    });
}

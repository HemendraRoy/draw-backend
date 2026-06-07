"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = registerGameHandlers;
const RoomManager_1 = __importDefault(require("../../rooms/RoomManager"));
const GameManager_1 = __importDefault(require("../../game/GameManager"));
const ChatManager_1 = __importDefault(require("../../game/ChatManager"));
const gameHelpers_1 = require("../utils/gameHelpers");
function registerGameHandlers(io, socket) {
    // CHAT MESSAGE
    socket.on("chat-message", ({ roomId, message }) => {
        const room = RoomManager_1.default.getRoom(roomId);
        if (!room)
            return;
        const player = room.players.find((p) => p.socketId === socket.id);
        if (!player)
            return;
        ChatManager_1.default.handleMessage(io, room, player.id, message);
        if (GameManager_1.default.isRoundCompleted(room) && room.game.phase === "DRAWING") {
            (0, gameHelpers_1.endTurn)(io, room);
        }
    });
    // START GAME
    socket.on("start-game", ({ roomId }) => {
        const room = RoomManager_1.default.getRoom(roomId);
        if (!room) {
            socket.emit("game-error", "Room not found");
            return;
        }
        if (!RoomManager_1.default.isHolder(roomId, socket.id)) {
            socket.emit("game-error", "Only holder can start");
            return;
        }
        const result = GameManager_1.default.startGame(room);
        if (!result.success) {
            socket.emit("game-error", result.message);
            return;
        }
        io.to(roomId).emit("game-started", { round: room.game.currentRound });
        (0, gameHelpers_1.startChoosePhase)(io, room, result);
    });
    // CHOOSE WORD
    socket.on("choose-word", ({ roomId, word }) => {
        const room = RoomManager_1.default.getRoom(roomId);
        if (!room)
            return;
        const drawer = room.players.find((p) => p.id === room.game.currentDrawerId);
        if (drawer?.socketId !== socket.id)
            return;
        clearTimeout(room.game.chooseTimer);
        GameManager_1.default.chooseWord(room, word);
        (0, gameHelpers_1.startDrawingPhase)(io, room);
    });
    // RETURN TO LOBBY AFTER GAME OVER
    socket.on("return-to-lobby", ({ roomId }) => {
        const room = RoomManager_1.default.getRoom(roomId);
        if (!room || !RoomManager_1.default.isHolder(roomId, socket.id))
            return;
        (0, gameHelpers_1.resetGameToLobby)(room);
        io.to(roomId).emit("returned-to-lobby");
        io.to(roomId).emit("leaderboard-update", RoomManager_1.default.getLeaderboard(roomId));
    });
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const normalizeWord_1 = require("../utils/normalizeWord");
const scoring_1 = require("../utils/scoring");
const GameManager_1 = __importDefault(require("./GameManager"));
class ChatManager {
    handleMessage(io, room, playerId, message) {
        const player = room.players.find((p) => p.id === playerId);
        if (!player)
            return;
        if (!room.game.started) {
            return this.emitChatMessage(io, room, "chat", player.name, message);
        }
        const isDrawer = room.game.currentDrawerId === playerId;
        const alreadyGuessed = room.game.guessedPlayers.includes(playerId);
        const normalizedGuess = (0, normalizeWord_1.normalizeWord)(message);
        const normalizedTarget = (0, normalizeWord_1.normalizeWord)(room.game.word || "");
        const isCorrectGuess = !isDrawer &&
            !alreadyGuessed &&
            normalizedTarget &&
            normalizedGuess === normalizedTarget;
        if (isCorrectGuess) {
            this.processCorrectGuess(io, room, player, playerId);
            return;
        }
        const senderRole = isDrawer
            ? "drawer"
            : alreadyGuessed
                ? "guessed"
                : "unguessed";
        this.emitChatMessage(io, room, "chat", player.name, message, senderRole);
    }
    processCorrectGuess(io, room, player, playerId) {
        room.game.guessedPlayers.push(playerId);
        const rank = room.game.guessedPlayers.length - 1;
        const points = (0, scoring_1.getGuesserPoints)(rank, (0, scoring_1.getPlayerCount)(room));
        player.score += points;
        room.game.lastTurnScores.push({ playerId, points });
        const leaderboard = room.players
            .filter((p) => p.connected)
            .map((p) => ({ id: p.id, name: p.name, score: p.score }))
            .sort((a, b) => b.score - a.score);
        io.to(room.roomId).emit("leaderboard-update", leaderboard);
        io.to(room.roomId).emit("guessed-players-update", {
            guessedPlayers: room.game.guessedPlayers,
        });
        this.emitChatMessage(io, room, "system", null, `${player.name} guessed the word!`);
        if (GameManager_1.default.isRoundCompleted(room)) {
            io.to(room.roomId).emit("all-players-guessed");
        }
    }
    emitChatMessage(io, room, type, from, message, senderRole) {
        const payload = { type, message };
        if (from)
            payload.from = from;
        if (type === "chat" &&
            room.game.started &&
            room.game.phase === "DRAWING" &&
            senderRole) {
            payload.senderRole = senderRole;
        }
        io.to(room.roomId).emit("chat-message", payload);
    }
}
exports.default = new ChatManager();

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const WordManager_1 = __importDefault(require("./WordManager"));
class GameManager {
    // GAME FLOW & LOOP
    startGame(room) {
        if (room.game.started) {
            return { success: false, message: "Game already started" };
        }
        if (this.getConnectedPlayers(room).length < 2) {
            return { success: false, message: "Need at least 2 players" };
        }
        room.game.started = true;
        room.game.currentRound = 1;
        return this.nextDrawer(room);
    }
    nextDrawer(room) {
        const connected = this.getConnectedPlayers(room);
        const available = connected.filter(p => !room.game.playersWhoDrewThisRound.includes(p.id));
        // If everyone has drawn this round, advance to next round
        if (available.length === 0) {
            room.game.currentRound++;
            room.game.playersWhoDrewThisRound = [];
            // End game check (max 3 rounds)
            if (room.game.currentRound > 3) {
                room.game.started = false;
                room.game.phase = "WAITING";
                const leaderboard = [...room.players].sort((a, b) => b.score - a.score);
                return {
                    success: true,
                    gameEnded: true,
                    winner: leaderboard[0],
                    leaderboard
                };
            }
            return this.nextDrawer(room);
        }
        const drawer = available[0];
        room.game.currentDrawerId = drawer.id;
        room.game.playersWhoDrewThisRound.push(drawer.id);
        room.game.phase = "CHOOSING";
        room.game.wordChoices = WordManager_1.default.getRandomWords(3);
        return {
            success: true,
            drawer,
            choices: room.game.wordChoices
        };
    }
    // WORD SELECTION ACTIONS
    chooseWord(room, word) {
        room.game.word = word;
        room.game.phase = "DRAWING";
        room.game.guessedPlayers = [];
        return { success: true };
    }
    autoChooseWord(room) {
        const choices = room.game.wordChoices;
        const random = choices[Math.floor(Math.random() * choices.length)];
        return this.chooseWord(room, random);
    }
    // STATE EVALUATION & UTILITIES
    isRoundCompleted(room) {
        const connectedGuessers = this.getConnectedPlayers(room).filter(p => p.id !== room.game.currentDrawerId);
        return room.game.guessedPlayers.length >= connectedGuessers.length;
    }
    resetTurn(room) {
        // Clear execution timers
        clearTimeout(room.game.chooseTimer);
        clearTimeout(room.game.drawTimer);
        clearTimeout(room.game.resultTimer);
        clearTimeout(room.game.hintTimer1);
        clearTimeout(room.game.hintTimer2);
        room.game.hintTimer1 = undefined;
        room.game.hintTimer2 = undefined;
        // Wipe turn states
        room.game.lastTurnScores = [];
        room.game.drawingHistory = [];
        room.game.drawingEvents = [];
        room.game.word = null;
        room.game.wordChoices = [];
        room.game.guessedPlayers = [];
        room.game.hintRevealIndices = undefined;
        room.game.hintRevealCount = undefined;
        // Clear metadata timestamps
        room.game.chooseEndsAt = undefined;
        room.game.drawEndsAt = undefined;
        room.game.resultEndsAt = undefined;
    }
    getConnectedPlayers(room) {
        return room.players.filter(p => p.connected);
    }
}
exports.default = new GameManager();

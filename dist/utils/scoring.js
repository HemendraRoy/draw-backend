"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerCount = getPlayerCount;
exports.getGuesserPoints = getGuesserPoints;
exports.getDrawerPoints = getDrawerPoints;
function getPlayerCount(room) {
    return room.players.length;
}
function guessersInRoom(room) {
    return Math.max(0, getPlayerCount(room) - 1);
}
/** First guesser: 60×N, then −5×N per rank; minimum 40 points. */
function getGuesserPoints(rank, totalPlayers) {
    const multiplier = Math.max(0, 60 - rank * 5);
    const raw = multiplier * Math.max(0, totalPlayers);
    return Math.max(40, raw);
}
/** Drawer earns 160 × (fraction of guessers who got it right). */
function getDrawerPoints(room) {
    const guessers = guessersInRoom(room);
    if (guessers === 0)
        return 0;
    const guessedCount = room.game.guessedPlayers.length;
    const fraction = guessedCount / guessers;
    return Math.max(0, Math.round(160 * fraction));
}

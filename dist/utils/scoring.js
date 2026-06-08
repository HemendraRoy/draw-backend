"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAT_COOLDOWN_MS = void 0;
exports.getConnectedGuessers = getConnectedGuessers;
exports.getDrawTimeRemainingSeconds = getDrawTimeRemainingSeconds;
exports.isEasyWord = isEasyWord;
exports.getGuesserPoints = getGuesserPoints;
exports.getDrawerPoints = getDrawerPoints;
const wordHint_1 = require("./wordHint");
const CHAT_COOLDOWN_MS = 800;
exports.CHAT_COOLDOWN_MS = CHAT_COOLDOWN_MS;
/** Connected players who can guess (excludes drawer and offline/kicked players). */
function getConnectedGuessers(room) {
    return room.players.filter((p) => p.connected && p.id !== room.game.currentDrawerId);
}
function getDrawTimeRemainingSeconds(room) {
    if (!room.game.drawEndsAt)
        return 0;
    return Math.max(0, Math.ceil((room.game.drawEndsAt - Date.now()) / 1000));
}
function isEasyWord(word) {
    return (0, wordHint_1.countWordLetters)(word) <= 5;
}
/** Easy (≤5 letters): (time left + 25) × 3. Hard (>5 letters): (time left + 25) × 4. */
function getGuesserPoints(room, word) {
    const timeRemaining = getDrawTimeRemainingSeconds(room);
    const multiplier = isEasyWord(word) ? 3 : 4;
    return (timeRemaining + 25) * multiplier;
}
/** Drawer earns 120 × fraction of connected guessers who got it right. */
function getDrawerPoints(room) {
    const guessers = getConnectedGuessers(room);
    if (guessers.length === 0)
        return 0;
    const guesserIds = new Set(guessers.map((p) => p.id));
    const guessedCount = room.game.guessedPlayers.filter((id) => guesserIds.has(id)).length;
    const fraction = guessedCount / guessers.length;
    return Math.max(0, Math.round(120 * fraction));
}

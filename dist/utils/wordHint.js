"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWordHintDisplay = buildWordHintDisplay;
exports.countWordLetters = countWordLetters;
exports.pickRandomLetterIndices = pickRandomLetterIndices;
/** Build a spaced hint string; word spaces render as " / " between letter groups. */
function buildWordHintDisplay(word, revealedLetterIndices) {
    const revealSet = new Set(revealedLetterIndices);
    let letterIndex = 0;
    const parts = [];
    for (const char of word) {
        if (char === " ") {
            parts.push("/");
            continue;
        }
        parts.push(revealSet.has(letterIndex) ? char.toUpperCase() : "_");
        letterIndex += 1;
    }
    return parts.join(" ");
}
function countWordLetters(word) {
    return word.replace(/ /g, "").length;
}
/** Pick `count` random letter positions (0-based, spaces excluded). */
function pickRandomLetterIndices(word, count) {
    const indices = Array.from({ length: countWordLetters(word) }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, count);
}

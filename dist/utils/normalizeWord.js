"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWord = normalizeWord;
function normalizeWord(word) {
    return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

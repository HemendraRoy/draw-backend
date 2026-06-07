"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const wordBank_1 = __importDefault(require("./wordBank"));
class WordManager {
    getRandomWords(count = 3) {
        const copy = [...wordBank_1.default];
        const length = copy.length;
        // Clamp count to make sure it doesn't exceed array length
        const iterations = Math.min(count, length);
        // Only shuffle as many elements as we actually need to return
        for (let i = 0; i < iterations; i++) {
            const j = Math.floor(Math.random() * (length - i)) + i;
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy.slice(0, count);
    }
}
exports.default = new WordManager();

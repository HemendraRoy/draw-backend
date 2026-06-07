"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = registerGameSocket;
const roomHandler_1 = __importDefault(require("./handlers/roomHandler"));
const gameHandler_1 = __importDefault(require("./handlers/gameHandler"));
const canvasHandler_1 = __importDefault(require("./handlers/canvasHandler"));
function registerGameSocket(io) {
    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);
        (0, roomHandler_1.default)(io, socket);
        (0, gameHandler_1.default)(io, socket);
        (0, canvasHandler_1.default)(io, socket);
    });
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = registerCanvasHandlers;
const crypto_1 = __importDefault(require("crypto"));
const RoomManager_1 = __importDefault(require("../../rooms/RoomManager"));
function registerCanvasHandlers(io, socket) {
    const verifyDrawer = (roomId) => {
        const room = RoomManager_1.default.getRoom(roomId);
        if (!room)
            return null;
        const drawer = room.players.find(p => p.id === room.game.currentDrawerId);
        return drawer?.socketId === socket.id ? room : null;
    };
    socket.on("draw-event", ({ roomId, data }) => {
        const room = verifyDrawer(roomId);
        if (!room)
            return;
        room.game.drawingEvents.push(data);
        socket.to(roomId).emit("draw-event", data);
    });
    socket.on("clear-canvas", ({ roomId }) => {
        const room = verifyDrawer(roomId);
        if (!room)
            return;
        room.game.drawingHistory = [];
        room.game.drawingEvents = [];
        io.to(roomId).emit("clear-canvas");
        io.to(roomId).emit("canvas-cleared");
    });
    socket.on("change-color", ({ roomId, color }) => {
        if (!verifyDrawer(roomId))
            return;
        io.to(roomId).emit("color-changed", color);
    });
    socket.on("change-brush-size", ({ roomId, size }) => {
        if (!verifyDrawer(roomId))
            return;
        io.to(roomId).emit("brush-size-changed", size);
    });
    socket.on("start-stroke", ({ roomId, stroke }) => {
        const room = RoomManager_1.default.getRoom(roomId);
        if (!room)
            return;
        room.game.drawingHistory.push(stroke);
        socket.to(roomId).emit("start-stroke", stroke);
    });
    socket.on("stroke-point", ({ roomId, point }) => {
        const room = RoomManager_1.default.getRoom(roomId);
        if (!room)
            return;
        const last = room.game.drawingHistory[room.game.drawingHistory.length - 1];
        if (last && "points" in last)
            last.points.push(point);
        socket.to(roomId).emit("stroke-point", point);
    });
    socket.on("undo-stroke", ({ roomId }) => {
        const room = RoomManager_1.default.getRoom(roomId);
        if (!room)
            return;
        room.game.drawingHistory.pop();
        io.to(roomId).emit("drawing-history", room.game.drawingHistory);
    });
    socket.on("fill-canvas", ({ roomId, color, x, y, id }) => {
        const room = verifyDrawer(roomId);
        if (!room)
            return;
        const fill = {
            id: id || crypto_1.default.randomUUID(),
            type: "fill",
            color,
            x,
            y,
        };
        room.game.drawingHistory.push(fill);
        socket.to(roomId).emit("fill-canvas", fill);
    });
    socket.on("undo-draw", ({ roomId }) => {
        const room = verifyDrawer(roomId);
        if (!room)
            return;
        room.game.drawingHistory.pop();
        io.to(roomId).emit("drawing-history", room.game.drawingHistory);
    });
}

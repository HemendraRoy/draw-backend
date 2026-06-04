import { Server, Socket } from "socket.io";
import roomManager from "../../rooms/RoomManager";

export default function registerCanvasHandlers(io: Server, socket: Socket) {
  const verifyDrawer = (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return null;
    const drawer = room.players.find(p => p.id === room.game.currentDrawerId);
    return drawer?.socketId === socket.id ? room : null;
  };

  socket.on("draw-event", ({ roomId, data }) => {
    const room = verifyDrawer(roomId);
    if (!room) return;
    room.game.drawingEvents.push(data);
    socket.to(roomId).emit("draw-event", data);
  });

  socket.on("clear-canvas", ({ roomId }) => {
    const room = verifyDrawer(roomId);
    if (!room) return;
    room.game.drawingHistory = [];
    room.game.drawingEvents = [];
    io.to(roomId).emit("clear-canvas");
    io.to(roomId).emit("canvas-cleared");
  });

  socket.on("change-color", ({ roomId, color }) => {
    if (!verifyDrawer(roomId)) return;
    io.to(roomId).emit("color-changed", color);
  });

  socket.on("change-brush-size", ({ roomId, size }) => {
    if (!verifyDrawer(roomId)) return;
    io.to(roomId).emit("brush-size-changed", size);
  });

  socket.on("start-stroke", ({ roomId, stroke }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    room.game.drawingHistory.push(stroke);
    socket.to(roomId).emit("start-stroke", stroke);
  });

  socket.on("stroke-point", ({ roomId, point }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    const last = room.game.drawingHistory[room.game.drawingHistory.length - 1];
    if (last) last.points.push(point);
    socket.to(roomId).emit("stroke-point", point);
  });

  socket.on("undo-stroke", ({ roomId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    room.game.drawingHistory.pop();
    io.to(roomId).emit("drawing-history", room.game.drawingHistory);
  });

  socket.on("fill-canvas", ({ roomId, color }) => {
    if (!verifyDrawer(roomId)) return;
    io.to(roomId).emit("fill-canvas", { color });
  });

  socket.on("undo-draw", ({ roomId }) => {
    const room = verifyDrawer(roomId);
    if (!room) return;
    room.game.drawingHistory.pop();
    io.to(roomId).emit("undo-draw");
  });
}
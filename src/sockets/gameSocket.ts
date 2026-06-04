import { Server } from "socket.io";
import registerRoomHandlers from "./handlers/roomHandler";
import registerGameHandlers from "./handlers/gameHandler";
import registerCanvasHandlers from "./handlers/canvasHandler";

export default function registerGameSocket(io: Server) {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerCanvasHandlers(io, socket);
  });
}
import { Server } from "socket.io";
import roomManager from "../rooms/RoomManager";

export default function registerGameSocket(
  io: Server
) {
  io.on("connection", socket => {
    console.log(socket.id);

    socket.on(
      "create-room",
      ({ name, password }) => {
        const result =
          roomManager.createRoom(
            name,
            password,
            socket.id
          );

        socket.join(result.room.roomId);

        socket.emit(
          "room-created",
          {
            roomId: result.room.roomId,
            holder: true
          }
        );
      }
    );
  });
}
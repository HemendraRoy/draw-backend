import { Server } from "socket.io";
import roomManager from "../rooms/RoomManager";

export default function registerGameSocket(
  io: Server
) {
  io.on("connection", socket => {
    console.log(
      "Socket connected:",
      socket.id
    );

    socket.on(
      "create-room",
      ({ name, password }) => {
        const result =
          roomManager.createRoom(
            name,
            password,
            socket.id
          );

        socket.join(
          result.room.roomId
        );

        io.to(
          result.room.roomId
        ).emit(
          "players-update",
          roomManager.getConnectedPlayers(
            result.room.roomId
          )
        );

        socket.emit(
          "room-created",
          {
            roomId:
              result.room.roomId,
            holder: true
          }
        );
      }
    );

    socket.on(
      "join-room",
      ({
        roomId,
        name,
        password
      }) => {
        const result =
          roomManager.joinRoom(
            roomId,
            name,
            password,
            socket.id
          );

        if (!result.success) {
          socket.emit(
            "join-error",
            result.message
          );
          return;
        }

        socket.join(roomId);

        io.to(roomId).emit(
          "players-update",
          roomManager.getConnectedPlayers(
            roomId
          )
        );

        socket.emit(
          "room-joined",
          {
            roomId,
            reconnect:
              result.reconnect
          }
        );
      }
    );

    socket.on(
      "disconnect",
      () => {
        const room =
          roomManager.disconnectPlayer(
            socket.id
          );

        if (!room) return;

        io.to(
          room.roomId
        ).emit(
          "players-update",
          roomManager.getConnectedPlayers(
            room.roomId
          )
        );
      }
    );
  });
}
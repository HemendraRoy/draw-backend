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

    // CREATE ROOM
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

        io.to(
          result.room.roomId
        ).emit(
          "holder-update",
          result.room.holderId
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

    // JOIN ROOM
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

        io.to(roomId).emit(
          "holder-update",
          roomManager.getRoom(roomId)
            ?.holderId
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

    // KICK PLAYER
    socket.on(
      "kick-player",
      ({
        roomId,
        targetName
      }) => {
        const result =
          roomManager.kickPlayer(
            roomId,
            socket.id,
            targetName
          );

        if (!result.success) {
          socket.emit(
            "kick-error",
            result.message
          );
          return;
        }

        const room =
          result.room!;

        const target =
          result.target!;

        const targetSocket =
          target.socketId;

        if (targetSocket) {
          io.to(targetSocket).emit(
            "kicked"
          );
        }

        io.to(roomId).emit(
          "players-update",
          roomManager.getConnectedPlayers(
            roomId
          )
        );

        io.to(roomId).emit(
          "holder-update",
          room.holderId
        );
      }
    );

    // DISCONNECT
    socket.on(
      "disconnect",
      () => {
        const room =
          roomManager.disconnectPlayer(
            socket.id
          );

        if (!room) {
          return;
        }

        const updatedRoom =
          room;

        io.to(
          updatedRoom.roomId
        ).emit(
          "players-update",
          roomManager.getConnectedPlayers(
            updatedRoom.roomId
          )
        );

        io.to(
          updatedRoom.roomId
        ).emit(
          "holder-update",
          updatedRoom.holderId
        );
      }
    );
  });
}
import { Server } from "socket.io";
import roomManager from "../rooms/RoomManager";
import gameManager from "../game/GameManager";


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

// START GAME
socket.on(
  "start-game",
  ({ roomId }) => {
    const room =
      roomManager.getRoom(
        roomId
      );

    if (!room) {
      socket.emit(
        "game-error",
        "Room not found"
      );
      return;
    }

    if (
      !roomManager.isHolder(
        roomId,
        socket.id
      )
    ) {
      socket.emit(
        "game-error",
        "Only holder can start"
      );
      return;
    }

    const result =
      gameManager.startGame(
        room
      );

    if (!result.success) {
      socket.emit(
        "game-error",
        result.message
      );
      return;
    }

    io.to(roomId).emit(
      "game-started",
      {
        round:
          room.game
            .currentRound
      }
    );

    if (
      result.drawer
    ) {
      const drawerSocket =
        result.drawer
          .socketId;

      if (drawerSocket) {
        io.to(
          drawerSocket
        ).emit(
          "choose-word",
          {
            choices:
              result.choices,
            time: 10
          }
        );
      }

      io.to(roomId).emit(
        "drawer-update",
        {
          drawer:
            result.drawer.name
        }
      );

      room.game.chooseEndsAt =
        Date.now() + 10000;

      room.game.chooseTimer =
        setTimeout(() => {
          gameManager.autoChooseWord(
            room
          );

          io.to(roomId).emit(
            "drawing-started",
            {
              duration: 75
            }
          );

          startDrawTimer(
            io,
            room
          );
        }, 10000);
    }
  }
);
// WORD CHOSEN
socket.on(
  "choose-word",
  ({
    roomId,
    word
  }) => {
    const room =
      roomManager.getRoom(
        roomId
      );

    if (!room) return;

    const drawer =
      room.players.find(
        p =>
          p.id ===
          room.game
            .currentDrawerId
      );

    if (
      drawer?.socketId !==
      socket.id
    ) {
      return;
    }

    clearTimeout(
      room.game.chooseTimer
    );

    gameManager.chooseWord(
      room,
      word
    );

    io.to(roomId).emit(
      "drawing-started",
      {
        duration: 75
      }
    );

    startDrawTimer(
      io,
      room
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

function startDrawTimer(
  io: Server,
  room: any
) {
  room.game.drawEndsAt =
    Date.now() + 75000;

  room.game.drawTimer =
    setTimeout(() => {
      io.to(
        room.roomId
      ).emit(
        "turn-ended",
        {
          word:
            room.game.word
        }
      );

      room.game.phase =
        "RESULT";

      room.game.resultTimer =
        setTimeout(() => {
          const result =
            gameManager.nextDrawer(
              room
            );

          if (
            result.gameEnded
          ) {
            io.to(
              room.roomId
            ).emit(
              "game-ended"
            );
            return;
          }

          if (
            result.drawer
          ) {
            const drawerSocket =
              result.drawer
                .socketId;

            if (
              drawerSocket
            ) {
              io.to(
                drawerSocket
              ).emit(
                "choose-word",
                {
                  choices:
                    result.choices,
                  time: 10
                }
              );
            }

            io.to(
              room.roomId
            ).emit(
              "drawer-update",
              {
                drawer:
                  result.drawer
                    .name
              }
            );
          }
        }, 5000);
    }, 75000);
}
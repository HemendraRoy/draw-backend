import { Server } from "socket.io";
import roomManager from "../rooms/RoomManager";
import gameManager from "../game/GameManager";
import { Room } from "../types/game";

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

        startChoosePhase(
          io,
          room,
          result
        );
      }
    );

    // CHOOSE WORD
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

    // DRAW EVENT
    socket.on(
      "draw-event",
      ({
        roomId,
        data
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

        socket.to(roomId).emit(
          "draw-event",
          data
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

        const disconnected =
          room.players.find(
            p =>
              !p.connected
          );

        // drawer disconnected
        if (
          disconnected?.id ===
            room.game
              .currentDrawerId &&
          room.game.phase ===
            "DRAWING"
        ) {
          clearTimeout(
            room.game.drawTimer
          );

          io.to(
            room.roomId
          ).emit(
            "drawer-skipped"
          );

          room.game.phase =
            "RESULT";

          room.game.resultTimer =
            setTimeout(() => {
              gameManager.resetTurn(
                room
              );

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

              startChoosePhase(
                io,
                room,
                result
              );
            }, 5000);
        }

        io.to(
          room.roomId
        ).emit(
          "players-update",
          roomManager.getConnectedPlayers(
            room.roomId
          )
        );

        io.to(
          room.roomId
        ).emit(
          "holder-update",
          room.holderId
        );
      }
    );
  });
}

function startChoosePhase(
  io: Server,
  room: Room,
  result: any
) {
  if (
    !result.drawer
  ) {
    return;
  }

  const drawerSocket =
    result.drawer.socketId;

  io.to(
    room.roomId
  ).emit(
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

      io.to(
        room.roomId
      ).emit(
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
}

function startDrawTimer(
  io: Server,
  room: Room
) {
  room.game.drawEndsAt =
    Date.now() + 75000;

  const word =
    room.game.word || "";

  const reveal1 =
    word[0] || "";

  const reveal2 =
    word[1] || "";

  const hint1 =
    setTimeout(() => {
      if (
        room.game.phase ===
        "DRAWING"
      ) {
        io.to(
          room.roomId
        ).emit(
          "hint-update",
          {
            reveal:
              reveal1
          }
        );
      }
    }, 25000);

  const hint2 =
    setTimeout(() => {
      if (
        room.game.phase ===
        "DRAWING"
      ) {
        io.to(
          room.roomId
        ).emit(
          "hint-update",
          {
            reveal:
              reveal1 +
              reveal2
          }
        );
      }
    }, 50000);

  room.game.drawTimer =
    setTimeout(() => {
      clearTimeout(
        hint1
      );

      clearTimeout(
        hint2
      );

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

      room.game.resultEndsAt =
        Date.now() + 5000;

      room.game.resultTimer =
        setTimeout(() => {
          gameManager.resetTurn(
            room
          );

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

          startChoosePhase(
            io,
            room,
            result
          );
        }, 5000);
    }, 75000);
}
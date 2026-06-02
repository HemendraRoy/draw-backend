import crypto from "crypto";
import { Player, Room } from "../types/game";

class RoomManager {
  rooms = new Map<string, Room>();

  generateRoomId(): string {
    let id = "";

    do {
      id = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
    } while (this.rooms.has(id));

    return id;
  }

  createRoom(
    name: string,
    password: string,
    socketId: string
  ) {
    const roomId = this.generateRoomId();

    const player: Player = {
      id: crypto.randomUUID(),
      name,
      password,
      socketId,
      connected: true,
      score: 0,
      joinedAt: Date.now()
    };

    const room: Room = {
      roomId,
      holderId: player.id,
      players: [player],
      bannedPlayers: []
    };

    this.rooms.set(roomId, room);

    return {
      success: true,
      room,
      player
    };
  }

  joinRoom(
    roomId: string,
    name: string,
    password: string,
    socketId: string
  ) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return {
        success: false,
        message: "Room not found"
      };
    }

    if (room.bannedPlayers.includes(name)) {
      return {
        success: false,
        message: "You are kicked from this room"
      };
    }

    const existingPlayer =
      room.players.find(
        p => p.name === name
      );

    if (existingPlayer) {
      if (
        existingPlayer.password !== password
      ) {
        return {
          success: false,
          message:
            "User already present. Enter correct password or change name."
        };
      }

      if (existingPlayer.connected) {
        return {
          success: false,
          message:
            "User already present in game"
        };
      }

      existingPlayer.connected = true;
      existingPlayer.socketId = socketId;

      if (room.expiryTimer) {
        clearTimeout(room.expiryTimer);
        room.expiryTimer = undefined;
      }

      return {
        success: true,
        room,
        player: existingPlayer,
        reconnect: true
      };
    }

    const player: Player = {
      id: crypto.randomUUID(),
      name,
      password,
      socketId,
      connected: true,
      score: 0,
      joinedAt: Date.now()
    };

    room.players.push(player);

    if (room.expiryTimer) {
      clearTimeout(room.expiryTimer);
      room.expiryTimer = undefined;
    }

    if (!room.holderId) {
      room.holderId = player.id;
    }

    return {
      success: true,
      room,
      player,
      reconnect: false
    };
  }

  disconnectPlayer(socketId: string) {
    for (const room of this.rooms.values()) {
      const player =
        room.players.find(
          p => p.socketId === socketId
        );

      if (!player) continue;

      player.connected = false;
      player.socketId = null;

      const connectedPlayers =
        room.players.filter(
          p => p.connected
        );

      if (
        room.holderId === player.id
      ) {
        const oldest =
          connectedPlayers.sort(
            (a, b) =>
              a.joinedAt - b.joinedAt
          )[0];

        room.holderId =
          oldest?.id || null;
      }

      if (
        connectedPlayers.length === 0
      ) {
        room.expiryTimer =
          setTimeout(() => {
            this.rooms.delete(
              room.roomId
            );

            console.log(
              "Room expired:",
              room.roomId
            );
          }, 5 * 60 * 1000);
      }

      return room;
    }
  }

  getConnectedPlayers(
    roomId: string
  ) {
    const room =
      this.rooms.get(roomId);

    if (!room) return [];

    return room.players.filter(
      p => p.connected
    );
  }

  getRoom(roomId: string) {
  return this.rooms.get(roomId);
}

isHolder(
  roomId: string,
  socketId: string
) {
  const room = this.rooms.get(roomId);

  if (!room) return false;

  const player =
    room.players.find(
      p => p.socketId === socketId
    );

  if (!player) return false;

  return room.holderId === player.id;
}

kickPlayer(
  roomId: string,
  holderSocketId: string,
  targetName: string
) {
  const room =
    this.rooms.get(roomId);

  if (!room) {
    return {
      success: false,
      message: "Room not found"
    };
  }

  if (
    !this.isHolder(
      roomId,
      holderSocketId
    )
  ) {
    return {
      success: false,
      message:
        "Only holder can kick"
    };
  }

  const target =
    room.players.find(
      p => p.name === targetName
    );

  if (!target) {
    return {
      success: false,
      message:
        "Player not found"
    };
  }

  room.bannedPlayers.push(
    target.name
  );

  target.connected = false;

  return {
    success: true,
    room,
    target
  };
}
}

export default new RoomManager();
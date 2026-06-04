import crypto from "crypto";
import { Player, Room } from "../types/game";

class RoomManager {
  private rooms = new Map<string, Room>();

  // CORE ROOM MANAGEMENT

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  generateRoomId(): string {
    let id: string;
    do {
      id = Math.floor(100000 + Math.random() * 900000).toString();
    } while (this.rooms.has(id));
    return id;
  }

  createRoom(name: string, password: string, socketId: string) {
    const roomId = this.generateRoomId();
    const player = this.createPlayerInstance(name, password, socketId);

    const room: Room = {
      roomId,
      holderId: player.id,
      players: [player],
      bannedPlayers: [],
      game: {
        started: false,
        currentRound: 1,
        phase: "WAITING",
        currentDrawerId: null,
        playersWhoDrewThisRound: [],
        lastTurnScores: [],
        drawingEvents: [],
        drawingHistory: [],
        word: null,
        wordChoices: [],
        guessedPlayers: []
      }
    };

    this.rooms.set(roomId, room);
    return { success: true, room, player };
  }

  // PLAYER MANAGEMENT

  joinRoom(roomId: string, name: string, password: string, socketId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: "Room not found" };
    if (room.bannedPlayers.includes(name)) return { success: false, message: "You are kicked from this room" };

    const existingPlayer = room.players.find(p => p.name === name);

    if (existingPlayer) {
      if (existingPlayer.password !== password) {
        return { success: false, message: "User already present. Enter correct password or change name." };
      }
      if (existingPlayer.connected) {
        return { success: false, message: "User already present in game" };
      }

      existingPlayer.connected = true;
      existingPlayer.socketId = socketId;
      this.clearRoomExpiry(room);

      return { success: true, room, player: existingPlayer, reconnect: true };
    }

    const player = this.createPlayerInstance(name, password, socketId);
    room.players.push(player);
    this.clearRoomExpiry(room);

    if (!room.holderId) room.holderId = player.id;

    return { success: true, room, player, reconnect: false };
  }

  disconnectPlayer(socketId: string) {
    const room = Array.from(this.rooms.values()).find(r => r.players.some(p => p.socketId === socketId));
    if (!room) return;

    const player = room.players.find(p => p.socketId === socketId)!;
    player.connected = false;
    player.socketId = null;

    const connectedPlayers = room.players.filter(p => p.connected);

    // Migrate host if the disconnected player was the room holder
    if (room.holderId === player.id) {
      const oldest = [...connectedPlayers].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      room.holderId = oldest?.id || null;
    }

    // Start self-destruct timer if room is entirely empty
    if (connectedPlayers.length === 0) {
      room.expiryTimer = setTimeout(() => {
        this.rooms.delete(room.roomId);
        console.log("Room expired:", room.roomId);
      }, 5 * 60 * 1000);
    }

    return room;
  }

  kickPlayer(roomId: string, holderSocketId: string, targetName: string) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: "Room not found" };
    if (!this.isHolder(roomId, holderSocketId)) return { success: false, message: "Only holder can kick" };

    const target = room.players.find(p => p.name === targetName);
    if (!target) return { success: false, message: "Player not found" };

    room.bannedPlayers.push(target.name);
    target.connected = false;

    return { success: true, room, target };
  }

  // UTILITIES & VALIDATIONS

  getConnectedPlayers(roomId: string): Player[] {
    return this.rooms.get(roomId)?.players.filter(p => p.connected) || [];
  }

  isHolder(roomId: string, socketId: string): boolean {
    const room = this.rooms.get(roomId);
    const player = room?.players.find(p => p.socketId === socketId);
    return !!room && !!player && room.holderId === player.id;
  }

  private createPlayerInstance(name: string, password: string, socketId: string): Player {
    return {
      id: crypto.randomUUID(),
      name,
      password,
      socketId,
      connected: true,
      score: 0,
      joinedAt: Date.now()
    };
  }

  private clearRoomExpiry(room: Room) {
    if (room.expiryTimer) {
      clearTimeout(room.expiryTimer);
      room.expiryTimer = undefined;
    }
  }
}

export default new RoomManager();
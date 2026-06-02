import { Room, Player } from "../types/game";

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

    return { room, player };
  }
}

export default new RoomManager();
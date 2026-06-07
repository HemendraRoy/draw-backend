"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
class RoomManager {
    constructor() {
        this.rooms = new Map();
    }
    // CORE ROOM MANAGEMENT
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    generateRoomId() {
        let id;
        do {
            id = Math.floor(100000 + Math.random() * 900000).toString();
        } while (this.rooms.has(id));
        return id;
    }
    createRoom(name, password, socketId) {
        const roomId = this.generateRoomId();
        const player = this.createPlayerInstance(name, password, socketId);
        const room = {
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
    joinRoom(roomId, name, password, socketId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return { success: false, message: "Room not found" };
        if (room.bannedPlayers.includes(name))
            return { success: false, message: "You are kicked from this room" };
        const existingPlayer = room.players.find(p => p.name === name);
        if (existingPlayer) {
            if (existingPlayer.password !== password) {
                return { success: false, message: "User already present. Enter correct password or change name." };
            }
            // Only evict another tab/device — same socket rejoining after leave is allowed
            const previousSocketId = existingPlayer.connected &&
                existingPlayer.socketId &&
                existingPlayer.socketId !== socketId
                ? existingPlayer.socketId
                : undefined;
            existingPlayer.connected = true;
            existingPlayer.socketId = socketId;
            this.clearRoomExpiry(room);
            return {
                success: true,
                room,
                player: existingPlayer,
                reconnect: true,
                previousSocketId,
            };
        }
        const player = this.createPlayerInstance(name, password, socketId);
        room.players.push(player);
        this.clearRoomExpiry(room);
        if (!room.holderId)
            room.holderId = player.id;
        return { success: true, room, player, reconnect: false };
    }
    disconnectPlayer(socketId) {
        const room = Array.from(this.rooms.values()).find(r => r.players.some(p => p.socketId === socketId));
        if (!room)
            return;
        const player = room.players.find(p => p.socketId === socketId);
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
    kickPlayer(roomId, holderSocketId, targetName) {
        const room = this.rooms.get(roomId);
        if (!room)
            return { success: false, message: "Room not found" };
        if (!this.isHolder(roomId, holderSocketId))
            return { success: false, message: "Only holder can kick" };
        const target = room.players.find(p => p.name === targetName);
        if (!target)
            return { success: false, message: "Player not found" };
        const targetSocketId = target.socketId;
        if (!room.bannedPlayers.includes(target.name)) {
            room.bannedPlayers.push(target.name);
        }
        target.connected = false;
        target.socketId = null;
        if (room.holderId === target.id) {
            const connectedPlayers = room.players.filter(p => p.connected);
            const oldest = [...connectedPlayers].sort((a, b) => a.joinedAt - b.joinedAt)[0];
            room.holderId = oldest?.id || null;
        }
        return { success: true, room, target, targetSocketId };
    }
    leaveRoom(socketId) {
        return this.disconnectPlayer(socketId);
    }
    // UTILITIES & VALIDATIONS
    getConnectedPlayers(roomId) {
        return this.rooms.get(roomId)?.players.filter(p => p.connected) || [];
    }
    getConnectedPlayersPublic(roomId) {
        return this.getConnectedPlayers(roomId).map(p => ({
            id: p.id,
            name: p.name,
            score: p.score,
            connected: true,
        }));
    }
    getLeaderboard(roomId) {
        return this.getConnectedPlayers(roomId)
            .map(p => ({ id: p.id, name: p.name, score: p.score }))
            .sort((a, b) => b.score - a.score);
    }
    isHolder(roomId, socketId) {
        const room = this.rooms.get(roomId);
        const player = room?.players.find(p => p.socketId === socketId);
        return !!room && !!player && room.holderId === player.id;
    }
    createPlayerInstance(name, password, socketId) {
        return {
            id: crypto_1.default.randomUUID(),
            name,
            password,
            socketId,
            connected: true,
            score: 0,
            joinedAt: Date.now()
        };
    }
    clearRoomExpiry(room) {
        if (room.expiryTimer) {
            clearTimeout(room.expiryTimer);
            room.expiryTimer = undefined;
        }
    }
}
exports.default = new RoomManager();

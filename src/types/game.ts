export interface Player {
  id: string;
  name: string;
  password: string;
  socketId: string | null;
  connected: boolean;
  score: number;
  joinedAt: number;
}

export interface Room {
  roomId: string;
  holderId: string | null;
  players: Player[];
  bannedPlayers: string[];
  expiryTimer?: NodeJS.Timeout;
}
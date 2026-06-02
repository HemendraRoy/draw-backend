export type TurnPhase =
  | "WAITING"
  | "CHOOSING"
  | "DRAWING"
  | "RESULT";

export interface Player {
  id: string;
  name: string;
  password: string;
  socketId: string | null;
  connected: boolean;
  score: number;
  joinedAt: number;
}

export interface GameState {
  started: boolean;
  currentRound: number;
  phase: TurnPhase;

  currentDrawerId: string | null;

  playersWhoDrewThisRound: string[];

  word: string | null;
  wordChoices: string[];

  guessedPlayers: string[];

  chooseEndsAt?: number;
  drawEndsAt?: number;
  resultEndsAt?: number;

  chooseTimer?: NodeJS.Timeout;
  drawTimer?: NodeJS.Timeout;
  resultTimer?: NodeJS.Timeout;
}

export interface Room {
  roomId: string;
  holderId: string | null;
  players: Player[];
  bannedPlayers: string[];
  expiryTimer?: NodeJS.Timeout;

  game: GameState;
}
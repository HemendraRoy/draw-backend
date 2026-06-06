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
  

  lastTurnScores: {
    playerId: string;
    points: number;
  }[];
  drawingEvents: any[];
  chooseEndsAt?: number;
  drawEndsAt?: number;
  resultEndsAt?: number;
  drawingHistory: CanvasItem[];

  chooseTimer?: NodeJS.Timeout;
  drawTimer?: NodeJS.Timeout;
  resultTimer?: NodeJS.Timeout;
  hintTimer1?: NodeJS.Timeout;
  hintTimer2?: NodeJS.Timeout;
  hintReveal?: string;
}
export interface Stroke {
  id: string;
  color: string;
  size: number;
  points: {
    x: number;
    y: number;
  }[];
}

export interface FillAction {
  id: string;
  type: "fill";
  color: string;
  x: number;
  y: number;
}

export type CanvasItem = Stroke | FillAction;
export interface Room {
  roomId: string;
  holderId: string | null;
  players: Player[];
  bannedPlayers: string[];
  expiryTimer?: NodeJS.Timeout;

  game: GameState;
}
import { Room, Player } from "../types/game";
import wordManager from "./WordManager";

class GameManager {
  // GAME FLOW & LOOP

  startGame(room: Room) {
    if (room.game.started) {
      return { success: false, message: "Game already started" };
    }

    if (this.getConnectedPlayers(room).length < 2) {
      return { success: false, message: "Need at least 2 players" };
    }

    room.game.started = true;
    room.game.currentRound = 1;

    return this.nextDrawer(room);
  }

  nextDrawer(room: Room): any {
    const connected = this.getConnectedPlayers(room);
    const available = connected.filter(p => !room.game.playersWhoDrewThisRound.includes(p.id));

    // If everyone has drawn this round, advance to next round
    if (available.length === 0) {
      room.game.currentRound++;
      room.game.playersWhoDrewThisRound = [];

      // End game check (max 3 rounds)
      if (room.game.currentRound > 3) {
        room.game.started = false;
        room.game.phase = "WAITING";

        const leaderboard = [...room.players].sort((a, b) => b.score - a.score);
        return {
          success: true,
          gameEnded: true,
          winner: leaderboard[0],
          leaderboard
        };
      }

      return this.nextDrawer(room);
    }

    const drawer = available[0];
    room.game.currentDrawerId = drawer.id;
    room.game.playersWhoDrewThisRound.push(drawer.id);
    room.game.phase = "CHOOSING";
    room.game.wordChoices = wordManager.getRandomWords(3);

    return {
      success: true,
      drawer,
      choices: room.game.wordChoices
    };
  }

  // WORD SELECTION ACTIONS

  chooseWord(room: Room, word: string) {
    room.game.word = word;
    room.game.phase = "DRAWING";
    room.game.guessedPlayers = [];

    return { success: true };
  }

  autoChooseWord(room: Room) {
    const choices = room.game.wordChoices;
    const random = choices[Math.floor(Math.random() * choices.length)];
    return this.chooseWord(room, random);
  }

  // STATE EVALUATION & UTILITIES

  isRoundCompleted(room: Room): boolean {
    const connectedGuessers = this.getConnectedPlayers(room).filter(
      p => p.id !== room.game.currentDrawerId
    );

    return room.game.guessedPlayers.length >= connectedGuessers.length;
  }

  resetTurn(room: Room) {
    // Clear execution timers
    clearTimeout(room.game.chooseTimer);
    clearTimeout(room.game.drawTimer);
    clearTimeout(room.game.resultTimer);

    // Wipe turn states
    room.game.lastTurnScores = [];
    room.game.drawingHistory = [];
    room.game.drawingEvents = [];
    room.game.word = null;
    room.game.wordChoices = [];
    room.game.guessedPlayers = [];
      
    // Clear metadata timestamps
    room.game.chooseEndsAt = undefined;
    room.game.drawEndsAt = undefined;
    room.game.resultEndsAt = undefined;
  }

  private getConnectedPlayers(room: Room): Player[] {
    return room.players.filter(p => p.connected);
  }
}

export default new GameManager();
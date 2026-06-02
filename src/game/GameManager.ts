import { Room } from "../types/game";
import wordManager from "./WordManager";

class GameManager {
  startGame(room: Room) {
    if (room.game.started) {
      return {
        success: false,
        message:
          "Game already started"
      };
    }

    const connected =
      room.players.filter(
        p => p.connected
      );

    if (
      connected.length < 2
    ) {
      return {
        success: false,
        message:
          "Need at least 2 players"
      };
    }

    room.game.started = true;
    room.game.currentRound = 1;

    return this.nextDrawer(
      room
    );
  }

  nextDrawer(
    room: Room
  ): any {
    const connected =
      room.players.filter(
        p => p.connected
      );

    const available =
      connected.filter(
        p =>
          !room.game
            .playersWhoDrewThisRound
            .includes(p.id)
      );

    if (
      available.length === 0
    ) {
      room.game.currentRound++;

      room.game
        .playersWhoDrewThisRound =
        [];

      if (
        room.game.currentRound >
        3
      ) {
        room.game.started =
          false;

        room.game.phase =
          "WAITING";

        return {
          success: true,
          gameEnded: true
        };
      }

      return this.nextDrawer(
        room
      );
    }

    const drawer =
      available[0];

    room.game.currentDrawerId =
      drawer.id;

    room.game
      .playersWhoDrewThisRound
      .push(drawer.id);

    room.game.phase =
      "CHOOSING";

    room.game.wordChoices =
      wordManager.getRandomWords(
        3
      );

    return {
      success: true,
      drawer,
      choices:
        room.game.wordChoices
    };
  }

  chooseWord(
    room: Room,
    word: string
  ) {
    room.game.word = word;

    room.game.phase =
      "DRAWING";

    room.game.guessedPlayers =
      [];

    return {
      success: true
    };
  }

  autoChooseWord(
    room: Room
  ) {
    const choices =
      room.game.wordChoices;

    const random =
      choices[
        Math.floor(
          Math.random() *
            choices.length
        )
      ];

    return this.chooseWord(
      room,
      random
    );
  }
}

export default new GameManager();
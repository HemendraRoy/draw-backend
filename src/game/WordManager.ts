import wordBank from "./wordBank";

class WordManager {
  getRandomWords(count = 3) {
    const copy = [...wordBank];

    for (
      let i = copy.length - 1;
      i > 0;
      i--
    ) {
      const j = Math.floor(
        Math.random() * (i + 1)
      );

      [copy[i], copy[j]] = [
        copy[j],
        copy[i]
      ];
    }

    return copy.slice(0, count);
  }
}

export default new WordManager();
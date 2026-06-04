import wordBank from "./wordBank";

class WordManager {
  getRandomWords(count = 3): string[] {
    const copy = [...wordBank];
    const length = copy.length;
    
    // Clamp count to make sure it doesn't exceed array length
    const iterations = Math.min(count, length);

    // Only shuffle as many elements as we actually need to return
    for (let i = 0; i < iterations; i++) {
      const j = Math.floor(Math.random() * (length - i)) + i;
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy.slice(0, count);
  }
}

export default new WordManager();
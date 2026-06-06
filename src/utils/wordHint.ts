/** Build a spaced hint string; word spaces render as " / " between letter groups. */
export function buildWordHintDisplay(word: string, revealedLetters: number): string {
  let revealed = 0;
  const parts: string[] = [];

  for (const char of word) {
    if (char === " ") {
      parts.push("/");
      continue;
    }

    if (revealed < revealedLetters) {
      revealed += 1;
      parts.push(char.toUpperCase());
    } else {
      parts.push("_");
    }
  }

  return parts.join(" ");
}

export function countWordLetters(word: string): number {
  return word.replace(/ /g, "").length;
}

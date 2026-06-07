/** Build a spaced hint string; word spaces render as " / " between letter groups. */
export function buildWordHintDisplay(
  word: string,
  revealedLetterIndices: number[]
): string {
  const revealSet = new Set(revealedLetterIndices);
  let letterIndex = 0;
  const parts: string[] = [];

  for (const char of word) {
    if (char === " ") {
      parts.push("/");
      continue;
    }

    parts.push(revealSet.has(letterIndex) ? char.toUpperCase() : "_");
    letterIndex += 1;
  }

  return parts.join(" ");
}

export function countWordLetters(word: string): number {
  return word.replace(/ /g, "").length;
}

/** Pick `count` random letter positions (0-based, spaces excluded). */
export function pickRandomLetterIndices(word: string, count: number): number[] {
  const indices = Array.from(
    { length: countWordLetters(word) },
    (_, i) => i
  );

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, count);
}

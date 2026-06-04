export function normalizeWord(
  word: string
): string {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
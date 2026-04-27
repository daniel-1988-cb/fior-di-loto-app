/** Parses a tags value (stored as JSON array or raw array) into string[]. */
export function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags as string[];
  if (typeof tags === "string") {
    try {
      return JSON.parse(tags) as string[];
    } catch {
      return [];
    }
  }
  return [];
}

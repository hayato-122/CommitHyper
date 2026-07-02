export function safeParseJson<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T[];
    } catch {
      return [];
    }
  }
  return [];
}

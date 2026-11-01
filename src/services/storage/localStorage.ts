const LEARNED_CHARACTERS_KEY = "hanzi:learned-characters";

export function readLearnedCharacters(): string[] {
  try {
    const storedValue = localStorage.getItem(LEARNED_CHARACTERS_KEY);

    if (!storedValue) {
      return [];
    }

    const parsed: unknown = JSON.parse(storedValue);

    if (
      Array.isArray(parsed) &&
      parsed.every((item): item is string => typeof item === "string")
    ) {
      return parsed;
    }

    return [];
  } catch {
    return [];
  }
}

export function writeLearnedCharacters(characterIds: string[]): void {
  localStorage.setItem(LEARNED_CHARACTERS_KEY, JSON.stringify(characterIds));
}

import type { VocabularyDisplay } from "./vocabularyDisplay";

/**
 * Normalizes search input so that Pinyin can be searched
 * with or without tone marks or numeric tone notation.
 *
 * Examples:
 * nǐ     -> ni
 * ni3    -> ni
 * nǚ     -> nu
 * nv3    -> nu
 */
export function normalizeVocabularySearchValue(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/u:/g, "ü")
    .replace(/v/g, "ü")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[1-5]/g, "")
    .trim();
}

/**
 * Checks whether a vocabulary entry matches the search phrase.
 */
export function matchesVocabularySearch(
  vocabulary: VocabularyDisplay,
  search: string,
): boolean {
  const normalizedSearch = normalizeVocabularySearchValue(search);

  if (!normalizedSearch) {
    return true;
  }

  const searchableValues = [
    vocabulary.simplified,
    ...vocabulary.traditionalVariants,
    ...vocabulary.readings.map((reading) => reading.pinyin),
    ...vocabulary.readings.flatMap((reading) => reading.definitions),
    ...vocabulary.meanings,
    ...vocabulary.examples.flatMap((example) => [
      example.simplified,
      example.pinyin,
      example.meaning,
    ]),
    ...vocabulary.notes,
  ];

  return searchableValues.some((value) =>
    normalizeVocabularySearchValue(value).includes(normalizedSearch),
  );
}

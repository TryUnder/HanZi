import type {
  VocabularyEntry,
  VocabularyLearningData,
  VocabularyReading,
} from "../../types/vocabulary";

export interface VocabularyDisplayReading {
  readonly pinyin: string;
  readonly definitions: readonly string[];
  readonly traditionalForms: readonly string[];
}

export interface VocabularyDisplay {
  readonly id: string;
  readonly simplified: string;
  readonly traditionalVariants: readonly string[];
  readonly hskLevels: readonly number[];
  readonly readings: readonly VocabularyDisplayReading[];
  readonly meanings: readonly string[];
  readonly examples: VocabularyLearningData["examples"];
  readonly notes: readonly string[];
  readonly isVerified: boolean;
  readonly audioUrl: string | null;
}

const TONE_MARKS: Readonly<Record<string, readonly string[]>> = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

function normalizePinyinVowels(value: string): string {
  return value.replace(/u:/gi, "ü").replace(/v/gi, "ü");
}

function getToneMarkPosition(syllable: string): number {
  // a and e always have priority.
  for (const vowel of ["a", "e"]) {
    const index = syllable.indexOf(vowel);

    if (index !== -1) {
      return index;
    }
  }

  // In "ou", the tone mark belongs on o.
  const ouIndex = syllable.indexOf("ou");

  if (ouIndex !== -1) {
    return ouIndex;
  }

  // In "iu", the tone mark belongs on u.
  const iuIndex = syllable.indexOf("iu");

  if (iuIndex !== -1) {
    return iuIndex + 1;
  }

  // In "ui", the tone mark belongs on i.
  const uiIndex = syllable.indexOf("ui");

  if (uiIndex !== -1) {
    return uiIndex + 1;
  }

  // For remaining combinations, use the last vowel.
  return Math.max(
    syllable.lastIndexOf("i"),
    syllable.lastIndexOf("o"),
    syllable.lastIndexOf("u"),
    syllable.lastIndexOf("ü"),
  );
}

function formatPinyinSyllable(syllable: string): string {
  const match = syllable.match(/^([a-züv:]+)([1-5])$/i);

  if (!match) {
    return syllable;
  }

  const initial = match[1];
  const toneValue = match[2];

  if (!initial || !toneValue) {
    return syllable;
  }

  const normalized = normalizePinyinVowels(initial);
  const tone = Number(toneValue);

  if (tone === 5) {
    return normalized;
  }

  const targetIndex = getToneMarkPosition(normalized);

  if (targetIndex < 0) {
    return normalized;
  }

  const vowel = normalized[targetIndex]?.toLowerCase();

  if (!vowel) {
    return normalized;
  }

  const markedVowel = TONE_MARKS[vowel]?.[tone - 1];

  if (!markedVowel) {
    return normalized;
  }

  return (
    normalized.slice(0, targetIndex) +
    markedVowel +
    normalized.slice(targetIndex + 1)
  );
}

/**
 * Converts numbered Hanyu Pinyin into tone-marked Pinyin.
 *
 * Examples:
 * "ni3 hao3" -> "nǐ hǎo"
 * "liu4" -> "liù"
 * "gui3" -> "guǐ"
 */
export function formatPinyin(pinyin: string): string {
  return pinyin.trim().split(/\s+/).map(formatPinyinSyllable).join(" ");
}

function getReadingDisplay(
  reading: VocabularyReading,
): VocabularyDisplayReading {
  return {
    pinyin: formatPinyin(reading.pinyin),
    definitions: [
      ...new Set(reading.entries.flatMap((entry) => entry.definitions)),
    ],
    traditionalForms: [
      ...new Set(reading.entries.map((entry) => entry.traditional)),
    ],
  };
}

/**
 * Creates a UI-friendly representation without modifying source data.
 */
export function createVocabularyDisplay(
  entry: VocabularyEntry,
  learningData?: VocabularyLearningData,
): VocabularyDisplay {
  const readings = entry.readings.map(getReadingDisplay);

  const sourceMeanings = readings.flatMap((reading) => reading.definitions);

  const meanings = learningData?.meanings.length
    ? learningData.meanings
    : sourceMeanings;

  return {
    id: entry.id,
    simplified: entry.simplified,
    traditionalVariants: entry.traditionalVariants,
    hskLevels: entry.hskLevels,
    readings,
    meanings: [...new Set(meanings)],
    examples: learningData?.examples ?? [],
    notes: learningData?.notes ?? [],
    isVerified: learningData?.status === "verified",
    audioUrl: entry.audioUrl,
  };
}

import type { MandarinTone } from "../models/pronunciationSyllable";
import type { PronunciationSyllable } from "../models/pronunciationSyllable";

export type PinyinParseErrorCode =
  "EMPTY_INPUT" | "INVALID_TOKEN" | "INVALID_ERHUA_POSITION";

export interface PinyinParseError {
  readonly code: PinyinParseErrorCode;
  readonly token?: string;
  readonly message: string;
}

export type PinyinParseResult =
  | {
      readonly success: true;
      readonly syllables: readonly PronunciationSyllable[];
    }
  | {
      readonly success: false;
      readonly error: PinyinParseError;
    };

const PINYIN_TOKEN_PATTERN = /^([a-züv:]+)([1-5])$/i;

function normalizePinyin(value: string): string {
  return value.toLowerCase().replace(/u:/g, "ü").replace(/v/g, "ü");
}

function createError(
  code: PinyinParseErrorCode,
  message: string,
  token?: string,
): PinyinParseResult {
  return {
    success: false,
    error: {
      code,
      message,
      ...(token ? { token } : {}),
    },
  };
}

/**
 * Parses numbered Hanyu Pinyin into structured syllables.
 *
 * Examples:
 * "ni3 hao3" -> two syllables
 * "ming2 zi5" -> second syllable has neutral tone
 * "na3 r5" -> one syllable with erhua
 *
 * This parser preserves lexical tones.
 * It does not apply contextual tone sandhi.
 */
export function parsePinyin(pinyin: string): PinyinParseResult {
  const tokens = pinyin.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return createError("EMPTY_INPUT", "Pinyin input cannot be empty.");
  }

  const syllables: PronunciationSyllable[] = [];

  for (const token of tokens) {
    const normalizedToken = normalizePinyin(token);

    if (normalizedToken === "r5") {
      const previousSyllable = syllables.at(-1);

      if (!previousSyllable || previousSyllable.erhua) {
        return createError(
          "INVALID_ERHUA_POSITION",
          "Erhua marker must follow a syllable that does not already have erhua.",
          token,
        );
      }

      syllables[syllables.length - 1] = {
        ...previousSyllable,
        erhua: true,
      };

      continue;
    }

    const match = normalizedToken.match(PINYIN_TOKEN_PATTERN);

    if (!match) {
      return createError(
        "INVALID_TOKEN",
        `Invalid numbered Pinyin token: ${token}`,
        token,
      );
    }

    const [, rawSyllable, rawTone] = match;

    if (!rawSyllable || !rawTone) {
      return createError(
        "INVALID_TOKEN",
        `Invalid numbered Pinyin token: ${token}`,
        token,
      );
    }

    const tone = Number(rawTone) as MandarinTone;

    syllables.push({
      pinyin: normalizePinyin(rawSyllable),
      lexicalTone: tone,
      isNeutralTone: tone === 5,
      erhua: false,
    });
  }

  if (syllables.length === 0) {
    return createError(
      "EMPTY_INPUT",
      "Pinyin input did not contain any pronunciation syllables.",
    );
  }

  return {
    success: true,
    syllables,
  };
}

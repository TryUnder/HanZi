/**
 * Parser for CC-CEDICT dictionary entries.
 *
 * Format:
 * Traditional Simplified [pinyin] /definition 1/definition 2/
 */

/**
 * @typedef {Object} CedictEntry
 * @property {string} traditional
 * @property {string} simplified
 * @property {string} pinyin
 * @property {string[]} definitions
 */

/**
 * Parses one CC-CEDICT line.
 *
 * @param {string} line
 * @returns {CedictEntry | null}
 */
export function parseCedictLine(line) {
  const normalizedLine = line.trim();

  if (!normalizedLine || normalizedLine.startsWith("#")) {
    return null;
  }

  const match = normalizedLine.match(
    /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.*)\/$/,
  );

  if (!match) {
    throw new Error(`Invalid CC-CEDICT entry: ${normalizedLine}`);
  }

  const [, traditional, simplified, pinyin, rawDefinitions] = match;

  const definitions = rawDefinitions
    .split("/")
    .map((definition) => definition.trim())
    .filter(Boolean);

  if (definitions.length === 0) {
    throw new Error(`Entry has no definitions: ${normalizedLine}`);
  }

  return {
    traditional,
    simplified,
    pinyin,
    definitions,
  };
}

/**
 * Parses the complete CC-CEDICT file.
 *
 * @param {string} content
 * @returns {CedictEntry[]}
 */
export function parseCedictFile(content) {
  const entries = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    try {
      const entry = parseCedictLine(line);

      if (entry) {
        entries.push(entry);
      }
    } catch (error) {
      throw new Error(
        `CC-CEDICT parsing failed at line ${index + 1}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return entries;
}

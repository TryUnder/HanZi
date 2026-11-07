import type { ToneDefinition } from "../types/speaking";

export const toneDefinitions: ToneDefinition[] = [
  {
    tone: 1,
    name: "First tone",
    description: "High and steady. Keep your voice at a consistent high pitch.",
    contour: [4, 4, 4, 4, 4],
  },
  {
    tone: 2,
    name: "Second tone",
    description: "Rising. Start in the middle and raise your voice.",
    contour: [2, 3, 4, 5],
  },
  {
    tone: 3,
    name: "Third tone",
    description: "Low dipping tone. Lower your voice, then rise slightly.",
    contour: [2, 1, 1, 2, 3],
  },
  {
    tone: 4,
    name: "Fourth tone",
    description: "Falling. Start high and drop your voice sharply.",
    contour: [5, 4, 3, 2, 1],
  },
  {
    tone: 5,
    name: "Neutral tone",
    description:
      "Short and light. Pronounce it naturally without emphasizing it.",
    contour: [3, 3],
  },
];

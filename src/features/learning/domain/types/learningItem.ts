export type LearningItemReference =
  | {
      readonly kind: "character";
      readonly id: string;
    }
  | {
      readonly kind: "vocabulary";
      readonly id: string;
    };


export interface FramePhoneAlignment {
  readonly frameIndex: number;
  readonly timeSeconds: number;
  readonly targetPhoneIndex: number | null;
  readonly confidence: number;
  readonly isSilence: boolean;
}

export interface ForcedAlignmentResult {
  readonly durationSeconds: number;
  readonly frameDurationSeconds: number;
  readonly frames: readonly FramePhoneAlignment[];
  readonly speechFrameCount: number;
  readonly alignedFrameCount: number;
}

export type ForcedAlignmentErrorCode =
  | "EMPTY_AUDIO"
  | "INVALID_AUDIO"
  | "MODEL_UNAVAILABLE"
  | "MODEL_INFERENCE_FAILED"
  | "INVALID_MODEL_OUTPUT"
  | "MISSING_SILENCE_TOKEN"
  | "EMPTY_TARGET"
  | "TOO_FEW_FRAMES"
  | "INVALID_ALIGNMENT";

export type ForcedAlignmentResponse =
  | {
      readonly success: true;
      readonly alignment: ForcedAlignmentResult;
    }
  | {
      readonly success: false;
      readonly error: {
        readonly code: ForcedAlignmentErrorCode;
        readonly message: string;
      };
    };

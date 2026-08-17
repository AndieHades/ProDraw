export type PsdDecodeErrorCode =
  "invalid-signature" | "unsupported-version" | "invalid-header" |
  "unsupported-depth" | "file-too-large" | "canvas-too-large" |
  "too-many-nodes" | "decode-failed";

export class PsdDecodeError extends Error {
  readonly code: PsdDecodeErrorCode;

  constructor(code: PsdDecodeErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "PsdDecodeError";
    this.code = code;
  }
}

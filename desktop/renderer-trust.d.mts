export interface RendererTrustOptions {
  readonly packagedEntry: string;
  readonly developmentUrl: string | null;
}

export function isTrustedRendererUrl(
  candidate: string | URL,
  options: RendererTrustOptions
): boolean;

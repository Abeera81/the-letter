/**
 * Shared classification for whatever the Gemini SDK throws.
 *
 * Both call #1 (extraction) and call #2 (rendering) hit this. The SDK's
 * specific error classes (AuthenticationError, RateLimitError, ...) are not
 * exported from the package, so `instanceof` is not available. Every one of
 * them does set a numeric `.status` on the thrown object though — confirmed
 * by reading the installed package's compiled source, not documentation.
 * Duck-typing on that is stable even if the exact class names the SDK uses
 * change.
 *
 * Exported as a pure function so it is unit tested directly, without mocking
 * the network or the SDK.
 */
export type SdkErrorClass = "auth_failed" | "quota_exceeded" | "provider_unavailable";

export function classifySdkError(error: unknown): SdkErrorClass {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status !== "number") return "provider_unavailable";
  if (status === 401 || status === 403) return "auth_failed";
  if (status === 429) return "quota_exceeded";
  return "provider_unavailable";
}

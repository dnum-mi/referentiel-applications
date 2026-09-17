export const API_TIMEOUT_MS = 10_000;

/** Le délai couvre aussi la lecture du corps ; une annulation appelante reste prioritaire. */
export function fetchWithTimeout(request: Request, timeoutMs = API_TIMEOUT_MS): Promise<Response> {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]);
  return globalThis.fetch(request, { signal });
}

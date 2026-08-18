export function getRequestSize(body: unknown): number {
  if (!body) return 0;
  try {
    return Buffer.byteLength(JSON.stringify(body));
  } catch {
    return 0;
  }
}

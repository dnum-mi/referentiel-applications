export function getRequestSize(body: any): number {
  if (!body) return 0;
  try {
    return Buffer.byteLength(JSON.stringify(body));
  } catch {
    return 0;
  }
}

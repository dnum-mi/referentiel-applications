export function sanitizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const sanitized = { ...headers };
  if (sanitized.authorization) sanitized.authorization = 'Bearer ***';
  return sanitized;
}

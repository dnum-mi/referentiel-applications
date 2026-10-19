import { API_KEY_HEADER } from "./constants.util";

export function sanitizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const sanitized = { ...headers };
  for (const header of Object.keys(sanitized)) {
    const name = header.toLowerCase();
    if (name === "authorization") sanitized[header] = "Bearer ***";
    else if (name === API_KEY_HEADER) sanitized[header] = "***";
  }
  return sanitized;
}

export function generateId(prefix?: string, suffix?: string) {
  const id = Math.random().toString(36).slice(2, 9);
  return `${prefix ? `${prefix}-` : ""}${id}${suffix ? `-${suffix}` : ""}`;
}

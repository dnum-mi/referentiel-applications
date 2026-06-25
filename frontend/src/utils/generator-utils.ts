export function generateId(prefix?: string, suffix?: string) {
  const id = Math.random().toString(36).slice(2, 9);
  const prefixPart = prefix ? `${prefix}-` : "";
  const suffixPart = suffix ? `-${suffix}` : "";
  return `${prefixPart}${id}${suffixPart}`;
}

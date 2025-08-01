export function translateEnum<T extends Record<string, string>>(
  enumMap: T,
  value?: string,
): string {
  if (!value) return "";
  return enumMap[value] ?? value;
}

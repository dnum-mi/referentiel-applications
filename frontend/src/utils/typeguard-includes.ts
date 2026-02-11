export function typeguardIncludes<T>(value: unknown, allowedValues: readonly T[]): value is T {
  return allowedValues.includes(value as T);
}

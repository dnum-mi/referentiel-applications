function normalize(value: any) {
  if (value === null) return "";
  if (value === undefined) return "";
  return value;
}

export function areFieldsModified<T>(initial: Partial<T>, current: Partial<T>, fields: (keyof T)[]): boolean {
  return fields.some((key) => {
    const a = normalize(initial[key]);
    const b = normalize(current[key]);

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return true;
      return a.some((val, i) => val !== b[i]);
    }
    return JSON.stringify(a) !== JSON.stringify(b);
  });
}

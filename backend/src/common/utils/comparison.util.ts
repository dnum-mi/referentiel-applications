export function areEqual(a: any, b: any): boolean {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (typeof a === 'string' && typeof b === 'string') {
    const isDate =
      /^\d{4}-\d{2}-\d{2}T/.test(a) && /^\d{4}-\d{2}-\d{2}T/.test(b);
    if (isDate) {
      return new Date(a).getTime() === new Date(b).getTime();
    }
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => areEqual(v, b[i]));
  }

  return a === b;
}

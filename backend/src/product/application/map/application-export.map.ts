export function getFullField(obj: any, path: string): string {
  const segments = path.split('.');

  function getValue(value: any, keys: string[]): any {
    if (!value || keys.length === 0) return value;

    const [key, ...rest] = keys;

    if (Array.isArray(value)) {
      const results = value
        .map((item) => getValue(item, [key, ...rest]))
        .flat();
      return results;
    }

    return getValue(value[key], rest);
  }

  const rawValue = getValue(obj, segments);

  if (Array.isArray(rawValue)) {
    return rawValue
      .filter((v) => v !== undefined && v !== null)
      .map((v) => formatValue(v))
      .join(', ');
  }

  return formatValue(rawValue);
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

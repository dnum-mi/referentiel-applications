export const excludes = function <T>(_this: T, exclude: string[]): T {
  const newObj: Partial<T> = {};
  for (const key in _this) {
    if ((_this as object).hasOwnProperty(key) && !exclude.includes(key)) {
      newObj[key] = _this[key];
    }
  }
  return newObj as T;
};

export const rename = <T>(
  _this: T,
  transformations: Record<string, string>,
): T => {
  const newObj: any = {};

  for (const key in _this) {
    const newKey =
      transformations[key] !== undefined ? transformations[key] : key;
    if ((_this as object).hasOwnProperty(key)) {
      newObj[newKey] = _this[key];
    }
  }

  return newObj as T;
};

export const excludesAndRename = <T>(
  _this: T,
  exclude: string[],
  transformations: Record<string, string>,
): T => {
  const newObj: any = {};

  for (const key in _this) {
    const newKey =
      transformations[key] !== undefined ? transformations[key] : key;
    if ((_this as object).hasOwnProperty(key) && !exclude.includes(key)) {
      newObj[newKey] = _this[key];
    }
  }

  return newObj as T;
};

export const includes = function <T>(_this: T, ...props: string[]): T {
  const newObj: Partial<T> = {};
  for (const key in _this) {
    if ((_this as object).hasOwnProperty(key) && props.includes(key)) {
      newObj[key] = _this[key];
    }
  }
  return newObj as T;
};

export const includesAndRename = <T>(
  _this: T,
  exclude: string[],
  transformations: Record<string, string>,
): T => {
  const newObj: any = {};

  for (const key in _this) {
    const newKey =
      transformations[key] !== undefined ? transformations[key] : key;
    if ((_this as object).hasOwnProperty(key) && exclude.includes(key)) {
      newObj[newKey] = _this[key];
    }
  }

  return newObj as T;
};

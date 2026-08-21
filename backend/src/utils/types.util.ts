export type AsyncReturnType<T extends (...args: never[]) => unknown> =
  T extends (...args: never[]) => Promise<infer R>
    ? R
    : T extends (...args: never[]) => infer R
      ? R
      : never;

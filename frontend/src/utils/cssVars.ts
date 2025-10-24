export function cssVar(name: string, el: Element = document.documentElement) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

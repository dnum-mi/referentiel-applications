export function addItem<T>(array: T[], item: T): void {
  array.push(item);
}

export function removeItem<T>(array: T[], index: number): void {
  if (index >= 0 && index < array.length) {
    array.splice(index, 1);
  }
}

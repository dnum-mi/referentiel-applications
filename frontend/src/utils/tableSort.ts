export function customSorter(a: Array = [], b: Array = [], currentSortedColumn: string, dictonary: object = {}): number {
  const column = Object.keys(dictonary).filter((key) => dictonary[key] === currentSortedColumn)[0];

  const valueA = a[column];
  const valueB = b[column];

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(valueA) && /^\d{2}\/\d{2}\/\d{4}$/.test(valueB)) {
    const dateA = parseDate(valueA).getTime();
    const dateB = parseDate(valueB).getTime();

    if (dateA < dateB) {
      return -1;
    }
    if (dateA > dateB) {
      return 1;
    }
  } else {
    if (valueA < valueB) {
      return -1;
    }
    if (valueA > valueB) {
      return 1;
    }
  }

  return 0;
}

function parseDate(dateString: string): Date {
  const [day, month, year] = dateString.split("/");

  return new Date(Number(year), Number(month) - 1, Number(day));
}

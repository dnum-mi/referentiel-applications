import { format, parseISO, isFuture } from "date-fns";

export const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export function formatDateFR(isoDate: string | Date): string {
  const d = typeof isoDate === "string" ? parseISO(isoDate) : isoDate;
  return format(d, "dd/MM/yyyy");
}

export function todayMax(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function isDateFuture(isoDate: string): boolean {
  return isFuture(parseISO(isoDate));
}

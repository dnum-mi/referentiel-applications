import { format, parseISO } from "date-fns";

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateFR(isoDate: string | Date): string {
  const d = typeof isoDate === "string" ? parseISO(isoDate) : isoDate;
  return format(d, "dd/MM/yyyy");
}

/**
 * Converts an ISO date string or Date to HTML date input format (YYYY-MM-DD)
 */
export function toDateInputValue(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy-MM-dd");
}

/**
 * Format a date string for display in German locale
 */

export type DateFormatType = "date" | "datetime" | "short";

const formatOptions: Record<DateFormatType, Intl.DateTimeFormatOptions> = {
  date: {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  },
  datetime: {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  short: {
    day: "2-digit",
    month: "short",
    year: "numeric",
  },
};

/**
 * Format a date for display
 * @param date - Date string, Date object, or timestamp
 * @param type - Format type: "date" (DD.MM.YYYY), "datetime" (DD.MM.YYYY HH:mm), "short" (DD. Mon YYYY)
 */
export function formatDate(
  date: string | Date | number,
  type: DateFormatType = "datetime"
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString("de-DE", formatOptions[type]);
}

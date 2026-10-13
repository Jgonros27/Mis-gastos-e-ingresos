import { type Filter, type Transaction, today, validDate } from "./model";
export const dateNumber = (date: string) => Date.parse(date + "T12:00:00Z");
export const civil = (date: Date) => date.toISOString().slice(0, 10);
export function monthEnd(month: string) {
  const [y, m] = month.split("-").map(Number);
  return civil(new Date(Date.UTC(y, m, 0, 12)));
}
export function effectiveDays(all: Transaction[], filter: Filter): string[] {
  const dates = all.map((t) => t.date).sort();
  const start =
    filter.from ||
    (filter.months.length
      ? [...filter.months].sort()[0] + "-01"
      : dates[0] || today());
  const end =
    filter.to ||
    (filter.months.length
      ? monthEnd([...filter.months].sort().at(-1)!)
      : dates.at(-1) || today());
  if (!validDate(start) || !validDate(end) || start > end) return [];
  const result: string[] = [];
  const cursor = new Date(start + "T12:00:00Z");
  for (
    let count = 0;
    civil(cursor) <= end && count < 36600;
    count++, cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const day = civil(cursor);
    if (!filter.months.length || filter.months.includes(day.slice(0, 7)))
      result.push(day);
  }
  return result;
}
export function previousDays(days: string[], year = false) {
  if (!days.length) return [];
  const span =
    Math.round((dateNumber(days.at(-1)!) - dateNumber(days[0])) / 86400000) + 1;
  return [
    ...new Set(
      days.map((day) => {
        const d = new Date(day + "T12:00:00Z");
        if (year) {
          const month = d.getUTCMonth();
          d.setUTCFullYear(d.getUTCFullYear() - 1);
          if (d.getUTCMonth() !== month) d.setUTCDate(0);
        } else d.setUTCDate(d.getUTCDate() - span);
        return civil(d);
      }),
    ),
  ];
}
export function comparePercent(current: number, previous: number) {
  return previous === 0 ? null : ((current - previous) / previous) * 100;
}

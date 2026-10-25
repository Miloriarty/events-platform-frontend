// Бэкенд принимает LocalDate (yyyy-MM-dd) без часового пояса
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromIsoDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isPast(endDate: string): boolean {
  return fromIsoDate(endDate) < fromIsoDate(toIsoDate(new Date()));
}

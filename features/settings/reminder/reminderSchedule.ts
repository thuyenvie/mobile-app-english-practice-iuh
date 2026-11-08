export function getQuietHoursError(start: string, end: string): string | null {
  if (!start && !end) return null;
  if (!start || !end || ![start, end].every(value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))) {
    return "Giờ yên lặng cần đúng HH:mm; nhập đủ cả hai giờ hoặc để trống cả hai để tắt.";
  }
  return null;
}

/** Half-open quiet interval, matching the backend scheduler (including midnight). */
export function isReminderInQuietHours(time: string | null, start: string | null, end: string | null): boolean {
  if (!time || !start || !end) return false;
  const reminder = time.slice(0, 5), from = start.slice(0, 5), to = end.slice(0, 5);
  if (![reminder, from, to].every(value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) || from === to) return false;
  return from < to ? reminder >= from && reminder < to : reminder >= from || reminder < to;
}

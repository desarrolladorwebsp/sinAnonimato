import { localDate } from "./types";

const santiagoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const recordingDay = new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" });

export function calendarDay(value: Date | string) {
  const parts = santiagoDay.formatToParts(new Date(value));
  const year = parts.find(part => part.type === "year")?.value.padStart(4, "0");
  const month = parts.find(part => part.type === "month")?.value;
  const day = parts.find(part => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

// UTC here is only used for arithmetic on date labels, independent of DST.
export function calendarDate(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

export function shiftCalendarDay(day: string, days: number) {
  const date = calendarDate(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function endOfRecordingDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = calendarDate(day);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) return null;

  // Find the start of the following Chilean day, including clock changes at midnight.
  let earlier = date.getTime();
  let later = earlier + 48 * 60 * 60 * 1000;
  while (later - earlier > 1) {
    const middle = Math.floor((earlier + later) / 2);
    if (calendarDay(new Date(middle)) <= day) earlier = middle;
    else later = middle;
  }
  return new Date(earlier);
}

export function formatRecording(value: Date | string) {
  const date = new Date(value);
  // Date-only invitations store the day's final instant as their deadline.
  if (date.getUTCMilliseconds() === 999 && endOfRecordingDay(calendarDay(date))?.getTime() === date.getTime()) {
    return recordingDay.format(date);
  }
  return localDate(date);
}

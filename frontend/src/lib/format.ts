import { addLocalDays, type DateInput, isSameLocalDay, toDate } from "./follow-up";

// Built by hand rather than with Intl: ICU output varies across Node and browser versions
// (e.g. a narrow no-break space before "AM"), which makes the UI and tests drift.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}

function formatDay(date: Date, now: Date): string {
  const day = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === now.getFullYear() ? day : `${day}, ${date.getFullYear()}`;
}

/** "just now", "5m ago", "3h ago", "2d ago", "3w ago", then a date. */
export function timeAgo(at: DateInput, now: Date): string {
  const date = toDate(at);
  if (!date) return "";

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 28) return `${Math.floor(days / 7)}w ago`;
  return formatDay(date, now);
}

/** "today at 2:00 PM", "tomorrow at 10:00 AM", "Mon, Oct 19 at 10:00 AM". */
export function formatFollowUp(at: DateInput, now: Date): string {
  const date = toDate(at);
  if (!date) return "";

  const time = formatTime(date);
  if (isSameLocalDay(date, now)) return `today at ${time}`;
  if (isSameLocalDay(date, addLocalDays(now, 1))) return `tomorrow at ${time}`;
  if (isSameLocalDay(date, addLocalDays(now, -1))) return `yesterday at ${time}`;
  return `${WEEKDAYS[date.getDay()]}, ${formatDay(date, now)} at ${time}`;
}

/** Timeline stamp: "May 4, 10:30 AM". */
export function formatTimestamp(at: DateInput, now: Date): string {
  const date = toDate(at);
  return date ? `${formatDay(date, now)}, ${formatTime(date)}` : "";
}

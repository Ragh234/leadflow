/**
 * Follow-up rules. The API stores every time in UTC; what counts as "today" is decided
 * here, in the browser, because only the browser knows the rep's local date.
 *
 * Every function takes `now` so the rules are pure and testable at any clock time.
 */

export type DateInput = string | Date | null | undefined;
export type FollowUpFilter = "all" | "today" | "overdue" | "upcoming" | "none";

export interface FollowUpPreset {
  label: string;
  at: Date;
}

export function toDate(value: DateInput): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function addLocalDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function atLocalTime(day: Date, hours: number, minutes = 0): Date {
  const result = new Date(day);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/** Due on today's local calendar date. Goes in the pinned section, overdue or not. */
export function isFollowUpToday(at: DateInput, now: Date): boolean {
  const date = toDate(at);
  return date !== null && isSameLocalDay(date, now);
}

/** Earlier than this moment, from any day. Shown in red wherever it appears. */
export function isFollowUpOverdue(at: DateInput, now: Date): boolean {
  const date = toDate(at);
  return date !== null && date.getTime() < now.getTime();
}

export function matchesFollowUpFilter(at: DateInput, filter: FollowUpFilter, now: Date): boolean {
  switch (filter) {
    case "all":
      return true;
    case "today":
      return isFollowUpToday(at, now);
    case "overdue":
      return isFollowUpOverdue(at, now);
    case "upcoming": {
      const date = toDate(at);
      return date !== null && date >= atLocalTime(addLocalDays(now, 1), 0);
    }
    case "none":
      return toDate(at) === null;
  }
}

/**
 * Splits leads into today's follow-ups (pinned, earliest first) and everything else
 * (original order). A pinned lead is moved, not duplicated.
 */
export function splitPinned<T extends { next_follow_up_at: string | null }>(
  leads: readonly T[],
  now: Date,
): { pinned: T[]; rest: T[] } {
  const pinned: T[] = [];
  const rest: T[] = [];
  for (const lead of leads) {
    (isFollowUpToday(lead.next_follow_up_at, now) ? pinned : rest).push(lead);
  }
  pinned.sort((a, b) => toDate(a.next_follow_up_at)!.getTime() - toDate(b.next_follow_up_at)!.getTime());
  return { pinned, rest };
}

/** Combines <input type="date"> and <input type="time"> values, read as local time. */
export function combineLocalDateAndTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  // An ISO date-time without an offset is parsed as local time by the JS spec.
  return toDate(`${date}T${time}`);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInputValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** One-click follow-up times; reps rarely need anything more precise than these. */
export function followUpPresets(now: Date): FollowUpPreset[] {
  const daysToNextMonday = (8 - now.getDay()) % 7 || 7;
  return [
    { label: "Tomorrow 10 AM", at: atLocalTime(addLocalDays(now, 1), 10) },
    { label: "In 3 days", at: atLocalTime(addLocalDays(now, 3), 10) },
    { label: "Next Monday", at: atLocalTime(addLocalDays(now, daysToNextMonday), 10) },
  ];
}

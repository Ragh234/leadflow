import { describe, expect, it } from "vitest";

import {
  combineLocalDateAndTime,
  followUpPresets,
  isFollowUpOverdue,
  isFollowUpToday,
  matchesFollowUpFilter,
  splitPinned,
} from "./follow-up";

// Wednesday 14 Oct 2026, 3:00 PM in India (09:30 UTC).
const now = new Date("2026-10-14T09:30:00Z");

it("runs in India time (UTC+5:30)", () => {
  expect(now.getTimezoneOffset()).toBe(-330);
});

describe("isFollowUpToday", () => {
  it("is true for a follow-up later today", () => {
    expect(isFollowUpToday("2026-10-14T12:30:00Z", now)).toBe(true); // 6:00 PM IST
  });

  it("is true for a follow-up earlier today, even though it is already overdue", () => {
    expect(isFollowUpToday("2026-10-14T03:30:00Z", now)).toBe(true); // 9:00 AM IST
  });

  it("uses the local date: 20:00 UTC on the 13th is 1:30 AM on the 14th in India", () => {
    expect(isFollowUpToday("2026-10-13T20:00:00Z", now)).toBe(true);
  });

  it("uses the local date: 18:45 UTC on the 14th is already the 15th in India", () => {
    expect(isFollowUpToday("2026-10-14T18:45:00Z", now)).toBe(false);
  });

  it("is false for yesterday and tomorrow", () => {
    expect(isFollowUpToday("2026-10-13T09:30:00Z", now)).toBe(false);
    expect(isFollowUpToday("2026-10-15T09:30:00Z", now)).toBe(false);
  });

  it("is false when there is no follow-up or it is not a date", () => {
    expect(isFollowUpToday(null, now)).toBe(false);
    expect(isFollowUpToday(undefined, now)).toBe(false);
    expect(isFollowUpToday("not a date", now)).toBe(false);
  });

  it("accepts Date objects", () => {
    expect(isFollowUpToday(new Date("2026-10-14T12:30:00Z"), now)).toBe(true);
  });
});

describe("isFollowUpOverdue", () => {
  it("is true for a time earlier today", () => {
    expect(isFollowUpOverdue("2026-10-14T03:30:00Z", now)).toBe(true);
  });

  it("is true for follow-ups from past days", () => {
    expect(isFollowUpOverdue("2026-10-11T04:30:00Z", now)).toBe(true);
  });

  it("is false for a time later today", () => {
    expect(isFollowUpOverdue("2026-10-14T12:30:00Z", now)).toBe(false);
  });

  it("is false at exactly now", () => {
    expect(isFollowUpOverdue(now.toISOString(), now)).toBe(false);
  });

  it("is false when there is no follow-up", () => {
    expect(isFollowUpOverdue(null, now)).toBe(false);
  });
});

describe("matchesFollowUpFilter", () => {
  const earlierToday = "2026-10-14T03:30:00Z";
  const laterToday = "2026-10-14T12:30:00Z";
  const lastWeek = "2026-10-07T04:30:00Z";
  const tomorrow = "2026-10-15T04:30:00Z";
  const all = [earlierToday, laterToday, lastWeek, tomorrow, null];
  const pick = (filter: Parameters<typeof matchesFollowUpFilter>[1]) =>
    all.filter((at) => matchesFollowUpFilter(at, filter, now));

  it("'all' keeps everything, including leads without a follow-up", () => {
    expect(pick("all")).toEqual(all);
  });

  it("'today' keeps today's follow-ups, overdue or not", () => {
    expect(pick("today")).toEqual([earlierToday, laterToday]);
  });

  it("'overdue' keeps anything before now, from any day", () => {
    expect(pick("overdue")).toEqual([earlierToday, lastWeek]);
  });

  it("'upcoming' keeps follow-ups from tomorrow onwards", () => {
    expect(pick("upcoming")).toEqual([tomorrow]);
  });

  it("'none' keeps only leads without a follow-up", () => {
    expect(pick("none")).toEqual([null]);
  });
});

describe("combineLocalDateAndTime", () => {
  it("reads the inputs as local time", () => {
    expect(combineLocalDateAndTime("2026-10-15", "10:00")?.toISOString()).toBe("2026-10-15T04:30:00.000Z");
  });

  it("returns null when either part is missing or invalid", () => {
    expect(combineLocalDateAndTime("2026-10-15", "")).toBeNull();
    expect(combineLocalDateAndTime("", "10:00")).toBeNull();
    expect(combineLocalDateAndTime("someday", "10:00")).toBeNull();
  });
});

describe("followUpPresets", () => {
  it("offers tomorrow, in 3 days and next Monday, all at 10 AM local time", () => {
    const presets = followUpPresets(now).map((p) => [p.label, p.at.toISOString()]);

    expect(presets).toEqual([
      ["Tomorrow 10 AM", "2026-10-15T04:30:00.000Z"],
      ["In 3 days", "2026-10-17T04:30:00.000Z"],
      ["Next Monday", "2026-10-19T04:30:00.000Z"],
    ]);
  });

  it("on a Monday, 'Next Monday' is a week away", () => {
    const monday = new Date("2026-10-19T06:00:00Z");

    const nextMonday = followUpPresets(monday).find((p) => p.label === "Next Monday");

    expect(nextMonday?.at.toISOString()).toBe("2026-10-26T04:30:00.000Z");
  });
});

describe("splitPinned", () => {
  const lead = (id: number, next_follow_up_at: string | null) => ({ id, next_follow_up_at });

  it("moves today's follow-ups to the pinned list, earliest first, without duplicating them", () => {
    const leads = [
      lead(1, null),
      lead(2, "2026-10-14T12:30:00Z"), // today 6 PM
      lead(3, "2026-10-15T04:30:00Z"), // tomorrow
      lead(4, "2026-10-14T03:30:00Z"), // today 9 AM, overdue but still today
    ];

    const { pinned, rest } = splitPinned(leads, now);

    expect(pinned.map((l) => l.id)).toEqual([4, 2]);
    expect(rest.map((l) => l.id)).toEqual([1, 3]);
  });

  it("does not pin overdue follow-ups from earlier days", () => {
    const { pinned } = splitPinned([lead(1, "2026-10-13T12:30:00Z")], now);

    expect(pinned).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import { formatFollowUp, formatTimestamp, timeAgo } from "./format";

// Wednesday 14 Oct 2026, 3:00 PM in India (09:30 UTC).
const now = new Date("2026-10-14T09:30:00Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

describe("timeAgo", () => {
  it("says 'just now' for the last minute", () => {
    expect(timeAgo(minutesAgo(0.3), now)).toBe("just now");
  });

  it("counts minutes, hours, days and weeks", () => {
    expect(timeAgo(minutesAgo(5), now)).toBe("5m ago");
    expect(timeAgo(minutesAgo(3 * 60), now)).toBe("3h ago");
    expect(timeAgo(minutesAgo(2 * 24 * 60), now)).toBe("2d ago");
    expect(timeAgo(minutesAgo(21 * 24 * 60), now)).toBe("3w ago");
  });

  it("falls back to a date after four weeks", () => {
    expect(timeAgo("2026-08-15T06:30:00Z", now)).toBe("Aug 15");
    expect(timeAgo("2025-12-20T06:30:00Z", now)).toBe("Dec 20, 2025");
  });

  it("treats a slightly future time (clock skew) as 'just now'", () => {
    expect(timeAgo(minutesAgo(-2), now)).toBe("just now");
  });

  it("returns an empty string without a date", () => {
    expect(timeAgo(null, now)).toBe("");
  });
});

describe("formatFollowUp", () => {
  it("names today, tomorrow and yesterday", () => {
    expect(formatFollowUp("2026-10-14T12:30:00Z", now)).toBe("today at 6:00 PM");
    expect(formatFollowUp("2026-10-15T04:30:00Z", now)).toBe("tomorrow at 10:00 AM");
    expect(formatFollowUp("2026-10-13T03:30:00Z", now)).toBe("yesterday at 9:00 AM");
  });

  it("uses weekday and date further out", () => {
    expect(formatFollowUp("2026-10-19T04:30:00Z", now)).toBe("Mon, Oct 19 at 10:00 AM");
  });

  it("formats midnight and noon in 12-hour time", () => {
    expect(formatFollowUp("2026-10-14T18:45:00Z", now)).toBe("tomorrow at 12:15 AM");
    expect(formatFollowUp("2026-10-14T06:30:00Z", now)).toBe("today at 12:00 PM");
  });
});

describe("formatTimestamp", () => {
  it("shows month, day and time like the wireframe's timeline", () => {
    expect(formatTimestamp("2026-05-04T05:00:00Z", now)).toBe("May 4, 10:30 AM");
  });

  it("adds the year for other years", () => {
    expect(formatTimestamp("2025-12-20T06:30:00Z", now)).toBe("Dec 20, 2025, 12:00 PM");
  });
});

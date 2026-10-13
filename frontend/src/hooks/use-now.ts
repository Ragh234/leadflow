"use client";

import { useSyncExternalStore } from "react";

/**
 * A shared clock that ticks every minute, so "3h ago", the pinned section and overdue
 * highlighting stay correct on a page that is left open.
 *
 * Returns null while prerendering: "now" must come from the viewer's browser, never
 * from the moment the page was built on the server.
 */
const TICK_MS = 60_000;
const listeners = new Set<() => void>();
let current: Date | null = null;
let timer: ReturnType<typeof setInterval> | undefined;

function tick() {
  current = new Date();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    current = new Date();
    timer = setInterval(tick, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) clearInterval(timer);
  };
}

function getSnapshot(): Date {
  current ??= new Date();
  return current;
}

function getServerSnapshot(): Date | null {
  return null;
}

export function useNow(): Date | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

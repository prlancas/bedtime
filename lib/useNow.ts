import { useEffect, useState } from 'react';

/** Returns a Date that updates on an interval, for live countdowns/clocks. */
export function useNow(intervalMs = 15000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** A friendly "in 2h 15m" / "in 8m" / "now" string for a future minutes-of-day. */
export function countdownLabel(targetMinutes: number, now: Date): string {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let diff = targetMinutes - nowMin;
  if (diff <= 0 && diff > -60) return 'now';
  if (diff < 0) diff += 1440; // tomorrow
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `in ${m}m`;
  return `in ${h}h ${m}m`;
}

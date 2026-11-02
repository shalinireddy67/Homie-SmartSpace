/**
 * Formatting utilities for dates, numbers, and domain values.
 */

export const formatRelativeTime = (
  timestamp: number,
  now: number = Date.now()
): string => {
  const diffMs = Math.max(0, now - timestamp);
  if (diffMs < 5000) return 'just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
};

export const formatTimestamp = (timestamp: number): string => {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

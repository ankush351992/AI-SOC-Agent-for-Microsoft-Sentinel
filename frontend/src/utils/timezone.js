// Timezone definitions & formatting helpers for Sentinel AI SOC

export const SUPPORTED_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST, UTC+5:30)', short: 'IST' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC+00:00)', short: 'UTC' },
  { value: 'America/New_York', label: 'US Eastern Time (EST/EDT, UTC-5/UTC-4)', short: 'EST' },
  { value: 'America/Chicago', label: 'US Central Time (CST/CDT, UTC-6/UTC-5)', short: 'CST' },
  { value: 'America/Denver', label: 'US Mountain Time (MST/MDT, UTC-7/UTC-6)', short: 'MST' },
  { value: 'America/Los_Angeles', label: 'US Pacific Time (PST/PDT, UTC-8/UTC-7)', short: 'PST' },
  { value: 'Europe/London', label: 'London / GMT (UTC+00:00 / BST)', short: 'GMT' },
  { value: 'Europe/Paris', label: 'Central European Time (CET/CEST, UTC+1/UTC+2)', short: 'CET' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST, UTC+4:00)', short: 'GST' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT, UTC+8:00)', short: 'SGT' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST, UTC+9:00)', short: 'JST' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST/AEDT, UTC+10/UTC+11)', short: 'AEST' }
];

const STORAGE_KEY = 'sentinel_user_timezone';

export function getUserTimezone() {
  if (typeof window === 'undefined') return 'UTC';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return saved;

  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) return detected;
  } catch (e) {
    // fallback
  }
  return 'Asia/Kolkata';
}

export function setUserTimezone(tz) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, tz);
  window.dispatchEvent(new CustomEvent('sentinel:timezone-changed', { detail: { timezone: tz } }));
}

export function getTimezoneShortLabel(tz) {
  const match = SUPPORTED_TIMEZONES.find(t => t.value === tz);
  if (match) return match.short;
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date());
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : tz;
  } catch (e) {
    return tz;
  }
}

/**
 * Formats ISO date string into locale-aware formatted date & time in the active timezone
 * Example output: "Aug 27, 2026, 05:14 PM (IST)" or "2026-08-27 17:14:13 IST"
 */
export function formatDateTime(isoString, customTimezone = null, formatStyle = 'medium') {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return String(isoString);

    const tz = customTimezone || getUserTimezone();
    const shortLabel = getTimezoneShortLabel(tz);

    if (formatStyle === 'short') {
      const formatted = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
      return `${formatted} (${shortLabel})`;
    }

    if (formatStyle === 'full') {
      const formatted = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(date);
      return `${formatted} ${shortLabel}`;
    }

    // Default medium format
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
    return `${formatted} (${shortLabel})`;
  } catch (err) {
    return String(isoString);
  }
}

/**
 * Formats relative time ("just now", "15m ago", "2h ago", "3d ago")
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;

    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  } catch (err) {
    return '';
  }
}

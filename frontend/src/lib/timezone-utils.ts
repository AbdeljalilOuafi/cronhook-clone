/**
 * Timezone conversion utilities for handling webhook scheduling.
 * 
 * The backend stores all scheduled_at times in UTC. This module provides
 * functions to convert between the user's local time and UTC.
 */

/**
 * Converts a datetime-local input value (user's local time) to UTC ISO string.
 * 
 * @param localDateTime - String from datetime-local input (e.g., "2025-10-25T10:00")
 * @returns ISO 8601 UTC string with 'Z' suffix (e.g., "2025-10-25T09:00:00.000Z")
 * 
 * @example
 * // User in Morocco (UTC+1) inputs "2025-10-25T10:00"
 * const utc = convertLocalToUTC("2025-10-25T10:00");
 * // Returns: "2025-10-25T09:00:00.000Z"
 */
export function convertLocalToUTC(localDateTime: string): string {
  if (!localDateTime) return '';
  
  // Create Date object from local datetime string
  // The browser automatically interprets this as local time
  const localDate = new Date(localDateTime);
  
  // Convert to UTC ISO string with 'Z' suffix
  return localDate.toISOString();
}

/**
 * Converts a UTC ISO string from the backend to a datetime-local input value.
 * 
 * @param utcDateTime - ISO 8601 UTC string (e.g., "2025-10-25T09:00:00Z")
 * @returns String formatted for datetime-local input (e.g., "2025-10-25T10:00")
 * 
 * @example
 * // Backend returns "2025-10-25T09:00:00Z"
 * const local = convertUTCToLocal("2025-10-25T09:00:00Z");
 * // For user in Morocco (UTC+1): "2025-10-25T10:00"
 */
export function convertUTCToLocal(utcDateTime: string): string {
  if (!utcDateTime) return '';
  
  // Parse the UTC datetime
  const utcDate = new Date(utcDateTime);
  
  // Get local datetime components
  const year = utcDate.getFullYear();
  const month = String(utcDate.getMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getDate()).padStart(2, '0');
  const hours = String(utcDate.getHours()).padStart(2, '0');
  const minutes = String(utcDate.getMinutes()).padStart(2, '0');
  
  // Format as "YYYY-MM-DDTHH:mm" for datetime-local input
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Formats a UTC ISO string for display to the user in their local timezone.
 * 
 * @param utcDateTime - ISO 8601 UTC string (e.g., "2025-10-25T09:00:00Z")
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted string in user's locale and timezone
 * 
 * @example
 * const display = formatUTCForDisplay("2025-10-25T09:00:00Z");
 * // For user in Morocco: "10/25/2025, 10:00:00 AM"
 */
export function formatUTCForDisplay(
  utcDateTime: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!utcDateTime) return '';
  
  const utcDate = new Date(utcDateTime);
  
  // Default options for readable display
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  
  return utcDate.toLocaleString(undefined, options || defaultOptions);
}

/**
 * Gets the user's current timezone offset in a human-readable format.
 * 
 * @returns String like "UTC+1" or "UTC-5"
 */
export function getUserTimezone(): string {
  const offset = -new Date().getTimezoneOffset() / 60;
  const sign = offset >= 0 ? '+' : '';
  return `UTC${sign}${offset}`;
}

/**
 * Formats a UTC ISO string in DD/MM/YYYY HH:mm:ss format in user's local timezone.
 * 
 * @param utcDateTime - ISO 8601 UTC string (e.g., "2025-10-25T09:00:00Z")
 * @returns Formatted string like "25/10/2025 10:00:00"
 * 
 * @example
 * const display = formatScheduledTime("2025-10-25T09:00:00Z");
 * // For user in Morocco (UTC+1): "25/10/2025 10:00:00"
 */
export function formatScheduledTime(utcDateTime: string): string {
  if (!utcDateTime) return '';
  
  const utcDate = new Date(utcDateTime);
  
  const day = String(utcDate.getDate()).padStart(2, '0');
  const month = String(utcDate.getMonth() + 1).padStart(2, '0');
  const year = utcDate.getFullYear();
  const hours = String(utcDate.getHours()).padStart(2, '0');
  const minutes = String(utcDate.getMinutes()).padStart(2, '0');
  const seconds = String(utcDate.getSeconds()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

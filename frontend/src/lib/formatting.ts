/**
 * Formatting utilities for localized display of numbers and currencies.
 */

/**
 * Formats a lamport amount into SOL with fixed decimal places.
 */
export const formatLamportsToSol = (lamports: number): string => {
  return (lamports / 1_000_000_000).toFixed(4);
};

/**
 * Truncates a base58 string for display (e.g., Phantom-style address).
 */
export const truncateAddress = (address: string): string => {
  if (!address) return '';
  if (address.length <= 8) return address;
  return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
};

/**
 * Formats an ISO timestamp into a localized time string (HH:MM:SS).
 */
export const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch {
    return timestamp;
  }
};

/**
 * Formats a number into a localized string with thousands separators.
 */
export const formatNumber = (num: number): string => {
  if (num === undefined || num === null) return '';
  return num.toLocaleString();
};


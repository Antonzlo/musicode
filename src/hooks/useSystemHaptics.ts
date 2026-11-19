import { getSystemHapticsStatus, isSystemHapticsAvailable } from 'expo-system-haptics';
import { useEffect, useMemo, useState } from 'react';

const STATUS_POLL_MS = 1000;

/** The native status as a translation key for a user-facing line. */
export function systemHapticsStatusKey(status: string): string {
  if (status.startsWith('attached')) return 'systemHapticsActive';
  if (status === 'off') return 'systemHapticsOff';
  if (status === 'unsupported') return 'systemHapticsUnsupported';
  if (status === 'waiting') return 'systemHapticsWaiting';
  return 'systemHapticsProblem';
}

/**
 * System haptics (Android 12+, audio-coupled haptics) availability, and the
 * player's status while `active`. The player reports what it did a moment
 * after a change, so the status is followed while it is shown.
 */
export function useSystemHaptics(active: boolean): { available: boolean; status: string } {
  const available = useMemo(() => isSystemHapticsAvailable(), []);
  const [status, setStatus] = useState(() => getSystemHapticsStatus());
  useEffect(() => {
    if (!active) return undefined;
    setStatus(getSystemHapticsStatus());
    const timer = setInterval(() => setStatus(getSystemHapticsStatus()), STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [active]);
  return { available, status };
}

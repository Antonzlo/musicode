import ExpoSystemHapticsModule from './ExpoSystemHapticsModule';

/** True on Android 12+ devices that support audio-coupled haptics. */
export function isSystemHapticsAvailable(): boolean {
  return ExpoSystemHapticsModule.isAvailable();
}

/** Turn the system haptic generator on or off for the audio player. */
export function setSystemHapticsEnabled(enabled: boolean): void {
  ExpoSystemHapticsModule.setEnabled(enabled);
}

/**
 * What the player did with the last request: `off`, `unsupported`, `waiting`
 * (no audio session yet), `attached:<n>` or a failure code.
 */
export function getSystemHapticsStatus(): string {
  return ExpoSystemHapticsModule.getStatus();
}

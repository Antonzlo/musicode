import { requireNativeModule } from 'expo-modules-core';

interface ExpoSystemHapticsInterface {
  isAvailable: () => boolean;
  setEnabled: (enabled: boolean) => void;
  getStatus: () => string;
}

let module: ExpoSystemHapticsInterface;

try {
  module = requireNativeModule('ExpoSystemHaptics');
} catch {
  // Not built into this binary (iOS, or an older build): system haptics is simply unavailable.
  module = {
    isAvailable: () => false,
    setEnabled: () => {},
    getStatus: () => 'off',
  };
}

export default module;

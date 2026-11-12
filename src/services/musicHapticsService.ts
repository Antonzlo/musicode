import * as Haptics from 'expo-haptics';
import { getCastManager, getVisualizer } from 'react-native-queue-player';

import { playbackSettingsStore } from '../store/playbackSettingsStore';
import { playerStore } from '../store/playerStore';
import { createBeatDetector } from './beatDetector';

const FFT_SIZE = 1024;
const FRAME_INTERVAL_MS = 20;
/** Beat strength (bass energy over its average) above which the tick is medium / heavy. */
const MEDIUM_RATIO = 2;
const HEAVY_RATIO = 3;

let initialised = false;
let lastKey = '';
let stopVisualizer: (() => void) | null = null;
let outputIsBluetooth = false;
const pendingTicks = new Set<ReturnType<typeof setTimeout>>();

function tickStyle(ratio: number): Haptics.ImpactFeedbackStyle {
  if (ratio >= HEAVY_RATIO) return Haptics.ImpactFeedbackStyle.Heavy;
  if (ratio >= MEDIUM_RATIO) return Haptics.ImpactFeedbackStyle.Medium;
  return Haptics.ImpactFeedbackStyle.Light;
}

function tick(ratio: number): void {
  const fire = () => {
    // A tick that cannot play (haptics off in system settings) is just skipped.
    Haptics.impactAsync(tickStyle(ratio)).catch(() => {});
  };
  const delayMs = outputIsBluetooth ? playbackSettingsStore.getState().hapticsBluetoothDelayMs : 0;
  if (delayMs <= 0) {
    fire();
    return;
  }
  // The visualizer reads the decoded audio before it reaches the output, so over
  // Bluetooth the beat is felt before it is heard; wait out the output latency.
  const timer = setTimeout(() => {
    pendingTicks.delete(timer);
    fire();
  }, delayMs);
  pendingTicks.add(timer);
}

function stop(): void {
  stopVisualizer?.();
  stopVisualizer = null;
  pendingTicks.forEach(clearTimeout);
  pendingTicks.clear();
}

function start(): void {
  const detect = createBeatDetector();
  try {
    stopVisualizer = getVisualizer().subscribe(
      { fftSize: FFT_SIZE, updateIntervalMs: FRAME_INTERVAL_MS },
      (frame) => {
        const ratio = detect(new Float32Array(frame.fft), frame.sampleRate, Date.now());
        if (ratio !== null) tick(ratio);
      },
      () => {
        // No FFT for this source (stream type, nothing loaded); the next
        // playback change tries again.
        stop();
      },
    );
  } catch {
    stopVisualizer = null;
  }
}

function sync(): void {
  const { musicHaptics } = playbackSettingsStore.getState();
  const { playbackState, currentTrack } = playerStore.getState();
  // Position ticks also reach here; only a real change of setting, state or
  // track re-evaluates, so a source without FFT is not re-subscribed every second.
  const key = `${musicHaptics}|${playbackState}|${currentTrack?.id ?? ''}`;
  if (key === lastKey) return;
  lastKey = key;
  stop();
  if (musicHaptics && playbackState === 'playing') start();
}

/** Vibrate to the beat while music plays; call once at startup. */
export function initMusicHaptics(): void {
  if (initialised) return;
  initialised = true;
  try {
    getCastManager().onAudioRouteChange((route) => {
      outputIsBluetooth = route.kind.startsWith('bluetooth');
    });
  } catch {
    // Without route info the vibration simply runs undelayed.
  }
  playbackSettingsStore.subscribe(sync);
  playerStore.subscribe(sync);
  sync();
}

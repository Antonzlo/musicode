jest.mock('../../store/persistence/kvStorage', () => require('../../store/persistence/__mocks__/kvStorage'));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('expo-system-haptics', () => ({ setSystemHapticsEnabled: jest.fn() }));

const SAMPLE_RATE = 44100;

function frame(energy: number) {
  const fft = new Float32Array(512);
  for (let i = 1; i <= 3; i++) fft[i] = energy;
  return { fft: fft.buffer, sampleRate: SAMPLE_RATE };
}

type Env = ReturnType<typeof load>;

function load(opts: { castThrows?: boolean } = {}) {
  jest.resetModules();
  const handlers: { onFrame?: (f: ReturnType<typeof frame>) => void; onError?: () => void } = {};
  const dispose = jest.fn();
  const subscribe = jest.fn((_cfg, onFrame, onError) => {
    handlers.onFrame = onFrame;
    handlers.onError = onError;
    return dispose;
  });
  let routeListener: ((route: { kind: string }) => void) | undefined;
  const qp = require('react-native-queue-player');
  qp.getVisualizer.mockReturnValue({ subscribe });
  qp.getCastManager.mockImplementation(() => {
    if (opts.castThrows) throw new Error('no cast');
    return {
      onAudioRouteChange: (cb: (route: { kind: string }) => void) => {
        routeListener = cb;
        return jest.fn();
      },
    };
  });
  const Haptics = require('expo-haptics');
  const system = require('expo-system-haptics');
  const { playbackSettingsStore } = require('../../store/playbackSettingsStore');
  const { playerStore } = require('../../store/playerStore');
  const { initMusicHaptics } = require('../musicHapticsService');
  return {
    handlers,
    dispose,
    subscribe,
    Haptics,
    system,
    settings: playbackSettingsStore,
    player: playerStore,
    init: initMusicHaptics as () => void,
    setRoute: (kind: string) => routeListener?.({ kind }),
  };
}

/** Feed steady frames so the detector has an average, then return. */
function warm(env: Env, energy = 0.05) {
  for (let i = 0; i < 50; i++) {
    env.handlers.onFrame!(frame(energy));
    jest.advanceTimersByTime(20);
  }
}

function startPlaying(env: Env) {
  env.settings.setState({ musicHaptics: true });
  env.player.setState({ playbackState: 'playing', currentTrack: { id: 't1' } });
  env.init();
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('subscription', () => {
  it('stays off while the setting is off', () => {
    const env = load();
    env.player.setState({ playbackState: 'playing', currentTrack: { id: 't1' } });
    env.init();
    expect(env.subscribe).not.toHaveBeenCalled();
  });

  it('subscribes to the visualizer when enabled and playing', () => {
    const env = load();
    startPlaying(env);
    expect(env.subscribe).toHaveBeenCalledWith(
      { fftSize: 1024, updateIntervalMs: 20 },
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('does not subscribe while paused, and starts on play', () => {
    const env = load();
    env.settings.setState({ musicHaptics: true });
    env.player.setState({ playbackState: 'paused', currentTrack: { id: 't1' } });
    env.init();
    expect(env.subscribe).not.toHaveBeenCalled();
    env.player.setState({ playbackState: 'playing' });
    expect(env.subscribe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes on pause and when turned off', () => {
    const env = load();
    startPlaying(env);
    env.player.setState({ playbackState: 'paused' });
    expect(env.dispose).toHaveBeenCalledTimes(1);
    env.player.setState({ playbackState: 'playing' });
    env.settings.setState({ musicHaptics: false });
    expect(env.dispose).toHaveBeenCalledTimes(2);
  });

  it('is not resubscribed by position updates', () => {
    const env = load();
    startPlaying(env);
    env.player.setState({ position: 1 });
    env.player.setState({ position: 2 });
    expect(env.subscribe).toHaveBeenCalledTimes(1);
  });

  it('resubscribes for the next track', () => {
    const env = load();
    startPlaying(env);
    env.player.setState({ currentTrack: { id: 't2' } });
    expect(env.subscribe).toHaveBeenCalledTimes(2);
    expect(env.dispose).toHaveBeenCalledTimes(1);
  });

  it('stops after a visualizer error and retries on the next track', () => {
    const env = load();
    startPlaying(env);
    env.handlers.onError!();
    expect(env.dispose).toHaveBeenCalledTimes(1);
    env.player.setState({ position: 5 });
    expect(env.subscribe).toHaveBeenCalledTimes(1);
    env.player.setState({ currentTrack: { id: 't2' } });
    expect(env.subscribe).toHaveBeenCalledTimes(2);
  });

  it('ignores a second init', () => {
    const env = load();
    startPlaying(env);
    env.init();
    expect(env.subscribe).toHaveBeenCalledTimes(1);
  });

  it('survives a visualizer that cannot subscribe', () => {
    const env = load();
    require('react-native-queue-player').getVisualizer.mockImplementation(() => {
      throw new Error('no visualizer');
    });
    expect(() => startPlaying(env)).not.toThrow();
  });

  it('still works when route info is unavailable', () => {
    const env = load({ castThrows: true });
    startPlaying(env);
    expect(env.subscribe).toHaveBeenCalledTimes(1);
  });
});

describe('ticks', () => {
  it('maps beat strength to light, medium and heavy', () => {
    const env = load();
    startPlaying(env);
    warm(env);
    env.handlers.onFrame!(frame(0.085)); // 1.7x
    expect(env.Haptics.impactAsync).toHaveBeenLastCalledWith('light');
    jest.advanceTimersByTime(200);
    warm(env);
    env.handlers.onFrame!(frame(0.125)); // 2.5x
    expect(env.Haptics.impactAsync).toHaveBeenLastCalledWith('medium');
    jest.advanceTimersByTime(200);
    warm(env);
    env.handlers.onFrame!(frame(0.3)); // 6x
    expect(env.Haptics.impactAsync).toHaveBeenLastCalledWith('heavy');
  });

  it('stays quiet for a steady signal', () => {
    const env = load();
    startPlaying(env);
    warm(env);
    expect(env.Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('swallows a tick the system rejects', async () => {
    const env = load();
    env.Haptics.impactAsync.mockRejectedValue(new Error('haptics off'));
    startPlaying(env);
    warm(env);
    expect(() => env.handlers.onFrame!(frame(0.3))).not.toThrow();
    await Promise.resolve();
  });
});

describe('Bluetooth delay', () => {
  it('holds a tick back by the delay over Bluetooth', () => {
    const env = load();
    env.settings.setState({ hapticsBluetoothDelayMs: 300 });
    startPlaying(env);
    env.setRoute('bluetoothA2DP');
    warm(env);
    env.handlers.onFrame!(frame(0.3));
    expect(env.Haptics.impactAsync).not.toHaveBeenCalled();
    jest.advanceTimersByTime(299);
    expect(env.Haptics.impactAsync).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(env.Haptics.impactAsync).toHaveBeenCalledWith('heavy');
  });

  it('supports the full second', () => {
    const env = load();
    env.settings.setState({ hapticsBluetoothDelayMs: 1000 });
    startPlaying(env);
    env.setRoute('bluetoothLE');
    warm(env);
    env.handlers.onFrame!(frame(0.3));
    jest.advanceTimersByTime(999);
    expect(env.Haptics.impactAsync).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(env.Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('does not delay off Bluetooth', () => {
    const env = load();
    env.settings.setState({ hapticsBluetoothDelayMs: 300 });
    startPlaying(env);
    env.setRoute('speaker');
    warm(env);
    env.handlers.onFrame!(frame(0.3));
    expect(env.Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('fires at once with a zero delay over Bluetooth', () => {
    const env = load();
    startPlaying(env);
    env.setRoute('bluetoothHFP');
    warm(env);
    env.handlers.onFrame!(frame(0.3));
    expect(env.Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('drops pending ticks when playback stops', () => {
    const env = load();
    env.settings.setState({ hapticsBluetoothDelayMs: 500 });
    startPlaying(env);
    env.setRoute('bluetoothA2DP');
    warm(env);
    env.handlers.onFrame!(frame(0.3));
    env.player.setState({ playbackState: 'paused' });
    jest.advanceTimersByTime(1000);
    expect(env.Haptics.impactAsync).not.toHaveBeenCalled();
  });
});

describe('system haptics mode', () => {
  it('switches the system generator on and skips the beat pulses', () => {
    const env = load();
    env.settings.setState({ hapticsMode: 'system' });
    startPlaying(env);
    expect(env.system.setSystemHapticsEnabled).toHaveBeenLastCalledWith(true);
    expect(env.subscribe).not.toHaveBeenCalled();
  });

  it('keeps the system generator off in beat mode', () => {
    const env = load();
    startPlaying(env);
    expect(env.system.setSystemHapticsEnabled).toHaveBeenLastCalledWith(false);
    expect(env.subscribe).toHaveBeenCalledTimes(1);
  });

  it('hands over from beat pulses to the system generator', () => {
    const env = load();
    startPlaying(env);
    env.settings.setState({ hapticsMode: 'system' });
    expect(env.dispose).toHaveBeenCalledTimes(1);
    expect(env.system.setSystemHapticsEnabled).toHaveBeenLastCalledWith(true);
  });

  it('hands over from the system generator to beat pulses', () => {
    const env = load();
    env.settings.setState({ hapticsMode: 'system' });
    startPlaying(env);
    env.settings.setState({ hapticsMode: 'beat' });
    expect(env.system.setSystemHapticsEnabled).toHaveBeenLastCalledWith(false);
    expect(env.subscribe).toHaveBeenCalledTimes(1);
  });

  it('switches the system generator off with the setting', () => {
    const env = load();
    env.settings.setState({ hapticsMode: 'system' });
    startPlaying(env);
    env.settings.setState({ musicHaptics: false });
    expect(env.system.setSystemHapticsEnabled).toHaveBeenLastCalledWith(false);
  });

  it('does not repeat the native call for playback updates', () => {
    const env = load();
    env.settings.setState({ hapticsMode: 'system' });
    startPlaying(env);
    const calls = env.system.setSystemHapticsEnabled.mock.calls.length;
    env.player.setState({ position: 4 });
    env.player.setState({ playbackState: 'paused' });
    expect(env.system.setSystemHapticsEnabled.mock.calls.length).toBe(calls);
  });
});

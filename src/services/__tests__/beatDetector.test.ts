import { createBeatDetector } from '../beatDetector';

const SAMPLE_RATE = 44100;
const BINS = 512;

/** An FFT frame (fftSize 1024) with the same magnitude in bins 1 to 3 (43 to 129 Hz). */
function bassFrame(energy: number, treble = 0): Float32Array {
  const fft = new Float32Array(BINS);
  for (let i = 1; i <= 3; i++) fft[i] = energy;
  fft[200] = treble;
  return fft;
}

/** Feed `count` steady frames 20ms apart; returns the next timestamp. */
function warmUp(detect: ReturnType<typeof createBeatDetector>, energy: number, count = 50): number {
  let now = 0;
  for (let i = 0; i < count; i++) {
    detect(bassFrame(energy), SAMPLE_RATE, now);
    now += 20;
  }
  return now;
}

describe('createBeatDetector', () => {
  it('finds no beat in a steady signal', () => {
    const detect = createBeatDetector();
    let now = 0;
    for (let i = 0; i < 100; i++) {
      expect(detect(bassFrame(0.05), SAMPLE_RATE, now)).toBeNull();
      now += 20;
    }
  });

  it('reports a bass spike with its ratio to the running average', () => {
    const detect = createBeatDetector();
    const now = warmUp(detect, 0.05);
    const ratio = detect(bassFrame(0.2), SAMPLE_RATE, now);
    expect(ratio).toBeCloseTo(4, 1);
  });

  it('ignores a spike in the treble', () => {
    const detect = createBeatDetector();
    const now = warmUp(detect, 0.05);
    expect(detect(bassFrame(0.05, 0.9), SAMPLE_RATE, now)).toBeNull();
  });

  it('ignores a spike in near silence', () => {
    const detect = createBeatDetector();
    const now = warmUp(detect, 0.001);
    expect(detect(bassFrame(0.008), SAMPLE_RATE, now)).toBeNull();
  });

  it('enforces a minimum gap between beats', () => {
    const detect = createBeatDetector();
    let now = warmUp(detect, 0.05);
    expect(detect(bassFrame(0.3), SAMPLE_RATE, now)).not.toBeNull();
    now += 40;
    expect(detect(bassFrame(0.3), SAMPLE_RATE, now)).toBeNull();
    now += 200;
    detect(bassFrame(0.05), SAMPLE_RATE, now);
    now += 20;
    expect(detect(bassFrame(0.4), SAMPLE_RATE, now)).not.toBeNull();
  });

  it('adapts to a louder passage and stops firing', () => {
    const detect = createBeatDetector();
    let now = warmUp(detect, 0.05);
    let settled = 0;
    for (let i = 0; i < 300; i++) {
      // After about 1.2 s the average has caught up with the new level.
      if (detect(bassFrame(0.2), SAMPLE_RATE, now) !== null && i >= 60) settled++;
      now += 20;
    }
    expect(settled).toBe(0);
  });

  it('does not fire on the very first frame', () => {
    expect(createBeatDetector()(bassFrame(0.5), SAMPLE_RATE, 0)).toBeNull();
  });

  it('keeps its bass band inside a small FFT', () => {
    const detect = createBeatDetector();
    const small = new Float32Array(32);
    small.fill(0.05);
    expect(() => detect(small, SAMPLE_RATE, 0)).not.toThrow();
  });
});

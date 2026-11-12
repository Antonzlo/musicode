/** Bass band the beat is read from, in Hz. */
const BASS_LOW_HZ = 40;
const BASS_HIGH_HZ = 230;
/** A frame is a beat when its bass energy is this many times the running average. */
const ONSET_RATIO = 1.5;
/**
 * Quietest bass energy that counts. FFT magnitudes are `|X| * 2 / n` under a
 * Hann window (a full-scale sine reads about 0.5), so this ignores near silence.
 */
const MIN_ENERGY = 0.01;
/** Per-frame weight of the running average; about one second at a 20ms frame. */
const AVERAGE_WEIGHT = 0.02;
/** Shortest gap between beats, in ms. */
const MIN_GAP_MS = 120;

/**
 * Reads kick/bass beats out of successive FFT frames. Returns the ratio of the
 * frame's bass energy to the running average when it is a beat, otherwise null.
 */
export function createBeatDetector() {
  let average = 0;
  let lastBeatAt = Number.NEGATIVE_INFINITY;

  return function detect(fft: Float32Array, sampleRate: number, now: number): number | null {
    const binHz = sampleRate / (fft.length * 2);
    const lo = Math.max(1, Math.ceil(BASS_LOW_HZ / binHz));
    const hi = Math.min(fft.length - 1, Math.max(lo, Math.floor(BASS_HIGH_HZ / binHz)));
    let sum = 0;
    for (let i = lo; i <= hi; i++) sum += fft[i];
    const energy = sum / (hi - lo + 1);

    const previous = average;
    average = previous === 0 ? energy : previous + AVERAGE_WEIGHT * (energy - previous);

    if (energy < MIN_ENERGY || previous === 0) return null;
    if (energy < previous * ONSET_RATIO || now - lastBeatAt < MIN_GAP_MS) return null;
    lastBeatAt = now;
    return energy / previous;
  };
}

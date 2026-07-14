// Gentle, fun sound effects for Blocks Studio — synthesized with WebAudio so we
// ship no audio assets. Each operation a 5–8-year-old does gets a tiny cue that
// matches the action (tap, snap, pop, whoosh-to-bin, cheerful add, run fanfare).
// Kept soft + short. The AudioContext resumes on the first user gesture (the
// studio's first tap), which browsers require.

type Win = Window & { webkitAudioContext?: typeof AudioContext };

const MUTE_KEY = 'bsx-muted';

let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as Win).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function setMuted(v: boolean): void {
  muted = v;
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    // ignore
  }
}

export function isMuted(): boolean {
  return muted;
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  delay?: number;
}

function tone(freq: number, dur: number, opts: ToneOpts = {}): void {
  const c = ac();
  if (!c) return;
  const { type = 'sine', gain = 0.1, slideTo, delay = 0 } = opts;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function noise(dur: number, gain = 0.06, hz = 1100): void {
  const c = ac();
  if (!c) return;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = hz;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start();
  src.stop(c.currentTime + dur + 0.02);
}

export const sfx = {
  /** tapping a block / button to interact */
  tap: () => tone(620, 0.07, { type: 'triangle', gain: 0.07 }),
  /** lifting a block to drag */
  pickup: () => tone(440, 0.1, { type: 'sine', gain: 0.06, slideTo: 720 }),
  /** snapping a block into place (reorder / drop) */
  snap: () => {
    tone(680, 0.05, { type: 'square', gain: 0.05 });
    tone(920, 0.06, { type: 'sine', gain: 0.06, delay: 0.045 });
  },
  /** adding a block to the program */
  place: () => tone(720, 0.11, { type: 'triangle', gain: 0.09, slideTo: 1040 }),
  /** the green Pop block + small confirmations */
  pop: () => tone(880, 0.12, { type: 'sine', gain: 0.11, slideTo: 1250 }),
  /** The six child-programmable sounds used by the green Play Sound block. */
  playSound: (soundId: number) => {
    switch (Math.min(6, Math.max(1, Math.round(soundId)))) {
      case 2: // Chime
        tone(659, 0.18, { type: 'sine', gain: 0.09 });
        tone(988, 0.24, { type: 'sine', gain: 0.08, delay: 0.08 });
        break;
      case 3: // Drum
        tone(150, 0.16, { type: 'triangle', gain: 0.12, slideTo: 70 });
        break;
      case 4: // Whoosh
        noise(0.24, 0.045, 900);
        tone(520, 0.22, { type: 'sine', gain: 0.04, slideTo: 180 });
        break;
      case 5: // Boing
        tone(260, 0.26, { type: 'triangle', gain: 0.11, slideTo: 720 });
        break;
      case 6: // Sparkle
        [784, 988, 1319].forEach((freq, index) =>
          tone(freq, 0.16, { type: 'sine', gain: 0.065, delay: index * 0.07 }),
        );
        break;
      default:
        tone(880, 0.12, { type: 'sine', gain: 0.11, slideTo: 1250 });
    }
  },
  /** A fixed one-octave C-major scale: 1 Do through 7 Ti. */
  playNote: (noteId: number) => {
    const frequencies = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88] as const;
    const index = Math.min(frequencies.length - 1, Math.max(0, Math.round(noteId) - 1));
    tone(frequencies[index], 0.32, { type: 'triangle', gain: 0.09 });
  },
  /** adding a character / page — a cheerful two-note rise */
  add: () => {
    tone(523, 0.08, { type: 'triangle', gain: 0.09 });
    tone(784, 0.13, { type: 'triangle', gain: 0.09, delay: 0.075 });
  },
  /** throwing something in the bin — a whoosh down then a soft plop */
  trash: () => {
    tone(420, 0.18, { type: 'sawtooth', gain: 0.07, slideTo: 130 });
    noise(0.12, 0.04, 700);
    tone(190, 0.1, { type: 'sine', gain: 0.08, delay: 0.15 });
  },
  /** Go! — a happy 3-note arpeggio */
  go: () => [523, 659, 784].forEach((f, i) => tone(f, 0.15, { type: 'triangle', gain: 0.09, delay: i * 0.085 })),
  /** switching page — a little chime */
  page: () => {
    tone(659, 0.1, { type: 'sine', gain: 0.07 });
    tone(988, 0.14, { type: 'sine', gain: 0.07, delay: 0.055 });
  },
  /** bumping a block's number UP — a quick rising blip */
  numUp: () => tone(880, 0.07, { type: 'triangle', gain: 0.07, slideTo: 1180 }),
  /** bumping a block's number DOWN — a quick falling blip */
  numDown: () => tone(660, 0.07, { type: 'triangle', gain: 0.07, slideTo: 440 }),
};

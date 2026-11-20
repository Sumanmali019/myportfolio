/**
 * Sound for the journey, on the Web Audio API.
 *
 * Four recorded effects live in src/assets/sound_effect/ (click, typing, flight chime, mail bell);
 * everything else is synthesised here, so it costs no downloads and needs no licences. Browsers
 * only allow audio after the visitor has interacted with the page: the audio context is created on
 * the first pointer/key press, and anything due before that is simply skipped.
 *
 *   one-shots   CUES below: each fires as the journey passes it going forward (not on jumps);
 *               'swoosh' marks every time a monitor switches to a different app or window
 *   typing      loops while his hands are on the keyboard and the journey is moving
 *   ambience    a quiet bed per scene, cross-faded as scenes change, ducked under big moments
 *
 * A mute button in the player turns all of it off (remembered in this browser).
 */
import clickUrl from '../assets/sound_effect/matthewvakaliuk73627-mouse-click-290204.mp3?url';
import typingUrl from '../assets/sound_effect/dragon-studio-keyboard-typing-sound-effect-335503.mp3?url';
import flightUrl from '../assets/sound_effect/arunangshubanerjee-airbus-cabin-pa-beep-tone-passenger-announcement-chime-358248.mp3?url';
import mailUrl from '../assets/sound_effect/soundreality-bell-sound-effect-613873.mp3?url';

type FileSound = 'click' | 'typing' | 'flight' | 'mail';
type SynthSound =
  | 'blip'
  | 'tick'
  | 'pin'
  | 'swoosh'
  | 'whoosh'
  | 'sparkle'
  | 'thud'
  | 'paper'
  | 'sign'
  | 'stamp'
  | 'chord'
  | 'cheer'
  | 'confetti'
  | 'coin'
  | 'error'
  | 'join'
  | 'odometer'
  | 'flap'
  | 'engine'
  | 'touchdown'
  | 'lamp'
  | 'press'
  | 'page'
  | 'scroll'
  | 'drag'
  | 'drop'
  | 'fly';
export type SoundName = FileSound | SynthSound;

const FILES: Record<FileSound, [string, number]> = {
  click: [clickUrl, 0.6],
  typing: [typingUrl, 0.35],
  flight: [flightUrl, 0.6],
  mail: [mailUrl, 0.55],
};

/** The loudest moments: the ambience dips under them. */
const DUCK: ReadonlySet<SoundName> = new Set(['stamp', 'chord', 'cheer']);

/**
 * On-screen moments, per scene: [hold progress, sound]. Lottie frames are converted with each
 * scene's own mapping (e.g. the flights and interviews play frames over hold 0.04 → 0.94).
 */
export const CUES: Record<string, Array<[number, SoundName]>> = {
  // The greeting bubble pops away.
  '00-intro': [[0.15, 'blip']],
  // Cap toss (frames over 0.04 → 0.62): thrown 30, top 76, caught 118; then the letter, the
  // signature and the ACCEPTED stamp.
  '02-graduation': [
    [0.168, 'whoosh'],
    [0.3, 'cheer'],
    [0.543, 'thud'],
    [0.62, 'paper'],
    [0.72, 'sign'],
    [0.83, 'stamp'],
  ],
  // QOMIX builds and lands (its 10K+ badge), then Ten90's card.
  '03-kolkata': [
    [0.2, 'tick'],
    [0.32, 'swoosh'],
    [0.33, 'thud'],
    [0.35, 'sparkle'],
    [0.43, 'thud'],
    [0.51, 'swoosh'],
    [0.7, 'swoosh'],
    [0.85, 'swoosh'],
  ],
  // The flights (frames over 0.04 → 0.94): chime, board, pins 22 / 30, take-off 74,
  // landing 152, arrival banner 158.
  '04-flight-hyd': [
    [0.03, 'flight'],
    [0.1, 'flap'],
    [0.135, 'pin'],
    [0.17, 'pin'],
    [0.3, 'engine'],
    [0.695, 'touchdown'],
    [0.72, 'sparkle'],
  ],
  '07-flight-home': [
    [0.03, 'flight'],
    [0.1, 'flap'],
    [0.135, 'pin'],
    [0.17, 'pin'],
    [0.3, 'engine'],
    [0.695, 'touchdown'],
    [0.72, 'sparkle'],
  ],
  // The interviews (frames over 0.04 → 0.94): the call joins, a smile at 146, leave 162,
  // mail 198, open 232, the offer PDF 262.
  '04-interview': [
    [0.04, 'join'],
    [0.44, 'sparkle'],
    [0.483, 'click'],
    [0.582, 'mail'],
    [0.675, 'click'],
    [0.757, 'paper'],
    [0.77, 'confetti'],
  ],
  '08-interview': [
    [0.04, 'join'],
    [0.44, 'sparkle'],
    [0.483, 'click'],
    [0.582, 'mail'],
    [0.675, 'click'],
    [0.757, 'paper'],
    [0.77, 'confetti'],
  ],
  // BeWorld (the room plays over the first 0.84 of the hold): its 500K+ badge stamps in with
  // the confetti (0.521), then Current Affairs (0.588).
  '05-hyderabad': [
    [0.269, 'swoosh'],
    [0.378, 'swoosh'],
    [0.487, 'swoosh'],
    [0.521, 'thud'],
    [0.525, 'odometer'],
    [0.554, 'chord'],
    [0.554, 'confetti'],
    [0.554, 'swoosh'],
    [0.588, 'thud'],
    [0.605, 'sparkle'],
  ],
  // The workday: the call ends, then each window (Jira, Docker, VS Code at dusk, GitHub).
  '09-leading': [
    // The stand-up (call over hold 0 → 0.3): your popup, then each teammate's reply popup
    // (Faisal, Rajat, Priya) with the same chime.
    [0.04, 'join'],
    [0.108, 'join'],
    [0.162, 'join'],
    [0.216, 'join'],
    [0.3, 'blip'],
    [0.35, 'swoosh'],
    // Jira (window 0.365 → 0.545): each ticket picked up, dragged across, dropped.
    [0.379, 'click'],
    [0.381, 'drag'],
    [0.423, 'drop'],
    [0.437, 'click'],
    [0.439, 'drag'],
    [0.48, 'drop'],
    [0.495, 'click'],
    [0.497, 'drag'],
    [0.534, 'drop'],
    [0.56, 'swoosh'],
    [0.77, 'swoosh'],
    [0.79, 'lamp'],
    [0.89, 'swoosh'],
  ],
  // Klass Online and Ayantra go live (their badges), then the Twilio onboarding: Test connection.
  '09-neura-apps': [
    [0.12, 'swoosh'],
    [0.24, 'swoosh'],
    [0.36, 'swoosh'],
    [0.48, 'swoosh'],
    [0.516, 'sparkle'],
    [0.545, 'swoosh'],
    [0.581, 'sparkle'],
    [0.61, 'swoosh'],
    [0.675, 'swoosh'],
    [0.76, 'swoosh'],
    [0.899, 'click'],
  ],
  // ★ Open source. First GitHub's issue list (hold 0.02 → 0.2): it scrolls (0.034 → 0.096), the
  // pointer clicks the RenderFlex overflow issue (0.128) and it opens (0.135). Then the Lottie
  // (frames over 0.2 → 0.52 → 0.94): editor to PR 104, review rows 112 / 136 / 150, MERGED 152,
  // contributors 192, banner 250. The loudest moment on the site.
  '10-open-source': [
    [0.034, 'scroll'],
    [0.065, 'scroll'],
    [0.128, 'click'],
    [0.135, 'page'],
    [0.2, 'swoosh'],
    [0.354, 'swoosh'],
    [0.366, 'tick'],
    [0.402, 'tick'],
    [0.422, 'tick'],
    [0.425, 'stamp'],
    [0.432, 'chord'],
    [0.484, 'sparkle'],
    [0.646, 'confetti'],
    [0.646, 'cheer'],
  ],
  // The marketplace builds (0 → 0.36); Razorpay: UPI, Pay, paid (0.79), order placed (0.85).
  '11-khyaati': [
    [0.04, 'press'],
    [0.1, 'press'],
    [0.16, 'press'],
    [0.22, 'press'],
    [0.28, 'press'],
    [0.34, 'press'],
    [0.36, 'swoosh'],
    [0.64, 'swoosh'],
    [0.693, 'click'],
    [0.731, 'click'],
    [0.789, 'coin'],
    [0.846, 'blip'],
  ],
  // The Quiet Shelf builds (0 → 0.5): pages turning, then it settles.
  '11-quiet-shelf': [
    [0.05, 'page'],
    [0.13, 'page'],
    [0.21, 'page'],
    [0.29, 'page'],
    [0.37, 'page'],
    [0.45, 'page'],
    [0.5, 'thud'],
    [0.5, 'swoosh'],
  ],
  // The board flips YOUR TEAM, then each link row; the chime again as the buttons arrive.
  '15-departures': [
    [0.04, 'flap'],
    [0.08, 'flap'],
    [0.12, 'flap'],
    [0.16, 'flap'],
    [0.2, 'flap'],
    [0.3, 'flap'],
    [0.36, 'flap'],
    [0.42, 'flap'],
    [0.48, 'flap'],
    [0.55, 'flight'],
    [0.61, 'blip'],
  ],
};

/* ---------- ambience: which bed plays under each scene ---------- */

type BedKind =
  | 'night'
  | 'campus'
  | 'hall'
  | 'kolkata'
  | 'office'
  | 'cabin'
  | 'room'
  | 'home'
  | 'airport'
  | 'study'
  | 'study-night'
  | 'departures';

function bedFor(scene: string, hold: number): BedKind | null {
  switch (scene) {
    case '00-intro':
      return 'night';
    case '01-jadavpur':
      return 'campus';
    case '02-graduation':
      return 'hall';
    case '03-kolkata':
      // Learning on the monitor, seen from behind, before his hands go to the keyboard.
      return hold < 0.22 ? 'study' : 'kolkata';
    case '04-flight-hyd':
    case '07-flight-home':
      return hold < 0.3 ? 'airport' : 'cabin';
    case '04-interview':
    case '08-interview':
    case '10-open-source':
    case '11-khyaati':
    case '11-quiet-shelf':
      return 'room';
    case '05-hyderabad':
      // The room plays over the first 0.84 of the hold: dusk from 0.62, Scaler at night from 0.756.
      if (hold >= 0.756) return 'study-night';
      return hold < 0.62 ? 'office' : 'night';
    case '09-leading':
      return hold < 0.77 ? 'home' : 'night';
    case '09-neura-apps':
      return 'home';
    case '15-departures':
      return 'departures';
    default:
      return null;
  }
}

/* ---------- synthesis helpers ---------- */

interface ToneOpts {
  type?: OscillatorType;
  f0: number;
  f1?: number;
  dur: number;
  gain: number;
  attack?: number;
}
interface NoiseOpts {
  filter: BiquadFilterType;
  f0: number;
  f1?: number;
  q?: number;
  dur: number;
  gain: number;
  attack?: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function envelope(ctx: AudioContext, t: number, dur: number, peak: number, attack: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  return g;
}

function tone(ctx: AudioContext, out: AudioNode, t: number, o: ToneOpts) {
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f0, t);
  if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  const g = envelope(ctx, t, o.dur, o.gain, o.attack ?? 0.004);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + o.dur + 0.05);
}

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>();
function noiseBuffer(ctx: AudioContext): AudioBuffer {
  let b = noiseBuffers.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, b);
  }
  return b;
}

function noise(ctx: AudioContext, out: AudioNode, t: number, o: NoiseOpts) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.filter;
  f.Q.value = o.q ?? 0.8;
  f.frequency.setValueAtTime(o.f0, t);
  if (o.f1 !== undefined) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  const g = envelope(ctx, t, o.dur, o.gain, o.attack ?? 0.004);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random());
  src.stop(t + o.dur + 0.05);
}

type Synth = (ctx: AudioContext, out: AudioNode, t: number) => void;

const SYNTHS: Record<SynthSound, Synth> = {
  blip: (c, o, t) => tone(c, o, t, { f0: 880, f1: 700, dur: 0.08, gain: 0.22 }),
  tick: (c, o, t) => tone(c, o, t, { type: 'triangle', f0: 2200, dur: 0.035, gain: 0.18 }),
  pin: (c, o, t) => {
    tone(c, o, t, { f0: 1320, dur: 0.4, gain: 0.22 });
    tone(c, o, t, { f0: 1980, dur: 0.22, gain: 0.07 });
  },
  swoosh: (c, o, t) =>
    noise(c, o, t, {
      filter: 'bandpass',
      f0: 500,
      f1: 3500,
      q: 1.2,
      dur: 0.34,
      gain: 0.3,
      attack: 0.09,
    }),
  whoosh: (c, o, t) =>
    noise(c, o, t, {
      filter: 'bandpass',
      f0: 2500,
      f1: 300,
      q: 0.9,
      dur: 0.6,
      gain: 0.4,
      attack: 0.12,
    }),
  sparkle: (c, o, t) =>
    [1568, 2093, 2637, 3136].forEach((f, i) =>
      tone(c, o, t + i * 0.055, { f0: f, dur: 0.3, gain: 0.1 }),
    ),
  thud: (c, o, t) => {
    tone(c, o, t, { f0: 140, f1: 45, dur: 0.24, gain: 0.7 });
    noise(c, o, t, { filter: 'lowpass', f0: 900, dur: 0.06, gain: 0.25 });
  },
  paper: (c, o, t) => {
    noise(c, o, t, { filter: 'highpass', f0: 1800, f1: 2600, dur: 0.26, gain: 0.2, attack: 0.03 });
    noise(c, o, t + 0.13, { filter: 'highpass', f0: 2200, dur: 0.18, gain: 0.14, attack: 0.02 });
  },
  sign: (c, o, t) => {
    for (let i = 0; i < 6; i++)
      noise(c, o, t + i * 0.13 + rand(0, 0.03), {
        filter: 'bandpass',
        f0: rand(2800, 3600),
        q: 2,
        dur: rand(0.07, 0.11),
        gain: 0.12,
        attack: 0.015,
      });
  },
  stamp: (c, o, t) => {
    tone(c, o, t, { f0: 110, f1: 38, dur: 0.38, gain: 0.9 });
    noise(c, o, t, { filter: 'lowpass', f0: 1200, dur: 0.13, gain: 0.5 });
  },
  chord: (c, o, t) =>
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(c, o, t + i * 0.03, { type: 'triangle', f0: f, dur: 1.7, gain: 0.09, attack: 0.025 }),
    ),
  cheer: (c, o, t) => {
    const dur = 1.9;
    const am = c.createGain();
    am.gain.value = 0.7;
    const lfo = c.createOscillator();
    lfo.frequency.value = 7;
    const depth = c.createGain();
    depth.gain.value = 0.3;
    lfo.connect(depth).connect(am.gain);
    am.connect(o);
    noise(c, am, t, { filter: 'bandpass', f0: 1100, q: 0.6, dur, gain: 0.32, attack: 0.3 });
    noise(c, am, t + 0.05, { filter: 'bandpass', f0: 2600, q: 0.9, dur, gain: 0.14, attack: 0.35 });
    lfo.start(t);
    lfo.stop(t + dur + 0.1);
  },
  confetti: (c, o, t) => {
    for (let i = 0; i < 26; i++)
      noise(c, o, t + rand(0, 0.7), {
        filter: 'highpass',
        f0: rand(4000, 7000),
        dur: 0.022,
        gain: rand(0.08, 0.18),
        attack: 0.002,
      });
  },
  coin: (c, o, t) => {
    tone(c, o, t, { type: 'triangle', f0: 988, dur: 0.1, gain: 0.22 });
    tone(c, o, t + 0.09, { type: 'triangle', f0: 1319, dur: 0.42, gain: 0.22 });
  },
  error: (c, o, t) => {
    tone(c, o, t, { type: 'triangle', f0: 466, dur: 0.16, gain: 0.2 });
    tone(c, o, t + 0.16, { type: 'triangle', f0: 370, dur: 0.26, gain: 0.2 });
  },
  join: (c, o, t) => {
    tone(c, o, t, { f0: 660, dur: 0.14, gain: 0.2 });
    tone(c, o, t + 0.11, { f0: 990, dur: 0.3, gain: 0.2 });
  },
  odometer: (c, o, t) => {
    for (let i = 0; i < 22; i++)
      tone(c, o, t + 1.2 * Math.pow(i / 21, 1.6), {
        type: 'triangle',
        f0: 1800 + i * 25,
        dur: 0.025,
        gain: 0.11,
      });
  },
  flap: (c, o, t) => {
    for (let i = 0; i < 14; i++)
      noise(c, o, t + i * 0.024 + rand(0, 0.008), {
        filter: 'bandpass',
        f0: rand(2200, 3000),
        q: 3,
        dur: 0.02,
        gain: 0.28,
        attack: 0.002,
      });
  },
  engine: (c, o, t) => {
    noise(c, o, t, { filter: 'lowpass', f0: 180, f1: 1100, dur: 5.5, gain: 0.45, attack: 1.4 });
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    lp.connect(o);
    tone(c, lp, t, { type: 'sawtooth', f0: 55, f1: 120, dur: 5.5, gain: 0.08, attack: 1.4 });
  },
  touchdown: (c, o, t) => {
    SYNTHS.thud(c, o, t);
    noise(c, o, t + 0.05, { filter: 'bandpass', f0: 1800, q: 4, dur: 0.16, gain: 0.16 });
    tone(c, o, t + 0.2, { f0: 120, f1: 45, dur: 0.2, gain: 0.4 });
  },
  lamp: (c, o, t) => {
    tone(c, o, t, { type: 'triangle', f0: 1400, dur: 0.02, gain: 0.2 });
    tone(c, o, t + 0.05, { type: 'triangle', f0: 900, dur: 0.025, gain: 0.16 });
  },
  press: (c, o, t) => {
    tone(c, o, t, { f0: 180, f1: 70, dur: 0.1, gain: 0.35 });
    noise(c, o, t, { filter: 'bandpass', f0: 1500, dur: 0.05, gain: 0.18 });
  },
  // A project lifting off towards the "see it live" shelf: a short airy rise.
  fly: (c, o, t) =>
    noise(c, o, t, {
      filter: 'bandpass',
      f0: 700,
      f1: 2600,
      q: 1.4,
      dur: 0.3,
      gain: 0.14,
      attack: 0.08,
    }),
  // A card dragged across the board: a soft slide…
  drag: (c, o, t) =>
    noise(c, o, t, {
      filter: 'bandpass',
      f0: 900,
      f1: 1400,
      q: 1.5,
      dur: 0.55,
      gain: 0.12,
      attack: 0.15,
    }),
  // …and set down in its new column.
  drop: (c, o, t) => {
    tone(c, o, t, { f0: 260, f1: 120, dur: 0.09, gain: 0.25 });
    noise(c, o, t, { filter: 'lowpass', f0: 1500, dur: 0.04, gain: 0.12 });
  },
  // A mouse wheel rolling: a run of soft notches.
  scroll: (c, o, t) => {
    for (let i = 0; i < 9; i++)
      tone(c, o, t + i * 0.055 + rand(0, 0.01), {
        type: 'triangle',
        f0: rand(1100, 1400),
        dur: 0.018,
        gain: 0.07,
      });
  },
  page: (c, o, t) =>
    noise(c, o, t, {
      filter: 'bandpass',
      f0: 1400,
      f1: 3800,
      q: 0.8,
      dur: 0.2,
      gain: 0.18,
      attack: 0.05,
    }),
};

/* ---------- ambience beds ---------- */

interface Bed {
  stop(fade: number): void;
}

function makeBed(ctx: AudioContext, out: AudioNode, kind: BedKind): Bed {
  const t = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(1, t + 1.2);
  gain.connect(out);
  const nodes: AudioScheduledSourceNode[] = [];
  const timers: number[] = [];

  // A looping noise floor, filtered to the room.
  const floor = (filter: BiquadFilterType, freq: number, level: number, q = 0.7) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = level;
    src.connect(f).connect(g).connect(gain);
    src.start(t, Math.random());
    nodes.push(src);
    return g;
  };
  // A slow swell on a level (a fan, a murmuring hall).
  const sway = (target: GainNode, rate: number, depth: number) => {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const d = ctx.createGain();
    d.gain.value = depth;
    lfo.connect(d).connect(target.gain);
    lfo.start(t);
    nodes.push(lfo);
  };
  // Something that happens now and then (birds, crickets, a taxi horn).
  const every = (min: number, max: number, fn: (at: number) => void) => {
    const next = () => {
      timers.push(
        window.setTimeout(
          () => {
            fn(ctx.currentTime + 0.02);
            next();
          },
          rand(min, max) * 1000,
        ),
      );
    };
    next();
  };
  const hum = (freq: number, level: number) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = level;
    osc.connect(g).connect(gain);
    osc.start(t);
    nodes.push(osc);
  };

  switch (kind) {
    case 'night':
      floor('lowpass', 300, 0.02);
      every(0.8, 1.6, (at) => {
        for (let i = 0; i < 3; i++)
          tone(ctx, gain, at + i * 0.07, { f0: rand(4400, 4800), dur: 0.045, gain: 0.025 });
      });
      break;
    case 'campus': {
      // A soft morning at the gate: a barely-there air, and birds singing gently, a few at a
      // time, from near and far (no bell, no hiss).
      floor('lowpass', 300, 0.008);
      const birds = ctx.createBiquadFilter();
      birds.type = 'lowpass';
      birds.frequency.value = 3800;
      birds.connect(gain);
      // A short sung phrase: slurred notes that glide up or down, each eased in and out.
      const phrase = (at: number, near: boolean) => {
        const base = rand(1900, 2700);
        const notes = Math.round(rand(2, 5));
        const level = near ? 0.03 : 0.014;
        let t0 = at;
        for (let i = 0; i < notes; i++) {
          const up = Math.random() < 0.6;
          const f0 = base * rand(0.9, 1.15);
          const dur = rand(0.12, 0.22);
          tone(ctx, birds, t0, {
            f0,
            f1: f0 * (up ? rand(1.12, 1.3) : rand(0.8, 0.9)),
            dur,
            gain: level,
            attack: dur * 0.35,
          });
          t0 += dur + rand(0.04, 0.12);
        }
      };
      every(2.2, 4.5, (at) => phrase(at, true));
      every(3.5, 7, (at) => phrase(at, false));
      // Now and then a soft two-note call from further off.
      every(7, 12, (at) => {
        tone(ctx, birds, at, { f0: 1480, f1: 1400, dur: 0.35, gain: 0.012, attack: 0.12 });
        tone(ctx, birds, at + 0.42, { f0: 1175, f1: 1110, dur: 0.45, gain: 0.012, attack: 0.15 });
      });
      break;
    }
    case 'hall':
      sway(floor('bandpass', 700, 0.05, 0.5), 0.3, 0.02);
      break;
    case 'kolkata':
    case 'office': {
      floor('lowpass', 450, 0.045);
      if (kind === 'kolkata')
        every(9, 15, (at) => {
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 900;
          lp.connect(gain);
          tone(ctx, lp, at, { type: 'sawtooth', f0: 392, dur: 0.22, gain: 0.012 });
          tone(ctx, lp, at, { type: 'sawtooth', f0: 494, dur: 0.22, gain: 0.012 });
          tone(ctx, lp, at + 0.3, { type: 'sawtooth', f0: 392, dur: 0.18, gain: 0.01 });
        });
      break;
    }
    case 'cabin':
      floor('lowpass', 260, 0.09);
      hum(105, 0.02);
      break;
    case 'room':
      floor('lowpass', 350, 0.025);
      break;
    case 'home':
      sway(floor('bandpass', 220, 0.03, 0.6), 0.9, 0.012);
      break;
    case 'study':
    case 'study-night': {
      // A slow, soft pad while he studies: Cmaj7 → Am7 → Fmaj7 → G6, one chord every 4 s.
      floor('lowpass', kind === 'study' ? 380 : 260, 0.02);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      lp.connect(gain);
      const chords = [
        [261.63, 329.63, 392.0, 493.88],
        [220.0, 261.63, 329.63, 392.0],
        [174.61, 220.0, 261.63, 329.63],
        [196.0, 246.94, 293.66, 329.63],
      ];
      let n = 0;
      const pad = (at: number) => {
        for (const f of chords[n++ % chords.length]!)
          for (const detune of [-3, 3])
            tone(ctx, lp, at, {
              type: 'triangle',
              f0: f * Math.pow(2, detune / 1200),
              dur: 5.4,
              gain: 0.012,
              attack: 1.6,
            });
      };
      pad(t + 0.05);
      every(4, 4, pad);
      if (kind === 'study-night')
        every(1.2, 2.2, (at) => {
          for (let i = 0; i < 3; i++)
            tone(ctx, gain, at + i * 0.07, { f0: rand(4400, 4800), dur: 0.045, gain: 0.015 });
        });
      break;
    }
    case 'airport':
    case 'departures':
      // The last screen keeps only the soft chimes: no hall hiss under it.
      if (kind === 'airport') floor('bandpass', 900, 0.045, 0.4);
      every(12, 18, (at) => {
        tone(ctx, gain, at, { f0: 784, dur: 0.6, gain: 0.025 });
        tone(ctx, gain, at + 0.35, { f0: 659, dur: 0.8, gain: 0.025 });
      });
      break;
  }

  return {
    stop(fade) {
      timers.forEach((id) => window.clearTimeout(id));
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + fade);
      nodes.forEach((n) => n.stop(now + fade + 0.05));
      window.setTimeout(() => gain.disconnect(), (fade + 0.2) * 1000);
    },
  };
}

/* ---------- the player ---------- */

const KEY = 'day-muted';
const AMBIENCE_LEVEL = 0.9;

export interface Sound {
  /** Fetch these files now, so they start the moment they're needed. */
  preload(names: SoundName[]): void;
  play(name: SoundName): void;
  /** Keep a looping sound running (true) or stopped (false). Only `typing` loops. */
  loop(name: SoundName, on: boolean): void;
  /** The bed under this scene (null: none). Cheap to call every frame. */
  ambience(scene: string | null, hold: number): void;
  /** A project landing on the shelf: a soft pop, a step higher for each one (a little tune). */
  land(item: number): void;
  muted(): boolean;
  setMuted(muted: boolean): void;
}

export function sound(): Sound {
  let muted = false;
  try {
    muted = localStorage.getItem(KEY) === '1';
  } catch {
    /* storage unavailable: sound on */
  }

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let sfxBus: GainNode | null = null;
  let ambBus: GainNode | null = null;
  const raw = new Map<FileSound, Promise<ArrayBuffer | null>>();
  const decoded = new Map<FileSound, AudioBuffer>();
  const decoding = new Map<FileSound, Promise<AudioBuffer | null>>();
  let typingSrc: AudioBufferSourceNode | null = null;
  let typingWanted = false;
  let bed: Bed | null = null;
  let bedKind: BedKind | null = null;

  const fetchFile = (name: FileSound) => {
    let p = raw.get(name);
    if (!p) {
      p = fetch(FILES[name][0])
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null);
      raw.set(name, p);
    }
    return p;
  };
  const buffer = (name: FileSound): Promise<AudioBuffer | null> => {
    const ready = decoded.get(name);
    if (ready) return Promise.resolve(ready);
    let p = decoding.get(name);
    if (!p) {
      p = fetchFile(name).then(async (data) => {
        if (!data || !ctx) return null;
        try {
          // decodeAudioData detaches its input: decode a copy so a retry still has the bytes.
          const b = await ctx.decodeAudioData(data.slice(0));
          decoded.set(name, b);
          return b;
        } catch {
          return null;
        }
      });
      decoding.set(name, p);
    }
    return p;
  };

  // The context can only start after a gesture; until then every sound is skipped.
  const unlock = () => {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.connect(master);
      ambBus = ctx.createGain();
      ambBus.gain.value = AMBIENCE_LEVEL;
      ambBus.connect(master);
      (Object.keys(FILES) as FileSound[]).forEach((n) => void buffer(n));
    }
    if (ctx.state === 'suspended' && !document.hidden) void ctx.resume();
  };
  for (const ev of ['pointerdown', 'keydown', 'touchend'] as const)
    window.addEventListener(ev, unlock, { capture: true, passive: true });

  // Not 'running' yet is fine: the first press resumes the context asynchronously, and sounds
  // scheduled meanwhile play as soon as it does (so that very first click is heard).
  const live = () => !!ctx && ctx.state !== 'closed' && !muted;

  const duck = () => {
    if (!ctx || !ambBus) return;
    const now = ctx.currentTime;
    ambBus.gain.cancelScheduledValues(now);
    ambBus.gain.setValueAtTime(ambBus.gain.value, now);
    ambBus.gain.linearRampToValueAtTime(AMBIENCE_LEVEL * 0.45, now + 0.08);
    ambBus.gain.setValueAtTime(AMBIENCE_LEVEL * 0.45, now + 1.2);
    ambBus.gain.linearRampToValueAtTime(AMBIENCE_LEVEL, now + 1.8);
  };

  const playFile = (name: FileSound) => {
    void buffer(name).then((b) => {
      if (!b || !ctx || !sfxBus || !live()) return;
      const src = ctx.createBufferSource();
      src.buffer = b;
      const g = ctx.createGain();
      g.gain.value = FILES[name][1];
      src.connect(g).connect(sfxBus);
      src.start();
    });
  };

  const stopTyping = () => {
    if (typingSrc) {
      try {
        typingSrc.stop();
      } catch {
        /* already stopped */
      }
      typingSrc = null;
    }
  };
  const startTyping = () => {
    if (typingSrc) return;
    void buffer('typing').then((b) => {
      if (!b || !ctx || !sfxBus || !live() || !typingWanted || typingSrc) return;
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = FILES.typing[1];
      src.connect(g).connect(sfxBus);
      src.start();
      typingSrc = src;
    });
  };

  const stopBed = (fade = 1.2) => {
    bed?.stop(fade);
    bed = null;
    bedKind = null;
  };

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else if (!muted) void ctx.resume();
  });

  return {
    preload(names) {
      for (const n of names) if (n in FILES) void fetchFile(n as FileSound);
    },
    play(name) {
      if (!live() || !ctx || !sfxBus) return;
      if (DUCK.has(name)) duck();
      if (name in FILES) playFile(name as FileSound);
      else SYNTHS[name as SynthSound](ctx, sfxBus, ctx.currentTime + 0.01);
    },
    loop(name, on) {
      if (name !== 'typing') return;
      typingWanted = on;
      if (on && live()) startTyping();
      else stopTyping();
    },
    ambience(scene, hold) {
      if (!live() || !ctx || !ambBus) {
        if (bed && (muted || !ctx)) stopBed(0.3);
        return;
      }
      const kind = scene ? bedFor(scene, hold) : null;
      if (kind === bedKind) return;
      stopBed();
      if (kind) {
        bed = makeBed(ctx, ambBus, kind);
        bedKind = kind;
      }
    },
    land(item) {
      if (!live() || !ctx || !sfxBus) return;
      const notes = [659.25, 783.99, 987.77, 1174.66, 1318.51];
      const f = notes[Math.max(0, item) % notes.length]!;
      const t = ctx.currentTime + 0.01;
      tone(ctx, sfxBus, t, { f0: f * 1.5, f1: f, dur: 0.05, gain: 0.12 });
      tone(ctx, sfxBus, t + 0.02, { type: 'triangle', f0: f, dur: 0.28, gain: 0.16 });
    },
    muted: () => muted,
    setMuted(m) {
      muted = m;
      if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05);
      if (m) {
        stopTyping();
        stopBed(0.3);
      }
      try {
        localStorage.setItem(KEY, m ? '1' : '0');
      } catch {
        /* not remembered */
      }
    },
  };
}

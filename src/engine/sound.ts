/**
 * Sound effects (src/assets/sound_effect/). Each file loads only when first needed; browsers
 * let them play once the visitor has interacted with the page. A mute button in the player
 * turns them off (remembered in this browser).
 *
 *   click   any button or link you press, and the clicks that happen on screen (cues below)
 *   typing  loops while his hands are on the keyboard and the journey is moving
 *   flight  the cabin chime as a flight chapter begins
 *   mail    the bell as a mail (or a reply) arrives
 */
import clickUrl from '../assets/sound_effect/matthewvakaliuk73627-mouse-click-290204.mp3?url';
import typingUrl from '../assets/sound_effect/dragon-studio-keyboard-typing-sound-effect-335503.mp3?url';
import flightUrl from '../assets/sound_effect/arunangshubanerjee-airbus-cabin-pa-beep-tone-passenger-announcement-chime-358248.mp3?url';
import mailUrl from '../assets/sound_effect/soundreality-bell-sound-effect-613873.mp3?url';

export type SoundName = 'click' | 'typing' | 'flight' | 'mail';

const SRC: Record<SoundName, [string, number]> = {
  click: [clickUrl, 0.6],
  typing: [typingUrl, 0.35],
  flight: [flightUrl, 0.6],
  mail: [mailUrl, 0.55],
};

/**
 * On-screen moments, per scene: [hold progress, sound]. They play when the journey passes them
 * going forward (not on jumps).
 */
export const CUES: Record<string, Array<[number, SoundName]>> = {
  // The interviews (Lottie frames 162 leave, 198 mail, 232 open, over hold 0.04 → 0.94).
  '04-interview': [
    [0.483, 'click'],
    [0.582, 'mail'],
    [0.675, 'click'],
  ],
  '08-interview': [
    [0.483, 'click'],
    [0.582, 'mail'],
    [0.675, 'click'],
  ],
  '04-flight-hyd': [[0.03, 'flight']],
  '07-flight-home': [[0.03, 'flight']],
  // Twilio onboarding: Test connection, Save.
  '09-neura-apps': [
    [0.899, 'click'],
    [0.928, 'click'],
  ],
  // The refund: ticket submitted (frame 150), Twilio Support's reply (184), over 0.04 → 0.78.
  '09-twilio-refund': [
    [0.377, 'click'],
    [0.454, 'mail'],
  ],
  // Razorpay: choose UPI, Pay.
  '11-khyaati': [
    [0.693, 'click'],
    [0.731, 'click'],
  ],
};

const KEY = 'day-muted';

export interface Sound {
  play(name: SoundName): void;
  /** Keep a looping sound running (true) or stopped (false). */
  loop(name: SoundName, on: boolean): void;
  muted(): boolean;
  setMuted(muted: boolean): void;
}

export function sound(): Sound {
  const els = new Map<SoundName, HTMLAudioElement>();
  let muted = false;
  try {
    muted = localStorage.getItem(KEY) === '1';
  } catch {
    /* storage unavailable: sound on */
  }
  const get = (name: SoundName) => {
    let a = els.get(name);
    if (!a) {
      const [src, volume] = SRC[name];
      a = new Audio(src);
      a.volume = volume;
      a.loop = name === 'typing';
      els.set(name, a);
    }
    return a;
  };
  const start = (a: HTMLAudioElement) => void a.play().catch(() => {});
  const stopAll = () => els.forEach((a) => a.pause());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAll();
  });
  return {
    play(name) {
      if (muted) return;
      const a = get(name);
      a.currentTime = 0;
      start(a);
    },
    loop(name, on) {
      if (on && !muted) {
        const a = get(name);
        if (a.paused) start(a);
      } else {
        const a = els.get(name);
        if (a && !a.paused) a.pause();
      }
    },
    muted: () => muted,
    setMuted(m) {
      muted = m;
      if (m) stopAll();
      try {
        localStorage.setItem(KEY, m ? '1' : '0');
      } catch {
        /* not remembered */
      }
    },
  };
}

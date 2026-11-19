/**
 * Chapter 09: the team sync, from Suman's reference drawing (meet_2_laugh_tee_techlead.svg):
 * a large "You | Tech Lead" tile with the avatar laughing in a mustard tee, tiles for Faisal,
 * Rajat and "+3 others", a "You joined the meeting" toast and the call controls.
 *
 * The stand-up plays across its window of the hold: you join, Suman asks "What's everyone
 * working on today?", then each of the team answers in turn — a speech bubble by their tile,
 * a green speaking ring and a little nod while they talk.
 *
 * The drawing keeps its own 820×500 coordinates inside a nested <svg> that letterboxes into
 * the screen rect. Gradients are flattened; the one clip path gets a unique id per mount.
 * Generic call UI only — no product logos.
 */
import type { Screen } from '../engine/types';
import { easeOut, mod, progress } from '../lib/math';
import type { Window } from './lead-workday';
import { screenFrame, setTransform, svgEl } from '../lib/svg';

let seq = 0;

const FONT = 'font-family="Arial,sans-serif"';

/** The laughing avatar in a mustard tee, in the drawing's 400×400 bust coordinates. */
const LAUGHING_AVATAR = `
<path d="M168,225 L232,225 L238,298 Q200,318 162,298 Z" fill="#9c6842"/>
<path d="M30,400 C40,325 105,300 160,288 L240,288 C295,300 360,325 370,400 Z" fill="#e3a72f"/>
<path d="M160,290 Q200,326 240,290" stroke="#c48d1f" stroke-width="9" fill="none" stroke-linecap="round"/>
<path d="M90,330 Q100,360 96,400 M310,330 Q300,360 304,400" stroke="#c48d1f" stroke-width="3" fill="none"/>
<ellipse cx="129" cy="172" rx="13" ry="22" fill="#a87249"/><ellipse cx="271" cy="172" rx="13" ry="22" fill="#a87249"/>
<ellipse cx="200" cy="162" rx="72" ry="88" fill="#b67d52"/>
<path d="M127,155 C112,95 145,48 200,46 C258,46 290,92 274,155 C270,128 262,112 246,104 C222,92 178,92 156,102 C140,110 131,128 127,155 Z" fill="#17120f"/>
<circle cx="160" cy="66" r="18" fill="#17120f"/><circle cx="190" cy="54" r="20" fill="#17120f"/><circle cx="222" cy="56" r="19" fill="#17120f"/>
<circle cx="250" cy="70" r="17" fill="#17120f"/><circle cx="140" cy="88" r="15" fill="#17120f"/><circle cx="264" cy="94" r="14" fill="#17120f"/>
<path d="M175,70 q12,-8 22,2 M210,66 q12,-6 20,4" stroke="#3a2c24" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<path d="M129,170 C130,232 160,266 200,268 C240,266 270,232 271,170 C266,198 256,214 242,220 C226,210 174,210 158,220 C144,214 134,198 129,170 Z" fill="#1c1612"/>
<path d="M172,216 Q200,258 228,216 Z" fill="#4a1714"/><path d="M176,217 Q200,223 224,217 L222,223 Q200,229 178,223 Z" fill="#fff"/>
<ellipse cx="200" cy="240" rx="11" ry="6" fill="#c9575a"/>
<path d="M168,214 C178,202 194,204 200,209 C206,204 222,202 232,214 C220,218 208,216 200,214 C192,216 180,218 168,214 Z" fill="#120d0b"/>
<path d="M144,134 Q166,122 190,132 M210,132 Q234,122 256,134" stroke="#120d0b" stroke-width="7" fill="none" stroke-linecap="round"/>
<path d="M157,168 Q167,157 177,168 M223,168 Q233,157 243,168" stroke="#2a1a12" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<path d="M200,168 Q196,186 190,194 Q200,202 210,194" stroke="#8a5a38" stroke-width="3" fill="none" stroke-linecap="round"/>
<rect x="138" y="146" width="56" height="38" rx="7" fill="#fff" fill-opacity="0.12" stroke="#0c0c0c" stroke-width="5"/>
<rect x="206" y="146" width="56" height="38" rx="7" fill="#fff" fill-opacity="0.12" stroke="#0c0c0c" stroke-width="5"/>
<path d="M194,158 Q200,153 206,158" stroke="#0c0c0c" stroke-width="4" fill="none"/>
<path d="M138,156 L126,160 M262,156 L274,160" stroke="#0c0c0c" stroke-width="4" stroke-linecap="round"/>
<path d="M146,152 L156,152 M214,152 L224,152" stroke="#fff" stroke-opacity="0.6" stroke-width="2.5" stroke-linecap="round"/>`;

/** The stand-up, in the call's own progress (0–1): who speaks when, and what they say. */
const TALK: Array<{ who: number; name: string; say: string; at: number; until: number }> = [
  { who: 0, name: 'You', say: "What's everyone working on today?", at: 0.2, until: 0.34 },
  { who: 1, name: 'Faisal', say: 'Auth API, PR up by noon', at: 0.36, until: 0.52 },
  { who: 2, name: 'Rajat', say: 'Fixing the SSE retry bug', at: 0.54, until: 0.7 },
  { who: 3, name: 'Priya (+2)', say: 'QA on the mobile build', at: 0.72, until: 0.88 },
];
/** Where each bubble sits (its box and the tip of its tail), in the drawing's units. */
const BUBBLE: Array<{ x: number; y: number; w: number; tip: [number, number] }> = [
  { x: 40, y: 318, w: 330, tip: [70, 380] },
  { x: 336, y: 42, w: 250, tip: [604, 70] },
  { x: 336, y: 186, w: 250, tip: [604, 214] },
  { x: 336, y: 330, w: 250, tip: [604, 358] },
];

function bubbleMarkup(i: number): string {
  const t = TALK[i]!;
  const b = BUBBLE[i]!;
  const h = 52;
  // The tail: down-left for Suman's (into his tile), right for the team's (to their tiles).
  const tail =
    i === 0
      ? `M${b.x + 22},${b.y + h - 1} L${b.tip[0]},${b.tip[1]} L${b.x + 46},${b.y + h - 1} Z`
      : `M${b.x + b.w - 1},${b.y + 16} L${b.tip[0]},${b.tip[1]} L${b.x + b.w - 1},${b.y + 36} Z`;
  return `
<g data-bubble="${i}">
  <path d="${tail}" fill="#fff"/>
  <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${h}" rx="14" fill="#fff"/>
  <text x="${b.x + 14}" y="${b.y + 19}" ${FONT} font-size="11" font-weight="700" fill="#1a73e8">${t.name}</text>
  <text x="${b.x + 14}" y="${b.y + 39}" ${FONT} font-size="${i === 0 ? 16 : 14.5}" fill="#202124">${t.say.replace(/'/g, '&#39;')}</text>
</g>`;
}

const sideTile = (y: number, color: string, letter: string, name: string, tile: number) => `
<g data-tile="${tile}">
  <rect x="610" y="${y}" width="190" height="122" rx="10" fill="#3c4043"/>
  <g data-face="${tile}">
  <circle cx="705" cy="${y + 56}" r="28" fill="${color}"/>
  <text x="705" y="${y + 66}" text-anchor="middle" ${FONT} font-size="26" fill="#fff">${letter}</text>
  </g>
  <rect data-ring="${tile}" x="611.5" y="${y + 1.5}" width="187" height="119" rx="9" fill="none" stroke="#34a853" stroke-width="3" opacity="0"/>
  <text x="620" y="${y + 114}" ${FONT} font-size="12" fill="#fff">${name}</text>
  <circle cx="784" cy="${y + 16}" r="10" fill="#202124" opacity="0.7"/>
  <rect x="781" y="${y + 9}" width="6" height="10" rx="3" fill="#fff"/>
  <path d="M778,${y + 8} L790,${y + 24}" stroke="#ea4335" stroke-width="2"/>
</g>`;

function meetMarkup(clip: string): string {
  return `
<rect width="820" height="500" fill="#202124"/>
<defs><clipPath id="${clip}"><rect x="20" y="20" width="570" height="410" rx="14"/></clipPath></defs>
<g data-tile="0">
  <g clip-path="url(#${clip})">
    <rect x="20" y="20" width="570" height="410" fill="#4b4e55"/>
    <circle cx="305" cy="190" r="240" fill="#5d6067"/>
    <g transform="translate(105 30)">${LAUGHING_AVATAR}</g>
  </g>
  <rect x="20" y="20" width="570" height="410" rx="14" fill="none" stroke="#8ab4f8" stroke-width="3"/>
  <rect data-ring="0" x="20" y="20" width="570" height="410" rx="14" fill="none" stroke="#34a853" stroke-width="4" opacity="0"/>
  <rect x="32" y="396" width="124" height="24" rx="6" fill="#202124" opacity="0.75"/>
  <text x="94" y="413" text-anchor="middle" ${FONT} font-size="13" fill="#fff">You | Tech Lead</text>
  <rect x="548" y="32" width="30" height="30" rx="15" fill="#8ab4f8"/>
  <rect data-bar="0" x="556" y="44" width="3" height="8" fill="#202124"/>
  <rect data-bar="1" x="562" y="39" width="3" height="13" fill="#202124"/>
  <rect data-bar="2" x="568" y="42" width="3" height="10" fill="#202124"/>
</g>
${sideTile(20, '#7b5cc4', 'F', 'Faisal', 1)}
${sideTile(164, '#d0632b', 'R', 'Rajat', 2)}
<g data-tile="3">
  <rect x="610" y="308" width="190" height="122" rx="10" fill="#3c4043"/>
  <g data-face="3">
  <circle cx="705" cy="364" r="28" fill="#1e8e5a"/>
  <text x="705" y="374" text-anchor="middle" ${FONT} font-size="26" fill="#fff">+3</text>
  </g>
  <text x="620" y="422" ${FONT} font-size="12" fill="#fff">3 others</text>
  <rect data-ring="3" x="611.5" y="309.5" width="187" height="119" rx="9" fill="none" stroke="#34a853" stroke-width="3" opacity="0"/>
</g>
<g data-toast="">
  <rect x="190" y="36" width="230" height="34" rx="17" fill="#e8eaed"/>
  <text x="305" y="58" text-anchor="middle" ${FONT} font-size="14" fill="#202124">You joined the meeting</text>
</g>
<text x="24" y="474" ${FONT} font-size="15" fill="#e8eaed">10:00 AM  |  Team sync</text>
<circle cx="300" cy="468" r="22" fill="#3c4043"/><rect x="295" y="456" width="10" height="16" rx="5" fill="#fff"/>
<path d="M290,467 Q300,482 310,467 M300,476 L300,481" stroke="#fff" stroke-width="2" fill="none"/>
<circle cx="354" cy="468" r="22" fill="#3c4043"/><rect x="342" y="460" width="16" height="16" rx="3" fill="#fff"/>
<path d="M358,464 L366,459 L366,477 L358,472 Z" fill="#fff"/>
<circle cx="408" cy="468" r="22" fill="#3c4043"/><rect x="398" y="458" width="20" height="14" rx="2" fill="none" stroke="#fff" stroke-width="2"/>
<path d="M408,469 L408,461 M404,464 L408,460 L412,464 M403,477 L413,477" stroke="#fff" stroke-width="2" fill="none"/>
<circle cx="462" cy="468" r="22" fill="#3c4043"/><circle cx="455" cy="468" r="2.5" fill="#fff"/><circle cx="462" cy="468" r="2.5" fill="#fff"/><circle cx="469" cy="468" r="2.5" fill="#fff"/>
<rect x="496" y="446" width="64" height="44" rx="22" fill="#ea4335"/>
<path d="M512,472 Q528,456 544,472 L540,476 L534,472 L534,468 Q528,465 522,468 L522,472 L516,476 Z" fill="#fff"/>
<path d="M728,460 L752,460 L752,474 L738,474 L732,480 L732,474 L728,474 Z" fill="none" stroke="#e8eaed" stroke-width="2"/>
<circle cx="785" cy="462" r="5" fill="none" stroke="#e8eaed" stroke-width="2"/>
<path d="M776,478 Q785,466 794,478" stroke="#e8eaed" stroke-width="2" fill="none"/>
${TALK.map((_, i) => bubbleMarkup(i)).join('')}`;
}

/** Tile centres in the drawing's coordinates (pop-in origins). */
const TILE_ORIGIN = ['305px 225px', '705px 81px', '705px 225px', '705px 369px'];

/** `win`: the stand-up's window of the hold. */
export function callGrid(rect: SVGGraphicsElement, win: Window = [0, 1]): Screen {
  const { g, x, y, w, h } = screenFrame(rect);
  svgEl('rect', { x, y, width: w, height: h, fill: '#202124' }, g);
  const view = svgEl(
    'svg',
    { x, y, width: w, height: h, viewBox: '0 0 820 500', preserveAspectRatio: 'xMidYMid meet' },
    g,
  );
  view.innerHTML = meetMarkup(`meet-clip-${++seq}`);

  const tiles = Array.from(view.querySelectorAll<SVGGElement>('[data-tile]'));
  tiles.forEach((t, i) => (t.style.transformOrigin = TILE_ORIGIN[i] ?? 'center'));
  const toast = view.querySelector<SVGGElement>('[data-toast]');
  if (toast) toast.style.transformOrigin = '305px 53px';
  const bars = Array.from(view.querySelectorAll<SVGRectElement>('[data-bar]'));
  const bubbles = TALK.map((_, i) => {
    const el = view.querySelector<SVGGElement>(`[data-bubble="${i}"]`)!;
    el.style.transformOrigin = `${BUBBLE[i]!.tip[0]}px ${BUBBLE[i]!.tip[1]}px`;
    return el;
  });
  const rings = TALK.map((t) => view.querySelector<SVGRectElement>(`[data-ring="${t.who}"]`));
  const faces = TALK.map((t) => view.querySelector<SVGGElement>(`[data-face="${t.who}"]`));
  const barBase: Array<[number, number]> = [
    [44, 8],
    [39, 13],
    [42, 10],
  ];

  return {
    update({ hold: h, idle, reduced }) {
      // The call's own progress.
      const hold = progress(h, win[0], win[1]);
      tiles.forEach((t, i) => {
        const k = reduced ? 1 : easeOut(progress(hold, i * 0.03, 0.08 + i * 0.03), 1.5);
        setTransform(t, k >= 1 ? '' : `scale(${k.toFixed(3)})`);
        t.style.visibility = k <= 0 ? 'hidden' : '';
      });
      if (toast) {
        // Pops in as you join, then tucks away.
        const k = reduced
          ? hold < 0.4
            ? 1
            : 0
          : Math.min(easeOut(progress(hold, 0.06, 0.12), 1.6), 1 - progress(hold, 0.16, 0.2));
        setTransform(toast, k >= 1 ? '' : `scale(${Math.max(0, k).toFixed(3)})`);
        toast.style.visibility = k <= 0 ? 'hidden' : '';
      }
      // The stand-up: each bubble pops in as they start talking and stays; the speaker's tile
      // lights up green and their face nods while they talk.
      TALK.forEach((t, i) => {
        const k = reduced
          ? hold >= t.at
            ? 1
            : 0
          : easeOut(progress(hold, t.at, t.at + 0.04), 1.5);
        const b = bubbles[i]!;
        setTransform(b, k >= 1 ? '' : `scale(${Math.max(0, k).toFixed(3)})`);
        b.style.visibility = k <= 0 ? 'hidden' : '';
        const talking = hold >= t.at && hold < t.until;
        rings[i]?.setAttribute('opacity', talking ? '1' : '0');
        const face = faces[i];
        if (face && i > 0) {
          const nod = talking && !reduced ? Math.abs(Math.sin(idle * 6)) * 5 : 0;
          face.setAttribute('transform', nod ? `translate(0 ${nod.toFixed(1)})` : '');
        }
      });
      // Speaking indicator: you're laughing, so the bars dance.
      bars.forEach((b, i) => {
        const [y0, h0] = barBase[i]!;
        const s = reduced
          ? 1
          : 0.5 + 0.6 * Math.abs(Math.sin(idle * 7 + i * 1.7)) + 0.15 * mod(i, 2);
        const hh = h0 * s;
        b.setAttribute('y', (y0 + h0 - hh).toFixed(1));
        b.setAttribute('height', hh.toFixed(1));
      });
    },
  };
}

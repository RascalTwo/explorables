export type P = { x: number; y: number };
export type Kf = P & { t: number };
export type Stride = { x: number; y: number; k: string; n?: string };
export type Api = { onShow?: () => void; onHide?: () => void };
export type Force = "baseline" | "straight" | "middle";
export const isForce = (s: string | undefined): s is Force =>
  s === "baseline" || s === "straight" || s === "middle";
/** An element the markup is known to have; throws when it is missing (each tab's init runs inside `safe`, which logs it). */
export const need = <E extends Element>(e: E | null, sel: string): E => {
  if (!e) throw new Error("missing element " + sel);
  return e;
};
export const scope =
  (root: HTMLElement): ((s: string) => HTMLElement) =>
  (s: string) =>
    need(root.querySelector<HTMLElement>(s), s);
export const RIM = { x: 250, y: 56 };
export const dist = (a: P, b: P): number => Math.hypot(a.x - b.x, a.y - b.y);
export const norm = (a: P): P => {
  const l = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / l, y: a.y / l };
};
export const sub = (a: P, b: P): P => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a: P, b: P): P => ({ x: a.x + b.x, y: a.y + b.y });
export const mul = (a: P, k: number): P => ({ x: a.x * k, y: a.y * k });
export const perp = (a: P): P => ({ x: -a.y, y: a.x });
export const ease = (p: number): number => p * p * (3 - 2 * p);
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export function along(pts: P[], a: number): P {
  const segs = pts.length - 1;
  const x = clamp(a, 0, 1) * segs;
  const i = Math.min(segs - 1, Math.floor(x));
  let f = ease(x - i);
  const A = pts[i]!,
    B = pts[i + 1]!;
  return { x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f };
}
export const sampleKf = (kf: Kf[], t0: number): P => {
  const t = clamp(t0, 0, 1);
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i]!,
      b = kf[i + 1]!;
    if (t >= a.t && t <= b.t) {
      const p = b.t === a.t ? 0 : ease((t - a.t) / (b.t - a.t));
      return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
    }
  }
  const l = kf.at(-1)!;
  return { x: l.x, y: l.y };
};
export const pathD = (pts: P[]): string =>
  pts.map((p, i) => (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ");

export const COURT = `
  <rect x="20" y="20" width="460" height="450" fill="#241a0e" stroke="#6b5836" stroke-width="2"/>
  <rect x="170" y="20" width="160" height="190" fill="#3a2b14" stroke="#6b5836" stroke-width="2"/>
  <circle cx="250" cy="210" r="60" fill="none" stroke="#6b5836" stroke-width="2"/>
  <path d="M 210 60 A 40 40 0 0 0 290 60" fill="none" stroke="#6b5836" stroke-width="2"/>
  <path d="M 55 20 L 55 145 A 215 215 0 0 0 445 145 L 445 20" fill="none" stroke="#6b5836" stroke-width="2"/>
  <line x1="225" y1="42" x2="275" y2="42" stroke="#cbb78a" stroke-width="4"/>
  <circle cx="250" cy="56" r="9" fill="none" stroke="#ff7a3c" stroke-width="3"/>`;

export const O = { x: 405, y: 205 }; // shooter, right wing at the 3pt line
export const HELP = { x: 255, y: 195 }; // your help position, one pass away
export const dir = norm(sub(O, HELP)); // help -> shooter unit
export const toMid = norm(sub({ x: 250, y: 210 }, O)); // from shooter toward the middle/lane
export const toBase = mul(toMid, -1); // toward baseline / sideline

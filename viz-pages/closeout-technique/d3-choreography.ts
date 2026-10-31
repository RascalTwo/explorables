import { clamp, ease } from "./common.js";
import type { Foot } from "./d3-figures.js";

// ground coords: rim at z=-22,x=0. shooter on right wing. defender closes out from help.
export const SHOOTER: [number, number] = [8, -9];
export const rootKf: [number, number, number][] = [
  [0, -3, -3],
  [0.2, 1, -5.5],
  [0.42, 4.6, -8],
  [0.58, 5.7, -8.6],
  [0.74, 6.1, -8.9],
  [1, 6.3, -9],
];
export const sample3 = (kf: [number, number, number][], t: number): [number, number] => {
  for (let i = 0; i < kf.length - 1; i++) {
    const A = kf[i]!,
      B = kf[i + 1]!;
    if (t >= A[0] && t <= B[0]) {
      const p = B[0] === A[0] ? 0 : ease((t - A[0]) / (B[0] - A[0]));
      return [A[1] + (B[1] - A[1]) * p, A[2] + (B[2] - A[2]) * p];
    }
  }
  const L = kf.at(-1)!;
  return [L[1], L[2]];
};
// Footstep plants along the path: long sprint strides that shrink to short chops, then a wide stance.
// Each foot alternates L/R; positions are offset perpendicular to travel so the base has width.
export const PLANTS = [
  { t: 0.08, side: "L", kind: "sprint" },
  { t: 0.2, side: "R", kind: "sprint" },
  { t: 0.33, side: "L", kind: "sprint" },
  { t: 0.45, side: "R", kind: "chop" },
  { t: 0.53, side: "L", kind: "chop" },
  { t: 0.61, side: "R", kind: "chop" },
  { t: 0.69, side: "L", kind: "chop" },
  { t: 0.8, side: "R", kind: "stance" },
  { t: 0.88, side: "L", kind: "stance" },
].map((p) => {
  const [x, z] = sample3(rootKf, p.t);
  const [x2, z2] = sample3(rootKf, Math.min(1, p.t + 0.02));
  const dx = x2 - x,
    dz = z2 - z,
    l = Math.hypot(dx, dz) || 1;
  const px = -dz / l,
    pz = dx / l; // left-perp of travel
  const w = p.kind === "sprint" ? 0.42 : p.kind === "chop" ? 0.6 : 0.95,
    s = p.side === "L" ? 1 : -1;
  return { t: p.t, side: p.side, kind: p.kind, pos: { x: x + px * w * s, z: z + pz * w * s } };
});
const F0 = (s: number): Foot => ({
  x: sample3(rootKf, 0)[0] + s * 0.42,
  z: sample3(rootKf, 0)[1],
  y: 0,
});
export function feet(t: number): { fL: Foot; fR: Foot } {
  let fL = F0(-1),
    fR = F0(1);
  for (let i = 0; i < PLANTS.length; i++) {
    const p = PLANTS[i]!;
    if (p.t <= t) {
      if (p.side === "L") fL = { x: p.pos.x, z: p.pos.z, y: 0 };
      else fR = { x: p.pos.x, z: p.pos.z, y: 0 };
      continue;
    }
    // first future plant = the swinging foot; lift it in an arc from its last plant to the next
    const from = p.side === "L" ? fL : fR,
      prevT = i > 0 ? PLANTS[i - 1]!.t : 0;
    const e = clamp((t - prevT) / (p.t - prevT), 0, 1);
    const lift = Math.sin(e * Math.PI) * (p.kind === "sprint" ? 0.6 : 0.28);
    const sx = from.x + (p.pos.x - from.x) * e,
      sz = from.z + (p.pos.z - from.z) * e;
    if (p.side === "L") fL = { x: sx, z: sz, y: lift };
    else fR = { x: sx, z: sz, y: lift };
    break;
  }
  return { fL, fR };
}
export const PHASES: [number, string, string][] = [
  [0, "The sprint", "Tall and fast — long strides eating up the gap. No control yet, all speed."],
  [0.42, "Chop it down", "Steps shorten, hips start to drop. You're trading speed for balance."],
  [
    0.58,
    "Sink the hips",
    "Butt down, chest up, base wide. This low stance is what lets you move any direction.",
  ],
  [
    0.78,
    "High hand, contest",
    "Landed at an arm's length. Top hand high in the shot, low hand out to wall the drive.",
  ],
];

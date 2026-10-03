// Rough.js 4.6.6 playground. Everything drawn here goes through the library's public API:
//   rough.generator() -> Drawable  ->  rough.canvas().draw() / rough.svg().draw() / toPaths()
import { $ } from "/_kit/viz.js";

import { rough, gen, P, reduced, svgEl, h, sk, bytes, live, redrawLive, bump, boil, type Pt, type Opts, type OpSet, type Drawable, type RoughCanvas } from "./rk.js";
import { initShowcase } from "./showcase.js";

let boilTimer = 0;
$("#boil-prev")!.addEventListener("click", () => bump(-1));
$("#boil-next")!.addEventListener("click", () => bump(1));
const playBtn = $("#boil-play") as HTMLButtonElement;
if (reduced) { playBtn.disabled = true; playBtn.title = "Disabled: prefers-reduced-motion"; }
playBtn.addEventListener("click", () => {
  const on = playBtn.getAttribute("aria-pressed") !== "true";
  playBtn.setAttribute("aria-pressed", String(on));
  clearInterval(boilTimer);
  if (on) boilTimer = window.setInterval(() => bump(1), 140);
});
addEventListener("keydown", (e) => {
  const t = e.target as HTMLElement;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
  if (e.key === "ArrowRight") bump(1);
  if (e.key === "ArrowLeft") bump(-1);
});

/* ───────────────────────── shape catalogue (size-parametric, used by every section) ───────────────────────── */
type ShapeName = "line" | "rectangle" | "ellipse" | "circle" | "linearPath" | "polygon" | "arc" | "arcClosed" | "curve" | "curveMulti" | "path" | "pathMulti";
interface ShapeDef { label: string; sig: string; fn: (o: Opts, w: number, h: number) => Drawable; note?: string }
const sc = (pts: Pt[], w: number, hh: number): Pt[] => pts.map(([x, y]) => [x * w, y * hh] as Pt);
const star = (w: number, hh: number): Pt[] => {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.2 : 0.46, a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([w / 2 + Math.cos(a) * r * Math.min(w, hh) * 1.35, hh / 2 + Math.sin(a) * r * Math.min(w, hh) * 1.35]);
  }
  return pts;
};
const WAVE: Pt[] = [[0.08, 0.6], [0.25, 0.2], [0.42, 0.75], [0.6, 0.25], [0.75, 0.7], [0.92, 0.4]];
const SHAPES: Record<ShapeName, ShapeDef> = {
  line: { label: "line", sig: "rc.line(x1, y1, x2, y2, options)", fn: (o, w, hh) => gen.line(w * 0.1, hh * 0.85, w * 0.9, hh * 0.15, o), note: "fill is ignored for open shapes" },
  rectangle: { label: "rectangle", sig: "rc.rectangle(x, y, width, height, options)", fn: (o, w, hh) => gen.rectangle(w * 0.12, hh * 0.15, w * 0.76, hh * 0.7, o) },
  ellipse: { label: "ellipse", sig: "rc.ellipse(cx, cy, width, height, options)", fn: (o, w, hh) => gen.ellipse(w / 2, hh / 2, w * 0.78, hh * 0.62, o) },
  circle: { label: "circle", sig: "rc.circle(cx, cy, diameter, options)", fn: (o, w, hh) => gen.circle(w / 2, hh / 2, Math.min(w, hh) * 0.72, o) },
  linearPath: { label: "linearPath", sig: "rc.linearPath([[x, y], …], options)", fn: (o, w, hh) => gen.linearPath(sc([[0.1, 0.8], [0.3, 0.2], [0.5, 0.8], [0.7, 0.2], [0.9, 0.8]], w, hh), o), note: "open polyline — fill ignored" },
  polygon: { label: "polygon", sig: "rc.polygon([[x, y], …], options)", fn: (o, w, hh) => gen.polygon(star(w, hh), o) },
  arc: { label: "arc (open)", sig: "rc.arc(cx, cy, w, h, start, stop, false, options)", fn: (o, w, hh) => gen.arc(w / 2, hh / 2, w * 0.8, hh * 0.7, -Math.PI * 0.85, Math.PI * 0.35, false, o), note: "closed=false: fill is ignored" },
  arcClosed: { label: "arc (closed)", sig: "rc.arc(cx, cy, w, h, start, stop, true, options)", fn: (o, w, hh) => gen.arc(w / 2, hh / 2, w * 0.8, hh * 0.7, -Math.PI * 0.85, Math.PI * 0.35, true, o), note: "closed=true draws the pie wedge" },
  curve: { label: "curve", sig: "rc.curve([[x, y], …], options)", fn: (o, w, hh) => gen.curve(sc(WAVE, w, hh), o) },
  curveMulti: { label: "curve (Point[][])", sig: "rc.curve([[…], […]], options)", fn: (o, w, hh) => gen.curve([sc([[0.1, 0.3], [0.3, 0.1], [0.5, 0.35], [0.9, 0.2]], w, hh), sc([[0.1, 0.8], [0.4, 0.55], [0.7, 0.9], [0.9, 0.7]], w, hh)], o), note: "several polylines in one Drawable" },
  path: { label: "path (SVG d)", sig: "rc.path('M… C… Z', options)", fn: (o, w, hh) => gen.path(`M ${w / 2} ${hh * 0.86} C ${w * 0.02} ${hh * 0.55}, ${w * 0.2} ${hh * 0.06}, ${w / 2} ${hh * 0.32} C ${w * 0.8} ${hh * 0.06}, ${w * 0.98} ${hh * 0.55}, ${w / 2} ${hh * 0.86} Z`, o), note: "a heart from cubic béziers" },
  pathMulti: { label: "path (arcs, sub-paths)", sig: "rc.path('M… A… Z M… Z', options)", fn: (o, w, hh) => gen.path(`M ${w * 0.15} ${hh * 0.85} L ${w * 0.15} ${hh * 0.4} L ${w * 0.5} ${hh * 0.12} L ${w * 0.85} ${hh * 0.4} L ${w * 0.85} ${hh * 0.85} Z M ${w * 0.42} ${hh * 0.85} L ${w * 0.42} ${hh * 0.6} A ${w * 0.08} ${hh * 0.08} 0 0 1 ${w * 0.58} ${hh * 0.6} L ${w * 0.58} ${hh * 0.85} Z`, o), note: "a house: line, arc & 2 sub-paths" },
};
const SHAPE_NAMES = Object.keys(SHAPES) as ShapeName[];
const FILL_STYLES = ["hachure", "solid", "zigzag", "cross-hatch", "dots", "dashed", "zigzag-line"];

/* ───────────────────────── 1 · Options lab ───────────────────────── */
const NUM_KEYS = ["roughness", "bowing", "maxRandomnessOffset", "strokeWidth", "curveFitting", "curveTightness", "curveStepCount",
  "fillWeight", "hachureAngle", "hachureGap", "simplification", "dashOffset", "dashGap", "zigzagOffset", "seed",
  "strokeLineDashOffset", "fillLineDashOffset", "fixedDecimalPlaceDigits", "fillShapeRoughnessGain"] as const;
type NumKey = typeof NUM_KEYS[number];
const DEF = gen.defaultOptions;
const numDefault = (k: NumKey): number => { const v = DEF[k]; return typeof v === "number" ? v : k === "fixedDecimalPlaceDigits" ? -1 : 0; };
const initNums = (): Record<NumKey, number> => {
  const r = {} as Record<NumKey, number>;
  for (const k of NUM_KEYS) r[k] = numDefault(k);
  r.seed = 42;
  return r;
};
const DASHES: Record<string, number[] | undefined> = { none: undefined, "[8, 6]": [8, 6], "[2, 6]": [2, 6], "[14, 4, 2, 4]": [14, 4, 2, 4] };
interface LabState { shape: ShapeName; num: Record<NumKey, number>; fillStyle: string; strokeDash: string; fillDash: string; disableMultiStroke: boolean; disableMultiStrokeFill: boolean; preserveVertices: boolean; strokeOn: boolean; stroke: string; fillOn: boolean; fill: string }
const initLab = (): LabState => ({ shape: "rectangle", num: initNums(), fillStyle: "hachure", strokeDash: "none", fillDash: "none", disableMultiStroke: false, disableMultiStrokeFill: false, preserveVertices: false, strokeOn: true, stroke: P.ink, fillOn: true, fill: P.c3 });
const lab = initLab();
// Lab state survives a reload via sessionStorage; the URL hash is reserved for deep links (#section, #ultra/<scene>).
interface Stored { lab?: Partial<LabState>; node?: string }
const stored = ((): Stored => { try { return JSON.parse(sessionStorage.getItem("rk-state") ?? "{}") as Stored; } catch { return {}; } })();
const saved = stored;
if (saved.lab) { const { num, ...rest } = saved.lab; Object.assign(lab, rest); if (num) Object.assign(lab.num, num); }

const W = 420, H = 300;
const cv = $("#cv") as HTMLCanvasElement;
const dpr = Math.min(2, devicePixelRatio || 1);
cv.style.aspectRatio = `${W} / ${H}`;
const rcCanvas = rough.canvas(cv) as RoughCanvas;
const svLab = $("#sv") as unknown as SVGSVGElement;

function buildOpts(): Opts {
  const o: Record<string, unknown> = {};
  for (const k of NUM_KEYS) {
    const v = lab.num[k];
    if (k === "fixedDecimalPlaceDigits" && v < 0) continue;
    o[k] = v;
  }
  if (lab.num.seed !== 0) o["seed"] = lab.num.seed + boil;
  o["fillStyle"] = lab.fillStyle;
  o["stroke"] = lab.strokeOn ? lab.stroke : "none";
  if (lab.fillOn) o["fill"] = lab.fill;
  const sd = DASHES[lab.strokeDash], fd = DASHES[lab.fillDash];
  if (sd) o["strokeLineDash"] = sd;
  if (fd) o["fillLineDash"] = fd;
  o["disableMultiStroke"] = lab.disableMultiStroke;
  o["disableMultiStrokeFill"] = lab.disableMultiStrokeFill;
  o["preserveVertices"] = lab.preserveVertices;
  return o as Opts;
}
let selNode = stored.node ?? "generator";
const persist = (): void => { try { sessionStorage.setItem("rk-state", JSON.stringify({ lab, node: selNode })); } catch { /* storage blocked: fine */ } };
function drawLab(): void {
  const o = buildOpts();
  const def = SHAPES[lab.shape];
  const d = def.fn(o, W, H);
  cv.width = W * dpr; cv.height = H * dpr; // resetting size clears + resets the 2D context the RoughCanvas holds
  cv.getContext("2d")!.scale(dpr, dpr);
  rcCanvas.draw(d);
  svLab.replaceChildren();
  sk(svLab, d);
  // inspector
  const diff = Object.entries(o).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(DEF[k]));
  $("#code")!.textContent = `${def.sig}\n\nconst options = {\n${diff.map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join("\n")}\n};` + (def.note ? `\n\n// note: ${def.note}` : "") +
    (lab.fillStyle === "dots" && lab.fillOn ? "\n// note: 'dots' fill places dots with Math.random() — not seed-stable" : "");
  $("#ops")!.textContent = d.sets.map((s, i) => {
    const c: Record<string, number> = {};
    for (const op of s.ops) c[op.op] = (c[op.op] ?? 0) + 1;
    return `[${i}] ${s.type.padEnd(10)} ${String(s.ops.length).padStart(4)} ops   ${Object.entries(c).map(([k, v]) => `${k}×${v}`).join("  ")}`;
  }).join("\n") || "(no sets — nothing to draw)";
  $("#paths")!.textContent = gen.toPaths(d).map((p, i) => `[${i}] stroke=${p.stroke} width=${p.strokeWidth} fill=${p.fill ?? "—"}\n    d="${p.d.slice(0, 110)}${p.d.length > 110 ? `… (${p.d.length} chars)` : ""}"`).join("\n") || "(none)";
}
live.push(drawLab);

// controls
const ctl = $("#lab-controls")!;
const group = (title: string, open = false): HTMLElement => { const d = h("details", "", `<summary>${title}</summary>`, ctl); d.open = open; return d; };
const fmt = (k: NumKey, v: number): string => (k === "fixedDecimalPlaceDigits" && v < 0) ? "off" : (v < 0 && ["fillWeight", "hachureGap", "dashOffset", "dashGap", "zigzagOffset"].includes(k)) ? "auto" : k === "seed" && v === 0 ? "0 (re-roll)" : String(v);
const outs: Partial<Record<NumKey, { input: HTMLInputElement; out: HTMLOutputElement }>> = {};
function num(parent: HTMLElement, k: NumKey, min: number, max: number, step: number, hint: string): void {
  const w = h("div", "ctl", "", parent);
  h("label", "", `${k} <span style="color:var(--muted)">(default ${fmt(k, numDefault(k))})</span>`, w).setAttribute("for", `n-${k}`);
  const out = h("output", "", fmt(k, lab.num[k]), w);
  const input = h("input", "", "", w);
  Object.assign(input, { type: "range", id: `n-${k}`, min: String(min), max: String(max), step: String(step), value: String(lab.num[k]) });
  h("div", "hint", hint, w);
  input.addEventListener("input", () => { lab.num[k] = Number(input.value); out.textContent = fmt(k, lab.num[k]); drawLab(); persist(); });
  outs[k] = { input, out };
}
function sel(parent: HTMLElement, id: string, label: string, opts: string[], get: () => string, set: (v: string) => void, hint: string): HTMLSelectElement {
  const w = h("div", "ctl", "", parent);
  h("label", "", label, w).setAttribute("for", id);
  h("span", "", "", w);
  const s = h("select", "", opts.map((o) => `<option>${o}</option>`).join(""), w);
  s.id = id; s.value = get();
  h("div", "hint", hint, w);
  s.addEventListener("change", () => { set(s.value); drawLab(); persist(); });
  return s;
}
function chk(parent: HTMLElement, label: string, get: () => boolean, set: (v: boolean) => void, hint: string): HTMLInputElement {
  const w = h("div", "ctl row", "", parent);
  const c = h("input", "", "", w); c.type = "checkbox"; c.checked = get();
  h("label", "", label, w);
  h("span", "", "", w);
  h("div", "hint", hint, w).style.gridColumn = "1 / -1";
  c.addEventListener("change", () => { set(c.checked); drawLab(); persist(); });
  return c;
}
function color(parent: HTMLElement, label: string, get: () => string, set: (v: string) => void, on: () => boolean, setOn: (v: boolean) => void, hint: string): void {
  const w = h("div", "ctl row", "", parent);
  const c = h("input", "", "", w); c.type = "checkbox"; c.checked = on(); c.title = "enabled";
  h("label", "", label, w);
  const p = h("input", "", "", w); p.type = "color"; p.value = get();
  h("div", "hint", hint, w).style.gridColumn = "1 / -1";
  c.addEventListener("change", () => { setOn(c.checked); drawLab(); persist(); });
  p.addEventListener("input", () => { set(p.value); drawLab(); persist(); });
}

const gStroke = group("Stroke", true);
color(gStroke, "stroke", () => lab.stroke, (v) => { lab.stroke = v; }, () => lab.strokeOn, (v) => { lab.strokeOn = v; }, "Outline colour. Unchecked ⇒ stroke: 'none' (fill only).");
num(gStroke, "strokeWidth", 0.5, 12, 0.5, "Pen width in px. Also drives the auto fill weight and hachure gap.");
const gWobble = group("Wobble — the hand-drawn feel", true);
num(gWobble, "roughness", 0, 6, 0.1, "0 = machine-perfect, 1 = default sketch, 3+ = shaky.");
num(gWobble, "bowing", 0, 10, 0.1, "How much straight lines bow into arcs.");
num(gWobble, "maxRandomnessOffset", 0, 20, 0.5, "Max px any endpoint may be displaced.");
num(gWobble, "seed", 0, 9999, 1, "Same seed ⇒ same wobble. 0 = Math.random each draw (Rough.js default) — drag it to 0 and watch it jitter.");
chk(gWobble, "disableMultiStroke", () => lab.disableMultiStroke, (v) => { lab.disableMultiStroke = v; }, "Draw each edge once instead of twice (the double line is the signature look).");
chk(gWobble, "preserveVertices", () => lab.preserveVertices, (v) => { lab.preserveVertices = v; }, "Keep line endpoints exactly on the vertices; only the middle wobbles.");
const gFill = group("Fill", true);
color(gFill, "fill", () => lab.fill, (v) => { lab.fill = v; }, () => lab.fillOn, (v) => { lab.fillOn = v; }, "Fill colour. Unchecked ⇒ no fill option at all. Only closed shapes fill.");
sel(gFill, "fillStyle", "fillStyle", FILL_STYLES, () => lab.fillStyle, (v) => { lab.fillStyle = v; }, "hachure · solid · zigzag · cross-hatch · dots · dashed · zigzag-line");
num(gFill, "fillWeight", -1, 12, 0.5, "Width of fill strokes (or dot size). -1 = strokeWidth / 2.");
num(gFill, "hachureAngle", -90, 90, 1, "Angle of hatch lines, degrees.");
num(gFill, "hachureGap", -1, 30, 1, "Distance between hatch lines. -1 = strokeWidth × 4.");
num(gFill, "fillShapeRoughnessGain", 0, 2, 0.05, "Extra roughness added when 'solid' filling curves and paths.");
num(gFill, "dashOffset", -1, 40, 1, "'dashed' fill: dash length. -1 = hachureGap.");
num(gFill, "dashGap", -1, 40, 1, "'dashed' fill: gap between dashes. -1 = hachureGap.");
num(gFill, "zigzagOffset", -1, 40, 1, "'zigzag-line' fill: zig height. -1 = hachureGap.");
chk(gFill, "disableMultiStrokeFill", () => lab.disableMultiStrokeFill, (v) => { lab.disableMultiStrokeFill = v; }, "Draw each fill line once instead of twice.");
const gCurve = group("Curves & paths");
num(gCurve, "curveFitting", 0, 1, 0.01, "curve(): 1 = follow points exactly, lower = drift.");
num(gCurve, "curveTightness", -1, 1, 0.05, "curve(): 0 = Catmull-Rom, 1 = straight segments.");
num(gCurve, "curveStepCount", 2, 30, 1, "Segments used to approximate ellipses/arcs.");
num(gCurve, "simplification", 0, 1, 0.05, "path() fills only: <1 thins the fill sketch (see Ladders).");
const gDash = group("Dashes");
sel(gDash, "strokeLineDash", "strokeLineDash", Object.keys(DASHES), () => lab.strokeDash, (v) => { lab.strokeDash = v; }, "Dash pattern of the outline (canvas setLineDash / SVG stroke-dasharray).");
num(gDash, "strokeLineDashOffset", 0, 40, 1, "Phase of the outline dashes.");
sel(gDash, "fillLineDash", "fillLineDash", Object.keys(DASHES), () => lab.fillDash, (v) => { lab.fillDash = v; }, "Dash pattern applied to fill strokes.");
num(gDash, "fillLineDashOffset", 0, 40, 1, "Phase of the fill dashes.");
const gMisc = group("Output");
num(gMisc, "fixedDecimalPlaceDigits", -1, 4, 1, "Round path coordinates to N decimals (shrinks output). -1 = off (undefined).");

const shapeSel = $("#shape") as HTMLSelectElement;
shapeSel.innerHTML = SHAPE_NAMES.map((n) => `<option value="${n}">${SHAPES[n].label}</option>`).join("");
shapeSel.value = lab.shape;
shapeSel.addEventListener("change", () => { lab.shape = shapeSel.value as ShapeName; drawLab(); persist(); });
$("#reset")!.addEventListener("click", () => { history.replaceState(null, "", location.pathname); location.reload(); });
$("#reroll")!.addEventListener("click", () => {
  lab.num.seed = 1 + (rough.newSeed() % 9999);
  const c = outs.seed!; c.input.value = String(lab.num.seed); c.out.textContent = String(lab.num.seed);
  drawLab(); persist();
});
$("#copy")!.addEventListener("click", () => { void navigator.clipboard?.writeText($("#code")!.textContent ?? ""); });

/* ───────────────────────── 2 · Primitive gallery ───────────────────────── */
const CARD_W = 240, CARD_H = 170;
function card(parent: Element, id: string, title: string, sig: string, note: string, draw: (svg: SVGSVGElement, seed: number) => void, isLive: boolean): void {
  const fig = h("figure", "cardfig", "", parent);
  fig.dataset["vizId"] = id; fig.dataset["label"] = title;
  const svg = svgEl("svg", { viewBox: `0 0 ${CARD_W} ${CARD_H}` });
  fig.appendChild(svg);
  const cap = h("figcaption", "", "", fig);
  let seed = 1 + Math.floor(Math.random() * 9000);
  const render = (): void => { svg.replaceChildren(); draw(svg, seed + (isLive ? boil : 0)); cap.innerHTML = `<b>${title}</b><br><code>${sig}</code><br>seed ${seed}${isLive && boil ? `+${boil}` : ""}${note ? ` · ${note}` : ""}`; };
  render();
  fig.addEventListener("click", () => { seed = 1 + Math.floor(Math.random() * 9000); render(); });
  if (isLive) live.push(render);
}
const prims = $("#prims")!;
const PRIM_FILL: Partial<Record<ShapeName, string>> = { rectangle: P.c1, ellipse: P.c2, circle: P.c3, polygon: P.c4, arcClosed: P.c6, curve: P.c5, path: P.c6, pathMulti: P.c1 };
for (const n of SHAPE_NAMES) {
  const def = SHAPES[n];
  const fill = PRIM_FILL[n];
  card(prims, `prim-${n}`, def.label, def.sig, def.note ?? "", (svg, seed) => {
    const o: Opts = { seed, stroke: P.ink, strokeWidth: 1.8 };
    if (fill) { o.fill = fill; o.fillStyle = n === "circle" ? "cross-hatch" : n === "ellipse" ? "zigzag" : "hachure"; o.hachureGap = 7; }
    sk(svg, def.fn(o, CARD_W, CARD_H));
  }, true);
}

/* ───────────────────────── ladders (fills + options) ───────────────────────── */
interface Cell { label: string; o: Opts }
interface Ladder { title: string; note: string; shape: ShapeName; base: Opts; cells: Cell[]; cw?: number; ch?: number }
const BASE: Opts = { seed: 7, stroke: P.ink, strokeWidth: 1.6 };
const withFill = (extra: Opts = {}, fill: string = P.c3): Opts => ({ ...BASE, fill, hachureGap: 8, ...extra });
const ladderTo = (host: Element, spec: Ladder): void => {
  const box = h("div", "ladder", `<h3>${spec.title} <span>— ${spec.note}</span></h3>`, host);
  box.dataset["vizId"] = `ladder-${spec.title.replace(/\W+/g, "-")}`; box.dataset["label"] = spec.title;
  const row = h("div", "cells", "", box);
  const cw = spec.cw ?? 150, ch = spec.ch ?? 105;
  const draw = (): void => {
    row.replaceChildren();
    for (const c of spec.cells) {
      const cell = h("div", "cell", "", row);
      const svg = svgEl("svg", { width: cw, height: ch, viewBox: `0 0 ${cw} ${ch}` });
      cell.appendChild(svg);
      const d = SHAPES[spec.shape].fn({ ...spec.base, ...c.o }, cw, ch);
      sk(svg, d);
      h("div", "lab1", c.label, cell); h("div", "bytes", `${bytes(d)} chars`, cell);
    }
  };
  draw();
  box.addEventListener("click", draw);
};
const fillsHost = $("#fills-rows")!;
const laddersHost = $("#ladder-rows")!;
const F = (o: Opts = {}): Opts => withFill(o);
const FILL_LADDERS: Ladder[] = [
  { title: "fillStyle", note: "seven built-ins (dots uses Math.random → jitters on redraw)", shape: "circle", base: F(), cw: 150, ch: 120, cells: FILL_STYLES.map((s) => ({ label: s, o: { fillStyle: s } })) },
  { title: "hachureAngle", note: "degrees; default −41", shape: "polygon", base: F(), cells: [-90, -41, 0, 30, 60, 90].map((a) => ({ label: String(a), o: { hachureAngle: a } })) },
  { title: "hachureGap", note: "px between hatch lines; −1 = auto (4 × strokeWidth)", shape: "ellipse", base: F(), cells: [-1, 2, 5, 10, 20, 30].map((g) => ({ label: String(g), o: { hachureGap: g } })) },
  { title: "fillWeight", note: "hatch stroke width; −1 = auto (strokeWidth / 2)", shape: "rectangle", base: F(), cells: [-1, 0.5, 1.5, 3, 6].map((w) => ({ label: String(w), o: { fillWeight: w } })) },
  { title: "fillStyle: 'dots' + fillWeight", note: "dot diameter", shape: "circle", base: F({ fillStyle: "dots", hachureGap: 10 }), cells: [1, 2, 4, 6].map((w) => ({ label: String(w), o: { fillWeight: w } })) },
  { title: "fillStyle: 'dashed' — dashOffset / dashGap", note: "dash length / gap", shape: "rectangle", base: F({ fillStyle: "dashed" }), cells: [[-1, -1], [4, 4], [12, 4], [4, 14], [16, 16]].map(([a, b]) => ({ label: `len ${a} gap ${b}`, o: { dashOffset: a ?? -1, dashGap: b ?? -1 } })) },
  { title: "fillStyle: 'zigzag-line' — zigzagOffset", note: "zig height", shape: "rectangle", base: F({ fillStyle: "zigzag-line" }), cells: [-1, 2, 5, 10, 18].map((z) => ({ label: String(z), o: { zigzagOffset: z } })) },
  { title: "fillStyle: 'cross-hatch' — hachureAngle", note: "second pass is +90°", shape: "circle", base: F({ fillStyle: "cross-hatch" }), cells: [-41, 0, 30, 45].map((a) => ({ label: String(a), o: { hachureAngle: a } })) },
  { title: "fillStyle: 'solid' — fillShapeRoughnessGain", note: "extra roughness on a solid path() fill", shape: "path", base: F({ fillStyle: "solid", roughness: 1.5 }), cells: [0, 0.4, 0.8, 1.5, 2].map((g) => ({ label: String(g), o: { fillShapeRoughnessGain: g } })) },
  { title: "fillLineDash + fillLineDashOffset", note: "dash the hatch strokes themselves", shape: "rectangle", base: F(), cells: [{ label: "none", o: {} }, { label: "[6, 6]", o: { fillLineDash: [6, 6] } }, { label: "[2, 5]", o: { fillLineDash: [2, 5] } }, { label: "[6, 6] +3", o: { fillLineDash: [6, 6], fillLineDashOffset: 3 } }] },
  { title: "disableMultiStrokeFill", note: "one pass vs two passes per hatch line", shape: "ellipse", base: F(), cells: [{ label: "false", o: {} }, { label: "true", o: { disableMultiStrokeFill: true } }] },
];
const OPT_LADDERS: Ladder[] = [
  { title: "roughness", note: "0 = perfect → 5 = drunk", shape: "rectangle", base: { ...BASE }, cells: [0, 0.5, 1, 2, 3, 5].map((r) => ({ label: String(r), o: { roughness: r } })) },
  { title: "bowing", note: "curvature of straight edges", shape: "rectangle", base: { ...BASE }, cells: [0, 1, 3, 6, 10].map((b) => ({ label: String(b), o: { bowing: b } })) },
  { title: "maxRandomnessOffset", note: "max endpoint displacement (px)", shape: "circle", base: { ...BASE }, cells: [0, 1, 2, 5, 10, 20].map((m) => ({ label: String(m), o: { maxRandomnessOffset: m } })) },
  { title: "strokeWidth", note: "px", shape: "ellipse", base: { ...BASE }, cells: [0.5, 1, 2, 4, 8].map((w) => ({ label: String(w), o: { strokeWidth: w } })) },
  { title: "stroke: 'none'", note: "hide the outline; keep the fill", shape: "ellipse", base: F(), cells: [{ label: "stroke", o: {} }, { label: "'none'", o: { stroke: "none" } }] },
  { title: "curveFitting", note: "curve(): fidelity to your points", shape: "curve", base: { ...BASE }, cells: [0, 0.5, 0.8, 0.95, 1].map((c) => ({ label: String(c), o: { curveFitting: c } })) },
  { title: "curveStepCount", note: "ellipse/arc resolution", shape: "ellipse", base: { ...BASE }, cells: [2, 3, 5, 9, 20].map((c) => ({ label: String(c), o: { curveStepCount: c } })) },
  { title: "curveTightness", note: "curve(): −1 loose … 1 straight", shape: "curve", base: { ...BASE, roughness: 0.4 }, cells: [-1, -0.5, 0, 0.5, 1].map((c) => ({ label: String(c), o: { curveTightness: c } })) },
  { title: "simplification", note: "path() only: thins the fill sketch", shape: "path", base: F(), cells: [0.1, 0.25, 0.5, 0.75, 1].map((s) => ({ label: String(s), o: { simplification: s } })) },
  { title: "disableMultiStroke", note: "single vs double outline", shape: "rectangle", base: { ...BASE }, cells: [{ label: "false", o: {} }, { label: "true", o: { disableMultiStroke: true } }] },
  { title: "preserveVertices", note: "corners pinned (roughness 4 to exaggerate)", shape: "polygon", base: { ...BASE, roughness: 4 }, cells: [{ label: "false", o: {} }, { label: "true", o: { preserveVertices: true } }] },
  { title: "strokeLineDash + strokeLineDashOffset", note: "dashed outlines", shape: "rectangle", base: { ...BASE, strokeWidth: 2 }, cells: [{ label: "none", o: {} }, { label: "[4, 4]", o: { strokeLineDash: [4, 4] } }, { label: "[10, 6]", o: { strokeLineDash: [10, 6] } }, { label: "[10, 6] +5", o: { strokeLineDash: [10, 6], strokeLineDashOffset: 5 } }, { label: "[14, 4, 2, 4]", o: { strokeLineDash: [14, 4, 2, 4] } }] },
  { title: "fixedDecimalPlaceDigits", note: "round path data; caption shows the size saved", shape: "circle", base: { ...BASE, roughness: 1.5 }, cells: [{ label: "off", o: {} }, { label: "0", o: { fixedDecimalPlaceDigits: 0 } }, { label: "1", o: { fixedDecimalPlaceDigits: 1 } }, { label: "2", o: { fixedDecimalPlaceDigits: 2 } }] },
  { title: "seed", note: "equal seeds ⇒ identical · 0 ⇒ re-rolls on every click", shape: "rectangle", base: { ...BASE, fill: P.c4, hachureGap: 8 }, cells: [{ label: "1", o: { seed: 1 } }, { label: "1", o: { seed: 1 } }, { label: "2", o: { seed: 2 } }, { label: "3", o: { seed: 3 } }, { label: "0 (random)", o: { seed: 0 } }, { label: "0 (random)", o: { seed: 0 } }] },
];
FILL_LADDERS.forEach((l) => ladderTo(fillsHost, l));
OPT_LADDERS.forEach((l) => ladderTo(laddersHost, l));

/* ───────────────────────── 5 · Diagram ───────────────────────── */
interface DNode { id: string; x: number; y: number; w: number; hh: number; title: string; sub: string; color: string; style: string; info: string[] }
const NODES: DNode[] = [
  { id: "options", x: 30, y: 150, w: 180, hh: 100, title: "Options", sub: "roughness, seed, fill…", color: P.c3, style: "hachure",
    info: ["A plain object passed as the last argument to every drawing call.", "Defaults live in <code>generator.defaultOptions</code>; pass <code>{ options }</code> to <code>rough.canvas(el, config)</code> to change them for one instance.", "See section 1 — every key has a control."] },
  { id: "generator", x: 290, y: 150, w: 200, hh: 100, title: "RoughGenerator", sub: "rough.generator()", color: P.c1, style: "cross-hatch",
    info: ["Pure computation: <code>line() rectangle() ellipse() circle() linearPath() polygon() arc() curve() path()</code> each return a <code>Drawable</code>.", "It touches no DOM, so it can run in a worker or on the server.", "Wobble comes from a tiny seeded PRNG: same <code>seed</code> ⇒ same drawing."] },
  { id: "drawable", x: 590, y: 150, w: 200, hh: 100, title: "Drawable", sub: "{ shape, options, sets }", color: P.c4, style: "zigzag",
    info: ["<code>sets: OpSet[]</code>, each with a <code>type</code> (<code>path</code> outline, <code>fillPath</code> solid fill, <code>fillSketch</code> hatch/dots) and <code>ops</code>.", "An op is <code>move</code>, <code>lineTo</code> or <code>bcurveTo</code> with numeric <code>data</code>.", "Section 6 plots these ops on top of a drawing."] },
  { id: "canvas", x: 900, y: 40, w: 170, hh: 90, title: "RoughCanvas", sub: "rc.draw(drawable)", color: P.c2, style: "hachure",
    info: ["<code>rough.canvas(canvasEl)</code>. <code>rc.draw()</code> strokes the ops straight onto the 2D context; <code>rc.rectangle(…)</code> etc. generate <i>and</i> draw in one call.", "Dashes use <code>setLineDash</code>."] },
  { id: "svg", x: 900, y: 190, w: 170, hh: 90, title: "RoughSVG", sub: "rc.draw(drawable)", color: P.c5, style: "hachure",
    info: ["<code>rough.svg(svgEl)</code>. <code>draw()</code> returns an <code>SVGGElement</code> of <code>&lt;path&gt;</code>s — <b>you</b> append it.", "Dashes become <code>stroke-dasharray</code>."] },
  { id: "paths", x: 590, y: 350, w: 200, hh: 90, title: "PathInfo[]", sub: "toPaths() · opsToPath()", color: P.c6, style: "dots",
    info: ["<code>generator.toPaths(drawable)</code> → <code>{ d, stroke, strokeWidth, fill }[]</code>; <code>generator.opsToPath(opSet, digits?)</code> → one path string.", "Use these to render on any surface — your own SVG, Path2D, a PDF…"] },
  { id: "seednote", x: 290, y: 350, w: 200, hh: 90, title: "seed", sub: "0 ⇒ Math.random()", color: P.c3, style: "solid",
    info: ["The PRNG is <code>seed → seed × 48271 mod (2³¹−1)</code>. A falsy seed falls back to <code>Math.random()</code>, which is why the default (0) looks different on every render.", "Fix it (e.g. 42) for stable diagrams — or add an offset each frame for the Excalidraw 'boil'.", "Exception: the <code>dots</code> fill style always uses <code>Math.random()</code> for dot placement."] },
];
type Side = "l" | "r" | "t" | "b";
const port = (n: DNode, s: Side): Pt => s === "r" ? [n.x + n.w, n.y + n.hh / 2] : s === "l" ? [n.x, n.y + n.hh / 2] : s === "t" ? [n.x + n.w / 2, n.y] : [n.x + n.w / 2, n.y + n.hh];
const EDGES: Array<{ a: string; as: Side; b: string; bs: Side; label: string; dashed?: boolean }> = [
  { a: "options", as: "r", b: "generator", bs: "l", label: "options" },
  { a: "generator", as: "r", b: "drawable", bs: "l", label: "shape()" },
  { a: "drawable", as: "r", b: "canvas", bs: "l", label: "draw()" },
  { a: "drawable", as: "r", b: "svg", bs: "l", label: "draw()" },
  { a: "drawable", as: "b", b: "paths", bs: "t", label: "toPaths()" },
  { a: "seednote", as: "t", b: "generator", bs: "b", label: "PRNG", dashed: true },
];
const dsvg = $("#diagram-svg") as unknown as SVGSVGElement;
const dRough = $("#d-rough") as HTMLInputElement;
const info = $("#nodeinfo")!;
function showInfo(): void {
  const n = NODES.find((x) => x.id === selNode) ?? NODES[1]!;
  info.innerHTML = `<h3>${n.title}</h3><p style="color:var(--muted)"><code>${n.sub}</code></p>${n.info.map((t) => `<p>${t}</p>`).join("")}`;
}
function drawDiagram(): void {
  dsvg.replaceChildren();
  const r = Number(dRough.value);
  $("#d-rough-out")!.textContent = String(r);
  const base = 100 + boil;
  // edges first, so boxes sit on top
  EDGES.forEach((e, i) => {
    const A = NODES.find((n) => n.id === e.a)!, B = NODES.find((n) => n.id === e.b)!;
    const [x1, y1] = port(A, e.as), [x2, y2] = port(B, e.bs);
    const g = svgEl("g", { "data-viz-id": `edge-${e.a}-${e.b}`, "data-label": `${A.title} → ${B.title}: ${e.label}` }, dsvg);
    const o: Opts = { seed: base + i * 7, roughness: r, stroke: P.ink, strokeWidth: 2, bowing: 1.5 };
    if (e.dashed) o.strokeLineDash = [8, 7];
    sk(g, gen.line(x1, y1, x2, y2, o));
    // arrowhead = two more sketchy strokes from the tip
    const ang = Math.atan2(y2 - y1, x2 - x1), L = 18, sp = 0.45;
    sk(g, gen.linearPath([[x2 - L * Math.cos(ang - sp), y2 - L * Math.sin(ang - sp)], [x2, y2], [x2 - L * Math.cos(ang + sp), y2 - L * Math.sin(ang + sp)]], { ...o, strokeLineDash: [], seed: base + i * 7 + 3, bowing: 0.5 }));
    const vertical = Math.abs(x2 - x1) < Math.abs(y2 - y1);
    const t = svgEl("text", { x: (x1 + x2) / 2 + (vertical ? 10 : 0), y: (y1 + y2) / 2 + (vertical ? 4 : -12), "text-anchor": vertical ? "start" : "middle", "font-family": "var(--hand)", "font-size": 22, fill: P.muted }, g);
    t.textContent = e.label;
  });
  NODES.forEach((n, i) => {
    const g = svgEl("g", { "data-viz-id": `node-${n.id}`, "data-label": n.title, tabindex: 0, role: "button" }, dsvg);
    const on = n.id === selNode;
    sk(g, gen.rectangle(n.x, n.y, n.w, n.hh, { seed: base + 50 + i * 11, roughness: r, stroke: n.color, strokeWidth: on ? 4 : 2.4, fill: n.color, fillStyle: n.style, hachureGap: 9, fillWeight: 1.2 }));
    // white plate so text stays legible over the hatching
    svgEl("rect", { x: n.x + 6, y: n.y + n.hh / 2 - 34, width: n.w - 12, height: 64, rx: 6, fill: "#fff", "fill-opacity": 0.86 }, g);
    const t = svgEl("text", { x: n.x + n.w / 2, y: n.y + n.hh / 2 - 6, "text-anchor": "middle", "font-family": "var(--hand)", "font-size": 27, "font-weight": 700, fill: P.ink }, g);
    t.textContent = n.title;
    const s = svgEl("text", { x: n.x + n.w / 2, y: n.y + n.hh / 2 + 20, "text-anchor": "middle", "font-family": "var(--mono)", "font-size": 12.5, fill: P.muted }, g);
    s.textContent = n.sub;
    const pick = (): void => { selNode = n.id; persist(); drawDiagram(); showInfo(); };
    g.addEventListener("click", pick);
    g.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pick(); } });
  });
  // hand-drawn callout: a sticky note, a circle around the "draw()" fork, and a squiggle underline
  const note = svgEl("g", { "data-viz-id": "note-two-renderers", "data-label": "Two renderers note" }, dsvg);
  sk(note, gen.polygon([[820, 330], [1060, 322], [1068, 410], [826, 420]], { seed: base + 200, roughness: r, stroke: P.c3, fill: "#fff3bf", fillStyle: "solid", strokeWidth: 1.5 }));
  ["One Drawable,", "any surface: canvas,", "SVG or your own path."].forEach((line, i) => {
    const t = svgEl("text", { x: 842, y: 358 + i * 24, "font-family": "var(--hand)", "font-size": 22, fill: P.ink }, note); t.textContent = line;
  });
  sk(note, gen.curve([[836, 428], [900, 440], [960, 424], [1050, 438]], { seed: base + 210, roughness: r, stroke: P.c3, strokeWidth: 2 }));
}
dRough.addEventListener("input", drawDiagram);
live.push(drawDiagram);

/* ───────────────────────── 6 · Anatomy ───────────────────────── */
const asvg = $("#anat-svg") as unknown as SVGSVGElement;
const aShape = $("#a-shape") as HTMLSelectElement, aFill = $("#a-fill") as HTMLSelectElement, aRough = $("#a-rough") as HTMLInputElement;
const ANAT_SHAPES: ShapeName[] = ["rectangle", "ellipse", "circle", "polygon", "curve", "arcClosed", "line", "path"];
aShape.innerHTML = ANAT_SHAPES.map((n) => `<option value="${n}">${SHAPES[n].label}</option>`).join("");
aFill.innerHTML = FILL_STYLES.map((f) => `<option>${f}</option>`).join("");
aFill.value = "solid"; // few ops ⇒ readable; switch to hachure to see hundreds
const SET_COLOR: Record<OpSet["type"], string> = { path: P.c1, fillPath: P.c3, fillSketch: P.c2 };
const showSet: boolean[] = [];
let pathSel = 0;
function drawAnatomy(): void {
  asvg.replaceChildren();
  const rr = Number(aRough.value);
  $("#a-rough-out")!.textContent = String(rr);
  const d = SHAPES[aShape.value as ShapeName].fn({ seed: 11 + boil, roughness: rr, stroke: P.ink, strokeWidth: 1.6, fill: P.c3, fillStyle: aFill.value, hachureGap: 10 }, 560, 340);
  const ghost = svgEl("g", { opacity: 0.55, "data-viz-id": "anatomy-drawing", "data-label": "Rendered drawable" }, asvg);
  sk(ghost, d);
  d.sets.forEach((s, si) => {
    if (showSet[si] === undefined) showSet[si] = true;
    if (!showSet[si]) return;
    const col = SET_COLOR[s.type];
    const g = svgEl("g", { "data-viz-id": `ops-set-${si}`, "data-label": `OpSet ${si}: ${s.type}` }, asvg);
    let cx = 0, cy = 0;
    for (const op of s.ops) {
      const D = op.data;
      if (op.op === "bcurveTo") {
        const [x1, y1, x2, y2, x, y] = D as [number, number, number, number, number, number];
        svgEl("line", { x1: cx, y1: cy, x2: x1, y2: y1, stroke: col, "stroke-opacity": 0.35, "stroke-width": 0.7 }, g);
        svgEl("line", { x1: x, y1: y, x2, y2, stroke: col, "stroke-opacity": 0.35, "stroke-width": 0.7 }, g);
        for (const [px, py] of [[x1, y1], [x2, y2]] as Pt[]) svgEl("circle", { cx: px, cy: py, r: 2.3, fill: "#fff", stroke: col, "stroke-width": 1.2 }, g);
        svgEl("circle", { cx: x, cy: y, r: 2.6, fill: col }, g);
        cx = x; cy = y;
      } else {
        const [x, y] = D as [number, number];
        if (op.op === "move") svgEl("rect", { x: x - 3.2, y: y - 3.2, width: 6.4, height: 6.4, fill: col }, g);
        else svgEl("circle", { cx: x, cy: y, r: 2.6, fill: col }, g);
        cx = x; cy = y;
      }
    }
  });
  // table of sets
  const tbl = $("#sets")!;
  tbl.innerHTML = "<tr><th></th><th>#</th><th>type</th><th>ops</th><th>breakdown</th></tr>";
  d.sets.forEach((s, si) => {
    const c: Record<string, number> = {};
    for (const op of s.ops) c[op.op] = (c[op.op] ?? 0) + 1;
    const tr = h("tr", "", "", tbl);
    const td = h("td", "", "", tr);
    const cb = h("input", "", "", td); cb.type = "checkbox"; cb.checked = showSet[si] ?? true; cb.title = "show ops";
    cb.addEventListener("change", () => { showSet[si] = cb.checked; drawAnatomy(); });
    h("td", "", `<i class="dot" style="background:${SET_COLOR[s.type]}"></i>${si}`, tr);
    h("td", "", `<code>${s.type}</code>`, tr);
    h("td", "", String(s.ops.length), tr);
    h("td", "", Object.entries(c).map(([k, v]) => `${k}×${v}`).join(" "), tr);
    tr.style.cursor = "pointer";
    tr.addEventListener("click", (ev) => { if (ev.target === cb) return; pathSel = si; drawAnatomy(); });
    if (si === pathSel) tr.style.background = "var(--panel-2)";
  });
  const chosen = d.sets[pathSel] ?? d.sets[0];
  $("#a-path")!.textContent = chosen ? (() => { const p = gen.opsToPath(chosen); return p.length > 420 ? `${p.slice(0, 420)}… (${p.length} chars)` : p; })() : "(no sets)";
}
[aShape, aFill, aRough].forEach((e) => e.addEventListener("input", () => { showSet.length = 0; pathSel = 0; drawAnatomy(); }));
live.push(drawAnatomy);

/* ───────────────────────── go ───────────────────────── */
// Deep links: #ultra opens the Plus Ultra section; #ultra/<scene> opens that scene (e.g. #ultra/editor).
const routeScene = (): string | undefined => /^#ultra\/([\w-]+)$/.exec(location.hash)?.[1];
const showScene = initShowcase(routeScene(), (id) => history.replaceState(null, "", `#ultra/${id}`));
const goto = (): void => {
  const id = routeScene();
  if (id) showScene(id, false);
  const sec = document.getElementById(location.hash.slice(1).split("/")[0] ?? "");
  if (sec) sec.scrollIntoView();
};
addEventListener("hashchange", goto);
showInfo();
redrawLive();
if (location.hash) requestAnimationFrame(goto); // content above the target lays out asynchronously

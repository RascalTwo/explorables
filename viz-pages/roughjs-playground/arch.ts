// Scene 12 — a REAL architecture & data-flow diagram: how the very conversation that built this page
// was wired up (user → Claude Code harness ⇄ model, context sources feeding in, tools fanning out).
// Every number comes from that session's own log (session-data.ts). Replay it: the tape at the bottom
// is every tool call in order; scrubbing ticks the counters and sends a dot down the matching arrow.
//
// Style: "hand-drawn by someone who can draw" — low roughness, a single confident stroke (no
// multi-stroke doubling), white boxes with coloured outlines, open chevron arrowheads, dot-grid paper.
import { gen, sk, svgEl, h, boil, reduced, arrow, type Opts } from "./rk.js";
import { clamp, btn, readout, mkSvg, selectCtl } from "./ui.js";
import { EVENTS, SESSION, type Kind } from "./session-data.js";

const INK = "#14181c", GRAY = "#5b636b", GREEN = "#2f9e44", ORANGE = "#e8590c", BLUE = "#1971c2";
const CAT: Record<Kind, { name: string; col: string }> = {
  bash: { name: "Bash", col: BLUE }, read: { name: "Read", col: "#0c8599" }, write: { name: "Write", col: ORANGE }, edit: { name: "Edit", col: GRAY },
  skill: { name: "Skill", col: "#6965db" }, mcp: { name: "MCP tool", col: GREEN }, search: { name: "ToolSearch", col: "#f08c00" }, agent: { name: "Agent (subagents)", col: GRAY }, other: { name: "other", col: GRAY }, user: { name: "you", col: INK },
};
const TOOL_ORDER: Kind[] = ["bash", "read", "write", "skill", "mcp", "search", "edit", "agent"];
interface Bx { x: number; y: number; w: number; h: number }
type XY = [number, number];
const cx = (b: Bx): number => b.x + b.w / 2, cy = (b: Bx): number => b.y + b.h / 2;
const mid = (b: Bx): XY => [cx(b), cy(b)];
/** Where the ray from b's centre toward `to` leaves b, plus a small gap so arrowheads don't touch the outline. */
function clip(b: Bx, to: XY, gap = 5): XY {
  const dx = to[0] - cx(b), dy = to[1] - cy(b);
  const k = 1 / Math.max(Math.abs(dx) / (b.w / 2 + gap), Math.abs(dy) / (b.h / 2 + gap), 1e-6);
  return [cx(b) + dx * k, cy(b) + dy * k];
}
const offset = (a: XY, b: XY, d: number): [XY, XY] => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * d, ny = (dx / l) * d;
  return [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny]];
};
const fmtDur = (s: number): string => { const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m ${String(s % 60).padStart(2, "0")}s`; };

export function sceneArch(box: HTMLElement): () => void {
  const N = EVENTS.length;
  const total = EVENTS.filter((e) => e.k !== "user").length;
  let p = N, raf = 0, last = 0, staticKey = "";
  // "steady" is the calm, confident-hand look; the others are the same drawing with a shakier pen
  const PENS: Record<string, { r: number; multi: boolean }> = { steady: { r: 0.5, multi: false }, sketchy: { r: 1.4, multi: true }, wild: { r: 2.8, multi: true } };
  let pen = "steady";

  const bar = h("div", "toolbar", "", box);
  const prev = btn(bar, "◀ step", () => { stop(); p = Math.max(0, Math.ceil(p) - 1); draw(); });
  const play = btn(bar, "▶ replay the session", () => { if (raf) { stop(); return; } if (p >= N) p = 0; last = performance.now(); raf = requestAnimationFrame(tick); play.textContent = "❚❚ pause"; });
  const next = btn(bar, "step ▶", () => { stop(); p = Math.min(N, Math.floor(p) + 1); draw(); });
  if (reduced) play.disabled = true;
  const scrub = h("input", "", "", h("label", "", "scrub ", bar));
  Object.assign(scrub, { type: "range", min: "0", max: String(N), step: "0.01", value: String(p) });
  selectCtl(bar, "pen", Object.keys(PENS), pen, (v) => { pen = v; draw(); });
  const info = readout(bar);
  const svg = mkSvg(box);
  const defs = svgEl("defs", {}, svg);
  const pat = svgEl("pattern", { id: "arch-dots", width: 24, height: 24, patternUnits: "userSpaceOnUse" }, defs);
  svgEl("circle", { cx: 2, cy: 2, r: 1.2, fill: "#d3d0c6" }, pat);
  svgEl("rect", { x: 0, y: 0, width: 900, height: 520, fill: "url(#arch-dots)" }, svg);
  const stat = svgEl("g", {}, svg), dyn = svgEl("g", {}, svg);
  const stop = (): void => { cancelAnimationFrame(raf); raf = 0; play.textContent = "▶ replay the session"; };
  function tick(now: number): void {
    p = Math.min(N, p + ((now - last) / 1000) * 7); last = now;
    draw();
    if (p >= N) { stop(); return; }
    raf = requestAnimationFrame(tick);
  }
  scrub.addEventListener("input", () => { stop(); p = Number(scrub.value); draw(); });

  /* ── layout ── */
  const hookTotal = Object.values(SESSION.hooks).reduce((a, b) => a + b, 0);
  const ctx: Array<{ title: string; sub: string; box: Bx; dashed: boolean }> = [
    { title: "CLAUDE.md", sub: `${SESSION.instructionFiles} global + ${SESSION.nestedInstructionFiles} nested`, box: { x: 18, y: 122, w: 180, h: 48 }, dashed: false },
    { title: "Skills catalogue", sub: `${SESSION.skillsListed} listed · on demand`, box: { x: 18, y: 176, w: 180, h: 48 }, dashed: false },
    { title: "MCP servers", sub: `${SESSION.mcpServers.length} · ${SESSION.deferredTools} deferred tools`, box: { x: 18, y: 230, w: 180, h: 48 }, dashed: false },
    { title: "Hooks", sub: `${hookTotal} pre/post-tool runs`, box: { x: 18, y: 284, w: 180, h: 48 }, dashed: true },
  ];
  const you: Bx = { x: 18, y: 346, w: 180, h: 50 };
  const model: Bx = { x: 274, y: 122, w: 210, h: 62 };
  const harness: Bx = { x: 274, y: 226, w: 210, h: 92 };
  const tools = TOOL_ORDER.map((k, i) => ({ k, box: { x: 570, y: 118 + i * 34, w: 312, h: 29 } as Bx }));
  const toolBox = (k: Kind): Bx => tools.find((t) => t.k === k)?.box ?? tools[0]!.box;
  const TAPE = { x0: 40, x1: 860, base: 488, top: 430 };

  /* ── text helpers: handwriting for names, clean sans for detail (as in the reference) ── */
  const hand = (g: Element, x: number, y: number, s: string, size: number, o: { fill?: string; anchor?: string; weight?: number } = {}): SVGTextElement => {
    const t = svgEl("text", { x, y, "text-anchor": o.anchor ?? "start", "font-family": "'Caveat', cursive", "font-size": size, "font-weight": o.weight ?? 700, fill: o.fill ?? INK }, g);
    t.textContent = s; return t;
  };
  const sans = (g: Element, x: number, y: number, s: string, size: number, o: { fill?: string; anchor?: string; weight?: number; ls?: number } = {}): SVGTextElement => {
    const t = svgEl("text", { x, y, "text-anchor": o.anchor ?? "start", "font-family": "var(--sans)", "font-size": size, "font-weight": o.weight ?? 400, fill: o.fill ?? GRAY, ...(o.ls ? { "letter-spacing": o.ls } : {}) }, g);
    t.textContent = s; return t;
  };
  const clean = (seed: number, col: string, w = 3.2, extra: Opts = {}): Opts => ({ seed: seed + boil, roughness: PENS[pen]!.r, bowing: 0.5 + PENS[pen]!.r * 0.4, disableMultiStroke: !PENS[pen]!.multi, stroke: col, strokeWidth: w, ...extra });
  const arr = (g: SVGGElement, a: XY, b: XY, seed: number, dashed = false): void =>
    arrow(g, a[0], a[1], b[0], b[1], clean(seed, GRAY, 2.6, dashed ? { strokeLineDash: [9, 7] } : {}), 13);

  /** Static (rough) shapes: rebuilt only when the boil offset changes. */
  function buildStatic(): void {
    stat.replaceChildren();
    // header — same voice as the reference: caps eyebrow, big handwriting headline, coloured subhead
    sans(stat, 20, 30, "ARCHITECTURE · THIS VERY SESSION", 14, { weight: 700, ls: 3 });
    hand(stat, 18, 82, "One conversation, wired up", 50);
    const boxes = svgEl("g", {}, stat);
    const rect = (b: Bx, col: string, seed: number, w = 3.2, dashed = false): void => { sk(boxes, gen.rectangle(b.x, b.y, b.w, b.h, clean(seed, col, w, dashed ? { strokeLineDash: [8, 6] } : {}))); };
    rect(you, INK, 1, 3.6);
    rect(harness, GREEN, 2, 3.6);
    rect(model, ORANGE, 3, 3.6);
    ctx.forEach((c, i) => rect(c.box, BLUE, 10 + i, 2.6, c.dashed));
    tools.forEach((t, i) => rect(t.box, CAT[t.k].col, 30 + i, 2.4, t.k === "edit" || t.k === "agent"));
    // arrows
    const arrows = svgEl("g", {}, stat);
    ctx.forEach((c, i) => arr(arrows, clip(c.box, mid(harness)), clip(harness, mid(c.box)), 60 + i, c.dashed));
    const [a1, b1] = offset(clip(you, mid(harness)), clip(harness, mid(you)), -9);
    const [a2, b2] = offset(clip(harness, mid(you)), clip(you, mid(harness)), -9);
    arr(arrows, a1, b1, 70); arr(arrows, a2, b2, 71);
    const [c1, d1] = offset(clip(harness, mid(model)), clip(model, mid(harness)), -12);
    const [c2, d2] = offset(clip(model, mid(harness)), clip(harness, mid(model)), -12);
    arr(arrows, c1, d1, 72); arr(arrows, c2, d2, 73);
    tools.forEach((t, i) => arr(arrows, clip(harness, mid(t.box)), clip(t.box, mid(harness)), 80 + i));
    // tape ticks (height = seconds until the next event, sqrt-scaled)
    const tape = svgEl("g", { "data-viz-id": "session-tape", "data-label": "Session tape: every tool call in order" }, stat);
    const dx = (TAPE.x1 - TAPE.x0) / N;
    EVENTS.forEach((e, i) => {
      const x = TAPE.x0 + (i + 0.5) * dx;
      const hgt = e.k === "user" ? 56 : 8 + 40 * Math.sqrt(clamp(e.gap, 0, 240) / 240);
      sk(tape, gen.line(x, TAPE.base, x, TAPE.base - hgt, { seed: 200 + i + boil, roughness: PENS[pen]!.r * 0.6, disableMultiStroke: true, stroke: CAT[e.k].col, strokeWidth: e.k === "user" ? 3.6 : Math.max(2, dx * 0.55) }));
    });
    sk(tape, gen.line(TAPE.x0 - 6, TAPE.base + 5, TAPE.x1 + 6, TAPE.base + 5, clean(300, INK, 2.2)));
  }

  function draw(): void {
    const key = `${boil}|${pen}`;
    if (staticKey !== key) { buildStatic(); staticKey = key; }
    scrub.value = String(p);
    prev.disabled = p <= 0; next.disabled = p >= N;
    dyn.replaceChildren();
    const i = Math.floor(p), done = EVENTS.slice(0, Math.min(N, i));
    const active = p < N ? EVENTS[i] : undefined;
    const count = (k: Kind): number => done.filter((e) => e.k === k).length + (active?.k === k ? 1 : 0);
    const calls = done.filter((e) => e.k !== "user").length + (active && active.k !== "user" ? 1 : 0);
    const prompts = done.filter((e) => e.k === "user").length + (active?.k === "user" ? 1 : 0);

    // subhead + the big handwritten stat (reference: green subhead, "~100 ms" in handwriting)
    sans(dyn, 20, 110, `${calls} tool calls across ${prompts} prompt${prompts === 1 ? "" : "s"} — and ${SESSION.skillsUsed.length} skills steered the work.`, 16, { fill: GREEN, weight: 700 });
    hand(dyn, 878, 66, calls === total ? `≈${(total / SESSION.prompts).toFixed(0)}` : String(calls), 58, { fill: GREEN, anchor: "end" });
    sans(dyn, 878, 92, calls === total ? "tool calls per prompt" : "tool calls so far", 13, { anchor: "end" });

    const label = (b: Bx, title: string, sub: string, size = 25): void => {
      hand(dyn, b.x + 12, b.y + (size > 24 ? 27 : 23), title, size);
      if (sub) sans(dyn, b.x + 12, b.y + b.h - 10, sub, 12);
    };
    label(you, "You", `${prompts} of ${SESSION.prompts} prompts`);
    label(model, SESSION.model, "reads context, picks a tool");
    label(harness, "Claude Code", "runs tools, returns results", 30);
    hand(dyn, harness.x + harness.w - 12, harness.y + 27, active ? "…working" : "idle", 17, { fill: GREEN, anchor: "end" });
    ctx.forEach((c) => label(c.box, c.title, c.sub, 21));
    tools.forEach((tl) => {
      const n = count(tl.k), unused = (tl.k === "edit" || tl.k === "agent") && n === 0;
      if (active?.k === tl.k) sk(dyn, gen.rectangle(tl.box.x, tl.box.y, tl.box.w, tl.box.h, clean(400, CAT[tl.k].col, 3.8, { fill: `${CAT[tl.k].col}22`, fillStyle: "solid" })));
      hand(dyn, tl.box.x + 10, tl.box.y + 21, CAT[tl.k].name, 20, { fill: unused ? GRAY : INK });
      const barW = (n / 68) * 90;
      if (barW > 0) sk(dyn, gen.line(tl.box.x + 158, tl.box.y + 14, tl.box.x + 158 + Math.max(4, barW), tl.box.y + 14, { seed: 500, roughness: 0.3, disableMultiStroke: true, stroke: CAT[tl.k].col, strokeWidth: 7 }));
      sans(dyn, tl.box.x + 150, tl.box.y + 19, String(n), 13, { anchor: "end", fill: unused ? "#9aa1a8" : INK, weight: 700 });
      const sub = tl.k === "skill" ? SESSION.skillsUsed.join(" · ") : tl.k === "mcp" ? "basic-memory" : unused ? "never used" : "";
      if (sub) sans(dyn, tl.box.x + tl.box.w - 8, tl.box.y + 19, sub, 12, { anchor: "end" });
    });

    // travelling dot (the reference's blue dot on the arrow): harness → tool, or you → harness
    if (active) {
      const f = p - Math.floor(p);
      const tb = toolBox(active.k);
      const [a, b] = active.k === "user" ? [clip(you, mid(harness)), clip(harness, mid(you))] : [clip(harness, mid(tb)), clip(tb, mid(harness))];
      const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
      svgEl("circle", { cx: x, cy: y, r: 13, fill: CAT[active.k].col, "fill-opacity": 0.22 }, dyn);
      svgEl("circle", { cx: x, cy: y, r: 7, fill: CAT[active.k].col }, dyn);
      if (active.l) hand(dyn, x, y - 14, active.l, 20, { fill: CAT[active.k].col, anchor: "middle" });
    }

    // tape cursor, caption, legend
    const dx = (TAPE.x1 - TAPE.x0) / N, curX = TAPE.x0 + clamp(p, 0, N) * dx;
    sk(dyn, gen.line(curX, TAPE.top - 14, curX, TAPE.base + 8, { seed: 600, roughness: 0.3, disableMultiStroke: true, stroke: INK, strokeWidth: 2, strokeLineDash: [6, 5] }));
    sans(dyn, TAPE.x0 - 6, TAPE.top - 22, "SESSION TAPE — every tool call in order · height = seconds until the next event · click to jump", 11, { weight: 700, ls: 1 });
    sans(dyn, TAPE.x1 + 6, TAPE.base + 23, `${fmtDur(SESSION.wallSec)} wall-clock · snapshot ${SESSION.snapshot}`, 11, { anchor: "end" });
    (["bash", "read", "write", "skill", "mcp", "search", "user"] as Kind[]).forEach((k, j) => {
      const lx = TAPE.x0 + j * 76;
      svgEl("rect", { x: lx, y: TAPE.base + 14, width: 10, height: 10, rx: 2, fill: CAT[k].col }, dyn);
      sans(dyn, lx + 15, TAPE.base + 23, CAT[k].name === "MCP tool" ? "MCP" : CAT[k].name, 11);
    });
    const ev = active ?? EVENTS[N - 1]!;
    info.textContent = p >= N ? `full session · ${total} calls · ${prompts} prompts` : `event ${i + 1}/${N} · +${fmtDur(ev.t)} · ${CAT[ev.k].name}${ev.l ? ` (${ev.l})` : ""}`;
  }

  // click / drag on the tape to seek
  const seek = (e: PointerEvent): void => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    if (q.y < TAPE.top - 30) return;
    stop(); p = clamp(((q.x - TAPE.x0) / (TAPE.x1 - TAPE.x0)) * N, 0, N); draw();
  };
  let dragging = false;
  svg.addEventListener("pointerdown", (e) => { const q = (e.target as Element); if (q.closest("button")) return; dragging = true; svg.setPointerCapture(e.pointerId); seek(e); });
  svg.addEventListener("pointermove", (e) => { if (dragging) seek(e); });
  svg.addEventListener("pointerup", () => { dragging = false; });

  draw();
  return draw;
}

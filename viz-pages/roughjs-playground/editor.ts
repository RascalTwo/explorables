// Flagship 2 — a tiny Excalidraw-style diagram editor built on Rough.js.
// Tools: select/move/resize, rectangle, ellipse, diamond, arrow, line, freehand, text.
// Undo/redo, per-element style, grid snap, autosave to localStorage, export SVG / JSON.
import { gen, sk, svgEl, h, P, boil, arrow, type Opts, type Pt } from "./rk.js";
import { ink, SVGW, SVGH, clamp, mkSvg, toSvg, btn, readout } from "./ui.js";

type Kind = "rect" | "ellipse" | "diamond" | "arrow" | "line" | "free" | "text";
type Tool = "select" | Kind;
interface El {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  pts?: Pt[];
  label: string;
  stroke: string;
  fill: string;
  fillStyle: string;
  roughness: number;
  sw: number;
  seed: number;
}
interface Style {
  stroke: string;
  fill: string;
  fillStyle: string;
  roughness: number;
  sw: number;
}

const KINDS = new Set(["rect", "ellipse", "diamond", "arrow", "line", "free", "text"]);
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
// Shallow on purpose: the numbers and strings an El must have, and that pts (if any) is a list.
const isEl = (v: unknown): v is El =>
  isRec(v) &&
  KINDS.has(String(v["kind"])) &&
  (v["pts"] === undefined || Array.isArray(v["pts"])) &&
  ["id", "x", "y", "w", "h", "roughness", "sw", "seed"].every((k) => typeof v[k] === "number") &&
  ["label", "stroke", "fill", "fillStyle"].every((k) => typeof v[k] === "string");
/** Elements from JSON (pasted, stored, or an undo step); throws on anything that is not a list of them. */
function parseEls(json: string): El[] {
  const v: unknown = JSON.parse(json);
  if (!Array.isArray(v) || !v.every(isEl)) throw new Error("not a list of elements");
  return v;
}

const FONT = "Caveat, 'Segoe Print', cursive";
const STORE = "rk-editor-v1";
const TOOLS: Array<[Tool, string, string]> = [
  ["select", "↖", "v"],
  ["rect", "▭", "r"],
  ["ellipse", "◯", "o"],
  ["diamond", "◇", "d"],
  ["arrow", "→", "a"],
  ["line", "／", "l"],
  ["free", "✎", "p"],
  ["text", "T", "t"],
];
const FILLS = [
  "none",
  "hachure",
  "solid",
  "zigzag",
  "cross-hatch",
  "dots",
  "dashed",
  "zigzag-line",
];

/* ── geometry ── */
function bbox(e: El): { x: number; y: number; w: number; h: number } {
  if (e.kind === "arrow" || e.kind === "line")
    return {
      x: Math.min(e.x, e.x + e.w),
      y: Math.min(e.y, e.y + e.h),
      w: Math.abs(e.w),
      h: Math.abs(e.h),
    };
  if (e.kind === "free") {
    const p = e.pts ?? [];
    const xs = p.map((q) => q[0]),
      ys = p.map((q) => q[1]);
    const x0 = Math.min(...xs),
      y0 = Math.min(...ys);
    return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
  }
  if (e.kind === "text") return { x: e.x, y: e.y, w: Math.max(30, e.label.length * 12 + 8), h: 32 };
  return { x: e.x, y: e.y, w: e.w, h: e.h };
}
const segDist = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number => {
  const dx = x2 - x1,
    dy = y2 - y1,
    l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};
function hit(e: El, px: number, py: number): boolean {
  if (e.kind === "arrow" || e.kind === "line")
    return segDist(px, py, e.x, e.y, e.x + e.w, e.y + e.h) < 9;
  if (e.kind === "free") {
    const p = e.pts ?? [];
    return p.some((q, i) => i > 0 && segDist(px, py, p[i - 1]![0], p[i - 1]![1], q[0], q[1]) < 9);
  }
  const b = bbox(e);
  return px >= b.x - 6 && px <= b.x + b.w + 6 && py >= b.y - 6 && py <= b.y + b.h + 6;
}
const handles = (e: El): Array<{ k: string; x: number; y: number }> =>
  e.kind === "arrow" || e.kind === "line"
    ? [
        { k: "0", x: e.x, y: e.y },
        { k: "1", x: e.x + e.w, y: e.y + e.h },
      ]
    : e.kind === "rect" || e.kind === "ellipse" || e.kind === "diamond"
      ? [{ k: "br", x: e.x + e.w, y: e.y + e.h }]
      : [];

/* ── element drawing ── */
const eOpts = (e: El): Opts => ({
  seed: e.seed + boil,
  roughness: e.roughness,
  stroke: e.stroke,
  strokeWidth: e.sw,
  ...(e.fill !== "none" && (e.kind === "rect" || e.kind === "ellipse" || e.kind === "diamond")
    ? {
        fill: e.fill,
        fillStyle: e.fillStyle,
        hachureGap: 8 + e.sw,
        fillWeight: Math.max(0.8, e.sw / 2.4),
      }
    : {}),
});
function label2(parent: SVGGElement, x: number, y: number, text: string, size = 26): void {
  if (!text) return;
  const t = svgEl(
    "text",
    {
      x,
      y,
      "text-anchor": "middle",
      "font-family": FONT,
      "font-size": size,
      "font-weight": 700,
      fill: ink,
    },
    parent,
  );
  t.textContent = text;
}
function drawEl(svg: SVGSVGElement, e: El): void {
  const g = svgEl(
    "g",
    { "data-viz-id": `el-${e.id}`, "data-label": `${e.kind}${e.label ? `: ${e.label}` : ""}` },
    svg,
  );
  const o = eOpts(e);
  switch (e.kind) {
    case "rect":
      sk(g, gen.rectangle(e.x, e.y, e.w, e.h, o));
      break;
    case "ellipse":
      sk(g, gen.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w, e.h, o));
      break;
    case "diamond":
      sk(
        g,
        gen.polygon(
          [
            [e.x + e.w / 2, e.y],
            [e.x + e.w, e.y + e.h / 2],
            [e.x + e.w / 2, e.y + e.h],
            [e.x, e.y + e.h / 2],
          ],
          o,
        ),
      );
      break;
    case "arrow":
      arrow(g, e.x, e.y, e.x + e.w, e.y + e.h, o, 10 + e.sw * 2.5);
      break;
    case "line":
      sk(g, gen.line(e.x, e.y, e.x + e.w, e.y + e.h, o));
      break;
    case "free":
      if ((e.pts?.length ?? 0) > 1) sk(g, gen.linearPath(e.pts!, o));
      break;
    case "text":
      break;
    default:
      break;
  }
  if (e.kind === "text") {
    const t = svgEl(
      "text",
      {
        x: e.x,
        y: e.y + 24,
        "font-family": FONT,
        "font-size": 30,
        "font-weight": 700,
        fill: e.stroke,
      },
      g,
    );
    t.textContent = e.label;
  } else if (e.kind === "arrow" || e.kind === "line") {
    if (Math.abs(e.h) > Math.abs(e.w) && e.label) {
      const t = svgEl(
        "text",
        {
          x: e.x + 14,
          y: e.y + e.h / 2 + 6,
          "font-family": FONT,
          "font-size": 24,
          "font-weight": 700,
          fill: ink,
        },
        g,
      );
      t.textContent = e.label;
    } else label2(g, e.x + e.w / 2, e.y + e.h / 2 - 12, e.label, 24);
  } else if (e.kind !== "free") {
    const b = bbox(e);
    label2(g, b.x + b.w / 2, b.y + b.h / 2 + 9, e.label);
  }
}
/** A pointer gesture in flight: drawing a new element, dragging one, or resizing one by a handle. */
type Mode =
  | { t: "create"; el: El }
  | { t: "move"; orig: El; sx: number; sy: number }
  | { t: "handle"; id: number; k: string }
  | null;

/** The editor's mutable model: elements, selection, tool, style, undo history and the gesture in flight. */
interface EdState {
  els: El[];
  sel: number | null;
  tool: Tool;
  snapOn: boolean;
  nextId: number;
  style: Style;
  committed: string;
  undo: string[];
  redo: string[];
  mode: Mode;
}

/** The toolbar, style panel, JSON box and canvas the editor reads and writes. */
interface Ui {
  toolBtns: Map<Tool, HTMLButtonElement>;
  stroke: HTMLInputElement;
  fillOn: HTMLInputElement;
  fill: HTMLInputElement;
  fs: HTMLSelectElement;
  rough: HTMLInputElement;
  sw: HTMLInputElement;
  label: HTMLInputElement;
  snap: HTMLInputElement;
  info: HTMLElement;
  svg: SVGSVGElement;
}

/** What the toolbar buttons call back into once the editor is wired up. */
interface Actions {
  setTool: (t: Tool) => void;
  undo: () => void;
  redo: () => void;
  del: () => void;
  commit: () => void;
  render: () => void;
  syncPanel: () => void;
  svgText: () => string;
}

/* ── model helpers ── */
const cur = (ed: EdState): El | undefined => ed.els.find((e) => e.id === ed.sel);
const sn = (ed: EdState, v: number): number => (ed.snapOn ? Math.round(v / 20) * 20 : v);

/* ── toolbar ── */
function buildUi(box: HTMLElement, ed: EdState, act: Actions): Ui {
  const bar = h("div", "toolbar", "", box);
  const toolBtns = new Map<Tool, HTMLButtonElement>();
  for (const [t, glyph, key] of TOOLS) {
    const b = btn(bar, `${glyph} <small>${key}</small>`, () => act.setTool(t));
    b.title = `${t} (${key})`;
    toolBtns.set(t, b);
  }
  const bar2 = h("div", "toolbar", "", box);
  const lab = (text: string, parent: HTMLElement = bar2): HTMLLabelElement =>
    h("label", "", `${text} `, parent);
  const stroke = h("input", "", "", lab("stroke"));
  stroke.type = "color";
  stroke.value = ed.style.stroke;
  const fillOn = h("input", "", "", lab("fill"));
  fillOn.type = "checkbox";
  fillOn.checked = true;
  const fill = h("input", "", "", fillOn.parentElement!);
  fill.type = "color";
  fill.value = ed.style.fill;
  const fs = h(
    "select",
    "",
    FILLS.filter((f) => f !== "none")
      .map((f) => `<option>${f}</option>`)
      .join(""),
    lab("pattern"),
  );
  fs.value = ed.style.fillStyle;
  const rough = h("input", "", "", lab("roughness"));
  Object.assign(rough, {
    type: "range",
    min: "0",
    max: "4",
    step: "0.1",
    value: String(ed.style.roughness),
  });
  const sw = h("input", "", "", lab("width"));
  Object.assign(sw, { type: "range", min: "1", max: "8", step: "0.5", value: String(ed.style.sw) });
  const label = h("input", "", "", lab("label"));
  label.type = "text";
  label.placeholder = "select a shape…";
  label.style.width = "140px";
  const snap = h("input", "", "", lab("grid snap"));
  snap.type = "checkbox";
  const bar3 = h("div", "toolbar", "", box);
  btn(bar3, "↶ undo", () => act.undo());
  btn(bar3, "↷ redo", () => act.redo());
  btn(bar3, "⌫ delete", () => act.del());
  btn(bar3, "⇧ to front", () => {
    const e = cur(ed);
    if (e) {
      ed.els = [...ed.els.filter((x) => x !== e), e];
      act.commit();
      act.render();
    }
  });
  btn(bar3, "clear", () => {
    ed.els = [];
    ed.sel = null;
    act.commit();
    act.render();
  });
  btn(bar3, "⤓ .svg", () => download("diagram.svg", act.svgText(), "image/svg+xml"));
  btn(bar3, "copy svg", () => {
    navigator.clipboard?.writeText(act.svgText()).catch(console.warn);
  });
  btn(bar3, "copy json", () => {
    navigator.clipboard?.writeText(JSON.stringify(ed.els)).catch(console.warn);
  });
  btn(bar3, "load json…", () => {
    jsonBox.hidden = !jsonBox.hidden;
  });
  const info = readout(bar3);
  const jsonBox = h("div", "toolbar", "", box);
  jsonBox.hidden = true;
  const ta = h("textarea", "", "", jsonBox);
  ta.rows = 3;
  ta.style.cssText = "flex:1;font-family:var(--mono);font-size:12px";
  ta.placeholder = "paste JSON from “copy json” here";
  btn(jsonBox, "apply", () => {
    try {
      ed.els = parseEls(ta.value);
      ed.nextId = Math.max(0, ...ed.els.map((q) => q.id)) + 1;
      ed.sel = null;
      act.commit();
      act.syncPanel();
      act.render();
      jsonBox.hidden = true;
    } catch {
      info.textContent = "invalid JSON";
    }
  });
  const svg = mkSvg(box);
  svg.style.cursor = "default";
  svg.setAttribute("tabindex", "0");
  return { toolBtns, stroke, fillOn, fill, fs, rough, sw, label, snap, info, svg };
}

/* ── history ── */
function commit(ed: EdState): void {
  const now = JSON.stringify(ed.els);
  if (now === ed.committed) return;
  if (ed.committed) {
    ed.undo.push(ed.committed);
    ed.redo.length = 0;
  }
  ed.committed = now;
  try {
    localStorage.setItem(STORE, now);
  } catch {
    /* private mode: fine */
  }
}
function restore(ed: EdState, ui: Ui, json: string): void {
  ed.els = parseEls(json);
  ed.committed = json;
  if (!cur(ed)) ed.sel = null;
  try {
    localStorage.setItem(STORE, json);
  } catch {
    /* ignore */
  }
  syncPanel(ed, ui);
  render(ed, ui);
}
function doUndo(ed: EdState, ui: Ui): void {
  const p = ed.undo.pop();
  if (p !== undefined) {
    ed.redo.push(ed.committed);
    restore(ed, ui, p);
  }
}
function doRedo(ed: EdState, ui: Ui): void {
  const n = ed.redo.pop();
  if (n !== undefined) {
    ed.undo.push(ed.committed);
    restore(ed, ui, n);
  }
}
function del(ed: EdState, ui: Ui): void {
  if (ed.sel !== null) {
    ed.els = ed.els.filter((e) => e.id !== ed.sel);
    ed.sel = null;
    commit(ed);
    syncPanel(ed, ui);
    render(ed, ui);
  }
}

/* ── panel <-> selection ── */
function syncPanel(ed: EdState, ui: Ui): void {
  const { stroke, fillOn, fill, fs, rough, sw, label, toolBtns } = ui;
  const e = cur(ed);
  if (e) {
    stroke.value = e.stroke;
    fs.value = e.fillStyle === "none" ? "hachure" : e.fillStyle;
    fillOn.checked = e.fill !== "none";
    if (e.fill !== "none") fill.value = e.fill;
    rough.value = String(e.roughness);
    sw.value = String(e.sw);
    label.value = e.label;
    label.placeholder = "label…";
  } else {
    label.value = "";
    label.placeholder = "select a shape…";
  }
  for (const [t, b] of toolBtns) {
    b.style.background = t === ed.tool ? "var(--accent)" : "";
    b.style.color = t === ed.tool ? "#fff" : "";
  }
}
function applyStyle(ed: EdState, ui: Ui): void {
  const { stroke, fillOn, fill, fs, rough, sw } = ui;
  ed.style = {
    stroke: stroke.value,
    fill: fillOn.checked ? fill.value : "none",
    fillStyle: fs.value,
    roughness: Number(rough.value),
    sw: Number(sw.value),
  };
  const e = cur(ed);
  if (e) {
    Object.assign(e, {
      stroke: ed.style.stroke,
      fill: ed.style.fill,
      fillStyle: ed.style.fill === "none" ? "hachure" : ed.style.fillStyle,
      roughness: ed.style.roughness,
      sw: ed.style.sw,
    });
    render(ed, ui);
  }
}
function setTool(ed: EdState, ui: Ui, t: Tool): void {
  ed.tool = t;
  ui.svg.style.cursor = t === "select" ? "default" : "crosshair";
  syncPanel(ed, ui);
}
/** Wire the style controls, label box and grid-snap checkbox to the selected element. */
function wirePanel(ed: EdState, ui: Ui): void {
  const { stroke, fillOn, fill, fs, rough, sw, label, snap } = ui;
  for (const c of [stroke, fill, fillOn, fs, rough, sw]) {
    c.addEventListener("input", () => applyStyle(ed, ui));
    c.addEventListener("change", () => {
      applyStyle(ed, ui);
      commit(ed);
    });
  }
  label.addEventListener("input", () => {
    const e = cur(ed);
    if (e) {
      e.label = label.value;
      render(ed, ui);
    }
  });
  label.addEventListener("change", () => commit(ed));
  snap.addEventListener("change", () => {
    ed.snapOn = snap.checked;
    render(ed, ui);
  });
}

/* ── rendering ── */
/** The dashed selection box and resize handles over the selected element. */
function drawOverlay(svg: SVGSVGElement, e: El): void {
  const ov = svgEl("g", { class: "overlay", "pointer-events": "none" }, svg);
  const b = bbox(e);
  sk(
    ov,
    gen.rectangle(b.x - 8, b.y - 8, b.w + 16, b.h + 16, {
      seed: 1,
      roughness: 0,
      stroke: P.c4,
      strokeWidth: 1.4,
      strokeLineDash: [5, 4],
    }),
  );
  for (const hd of handles(e))
    svgEl(
      "rect",
      {
        x: hd.x - 5,
        y: hd.y - 5,
        width: 10,
        height: 10,
        fill: "#fff",
        stroke: P.c4,
        "stroke-width": 2,
      },
      ov,
    );
}
function render(ed: EdState, ui: Ui): void {
  const { svg } = ui;
  svg.replaceChildren();
  svgEl("rect", { x: 0, y: 0, width: SVGW, height: SVGH, fill: "#fff" }, svg);
  if (ed.snapOn)
    for (let x = 20; x < SVGW; x += 20)
      for (let y = 20; y < SVGH; y += 20)
        svgEl("circle", { cx: x, cy: y, r: 1.1, fill: "#d9d3c3" }, svg);
  ed.els.forEach((e) => drawEl(svg, e));
  const e = cur(ed);
  if (e) drawOverlay(svg, e);
  const chars = svgString(svg).length;
  ui.info.textContent = `${ed.els.length} element${ed.els.length === 1 ? "" : "s"} · svg ${(chars / 1024).toFixed(1)} KB${ed.sel !== null ? "" : ""}`;
}
function svgString(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true);
  if (!(clone instanceof SVGSVGElement)) return "";
  clone.querySelector(".overlay")?.remove();
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  clone.removeAttribute("tabindex");
  return new XMLSerializer().serializeToString(clone);
}
function download(name: string, text: string, mime: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ── pointer interaction (on the persistent <svg>) ── */
/** Pointer down with the select tool: grab a resize handle, or pick (and start moving) the element under the cursor. */
function pointerDownSelect(ed: EdState, ui: Ui, rx: number, ry: number): void {
  const e = cur(ed);
  if (e) {
    const hd = handles(e).find((q) => Math.hypot(q.x - rx, q.y - ry) < 11);
    if (hd) {
      ed.mode = { t: "handle", id: e.id, k: hd.k };
      return;
    }
  }
  const top = ed.els.toReversed().find((q) => hit(q, rx, ry));
  ed.sel = top ? top.id : null;
  if (top) ed.mode = { t: "move", orig: structuredClone(top), sx: rx, sy: ry };
  syncPanel(ed, ui);
  render(ed, ui);
}
/** Pointer down with a drawing tool: drop a text element, or start dragging out a new shape. */
function pointerDownCreate(ed: EdState, ui: Ui, tool: Kind, pos: { rx: number; ry: number }): void {
  const { rx, ry } = pos;
  const px = sn(ed, rx),
    py = sn(ed, ry);
  const base = {
    id: ed.nextId++,
    label: "",
    stroke: ed.style.stroke,
    fill:
      tool === "line" || tool === "arrow" || tool === "free" || tool === "text"
        ? "none"
        : ed.style.fill,
    fillStyle: ed.style.fillStyle,
    roughness: ed.style.roughness,
    sw: ed.style.sw,
    seed: 1 + Math.floor(Math.random() * 9000),
  };
  if (tool === "text") {
    ed.els.push({
      ...base,
      kind: "text",
      x: px,
      y: py - 16,
      w: 0,
      h: 0,
      label: "text",
      fill: "none",
    });
    ed.sel = base.id;
    setTool(ed, ui, "select");
    commit(ed);
    syncPanel(ed, ui);
    render(ed, ui);
    ui.label.focus();
    ui.label.select();
    return;
  }
  const el: El = {
    ...base,
    kind: tool,
    x: px,
    y: py,
    w: 0,
    h: 0,
    ...(tool === "free" ? { pts: [[rx, ry] as Pt] } : {}),
  };
  ed.els.push(el);
  ed.sel = el.id;
  ed.mode = { t: "create", el };
  render(ed, ui);
}
/** Pointer move while dragging out a new element: grow a freehand stroke, or stretch the shape. */
function dragCreate(ed: EdState, e: El, rx: number, ry: number): void {
  const px = sn(ed, rx),
    py = sn(ed, ry);
  if (e.kind === "free") {
    const l = e.pts![e.pts!.length - 1]!;
    if (Math.hypot(rx - l[0], ry - l[1]) > 4) e.pts!.push([rx, ry]);
  } else {
    e.w = px - e.x;
    e.h = py - e.y;
  }
}
/** Pointer move while moving the selected element: follow the cursor from where the drag began. */
function dragMove(
  ed: EdState,
  mode: { orig: El; sx: number; sy: number },
  rx: number,
  ry: number,
): boolean {
  const e = cur(ed);
  if (!e) return false;
  const dx = rx - mode.sx,
    dy = ry - mode.sy;
  e.x = sn(ed, mode.orig.x + dx);
  e.y = sn(ed, mode.orig.y + dy);
  if (e.kind === "free") {
    const ddx = e.x - mode.orig.x,
      ddy = e.y - mode.orig.y;
    e.pts = mode.orig.pts!.map(([a, b]) => [a + ddx, b + ddy] as Pt);
  }
  return true;
}
/** Pointer move while dragging a resize handle. */
function dragHandle(ed: EdState, m: { id: number; k: string }, rx: number, ry: number): boolean {
  const px = sn(ed, rx),
    py = sn(ed, ry);
  const e = ed.els.find((q) => q.id === m.id);
  if (!e) return false;
  const k = m.k;
  if (k === "br") {
    e.w = Math.max(20, px - e.x);
    e.h = Math.max(20, py - e.y);
  } else if (k === "1") {
    e.w = px - e.x;
    e.h = py - e.y;
  } else if (k === "0") {
    const ex = e.x + e.w,
      ey = e.y + e.h;
    e.x = px;
    e.y = py;
    e.w = ex - px;
    e.h = ey - py;
  }
  return true;
}
/** Pointer up after drawing: drop a stray click, flip a negative-size box, hand back to the select tool. */
function finishCreate(ed: EdState, ui: Ui, e: El): void {
  const tiny = e.kind === "free" ? (e.pts?.length ?? 0) < 3 : Math.hypot(e.w, e.h) < 6;
  if (tiny) {
    ed.els = ed.els.filter((q) => q.id !== e.id);
    ed.sel = null;
  } else if (e.kind === "rect" || e.kind === "ellipse" || e.kind === "diamond") {
    if (e.w < 0) {
      e.x += e.w;
      e.w = -e.w;
    }
    if (e.h < 0) {
      e.y += e.h;
      e.h = -e.h;
    }
  }
  setTool(ed, ui, "select");
}
function wirePointer(ed: EdState, ui: Ui): void {
  const { svg } = ui;
  svg.addEventListener("pointerdown", (ev) => {
    svg.focus();
    const [rx, ry] = toSvg(svg, ev);
    svg.setPointerCapture(ev.pointerId);
    if (ed.tool === "select") pointerDownSelect(ed, ui, rx, ry);
    else pointerDownCreate(ed, ui, ed.tool, { rx, ry });
  });
  svg.addEventListener("pointermove", (ev) => {
    const mode = ed.mode;
    if (!mode) return;
    const [rx, ry] = toSvg(svg, ev);
    if (mode.t === "create") dragCreate(ed, mode.el, rx, ry);
    else if (mode.t === "move") {
      if (!dragMove(ed, mode, rx, ry)) return;
    } else if (!dragHandle(ed, mode, rx, ry)) return;
    render(ed, ui);
  });
  svg.addEventListener("pointerup", () => {
    if (ed.mode?.t === "create") finishCreate(ed, ui, ed.mode.el);
    ed.mode = null;
    commit(ed);
    syncPanel(ed, ui);
    render(ed, ui);
  });
  svg.addEventListener("dblclick", (ev) => {
    const [rx, ry] = toSvg(svg, ev);
    const t = ed.els.toReversed().find((q) => hit(q, rx, ry));
    if (t) {
      ed.sel = t.id;
      syncPanel(ed, ui);
      render(ed, ui);
      ui.label.focus();
      ui.label.select();
    }
  });
}
/** Keyboard shortcuts: undo/redo, delete, and the one-letter tool keys. */
function onKey(ed: EdState, ui: Ui, ev: KeyboardEvent): void {
  const tg = ev.target;
  if (tg instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/u.test(tg.tagName)) {
    if (ev.key === "Enter") tg.blur();
    return;
  }
  const mod = ev.metaKey || ev.ctrlKey;
  if (mod && ev.key.toLowerCase() === "z") {
    ev.preventDefault();
    if (ev.shiftKey) doRedo(ed, ui);
    else doUndo(ed, ui);
    return;
  }
  if (mod && ev.key.toLowerCase() === "y") {
    ev.preventDefault();
    doRedo(ed, ui);
    return;
  }
  if (ev.key === "Delete" || ev.key === "Backspace") {
    ev.preventDefault();
    del(ed, ui);
    return;
  }
  const t = TOOLS.find(([, , k]) => k === ev.key.toLowerCase());
  if (t && !mod) setTool(ed, ui, t[0]);
}

/* ── starting content: the Rough.js pipeline, sketched ── */
const seedEls = (): El[] => {
  let nextId = 1;
  const mk = (
    kind: Kind,
    x: number,
    y: number,
    w: number,
    hh: number,
    labelText: string,
    fillC: string,
    seed: number,
    extra: Partial<El> = {},
  ): El => ({
    id: nextId++,
    kind,
    x,
    y,
    w,
    h: hh,
    label: labelText,
    stroke: kind === "arrow" ? ink : fillC,
    fill: kind === "arrow" ? "none" : fillC,
    fillStyle: "hachure",
    roughness: 1.4,
    sw: 2.4,
    seed,
    ...extra,
  });
  return [
    mk("rect", 60, 220, 170, 84, "Options", P.c3, 11),
    mk("rect", 360, 220, 190, 84, "Generator", P.c1, 12),
    mk("rect", 680, 220, 170, 84, "Drawable", P.c4, 13),
    mk("arrow", 236, 262, 118, 0, "", ink, 14),
    mk("arrow", 556, 262, 118, 0, "", ink, 15),
    mk(
      "text",
      60,
      96,
      0,
      0,
      "Draw here — pick a tool (v r o d a l p t), drag on the canvas.",
      ink,
      16,
      { fill: "none", stroke: P.muted },
    ),
    mk("ellipse", 360, 380, 190, 76, "seed", P.c2, 17),
    mk("arrow", 455, 372, 0, -60, "", ink, 18, { label: "PRNG" }),
  ];
};
/** The saved diagram if there is a readable one, else the starter sketch. */
function initialEls(): El[] {
  const saved = (() => {
    try {
      return localStorage.getItem(STORE);
    } catch {
      return null;
    }
  })();
  try {
    return saved ? parseEls(saved) : seedEls();
  } catch {
    return seedEls();
  }
}

export function sceneEditor(box: HTMLElement): () => void {
  const ed: EdState = {
    els: [],
    sel: null,
    tool: "select",
    snapOn: false,
    nextId: 1,
    style: { stroke: ink, fill: P.c3, fillStyle: "hachure", roughness: 1.4, sw: 2.4 },
    committed: "",
    undo: [],
    redo: [],
    mode: null,
  };
  const act: Actions = {
    setTool: (t) => setTool(ed, ui, t),
    undo: () => doUndo(ed, ui),
    redo: () => doRedo(ed, ui),
    del: () => del(ed, ui),
    commit: () => commit(ed),
    render: () => render(ed, ui),
    syncPanel: () => syncPanel(ed, ui),
    svgText: () => svgString(ui.svg),
  };
  const ui = buildUi(box, ed, act);
  wirePanel(ed, ui);
  wirePointer(ed, ui);
  window.addEventListener("keydown", (ev) => {
    if (box.hidden) return;
    onKey(ed, ui, ev);
  });

  ed.els = initialEls();
  ed.nextId = Math.max(0, ...ed.els.map((e) => e.id)) + 1;
  ed.committed = JSON.stringify(ed.els);
  syncPanel(ed, ui);
  render(ed, ui);
  return () => render(ed, ui);
}

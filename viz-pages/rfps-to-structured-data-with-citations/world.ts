import { $, esc } from "@viz/kit";

// Imported, not fetched. A relative fetch() cannot travel into a single-file export —
// the publish step warns about the ones it can see in the HTML and never sees this one,
// because it is in here. An import is part of the module graph, so the bundler inlines it.
// Dynamic, so the `with { type: "json" }` survives the dev server's per-file type strip
// (Bun.Transpiler drops a static import's attributes, and the browser then refuses the
// JSON as a module script). `bun build` still inlines it, so the export is unchanged.
export const D = (await import("./story-data.json", { with: { type: "json" } })).default;

export type Box = { x: number; y: number; w: number; h: number };
type Style = Record<string, string | number>;
type Rect4 = [number, number, number, number];
/** The JSON stores a rectangle as number[]; it is always four numbers. */
export const rect4 = (r: number[]): Rect4 => [r[0]!, r[1]!, r[2]!, r[3]!];
export type Cam = { cx: number; cy: number; w: number };
export type Keyframe = {
  id: string;
  el: string;
  fit?: string[];
  pad?: number;
  beats?: number;
  dwell?: number;
  appendix?: string;
  eyebrow: string;
  title: string | ((b: number) => string | undefined);
  body: string;
  enter?(): void;
  on?(b: number): void;
};

export const world = $<HTMLElement & { _scale?: number }>("#world")!;
/* `?motion=off` forces the reduced-motion path from any machine: camera flights become
 * cuts and beats land instantly. It exists for the same reason `?rig=off` does — the
 * behaviour was only reachable by changing an OS setting, so nobody ever checked it —
 * and it is what makes a beat inspectable, by a screenshot or by anyone who finds a
 * 2.8-second flight between beats more nauseating than useful. `?motion=on` forces the
 * animated path even when the OS asks for reduced motion. */
const MOTION_PARAM = new URLSearchParams(location.search).get("motion");
export const REDUCED =
  MOTION_PARAM === "off"
    ? true
    : MOTION_PARAM === "on"
      ? false
      : matchMedia("(prefers-reduced-motion: reduce)").matches;

// Read before ANY render: the first apply() rewrites location.hash to the keyframe it
// lands on, so this is the only moment the requested one still exists.
export const WANTED = location.hash.slice(1);
// Otherwise the browser restores the previous scroll offset on reload and fights the
// deep link for the first few frames.
history.scrollRestoration = "manual";

/* Every reading time on the page comes from here, at one fixed rate — the measured
 * average for adult silent reading of non-fiction (Brysbaert 2019). This used to be a
 * slider in the narration bar. A word count is a number nobody has a feel for: "6,733
 * words" lands nowhere and "28 min" lands immediately, but handing the room a dial
 * invited an argument about the rate instead of about the pile of paper. */
export const WPM = D.reading.wpm;
export const readTime = (words: number): string => {
  const mins = Math.max(1, Math.round(words / WPM));
  const h = Math.floor(mins / 60),
    m = mins % 60;
  return h ? `${h} hr ${m} min` : `${m} min`;
};

export const fmt = (n: number): string => n.toLocaleString("en-US");
export const px = (n: number): string => `${n}px`;
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v));
export const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** `submissionDeadline` -> `submission deadline`. The field names are the pipeline's
 *  own keys; showing them camelCased makes a schema look like an implementation. */
export const human = (k: string): string => k.replaceAll(/([A-Z])/gu, " $1").toLowerCase();

/** Trim to a word boundary. The panel shows what a field became, not its full prose;
 *  a two-line CSS clamp cut mid-word and reported as a layout overflow. */
export function short(v: string | null | undefined, n = 74): string {
  const t = v ?? "—";
  return t.length <= n ? t : t.slice(0, t.lastIndexOf(" ", n)) + "…";
}

/** Create an absolutely-positioned world element. */
export function node(
  cls: string,
  box: Box | null,
  parent: HTMLElement = world,
  style: Style = {},
): HTMLElement {
  const e = document.createElement("div");
  e.className = cls;
  if (box)
    Object.assign(e.style, {
      position: "absolute",
      left: px(box.x),
      top: px(box.y),
      width: px(box.w),
      height: px(box.h),
    });
  Object.assign(e.style, style);
  parent.append(e);
  return e;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   WORLD LAYOUT

   Everything below is in world units. They are arbitrary but consistent; think of
   one unit as one pixel at camera scale 1. The numbers are grouped here rather than
   scattered through the builders so the spatial story stays legible.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const HERO_W = 2000; // hero page = grid cell = this
export const HERO_H = Math.round(HERO_W * D.hero.aspect);
export const HG = D.hero.grid; // 8 x 3 sprite of 22 pages
export const DOC = { x: 0, y: 0, w: HG.cols * HERO_W, h: HG.rows * HERO_H };

export const PANEL = { x: DOC.x + HERO_W + 380, y: 0, w: 3500, h: HERO_H };

// The gap to the hero document is clearance, not decoration: the wall's own shot is
// framed by height, so a tight gap put a sliver of page 22 in the left of frame.
const GAL_COLS = 5,
  GAL_CELL_W = 3000,
  GAL_GAP_X = 640;
export const GAL = {
  x: DOC.x + DOC.w + 4800,
  y: -200,
  cols: GAL_COLS,
  cellW: GAL_CELL_W,
  gapX: GAL_GAP_X,
  gapY: 760,
  w: GAL_COLS * (GAL_CELL_W + GAL_GAP_X) - GAL_GAP_X,
  h: 0,
};

export const MG = D.monster.grid; // 28 x 10 sprite of 275 pages
export const MON_CELL_W = 700,
  MON_CELL_H = Math.round(MON_CELL_W * (MG.cellH / MG.cellW));
export const MON: Box = { x: 0, w: MG.cols * MON_CELL_W, h: MG.rows * MON_CELL_H, y: 27000 };
MON.x = Math.round((DOC.x + DOC.w + GAL.x + GAL.w) / 2 - MON.w / 2);

/* The six-box pipeline diagram used to live here, and the tier diagram and the citation
   bar chart lived inside two of its boxes. All three are gone: the walkthrough shows a
   real page going through those same steps, so the boxes were a label for something the
   room had already watched happen. What is left is three floors — the comparison, the
   walkthrough, and what it cost. */
export const LANES = { w: 30000, h: 15400 }; // the workbench's own footprint
export const WORK: Box = { x: 0, y: 41000, w: 30000, h: 15400 }; // human and pipeline, side by side
export const TRACE = { x: 0, y: 62000, h: 15000 }; // one page, followed all the way
/* Deliberately tiny in world units, unlike everything else on this canvas: see the
   live-surfaces block for why one world unit has to equal one CSS pixel here. */
// Three panes of 1500 with 300 between them — keep this in step with `paneW` and the
// `panes` array in the live-surfaces block, since the camera frames this declared box
// and not the children that overflow it.
export const LIVE: Box = { x: 0, y: 84000, w: 5100, h: 1320 };
// The cost chart is an appendix now, so it sits after everything else rather than
// between the walkthrough and the live surfaces. Its old slot made the piece end on a
// bar chart, and made the closing scene reuse the cost frame — the same picture twice,
// two scenes apart, which read as a bug.
/* 104,000, not 100,000. The index above it is a wide, short box, so framing it fills the
   width and leaves height to spare — and at 100,000 that spare height was showing the top
   two bars of this chart under a card offering to open it. Four thousand units of clearance
   is what it takes to keep the menu from previewing its own first item. */
export const COST: Box = { x: 0, y: 104000, w: 26000, h: 14000 };
/* The 2026 appendix is the last thing on the canvas, and it answers the walkthrough's
   own six steps rather than introducing a new subject.

   MIND THE GAP: `trace` declares h: 15000 at y: 62000, but its children are absolutely
   positioned well outside that box and the deepest (#tr-0's page image) bottoms out at
   world y ~136,000 — a parent's getBoundingClientRect does not grow for overflowing
   children, so the declared height understates the scene by ~59,000 units. Anything
   placed below the trace floor has to clear 136,000, not 77,000. Measured, not guessed:
   walk `#world *` and take the max bottom. */
/* The appendix index, on its own floor between the live surfaces and the three scenes it
   points at. It is the last thing the scroll rail reaches — see `onRail()`. */
// Sized to the cards rather than to a round number, and dropped far enough below the
// live surfaces that framing it does not put three grey iframe panes in the top of the
// shot. 3,000 units of clearance to the cost chart below, which is the next thing down.
export const APPX: Box = { x: 0, y: 92500, w: 24000, h: 6000 };
export const NOW26: Box = { x: 0, y: 150000, w: 26000, h: 13000 };
// A harder document than any RFP in the corpus, and the last floor on the canvas.
export const CROP: Box = { x: 0, y: 188000, w: 30000, h: 23600 };
// Three more hard documents, on their own floor under the one the scene walks through.
// Same appendix, second keyframe — see `appendix: "crop"` on both.
export const CROP2: Box = { x: 0, y: 218000, w: 30000, h: 17000 };
export const MID = Math.round((DOC.x + DOC.w + GAL.x + GAL.w) / 2);
WORK.x = MID - WORK.w / 2;
TRACE.x = WORK.x;
COST.x = MID - COST.w / 2;
APPX.x = MID - APPX.w / 2;
NOW26.x = MID - NOW26.w / 2;
CROP.x = MID - CROP.w / 2;
CROP2.x = MID - CROP2.w / 2;
LIVE.x = MID - LIVE.w / 2;

export const FIELD_KEYS = Object.keys(D.hero.fields);

/* ── a whole document as one sprite image, with one overlay per page ──────────── */

/** Draw a page grid: ONE <img> of the sprite sheet, plus one transparent `.cell`
 *  overlay per page for the dim / ring / spotlight states.
 *
 *  Two things here are load-bearing, and both were learned the hard way:
 *
 *  The sprite is laid out at its NATURAL pixel size and blown up to world units with
 *  a transform, never by setting a width. A 1680px sheet stretched to 19600px world
 *  units is a 178-megapixel raster: Chrome painted it blank for the whole fly-in,
 *  and `img.decode()` on it never settled, which stalled this module's top-level
 *  await before it ever reached measure(). Scaled by transform it rasterises once at
 *  source resolution and the compositor does the zoom for free.
 *
 *  The overlays never touch `filter` or `opacity` — only `background-color` and
 *  `box-shadow`, both of which composite. Saturate-filtering 275 page-sized boxes at
 *  once to dim them hung the renderer outright. */
export function pageSheet(
  parent: HTMLElement,
  box: Box,
  g: typeof HG,
  cellW: number,
  cellH: number,
  ring: number,
  glow: number,
  idFor: (n: number) => Record<string, string>,
): { wrap: HTMLElement; cells: HTMLElement[] } {
  const wrap = node("gridwrap", box, parent);
  const img = document.createElement("img");
  img.className = "gridsheet";
  img.src = g.src;
  img.alt = "";
  img.width = g.cols * g.cellW;
  img.height = g.rows * g.cellH;
  Object.assign(img.style, {
    width: px(g.cols * g.cellW),
    height: px(g.rows * g.cellH),
    transformOrigin: "0 0",
    transform: `scale(${cellW / g.cellW})`,
  });
  wrap.append(img);

  /* The sheet is a full rectangle, so 22 pages in an 8x3 grid leave two slots of blank
     white paper in the corner. They used to be covered with opaque navy squares, which
     from the back of the room read as two black tiles someone forgot to fill. Clip the
     grid to the shape the document actually is instead: a ragged last row, which is
     what 22 pages in rows of 8 looks like. */
  const rem = g.pages % g.cols;
  if (rem) {
    const full = (Math.floor(g.pages / g.cols) / g.rows) * 100,
      part = (rem / g.cols) * 100;
    wrap.style.clipPath = `polygon(0 0, 100% 0, 100% ${full}%, ${part}% ${full}%, ${part}% 100%, 0 100%)`;
  }

  /* One dark band down every seam, drawn as a single background rather than by the
     overlays. The overlays are laid out on exact cell boundaries, but the camera scale
     is arbitrary, so a boundary lands mid-device-pixel and a hairline of undimmed sprite
     survives between two dimmed pages — bright white lines across the grid, worst in
     spotlight where everything around them is nearly black. A band centred on each seam
     covers the rounding whatever the scale, and reads as a page gutter. */
  const seam = Math.max(2, Math.round(cellW * 0.016));
  node("node", { x: 0, y: 0, w: g.cols * cellW, h: g.rows * cellH }, wrap, {
    backgroundImage:
      `repeating-linear-gradient(to right, #050d1c 0 ${seam}px, transparent ${seam}px ${cellW}px),` +
      `repeating-linear-gradient(to bottom, #050d1c 0 ${seam}px, transparent ${seam}px ${cellH}px)`,
    backgroundPosition: `${-seam / 2}px ${-seam / 2}px`,
    pointerEvents: "none",
  });

  const cells: HTMLElement[] = [];
  for (let i = 0; i < g.pages; i++) {
    const c = node(
      "cell",
      {
        x: (i % g.cols) * cellW,
        y: Math.floor(i / g.cols) * cellH,
        w: cellW,
        h: cellH,
      },
      wrap,
      { "--hit-ring": px(ring), "--hit-glow": px(glow) },
    );
    Object.assign(c.dataset, idFor(i + 1));
    cells.push(c);
  }
  return { wrap, cells };
}

/** A link to the document's own source PDF. `pointerEvents` because most world layers
 *  are pointer-events:none, and the underline is what makes it read as a link at all on
 *  a canvas where everything is already coloured text. */
export function srcLink(
  url: string,
  text: string,
  fontPx: number,
  colour = "var(--muted)",
): string {
  return `<a href="${esc(url)}" target="_blank" rel="noopener"
    style="font-family:var(--mono);font-size:${fontPx}px;color:${colour};
    text-decoration:underline;text-decoration-color:var(--faint);
    text-underline-offset:.25em;pointer-events:auto">${esc(text)}</a>`;
}

/** Engine entry points the scenes call from click handlers and `enter()` hooks. viz.ts fills them in; they are only ever called after load. */
export const nav: { pinTo: (id: string, push?: boolean) => void; nudgeLive: () => void } = {
  pinTo: () => {
    // replaced by viz.ts
  },
  nudgeLive: () => {
    // replaced by viz.ts
  },
};

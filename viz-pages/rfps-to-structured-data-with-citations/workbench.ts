import { esc } from "@viz/kit";
import {
  D,
  FIELD_KEYS,
  HG,
  type Keyframe,
  LANES,
  TRACE,
  WORK,
  human,
  node,
  pageSheet,
  px,
  rect4,
  short,
} from "./world.js";
import { heroCited } from "./hero.js";

/* ── the workbench: one real document, two ways of getting the same 15 fields ──────
 *
 * This was two rows of captioned boxes — "Open it / Read it / Find the facts" against
 * "Split / Convert / Extract" — and every word of it was an assertion. Nothing on screen
 * was a document, so having spent nine scenes on real paper we asked the room to take
 * the actual comparison on faith, in the abstract, at the exact moment it mattered.
 *
 * So both scenes now run on the same apparatus, and the apparatus is Flagstaff: its 22
 * pages on the left, the CRM record on the right, a clock above. A person reads pages
 * until fields appear. The pipeline does the same job to the same pages. Nothing moves
 * between the two scenes except what happens to the paper and what the clock says.
 *
 * Every number under it is computed, not written: the clock is that document's own
 * per-page word counts over the reading-speed dial, and which fields land when is its
 * own citation data. Change the dial and the argument re-runs. */

const WB_GRID_W = 16400,
  WB_CELL_W = Math.round(WB_GRID_W / HG.cols);
const WB = {
  clockH: 2200,
  gridW: WB_GRID_W,
  cardX: 18200,
  top: 3600,
  cellW: WB_CELL_W,
  cellH: Math.round(WB_CELL_W * (HG.cellH / HG.cellW)),
};

/* Out of the pipeline diagram. The workbench shows split, convert, extract, locate and
   check, so nesting it inside the box labelled "Extract" meant the pull-back revealed it
   sitting inside one of the five steps it had just walked through. */
const bench = node("node", { x: WORK.x, y: WORK.y, w: WORK.w, h: WORK.h });
bench.id = "bench";

/* The two scenes run on the same apparatus, which is the point — and was also the
   problem: the only thing saying "this is the manual one" and "this is the automated
   one" was an eyebrow in the caption bar, in the same colour both times. So the bench
   wears a badge, in the colour the rest of the piece already uses for each: amber for
   a person, green for the pipeline. It is the first thing that changes when the camera
   arrives and it never leaves the screen. */
const benchClock = node("node", { x: 0, y: 0, w: LANES.w, h: WB.clockH }, bench, {
  display: "flex",
  alignItems: "center",
  gap: "800px",
});
benchClock.innerHTML = `<div id="benchWho" style="font-family:var(--mono);font-size:620px;font-weight:600;
     letter-spacing:.18em;padding:260px 460px;border-radius:200px;border:20px solid"></div>
   <div id="benchTime" style="font-family:var(--mono);font-size:1600px;font-weight:600;
     color:var(--ink);letter-spacing:.04em">00:00</div>
   <div style="display:flex;flex-direction:column;gap:120px">
     <div id="benchMode" style="font-family:var(--mono);font-size:640px;letter-spacing:.16em;
       text-transform:uppercase;color:var(--faint)"></div>
     <div id="benchNote" style="font-family:var(--mono);font-size:420px;letter-spacing:.10em;
       color:rgba(95,118,153,.9)"></div>
   </div>`;
export const benchTime = benchClock.querySelector<HTMLElement>("#benchTime")!;
export const benchMode = benchClock.querySelector<HTMLElement>("#benchMode")!;
export const benchNote = benchClock.querySelector<HTMLElement>("#benchNote")!;
const benchWho = benchClock.querySelector<HTMLElement>("#benchWho")!;

/** Badge the bench as the manual run or the automated one. */
export function benchBadge(kind: string): void {
  const byHand = kind === "human";
  benchWho.textContent = byHand ? "BY HAND" : "AUTOMATED";
  benchWho.style.color = byHand ? "var(--warn)" : "var(--accent)";
  benchWho.style.borderColor = byHand ? "rgba(230,144,46,.55)" : "rgba(55,217,160,.55)";
  benchWho.style.background = byHand ? "rgba(48,30,10,.55)" : "rgba(8,44,36,.55)";
}

export const benchGrid = pageSheet(
  bench,
  { x: 0, y: WB.top, w: WB.gridW, h: HG.rows * WB.cellH },
  HG,
  WB.cellW,
  WB.cellH,
  120,
  800,
  (n) => ({ vizId: `bench-page-${n}`, label: `Flagstaff page ${n}` }),
);
const benchCells = benchGrid.cells;

// The same citation rectangles the close-up used, at grid size — this is where "locate"
// stops being a claim and becomes a box on a page.
const benchMarks: HTMLElement[] = [];
Object.entries(D.hero.citedPageRects).forEach(([page, rects]) => {
  const cell = benchCells[+page - 1];
  if (!cell) return;
  rects.map(rect4).forEach(([x, y, w, h]) => {
    benchMarks.push(
      node("mark", { x: x * WB.cellW, y: y * WB.cellH, w: w * WB.cellW, h: h * WB.cellH }, cell),
    );
  });
});

const CARD_H2 = LANES.h - WB.top + 700;
const benchCard = node(
  "wbox",
  { x: WB.cardX, y: WB.top - 700, w: LANES.w - WB.cardX, h: CARD_H2 },
  bench,
  {
    borderWidth: "22px",
    borderRadius: "300px",
    background: "rgba(8,44,36,.22)",
    borderColor: "rgba(55,217,160,.42)",
    padding: "600px 700px",
  },
);
benchCard.dataset["vizId"] = "bench-record";
benchCard.dataset["label"] = "The CRM record, filling in";
const CARD_ROW = Math.floor((CARD_H2 - 2600) / FIELD_KEYS.length);
benchCard.innerHTML = `<div style="font-family:var(--mono);font-size:520px;letter-spacing:.16em;
     text-transform:uppercase;color:var(--accent);margin-bottom:700px">The record</div>`;
const benchRows: Record<string, HTMLElement> = {};
FIELD_KEYS.forEach((k) => {
  const row = node("node", null, benchCard, {
    position: "relative",
    height: px(CARD_ROW),
    display: "flex",
    alignItems: "center",
    gap: "500px",
  });
  row.innerHTML = `<div style="font-family:var(--mono);font-size:${Math.round(CARD_ROW * 0.4)}px;
       color:var(--faint);width:38%;white-space:nowrap">${esc(human(k))}</div>
     <div class="v" style="flex:1;font-size:${Math.round(CARD_ROW * 0.44)}px;color:var(--ink);
       font-weight:700;opacity:0;transition:opacity .45s ease;white-space:nowrap;
       overflow:hidden"></div>`;
  benchRows[k] = row.querySelector<HTMLElement>(".v")!;
});

/* Reading time is the document's own words over the dial, so the clock cannot drift from
 * the claim: 22 pages is 6,733 words, and 6,733 words at 238 wpm is what it is. */
export const wordsTo = (n: number): number =>
  D.hero.perPageWords.slice(0, n).reduce((a, b) => a + b, 0);
export const clockText = (mins: number): string => {
  const t = Math.round(mins * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
export const fieldsBy = (n: number): Set<string> =>
  new Set(
    Object.entries(D.hero.citedPages)
      .filter(([p]) => +p <= n)
      .flatMap(([, f]) => f),
  );

/** Fill the record from a set of field keys; anything outside it stays visibly blank,
 *  which is the honest state — three of Flagstaff's fifteen are not in the document at
 *  all, and a person and the pipeline both end up with the same three holes. */
export function benchFill(keys: Set<string>, settled = false): void {
  FIELD_KEYS.forEach((k) => {
    const v = (D.hero.fields as Record<string, string | null>)[k];
    const has = v !== null && v !== undefined;
    const on = keys.has(k) && has;
    // "n/a" only once the document is exhausted. Until then an empty row means "not
    // found yet"; at the end it means "not in here" — which is the answer to "why did
    // you have to read all 22 pages?" A field is absent only when nothing is left.
    const na = settled && !has;
    benchRows[k]!.textContent = on ? short(v, 40) : na ? "n/a" : "";
    benchRows[k]!.style.opacity = on || na ? "1" : "0";
    benchRows[k]!.style.color = na ? "var(--faint)" : "var(--ink)";
    benchRows[k]!.style.fontWeight = na ? "400" : "700";
  });
}

export function benchPages({
  read = 0,
  cited = false,
  boxes = false,
}: {
  read?: number;
  cited?: boolean;
  boxes?: boolean;
}): void {
  benchCells.forEach((c, i) => {
    c.classList.toggle("seen", i < read);
    c.classList.toggle("hit", cited && heroCited.has(i + 1) && i < read);
  });
  benchMarks.forEach((m) => {
    m.classList.toggle("on", boxes);
  });
}

/* ── the machine's own picture ──────────────────────────────────────────────────
 *
 * The human scene is a document and a clock, because reading is a document and a clock.
 * Running the same beats through the same grid for the pipeline said only "this also
 * happens, but faster", and threw away the part that is actually interesting: the shape
 * of the work is different. One page becomes two artifacts, twenty-two pages go through
 * a model at once, twenty-two answers become one document, and one document is then
 * asked fifteen questions simultaneously. Fan out, fan in, fan out again.
 *
 * So this is a flow, left to right, one row per real page, sharing only the clock and
 * the record with the scene before it — which is what makes them comparable at all. */

/* Every chip in this flow is page-shaped, not a horizontal bar. They were bars, and a
 * bar is a quantity — the room read twenty-two rows of them as a chart of something,
 * not as twenty-two pages. A page is a portrait rectangle; at this pitch that is about
 * 300 units wide, which is small, and small is correct: the whole claim of the scene is
 * that a page is a small thing and there are a lot of them. */
const LN_H = LANES.h - WB.top;
const LN_PITCH = LN_H / D.hero.pages;
const LN_BAR = Math.round(LN_PITCH * 0.78); // a page's height
const LN_PW = Math.round(LN_BAR / D.hero.aspect); // and its width, at the real aspect
const LN = {
  top: WB.top,
  modelX: 5200,
  modelW: 2600,
  mdX: 9200,
  mergeX: 13000,
  mergeW: 3800,
  h: LN_H,
  pitch: LN_PITCH,
  bar: LN_BAR,
  pw: LN_PW,
  txtX: 0,
  imgX: LN_PW + 520,
  splitEnd: LN_PW + 520 + LN_PW,
  y: (i: number) => WB.top + Math.round(i * LN_PITCH),
};

export const line = node("node", { x: 0, y: 0, w: WB.cardX - 800, h: LANES.h }, bench, {
  opacity: 0,
  transition: "opacity .5s ease",
});

const lnLabel = (x: number, w: number, text: string, color = "var(--faint)", y = LN.top - 1150) => {
  const el = node("wlabel", null, line, {
    left: px(x),
    top: px(y),
    width: px(w),
    fontSize: "440px",
    letterSpacing: ".14em",
    color,
    opacity: 0,
    transition: "opacity .4s ease",
  });
  el.textContent = text;
  return el;
};
const lnHeads = {
  page: lnLabel(0, 4000, `${D.hero.pages} pages`),
  split: lnLabel(0, 4000, "text + image"),
  // Centred over the lit column below it, the way the merge head is centred over the
  // document. It used to be a wider box nudged 300 left, which — a .wlabel being
  // left-aligned — just moved the word off the column instead of centring it on it.
  model: lnLabel(LN.modelX, LN.modelW, "AI", "var(--accent)"),
  md: lnLabel(LN.mdX, 3000, "markdown"),
  merge: lnLabel(0, 4000, "one document"), // repositioned onto the document below
};
lnHeads.split.style.opacity = "0";
lnHeads.model.style.textAlign = "center";

/* The carry chain — the one thing in this scene that is not obvious from the rows.
 *
 * This used to be a brace labelled "all 22 at once", because the rebuild had lost the
 * fact that page N's conversion takes page N-1's markdown as an input. It does (see the
 * departures note on the `machine` keyframe), and that data dependency is why the pages
 * cannot be in flight together. So: a spine down the markdown column with a tick per
 * page, which is what "in order, each one sees the last" looks like. */
const lnCarry = node("node", { x: LN.mdX - 900, y: LN.top, w: 40, h: LN.h }, line, {
  background: "rgba(55,217,160,.55)",
  opacity: 0,
  transition: "opacity .4s ease",
});
// Indexed off the page count, not off lnRows — the rows are built below this.
const lnCarryTicks = Array.from({ length: D.hero.pages }, (_, i) =>
  node("node", { x: LN.mdX - 900, y: LN.y(i) + LN.bar / 2 - 10, w: 900, h: 20 }, line, {
    background: "rgba(55,217,160,.45)",
    opacity: 0,
    transition: `opacity .3s ease ${i * 45}ms`,
  }),
);
/* No tag on the spine. It said "each sees the last" 760 units under the word "markdown"
   — two labels overlapping in one column, and the second one repeating the beat title
   above it verbatim. The spine and its ticks carry the dependency on their own. */

/* One row per page. The three chips are the three states that page passes through, and
 * they all exist from the start — a beat only changes what is visible and where it is,
 * so the transitions are free and nothing is rebuilt mid-flight. */
const lnRows = D.hero.perPageWords.map((_, i) => {
  const y = LN.y(i),
    h = LN.bar,
    w = LN.pw;
  const sheetish = { borderRadius: "24px", transition: "opacity .4s ease" };
  const page = node("node", { x: 0, y, w, h }, line, {
    background: "var(--paper)",
    opacity: 0.92,
    ...sheetish,
  });
  // The text layer is a page too — same shape, ruled like type, so "one page becomes
  // two things" is two page-shaped things and not a bar chart.
  const txt = node("node", { x: LN.imgX, y, w, h }, line, {
    background: "rgba(154,176,207,.30)",
    opacity: 0,
    ...sheetish,
    backgroundImage: `repeating-linear-gradient(to bottom,
        rgba(154,176,207,.85) 0 ${Math.round(h * 0.07)}px,
        transparent ${Math.round(h * 0.07)}px ${Math.round(h * 0.2)}px)`,
    backgroundSize: "72% 100%",
    backgroundRepeat: "no-repeat",
    backgroundPosition: `${Math.round(w * 0.14)}px ${Math.round(h * 0.16)}px`,
  });
  const img = node("node", { x: LN.txtX, y, w, h }, line, {
    background: "var(--paper)",
    opacity: 0,
    ...sheetish,
  });
  /* A clean top-to-bottom cascade, proportional to the page index. It was `(i % 8) * 60ms`
     once, which split the column into three visible waves because of the modulo rather
     than by design. A cascade is now the honest animation: the pages really are
     converted one after another, because each one needs the one before it. */
  const md = node("node", { x: LN.mdX, y, w, h }, line, {
    background: "rgba(55,217,160,.30)",
    opacity: 0,
    ...sheetish,
    border: "12px solid rgba(55,217,160,.65)",
    transition: `opacity .4s ease ${i * 45}ms, transform .75s cubic-bezier(.4,0,.2,1)`,
  });
  // The citation mark rides the page row, so "locate" lands back on the paper it came
  // from rather than on a new diagram. One PAGE wide, not the whole split lane: the
  // locate beat has already put the text and image chips away and left only the page,
  // so a mark spanning `splitEnd` boxed the page plus two page-widths of empty canvas.
  const cite = node("node", { x: 0, y, w, h }, line, {
    boxShadow: "0 0 0 34px var(--mark)",
    borderRadius: "24px",
    opacity: 0,
    transition: "opacity .45s ease",
  });
  const wire = (x: number, len: number) =>
    node("node", { x, y: y + h / 2 - 5, w: len, h: 10 }, line, {
      background: "rgba(55,217,160,.45)",
      opacity: 0,
      transition: "opacity .4s ease",
    });
  /* The lit column is a CAPSULE — straight sides with a semicircular cap at each end —
     so its edge at row i is inset only for the handful of rows inside a cap. It used to
     be solved as a full-height ellipse, which insets every row above and below centre:
     at 22 rows against a 2,600-wide column that pulled most of the wires up to 1,300
     units short, and they ended in open canvas beside a gradient with no visible edge
     for them to end on. Solve the cap for this row instead. */
  const r = LN.modelW / 2,
    yc = y + h / 2;
  const over = Math.max(0, LN.top + r - yc, yc - (LN.top + LN.h - r));
  const inset = r - Math.sqrt(Math.max(0, r * r - over * over));
  const inW = wire(LN.splitEnd, LN.modelX + inset - LN.splitEnd);
  const outW = wire(LN.modelX + LN.modelW - inset, LN.mdX - (LN.modelX + LN.modelW - inset));
  return { page, txt, img, md, cite, inW, outW };
});

/* Not a bordered box. Every other rectangle on this canvas is a document, so drawing the
 * model as one more rounded rectangle made it read as another artefact in the row. A
 * soft-edged lit column has no border to mistake for a page edge, and matches the lit
 * spheres the walkthrough uses for the same thing. */
const lnModel = node("node", { x: LN.modelX, y: LN.top, w: LN.modelW, h: LN.h }, line, {
  borderRadius: `${LN.modelW / 2}px`,
  /* Lit ACROSS, not radially out from the centre. A radial gradient faded to
       transparent long before the element's own edge, so the shape you could see was a
       soft vertical blob floating somewhere inside a pill nobody could see — and 22
       wires arrived at the pill, which is not where the blob appeared to be. A gradient
       that runs left-to-right is clipped by `border-radius` to the capsule itself, so
       the silhouette on screen and the silhouette the wires are solved against are the
       same shape, and it has an edge. */
  background: `linear-gradient(90deg,
      rgba(55,217,160,.16), rgba(120,255,215,.40) 50%, rgba(55,217,160,.16))`,
  boxShadow: `inset 0 0 0 20px rgba(120,255,215,.34),
                0 0 900px 120px rgba(55,217,160,.16)`,
  opacity: 0,
  transition: "opacity .45s ease",
});

/* The merge target is a DOCUMENT, and it is document-shaped. It used to be a
 * full-height rounded box, and the 22 markdown chips flew into the middle of it and
 * flattened to `scaleY(.2)` — so twenty-two pages visibly became one horizontal line,
 * with the flight paths crossing into a shape the room read as a backwards 3. They land
 * on a page-shaped stack at page aspect instead, uniformly scaled, so nothing ever
 * stops looking like paper. */
const MERGE_H = Math.round(LN.h * 0.52),
  MERGE_W = Math.round(MERGE_H / D.hero.aspect);
const MERGE = {
  h: MERGE_H,
  w: MERGE_W,
  x: LN.mergeX + Math.round((LN.mergeW - MERGE_W) / 2),
  y: LN.top + Math.round((LN.h - MERGE_H) / 2),
  k: MERGE_W / LN.pw,
};

Object.assign(lnHeads.merge.style, {
  left: px(MERGE.x),
  top: px(MERGE.y - 800),
  width: px(MERGE.w),
  textAlign: "center",
});
const lnMerge = node(
  "node",
  { x: MERGE.x, y: MERGE.y, w: MERGE.w, h: MERGE.h },
  line,
  // Matched to the page chips that land inside it (24px at full size, scaled by MERGE.k),
  // so the container and its contents are one shape language. At a flat 40 it was a
  // squarer box holding rounder pages, which read as two unrelated rectangles.
  {
    borderRadius: px(Math.max(8, Math.round(24 * MERGE.k))),
    background: "rgba(55,217,160,.20)",
    opacity: 0,
    transition: "opacity .5s ease",
  },
);

/* Fifteen questions against one document, at the same instant — drawn as fifteen lines
 * from the merged document to the fifteen rows of the record, because that is the one
 * claim in this scene that a still picture can make on its own. */
const FAN_X = MERGE.x + MERGE.w;
const lnFan = FIELD_KEYS.map((_k, i) => {
  const y0 = MERGE.y + MERGE.h / 2;
  const y1 = WB.top - 700 + 1900 + Math.round((i + 0.5) * CARD_ROW);
  const dx = WB.cardX + 700 - FAN_X,
    dy = y1 - y0;
  const el = node("node", { x: FAN_X, y: y0, w: Math.round(Math.hypot(dx, dy)), h: 26 }, line, {
    background: "var(--accent)",
    opacity: 0,
    transformOrigin: "0 50%",
    transform: `rotate(${Math.atan2(dy, dx)}rad)`,
    transition: `opacity .4s ease ${i * 18}ms`,
  });
  return el;
});

/* The fan's endpoints were re-derived from WB.top with two magic offsets and landed a
 * little above each row's text. The rows are flex, alignItems:center, so their real
 * centre is the only honest target — measure it. Once, lazily, because layout has to
 * have happened first. */
let fanPlaced = false;
function placeFan() {
  if (fanPlaced) return;
  const rowEls = FIELD_KEYS.map((k) => benchRows[k] && benchRows[k].parentElement);
  if (!rowEls[0] || !rowEls[0].offsetHeight) return;
  const worldY = (el: HTMLElement) => {
    let y = 0,
      e: HTMLElement | null = el;
    while (e && e !== bench) {
      y += e.offsetTop;
      const up: Element | null = e.offsetParent;
      e = up instanceof HTMLElement ? up : null;
    }
    return y;
  };
  const y0 = MERGE.y + MERGE.h / 2;
  lnFan.forEach((el, i) => {
    const r = rowEls[i];
    if (!r) return;
    const y1 = worldY(r) + r.offsetHeight / 2;
    const dx = WB.cardX + 700 - FAN_X,
      dy = y1 - y0;
    el.style.width = px(Math.round(Math.hypot(dx, dy)));
    el.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  });
  fanPlaced = true;
}

export function lineShow(beat: number): void {
  const on = (el: HTMLElement, v: boolean) => (el.style.opacity = v ? "1" : "0");
  // Once the pages have become one document, the apparatus that made it is clutter.
  const upstream = beat < 3;
  lnRows.forEach((r, i) => {
    on(r.page, beat < 1);
    on(r.txt, beat >= 1 && upstream);
    on(r.img, beat >= 1 && upstream);
    on(r.md, beat >= 2);
    // Uniform scale onto the merged document's own footprint, from the chip's top-left.
    r.md.style.transformOrigin = "0 0";
    r.md.style.transform =
      beat >= 3
        ? `translate(${MERGE.x - LN.mdX}px, ${MERGE.y - LN.y(i)}px) scale(${MERGE.k})`
        : "none";
    // 22 chips stacked on the same footprint compound; at .16 each the merged document
    // came out a solid green slab instead of a document with pages in it.
    if (beat >= 3) {
      r.md.style.opacity = ".05";
      r.md.style.borderColor = "transparent";
    } else r.md.style.borderColor = "rgba(55,217,160,.65)";
    on(r.inW, beat >= 2 && upstream);
    on(r.outW, beat >= 2 && upstream);
    if (beat >= 5) {
      on(r.page, true);
      on(r.img, false);
      on(r.txt, false);
    }
    on(r.cite, beat >= 5 && heroCited.has(i + 1));
  });
  on(lnModel, beat >= 2 && upstream);
  on(lnCarry, beat >= 2 && beat < 3);
  lnCarryTicks.forEach((t) => {
    on(t, beat >= 2 && beat < 3);
  });
  on(lnMerge, beat >= 3);
  if (beat >= 4) placeFan();
  lnFan.forEach((el) => {
    on(el, beat >= 4);
  });
  on(lnHeads.page, beat < 1);
  on(lnHeads.split, beat >= 1 && upstream);
  on(lnHeads.model, beat >= 2 && upstream);
  on(lnHeads.md, beat >= 2 && beat < 3);
  on(lnHeads.merge, beat >= 3);
}

/* ── one page, followed all the way through ─────────────────────────────────────
 *
 * The flow above is the shape of the work. This is the work: six stations left to
 * right, and every panel in them is a real artefact off the pipeline's own disk — the
 * text layer PyMuPDF pulled out of page 1, the markdown the model wrote back for that
 * page, the question the extractor really asks for this field, the value and the quote
 * it really returned, and the rectangle the locate pass really matched. Nothing here is
 * illustrative. `build-assets.py` re-derives all of it, so if the pipeline changes its
 * mind the story changes with it.
 *
 * It is also where the word "AI" is allowed to be vague on purpose. The audience does
 * not need to know what a model is to follow a page of paper turning into a line of a
 * record; it needs to see the paper go in and the line come out. */

const T = D.trace;
/* The strip is NOT one straight line. Stations 1-4 are the pipeline, left to right, and
 * the last of them is a fork — "three ways back to the page, tried in order". Laid out
 * as stations 5, 6, 7 continuing rightwards, the three methods read as three more
 * pipeline steps: things that all happen, in that order, to every citation. They are
 * alternatives, and method 2 only runs when method 1 found nothing. So they hang BELOW
 * the fork instead — down-left, straight down, down-right — which is the shape of a
 * choice rather than the shape of a queue, and the camera flies it that way. */
// [column, row] per station. Row 1 is the fork's three branches, centred under station 4.
const TR_AT: [number, number][] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [2, 1],
  [3, 1],
  [4, 1],
];
const TR_PITCH = 20000,
  TR_DROP = 16000,
  TR_Y = TRACE.y + 2600;
const TR = {
  pitch: TR_PITCH,
  panelH: 9000,
  y: TR_Y,
  drop: TR_DROP,
  ox: (i: number) => TR_AT[i]![0] * TR_PITCH,
  oy: (i: number) => TR_Y + TR_AT[i]![1] * TR_DROP,
};
const trace = node("node", { x: TRACE.x, y: TRACE.y, w: TR.pitch * 5, h: TRACE.h + TR.drop });
trace.id = "trace";

/** A labelled panel. `mono` renders a real artefact — a text layer, a page of markdown —
 *  as itself, at a size that is legible when the camera is on it.
 *
 *  `io` is what makes a station readable as a machine rather than a row of boxes: the
 *  same green tint was on the prompt going in and the markdown coming out, so nothing
 *  on screen said which side of the model you were looking at. Inputs are cool and
 *  carry a `▶ IN` chip; outputs are green and carry `OUT ▶`. */
/* The per-panel IN/OUT chips are gone: the colour already says it, and a chip on every
   box was the same word four times in one frame. The columns are labelled instead. */
type PanelOpts = {
  x?: number;
  y?: number;
  w: number;
  h: number;
  label: string;
  text?: string;
  mono?: boolean;
  tint?: boolean;
  id?: string;
  io?: string;
  size?: number;
  dense?: boolean;
};
function trPanel(
  i: number,
  { x = 0, y = 0, w, h, label, text, mono, tint, id, io, size, dense }: PanelOpts,
) {
  const green = tint;
  const box = node("wbox", { x: TR.ox(i) + x, y: TR.oy(i) + y, w, h }, trace, {
    borderWidth: io ? "24px" : "16px",
    borderRadius: "180px",
    padding: dense ? "300px 340px" : "460px 420px",
    borderColor: green
      ? "rgba(55,217,160,.55)"
      : io === "in"
        ? "rgba(63,143,212,.55)"
        : io === "out"
          ? "rgba(200,214,236,.45)"
          : "rgba(120,160,230,.3)",
    background: green
      ? "rgba(8,44,36,.30)"
      : io === "in"
        ? "rgba(10,26,53,.62)"
        : "rgba(12,28,56,.62)",
    overflow: "hidden",
  });
  if (id) box.id = id;
  box.innerHTML =
    `<div style="font-family:var(--mono);font-size:${dense ? 250 : 300}px;
       letter-spacing:.12em;white-space:nowrap;margin-bottom:${dense ? 190 : 300}px;
       text-transform:uppercase;color:${
         green
           ? "var(--accent)"
           : io === "in"
             ? "var(--t-blue)"
             : io === "out"
               ? "var(--ink)"
               : "var(--faint)"
       }
       ">${esc(label)}</div>` +
    (text === undefined
      ? ""
      : `<div style="white-space:pre-wrap;${mono ? "font-family:var(--mono);" : ""}
         font-size:${size ?? (mono ? 168 : 300)}px;line-height:1.5;color:var(--ink);
         opacity:.92">${esc(text)}</div>`);
  return box;
}

/* The model, drawn as a thing rather than a rectangle.
 *
 * "AI" used to be a bordered box exactly like the panels either side of it — and at
 * station 4 it was an EMPTY one, a labelled hole in the middle of the diagram. A box
 * among boxes reads as another document. This is the one element on the canvas that
 * isn't paper, so it is the one element that isn't a rectangle: a lit sphere, which is
 * as specific as this story ever needs to be about what a model is. */
function trBrain(
  i: number,
  { x, y, d, label = "AI" }: { x: number; y: number; d: number; label?: string },
) {
  const el = node("node", { x: TR.ox(i) + x, y: TR.oy(i) + y, w: d, h: d }, trace, {
    borderRadius: "50%",
    background: `radial-gradient(circle at 50% 38%,
      rgba(120,255,215,.75), rgba(55,217,160,.42) 38%, rgba(8,44,36,.92) 70%)`,
    boxShadow: "0 0 0 26px rgba(55,217,160,.55), 0 0 1200px 260px rgba(55,217,160,.20)",
    display: "grid",
    placeItems: "center",
  });
  el.innerHTML = label
    ? `<div style="font-family:var(--mono);font-size:${Math.round(d * 0.18)}px;
       font-weight:600;letter-spacing:.2em;color:#eafff7">${esc(label)}</div>`
    : "";
  return el;
}

/** Gather several inputs onto one spine and take a single line into the model. Three
 *  separate arrows aimed at a sphere read as three unrelated pokes; a manifold reads as
 *  "all of this, together, is the input" — which is what a prompt is. */
function trBus(
  i: number,
  { fromX, ys, x, toY, toX }: { fromX: number; ys: number[]; x: number; toY: number; toX: number },
) {
  const wire = (bx: number, by: number, w: number, h: number) =>
    node("node", { x: TR.ox(i) + bx, y: TR.oy(i) + by, w, h }, trace, {
      background: "rgba(154,176,207,.55)",
    });
  ys.forEach((y) => {
    wire(fromX, y, x - fromX, 26);
  });
  wire(x, Math.min(...ys), 26, Math.max(...ys) - Math.min(...ys));
  wire(x, toY, toX - x, 26);
}

/** A column header — said once over a stack, instead of on every box in it. */
const trColHead = (i: number, x: number, w: number, text: string, color: string) => {
  const el = node("wlabel", null, trace, {
    left: px(TR.ox(i) + x),
    top: px(TR.oy(i) - 900),
    width: px(w),
    // Centred over the column it heads. Left-aligned, "input" sat against the left edge
    // of a group three panels wide and read as a label for the first panel only.
    textAlign: "center",
    fontSize: "320px",
    letterSpacing: ".22em",
    color,
  });
  el.textContent = text;
  return el;
};

/* No station number. Each title used to carry one, and because the frames overlap you
   also saw the NEXT station's number floating at the right edge of every shot — a
   counter nobody could act on, beside a step counter in the corner that already says
   where you are. The title is the station. */
const trStation = (i: number, t: string) => {
  const el = node("wlabel", null, trace, {
    left: px(TR.ox(i)),
    top: px(TR.oy(i) - 1800),
    width: px(TR.pitch - 1000),
    fontSize: "520px",
    letterSpacing: ".16em",
    color: "var(--faint)",
  });
  el.textContent = t;
  return el;
};

const trArrow = (i: number, x: number, y: number, w: number) =>
  node("node", { x: TR.ox(i) + x, y: TR.oy(i) + y, w, h: 26 }, trace, {
    background: "rgba(154,176,207,.55)",
  });

/* No character counts anywhere in this strip. Every panel had one — 1,359 characters,
   1,533 characters, 47,263 characters — and not one of them was a fact anybody could do
   anything with. The artefact IS the evidence; its length is trivia. */

/* 1 — split. One page, and the two things the pipeline makes of it: the text the PDF
   was already carrying, and a picture of the same page. Both on screen at once, because
   they are one step, not two. */
trStation(0, "one page becomes two things");
const trPage = node(
  "sheet",
  { x: TR.ox(0), y: TR.oy(0), w: 5600, h: Math.round(5600 * D.hero.aspect) },
  trace,
);
trPage.id = "tracePage";
trPage.innerHTML = `<img src="${D.hero.img.src}" alt="Page ${T.page} of the Flagstaff RFP">`;
node("wlabel", null, trace, {
  left: px(TR.ox(0)),
  top: px(TR.oy(0) + Math.round(5600 * D.hero.aspect) + 300),
  width: px(5600),
  fontSize: "300px",
  letterSpacing: ".1em",
}).textContent = `page ${T.page}`;
trPanel(0, {
  x: 6600,
  w: 11600,
  h: TR.panelH,
  label: "and the text the PDF already had",
  text:
    T.textLayer
      .replaceAll(/\n{2,}/gu, "\n")
      .trim()
      .slice(0, 620) + " …",
  mono: true,
});

/* 2 — three things go in, one comes out.
 *
 * This used to be a page, a box labelled "its text" with nothing in it, and the prompt
 * hidden inside the thing labelled "AI" — with a single arrow, drawn from the picture.
 * So the picture looked like the input, the text looked like an empty formality, and
 * the instruction looked like something the model already knew. All three are inputs
 * and all three are real, so all three are on screen with their own contents and their
 * own line into the model. */
trStation(1, "four things go to the model");
const TC = { inW: 4600, brainX: 7000, brainD: 3600, outX: 11600, outW: 6800 };
const tcImgH = Math.round(2000 * D.hero.aspect);
trColHead(1, 0, TC.inW, "input", "var(--t-blue)");
trColHead(1, TC.outX, TC.outW, "output", "var(--ink)");
const tcImg = node(
  "sheet",
  { x: TR.ox(1) + Math.round(TC.inW / 2 - 1000), y: TR.oy(1) + 150, w: 2000, h: tcImgH },
  trace,
  { boxShadow: "0 0 0 24px rgba(63,143,212,.55), 0 40px 120px rgba(0,0,0,.5)" },
);
tcImg.innerHTML = `<img src="${D.hero.img.src}" alt="A picture of page ${T.page}">`;
node("wlabel", null, trace, {
  left: px(TR.ox(1)),
  top: px(TR.oy(1) + 150 + tcImgH + 150),
  width: px(TC.inW),
  textAlign: "center",
  fontSize: "240px",
  letterSpacing: ".1em",
  color: "var(--t-blue)",
}).textContent = "a picture of the page";
// The real text layer, not the words "its text". Cut at a line, because the point is
// that it is ragged PDF text, not that you can read all of it here.
const tcText = T.textLayer
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean)
  .join("\n");
/* Three stacked inputs under the page image, on one shared grid inside the station's own
   vertical budget (0..9400 relative to TR.y). They were placed one at a time, and adding
   the fourth pushed it off the bottom of the frame. */
const TC_Y = [3350, 5400, 7450] as const,
  TC_H = 1900;
trPanel(1, {
  x: 0,
  y: TC_Y[0],
  w: TC.inW,
  h: TC_H,
  io: "in",
  label: "its text",
  // Two real lines and an explicit marker. A character slice landed mid-word on the
  // fourth line and clipped it, which reads as a rendering bug rather than an excerpt.
  dense: true,
  mono: true,
  size: 160,
  text:
    tcText
      .split("\n")
      .filter((l) => !/^\d+$/u.test(l))
      .slice(0, 2)
      .join("\n") + "\n… truncated",
});
trPanel(1, {
  x: 0,
  y: TC_Y[1],
  w: TC.inW,
  h: TC_H,
  io: "in",
  label: "the prompt",
  dense: true,
  size: 170,
  text: "One page. Trust the picture\nover the text. Write it out\nas markdown.",
});
/* The fourth input, and the one the rebuild had lost: what the previous page turned into,
   plus the headings seen so far. A table or a numbered clause straddling a page break is
   the normal case in a long solicitation, and a page converted with no idea what preceded
   it restarts the numbering and re-emits the table header as body text. */
trPanel(1, {
  x: 0,
  y: TC_Y[2],
  w: TC.inW,
  h: TC_H,
  io: "in",
  label: "page before",
  dense: true,
  size: 165,
  text: "The previous page's markdown,\nand every heading so far, so\ntables keep their shape.",
});
trBus(1, {
  fromX: TC.inW,
  ys: [1450, 4300, 6350, 8400],
  x: TC.inW + 900,
  toY: TR.panelH / 2,
  toX: TC.brainX,
});
trBrain(1, { x: TC.brainX, y: TR.panelH / 2 - TC.brainD / 2, d: TC.brainD });
// Length DERIVED, not guessed: the gap between the sphere's right edge and the output
// box. It was a round 1000 against an 800 gap, so 200 units of wire ran on behind a
// 62%-opaque panel and showed through it.
trArrow(1, TC.brainX + TC.brainD + 200, TR.panelH / 2, TC.outX - (TC.brainX + TC.brainD + 200));
// The whole page of markdown, untruncated: it is one page, it is short, and a "…" on
// the one artefact this step exists to produce invites the question of what was cut.
trPanel(1, {
  x: TC.outX,
  w: TC.outW,
  h: TR.panelH,
  io: "out",
  label: "one page of markdown",
  text: T.markdown.trim(),
  mono: true,
  size: 128,
});

/* The merge station is gone. It showed twenty-two chips becoming one document, i.e. an
   explainer for concatenation — the one step in the pipeline nobody in the room needs
   taught. Its slot is reused by the stations after it, which is why the trace indices
   below are contiguous again. */

/* 3 — one question at a time, all at the same time.
 *
 * Deliberately NOT how this repo's default extract stage is wired (it sends the whole
 * schema in one call). It IS how the real system works — one model call per question,
 * each its own task, each handed the same whole document — and it is the version worth
 * showing, because "fifteen questions asked at once" is a shape a room can hold and
 * "one call returning a fifteen-field object" is not.
 *
 * The example is real: the question below is the one the extractor actually asks for
 * the submission deadline, and the answer below is what actually came back. */
trStation(2, "one question at a time — all at once");
trColHead(2, 0, 5200, "input", "var(--t-blue)");
trColHead(2, 11800, 6600, "output", "var(--ink)");
const TE = { inW: 5200, brainX: 7800, brainD: 3400, outX: 11800, outW: 6600 };
trPanel(2, {
  y: 700,
  w: TE.inW,
  h: 3600,
  io: "in",
  label: "the whole document",
  text: `<<<PAGE 1>>>\n${T.markdown.trim().slice(0, 110)} …`,
  mono: true,
  size: 190,
});
trPanel(2, {
  y: 4700,
  w: TE.inW,
  h: 3600,
  io: "in",
  label: "one question",
  text: `“${T.question}”`,
  size: 250,
});
trBus(2, { fromX: TE.inW, ys: [2400, 6400], x: TE.inW + 900, toY: TR.panelH / 2, toX: TE.brainX });

/* Three stacked spheres, not one: the claim of this station is that the same document
   goes to the model fifteen times over, simultaneously, once per field. Two ghosted
   copies behind the live one is the cheapest honest way to draw "and fourteen more of
   these are happening right now". */
(
  [
    [-1100, 0.18],
    [-550, 0.38],
  ] satisfies [number, number][]
).forEach(([dy, op]) => {
  const g = trBrain(2, {
    x: TE.brainX + 260,
    y: TR.panelH / 2 - TE.brainD / 2 + dy,
    d: TE.brainD,
    label: "",
  });
  g.style.opacity = String(op);
});
trBrain(2, { x: TE.brainX, y: TR.panelH / 2 - TE.brainD / 2, d: TE.brainD });
node("wlabel", null, trace, {
  left: px(TR.ox(2) + TE.brainX - 400),
  top: px(TR.oy(2) + TR.panelH / 2 + TE.brainD / 2 + 500),
  width: px(TE.brainD + 1200),
  textAlign: "center",
  fontSize: "300px",
  letterSpacing: ".1em",
  color: "var(--accent)",
}).textContent = `× ${FIELD_KEYS.length}, in parallel`;

trArrow(2, TE.brainX + TE.brainD + 200, TR.panelH / 2, TE.outX - (TE.brainX + TE.brainD + 200));

/* What actually comes back is not a value. It is a value AND the passage it rests on,
   which is the only reason the next three stations can exist at all. */
const trAnswers = node(
  "wbox",
  { x: TR.ox(2) + TE.outX, y: TR.oy(2) + 700, w: TE.outW, h: 7600 },
  trace,
  {
    borderWidth: "24px",
    borderRadius: "180px",
    padding: "460px 420px",
    borderColor: "rgba(154,176,207,.45)",
    background: "rgba(12,28,56,.62)",
  },
);
trAnswers.innerHTML = `<div style="font-family:var(--mono);font-size:280px;letter-spacing:.14em;
     text-transform:uppercase;color:var(--muted);margin-bottom:420px">what came back</div>
   <div style="font-family:var(--mono);font-size:250px;color:var(--faint);
     letter-spacing:.06em">value</div>
   <div style="font-size:340px;font-weight:700;color:var(--ink);line-height:1.35;
     margin:120px 0 480px">${esc(T.value)}</div>
   <div style="font-family:var(--mono);font-size:250px;color:var(--faint);
     letter-spacing:.06em">quote</div>
   <div style="font-family:var(--mono);font-size:225px;color:var(--ink);line-height:1.5;
     margin-top:120px;opacity:.92">${esc(T.quote.replaceAll("*", "").trim())}</div>`;

/* 4, 5, 6, 7 — locate, one station per method plus the handoff.
 *
 * This was a single shot: the quote in a box, and beside it a panel of prose that
 * ASSERTED the methods in words. Having spent the whole piece insisting every claim is
 * a thing you can see, the step that exists to prove the values are real was the one
 * step asking to be taken on trust. */

/* 4 — the quote, on its own, handed to the locate pass. */
/* This station used to show the value and the quote under it, which is exactly what the
   station before it had just shown — the same two artefacts, one frame later. What the
   walkthrough actually needs here is the fork: the quote now has to be found on the page,
   and there are three ways to try, in order, each one only reached when the one before it
   failed. Naming them here is what makes the next three stations read as a ladder rather
   than three unrelated diagrams. */
/* Cards are nudged 500 left of a clean `i * 6300`, which is the whole reason this is a
   named function: it puts the MIDDLE card's centre exactly on the middle branch station's
   frame centre, so method 2's wire is one straight vertical line instead of a 500-unit
   dogleg. Methods 1 and 3 are elbows because they genuinely go sideways. */
const M3_CARD = (i: number) => i * 6300 - 500;
trStation(3, "three ways back to the page");
(
  [
    ["method 1", "the PDF's own words", "Search the text layer.\nNo model.", "var(--accent)"],
    // Labels here are nowrap in a 5600-wide box: "when the page is a picture" is 26
    // characters and clipped to "…IS A PICTU". Twenty is the ceiling.
    ["method 2", "when it is a picture", "OCR the pixels,\nthen search those.", "var(--t-blue)"],
    ["method 3", "when nothing matched", "Ask the model.\nOff by default.", "var(--warn)"],
  ] satisfies [string, string, string, string][]
).forEach(([n, k, v, c], i) => {
  const box = trPanel(3, {
    x: M3_CARD(i),
    y: 2200,
    w: 5600,
    h: 4600,
    label: k,
    text: v,
    size: 260,
  });
  box.style.borderColor = c;
  node("wlabel", null, trace, {
    left: px(TR.ox(3) + M3_CARD(i)),
    top: px(TR.oy(3) + 1500),
    width: px(5600),
    textAlign: "center",
    fontFamily: "var(--mono)",
    fontSize: "300px",
    letterSpacing: ".14em",
    textTransform: "uppercase",
    color: c,
  }).textContent = n;
  /* And the branch itself: an elbow from the bottom of this card down to the top of the
     station that carries it out. Without them the three stations below are just three
     more diagrams that happen to sit lower down; with them the frame you are looking at
     is visibly the place the path splits. Coordinates are derived from the same TR.ox /
     TR.oy the stations use, so moving a branch in TR_AT moves its wire with it. */
  const fromX = TR.ox(3) + M3_CARD(i) + 2800; // centre of this method card
  const toX = TR.ox(4 + i) + (TR.pitch - 1600) / 2 - 600; // centre of its station frame
  const y0 = TR.oy(3) + 6800; // the card's bottom edge
  const yMid = TR.y + TR.drop - 5000; // the lane the elbows turn in
  const y1 = TR.oy(4 + i) - 2200; // the station frame's top edge
  const seg = (x: number, y: number, w: number, h: number) =>
    node("node", { x, y, w, h }, trace, { background: c, opacity: 0.5 });
  if (fromX === toX) {
    seg(fromX - 20, y0, 40, y1 - y0); // straight down — no corner to draw
  } else {
    seg(fromX - 20, y0, 40, yMid - y0);
    seg(Math.min(fromX, toX) - 20, yMid - 20, Math.abs(toX - fromX) + 40, 40);
    seg(toX - 20, yMid, 40, y1 - yMid);
  }
});

/* 5 — method one: the PDF is already carrying its words and their boxes, so finding the
   quote is a string search, and the great majority of the corpus lands here — see
   D.corpus.citations for the split, which moves whenever the pipeline is re-run. */
trStation(4, "method 1 — the PDF already knows its words");
trPanel(4, {
  w: 5600,
  h: 2600,
  io: "in",
  label: "the quote",
  text: T.quote.replaceAll("*", "").trim(),
  mono: true,
  size: 180,
});
/* The words the locate pass matched, and the boxes the PDF carries for them — straight
   off D.trace.words, which build-assets reads out of the page. These were hand-typed
   until 2026-09-07, and wrong: the panel said `closing (148, 232)` where the PDF says
   `CLOSING (54, 152)`. It was the only illustrative thing in a strip whose whole
   argument is that every other panel is a real artefact. */
trPanel(4, {
  y: 3100,
  w: 5600,
  h: 4800,
  label: "words and boxes",
  text:
    T.words
      .slice(0, 7)
      .map((w) => `${w.w.padEnd(9)}(${w.x}, ${w.y})`)
      .join("\n") + (T.words.length > 7 ? "\n…" : ""),
  mono: true,
  size: 200,
});
trBus(4, { fromX: 5600, ys: [1300, 5500], x: 6500, toY: 4200, toX: 7600 });
trPanel(4, {
  x: 7600,
  y: 2600,
  w: 4600,
  h: 3200,
  label: "match the words",
  text: "No model.\nA plain text search.",
  size: 260,
});
trArrow(4, 12400, 4200, 900);
{
  const w = 5400,
    h = Math.round(w * D.hero.aspect);
  const proof = node("sheet", { x: TR.ox(4) + 13400, y: TR.oy(4) + 600, w, h }, trace);
  proof.id = "traceProof";
  proof.innerHTML = `<img src="${D.hero.img.src}" alt="Page ${T.page}, with the quote located">`;
  node(
    "mark",
    {
      x: T.rects[0]![0]! * w,
      y: T.rects[0]![1]! * h,
      w: T.rects[0]![2]! * w,
      h: T.rects[0]![3]! * h,
    },
    proof,
    { borderWidth: "20px", borderRadius: "14px" },
  ).classList.add("on");
  node("wlabel", null, trace, {
    left: px(TR.ox(4) + 13400),
    top: px(TR.oy(4) + 600 + h + 240),
    width: px(w),
    fontSize: "280px",
    letterSpacing: ".1em",
    color: "var(--accent)",
  }).textContent = `page ${T.page} · ${T.rects.length} rectangle`;
}

/* 6 — method two: the page is a scan, so there are no words to search. Tesseract reads
   the pixels and hands back the same shape of answer — words and boxes — after which
   method one runs on those, unchanged. A rasterised copy of this very document is in
   the corpus precisely so this is demonstrable rather than asserted. */
trStation(5, "method 2 — when the page is a picture");
{
  const w = 4000,
    h = Math.round(w * D.hero.aspect);
  const scan = node("sheet", { x: TR.ox(5), y: TR.oy(5) + 700, w, h }, trace, {
    boxShadow: "0 0 0 24px rgba(63,143,212,.55), 0 40px 120px rgba(0,0,0,.5)",
  });
  // Filter on the IMG, not on the sheet: on the sheet it also desaturates any child
  // drawn over the page — which is how the proof below ended up with a grey citation
  // box where methods 1 and 3 have a red one.
  scan.innerHTML = `<img src="${D.hero.img.src}" alt="A scanned page, with no text layer"
    style="filter:grayscale(1) contrast(.82) blur(1.2px)">`;
  node("wlabel", null, trace, {
    left: px(TR.ox(5)),
    top: px(TR.oy(5) + 700 + h + 240),
    width: px(w + 2000),
    fontSize: "280px",
    letterSpacing: ".1em",
    color: "var(--t-blue)",
  }).textContent = "a scan · no words at all";
}
trArrow(5, 4200, 4400, 800);
/* Tesseract's own output, not the word "Tesseract".
 *
 * This station used to be a prose panel asserting that OCR hands back the same shape of
 * answer the PDF would have — in a strip whose entire argument is that every panel is a
 * real artefact. `D.traceScan.words` is now that artefact: the words the locate pass
 * matched on a copy of this document with its text layer removed, read off the pixels by
 * Tesseract at 300dpi. Set them beside method 1's panel and the claim proves itself —
 * `CLOSING (54, 152)` from the PDF, `CLOSING (54, 154)` from the picture of it. */
{
  const W = D.traceScan.words;
  trPanel(5, {
    x: 5200,
    y: 1200,
    w: 6200,
    h: 6400,
    label: "what tesseract read back",
    text:
      W.length > 0
        ? W.slice(0, 7)
            .map((w) => `${w.w.padEnd(9)}(${w.x}, ${w.y})`)
            .join("\n") + (W.length > 7 ? "\n…" : "")
        : "(no OCR words in story-data.json — re-run build-assets.py)",
    mono: true,
    size: 200,
  });
  node("wlabel", null, trace, {
    left: px(TR.ox(5) + 5200),
    top: px(TR.oy(5) + 7800),
    width: px(6200),
    fontSize: "250px",
    letterSpacing: ".08em",
    color: "var(--muted)",
  }).textContent = "still no model — this is optical character recognition";
}
trArrow(5, 11600, 4400, 800);
/* Method 1 ends on a page with a rectangle drawn on it; this one used to end on a panel
   asserting that "method 1 runs on those, unchanged". The rectangle is the claim, so draw
   it: D.traceScan is the SAME quote located on the rasterised copy of the same document,
   a page with no text layer, so every coordinate here is OCR's work. */
{
  const S = D.traceScan;
  const w = 4600,
    h = Math.round(w * D.hero.aspect);
  const proof = node("sheet", { x: TR.ox(5) + 12800, y: TR.oy(5) + 900, w, h }, trace);
  // Greyscale belongs to the PAGE. On the sheet it caught the citation mark too, so the
  // one station that ends on the same red rectangle methods 1 and 3 end on was drawing
  // it in grey — which read as a different, weaker kind of box.
  proof.innerHTML = `<img src="${D.hero.img.src}" alt="The scanned page, with the quote located by OCR"
    style="filter:grayscale(1) contrast(.82)">`;
  node(
    "mark",
    {
      x: S.rects[0]![0]! * w,
      y: S.rects[0]![1]! * h,
      w: S.rects[0]![2]! * w,
      h: S.rects[0]![3]! * h,
    },
    proof,
    { borderWidth: "20px", borderRadius: "14px" },
  ).classList.add("on");
  node("wlabel", null, trace, {
    left: px(TR.ox(5) + 12800),
    top: px(TR.oy(5) + 900 + h + 240),
    width: px(w + 2400),
    fontSize: "280px",
    letterSpacing: ".1em",
    color: "var(--accent)",
  }).textContent = `located from pixels · ${S.rects.length} rectangle`;
}

/* 7 — method three, and the reason it is drawn switched off.
 *
 * `locate_citations.py` has a third tier: hand the phrase to a model and ask where it
 * is. It is gated behind `model_fallback` and is off, because a model guessing at
 * coordinates produces a box that looks exactly like a real one and is not checkable —
 * which is the one property this whole pass exists to provide. Boxes it does produce
 * are flagged `approx` and drawn differently. Showing the tier and showing it disabled
 * is a stronger claim than never mentioning it. */
trStation(6, "method 3 — ask the model");
/* Same page. Same quote. Same shape as the two stations beside it.
 *
 * This was the corn profile from the closing appendix for a while, on the logic that a
 * page of bar charts is the only situation this tier is ever reached in. True, and it
 * cost the comparison: the room has just watched two methods put a box on Flagstaff page
 * 1, and the third arrived with a different document, a different quote and a rectangle
 * drawn by hand. Nothing could be read off it.
 *
 * So this asks the model about the SAME page and the SAME quote, and the box it returns
 * is a real one — `_model_boxes` from locate_citations.py, run once against page
 * ${T.page}, cached in cache/locate-model/ so a rebuild does not re-bill it. The tier
 * stays off in the pipeline; running it here is what makes "off by default" a finding
 * rather than a policy. The red rectangle from method 1 is drawn on the same page so the
 * two can be compared directly, which is the entire argument of the station. */
const M3_PAGE = { w: 3200, h: Math.round(3200 * D.hero.aspect) };
{
  const sheet = node("sheet", { x: TR.ox(6), y: TR.oy(6) + 300, ...M3_PAGE }, trace, {
    boxShadow: "0 0 0 24px rgba(63,143,212,.55), 0 40px 120px rgba(0,0,0,.5)",
  });
  sheet.innerHTML = `<img src="${D.hero.img.src}" alt="Page ${T.page}, as a picture">`;
  node("wlabel", null, trace, {
    left: px(TR.ox(6)),
    top: px(TR.oy(6) + 300 + M3_PAGE.h + 240),
    width: px(6400),
    fontSize: "250px",
    letterSpacing: ".1em",
    color: "var(--t-blue)",
  }).textContent = `page ${T.page}, as a picture`;
}
// The same quote the other two methods were handed, verbatim.
trPanel(6, {
  y: 5400,
  w: 6400,
  h: 3000,
  io: "in",
  label: "the same quote",
  text: T.quote.replaceAll("*", "").trim(),
  mono: true,
  size: 180,
});
// The page is narrower than the panel, so it gets its own run out to the manifold
// rather than an arm that starts 2,800 units clear of the paper it comes from.
trArrow(6, M3_PAGE.w, 2400, 6400 - M3_PAGE.w);
trBus(6, { fromX: 6400, ys: [2400, 6900], x: 6800, toY: 4300, toX: 7400 });
{
  // Not greyed. The tier being OFF is said in words; greying the model as well made the
  // station read as broken rather than as a choice, and this is the one station whose
  // subject IS the model.
  trBrain(6, { x: 7400, y: 2600, d: 3400 });
}
trArrow(6, 11000, 4300, 900);
/* One box, drawn exactly like the two before it.
 *
 * This frame carried both rectangles for a while — method 1's match in red, the model's
 * guess in amber and dashed — on the theory that the gap between them was the argument.
 * It isn't, because at page scale there is no visible gap: the boxes differ by about a
 * third of the height of a single line of type, which is three screen pixels. Two
 * rectangles nobody can tell apart, labelled "red: matched · amber: guessed", asked the
 * room to take the difference on trust AND spend a beat working out which was which.
 *
 * So the model's box is the only one here, and it is drawn in the same red `.mark` the
 * other two stations end on. That looks like a lie and is the opposite: this tier really
 * does hand back something indistinguishable from a checked answer, and drawing it in a
 * special colour would quietly do the checking for you. The caption says what measuring
 * it found. (The pipeline itself flags these `approx` and renders them differently —
 * that is a product decision about a viewer, not about this explainer.) */
{
  const w = 4600,
    h = Math.round(w * D.hero.aspect);
  const proof = node("sheet", { x: TR.ox(6) + 12200, y: TR.oy(6) + 500, w, h }, trace);
  const guessRaw = (D.traceModel?.rects ?? [])[0];
  const guess = guessRaw && rect4(guessRaw);
  proof.innerHTML = `<img src="${D.hero.img.src}" alt="Page ${T.page}, with the box the model returned">`;
  if (guess) {
    node("mark", { x: guess[0] * w, y: guess[1] * h, w: guess[2] * w, h: guess[3] * h }, proof, {
      borderWidth: "20px",
      borderRadius: "14px",
    }).classList.add("on");
  }
  /* Captions are held to the width they actually have — 12,200 to the frame's right edge —
     and allowed to wrap inside it. `.wlabel` is nowrap globally, which is right for a
     one-word column head and wrong here: an earlier set ran off the right of the frame and
     the last line lost its last three words. Wrapping is the safety net; the strings below
     are short enough not to need it. */
  const CAP_W = TR.pitch - 1600 - 600 - 12200;
  const caption = (t: string, k: number, colour: string, size: string) => {
    node("wlabel", null, trace, {
      left: px(TR.ox(6) + 12200),
      top: px(TR.oy(6) + 500 + h + 240 + k * 420),
      width: px(CAP_W),
      whiteSpace: "normal",
      lineHeight: "1.3",
      fontSize: size,
      letterSpacing: ".08em",
      color: colour,
    }).textContent = t;
  };
  if (guess) {
    /* Two lines, and neither of them argues.
     *
     * No IoU: 0.60 is either a number the room already knows, in which case the frame does
     * not need to print it, or one that costs a sentence of teaching to land a point the
     * caption makes for free. (The 2026 appendix can afford to quote an IoU because it is
     * comparing two of them. A lone score is jargon with a decimal point in it.)
     *
     * And no verdict. "No way to check it, so this tier ships off" is the conclusion the
     * eyebrow and the title have already drawn — "ask the model where it is, and why we
     * don't" — so saying it a third time in the corner is the frame lecturing. What the
     * caption owes the room is the measurement: close, and not exact.
     *
     * The ratio is derived rather than typed, so re-running the model cannot leave this
     * describing the previous answer. This run: right line, 1.3x the height — the failure
     * mode locate_citations.py documents from its own measurement, reproduced on the one
     * page where there happens to be a checked answer to compare against. */
    const dh = Math.round((guess[3] / T.rects[0]![3]!) * 10) / 10;
    caption("the model's answer", 0, "var(--warn)", "280px");
    caption(`close · ${dh}\u00D7 too tall`, 1, "var(--muted)", "230px");
  } else {
    /* No box, so the frame says only what it can still show. It used to print "the model's
       box is not in story-data.json — re-run build-assets.py", which is a note to whoever
       maintains this addressed to a room that has never seen the repository. A build
       problem belongs in the console, where the person who can fix it is looking. */
    caption("the model returned nothing", 0, "var(--warn)", "280px");
    console.warn(
      "[trace] D.traceModel.rects is empty — station 7 is missing the model's " +
        "box. Re-run build-assets.py with AWS credentials to populate it.",
    );
  }
}

/* One frame per station, so the camera walks the strip instead of cutting between
   hand-typed rectangles. */
export const TRACE_KF = (
  [
    ["Split", "One page. Two things come off it."],
    ["Convert", "Four things in — including the page before. Markdown out."],
    ["Extract", `One question, one call — ${FIELD_KEYS.length} of them at the same time.`],
    ["Locate", "Three ways back to the page, tried in order."],
    ["Locate · method 1", "Search the words the PDF already knows."],
    ["Locate · method 2", "No text layer: read the pixels, then search those. Same rectangle."],
    ["Locate · method 3", "Ask the model where it is — and why we don't."],
  ] satisfies [string, string][]
).map(([eyebrow, title], i): Keyframe => {
  node(
    "node",
    { x: TR.ox(i) - 600, y: TR.oy(i) - 2200, w: TR.pitch - 1600, h: TR.panelH + 2600 },
    trace,
    { pointerEvents: "none" },
  ).id = `tr-${i}`;
  return { id: `trace-${i}`, el: `#tr-${i}`, pad: 0.04, beats: 1, eyebrow, title, body: "" };
});

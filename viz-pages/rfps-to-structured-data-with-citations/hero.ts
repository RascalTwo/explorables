import { esc } from "@viz/kit";
import {
  D,
  DOC,
  GAL,
  HERO_H,
  HERO_W,
  HG,
  type Keyframe,
  MG,
  MON,
  MON_CELL_H,
  MON_CELL_W,
  PANEL,
  fmt,
  human,
  node,
  pageSheet,
  px,
  readTime,
  rect4,
  short,
  srcLink,
  world,
} from "./world.js";

/* ── the hero page, and the 22-page document that contains it ─────────────────── */

const docBlock = node("node", DOC);
docBlock.id = "docBlock";

// Grid first, so the sharp single page paints on top of its own cell.
const heroGrid = pageSheet(
  docBlock,
  { x: 0, y: 0, w: DOC.w, h: DOC.h },
  HG,
  HERO_W,
  HERO_H,
  130,
  900,
  (n) => ({ vizId: `flagstaff-page-${n}`, label: `Flagstaff page ${n}` }),
);
export const gridWrap = heroGrid.wrap,
  heroCells = heroGrid.cells;

// The claim at this altitude is "six of these twenty-two carry an answer". A ring
// says which six; the boxes say where on the page, which is the actual evidence.
export const heroPageMarks: HTMLElement[] = [];
Object.entries(D.hero.citedPageRects).forEach(([page, rects]) => {
  const cell = heroCells[+page - 1];
  if (!cell) return;
  rects.map(rect4).forEach(([x, y, w, h]) => {
    heroPageMarks.push(
      node("mark", { x: x * HERO_W, y: y * HERO_H, w: w * HERO_W, h: h * HERO_H }, cell),
    );
  });
});

const heroSheet = node("sheet", { x: 0, y: 0, w: HERO_W, h: HERO_H }, docBlock);
heroSheet.id = "heroSheet";
heroSheet.dataset["vizId"] = "hero-page-1";
heroSheet.dataset["label"] = "Flagstaff RFP, page 1";
heroSheet.innerHTML = `<img src="${D.hero.img.src}" alt="Page 1 of the City of Flagstaff Request for Proposals">`;

// Real citation boxes, from real PDF coordinates, plus a synced answer panel.
export const heroMarks: { el: HTMLElement; i: number; field: string }[] = [],
  panelRows: HTMLElement[] = [];
// The panel sits over page 2 of the grid. The page overlays are dark enough to read
// against, but only just — a backdrop means the answers never depend on that.
export const panelBack = node(
  "node",
  {
    x: PANEL.x - 300,
    y: PANEL.y - 260,
    w: PANEL.w + 600,
    h: PANEL.h + 520,
  },
  docBlock,
  {
    background: "rgba(6,16,34,.9)",
    borderRadius: "60px",
    opacity: 0,
    transition: "opacity .6s ease",
  },
);
export const panel = node("node", PANEL, docBlock, { opacity: 0, transition: "opacity .6s ease" });
panel.id = "heroPanel";
panel.innerHTML = `<div style="font-family:var(--mono);font-size:86px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--accent);margin-bottom:44px">What a bidder needs</div>`;

D.hero.marks.forEach((m, i) => {
  m.rects.map(rect4).forEach(([x, y, w, h]) => {
    const el = node(
      "mark",
      { x: x * HERO_W, y: y * HERO_H, w: w * HERO_W, h: h * HERO_H },
      heroSheet,
      { borderWidth: "5px", borderRadius: "4px" },
    );
    el.dataset["vizId"] = `hero-mark-${m.field}`;
    el.dataset["label"] = `${m.field} — cited on page 1`;
    heroMarks.push({ el, i, field: m.field });
  });
  const row = document.createElement("div");
  row.className = "callout";
  row.style.cssText = `position:relative;margin-bottom:34px`;
  row.innerHTML = `<div class="k" style="font-size:62px;margin-bottom:10px">${esc(human(m.field))}</div>
     <div class="v" style="font-size:78px;line-height:1.3">${esc(short(m.value))}</div>
     <div class="rule" style="margin-top:16px;width:100%"></div>`;
  row.dataset["vizId"] = `hero-answer-${m.field}`;
  row.dataset["label"] = `${m.field} = ${m.value}`;
  panel.append(row);
  panelRows.push(row);
});

const deadlineMark = heroMarks.find((m) => m.field === "submissionDeadline")!.el;
deadlineMark.id = "heroLine";

export const heroCited = new Set(Object.keys(D.hero.citedPages).map(Number));
const docCaption = node("wlabel", null, docBlock, {
  left: px(0),
  top: px(DOC.h + 240),
  fontSize: "300px",
  letterSpacing: ".08em",
});
/* The "6 carry an answer" half arrives with the beat that shows which six. It used to
   be in the caption from the first frame, which answered the question the next beat is
   built to ask. */
/* No document name and no word count. "Flagstaff" is a label for a thing the story never
   uses again, and "6,733 words" is a number nobody can feel — the question the room is
   actually asking is how long this takes to read, so answer that instead. */
const HERO_DOC = D.docs.find((d) => d.stem === D.hero.stem);
export const docCap = (counted: boolean): string =>
  (docCaption.innerHTML =
    `${D.hero.pages} pages · ${readTime(D.hero.words)} to read` +
    (counted ? ` · ${heroCited.size} carry an answer` : "") +
    (HERO_DOC ? ` · ${srcLink(HERO_DOC.url, HERO_DOC.source, 300)}` : ""));
docCap(false);

/* ── nine more documents: the same fact, in nine other places ─────────────────── */

// One slab per seven pages, capped so the 275-page book stays inside its cell. The
// stack is the size story: page counts in a caption are a number you have to read,
// a brick next to a leaflet is a fact you already know.
const slabsFor = (pages: number) => Math.min(38, Math.max(1, Math.round(pages / 7)));
const SLAB_STEP = 34;

/* A stack is drawn up and to the right of its own page, so the tallest one reaches this
 * far above the top row. That overhang is part of the picture, so it has to be inside
 * the box the camera frames: the 275-page stack used to climb off the top of the screen
 * the moment the stacks appeared. Everything below is offset by it instead. */
const STACK_OVER = slabsFor(Math.max(...D.docs.map((d) => d.pages))) * SLAB_STEP;

const gallery = node("node", { x: GAL.x, y: GAL.y, w: GAL.w, h: 10 });
gallery.id = "gallery";
export const galItems: { marks: HTMLElement[]; stack: HTMLElement; pp: HTMLElement; i: number }[] =
  [];

D.docs.forEach((doc, i) => {
  const col = i % GAL.cols,
    row = Math.floor(i / GAL.cols);
  const h = Math.round(GAL.cellW * (doc.deadline.img.h / doc.deadline.img.w));
  const rowTop = STACK_OVER + row * (Math.round(GAL.cellW * 1.32) + GAL.gapY);
  const cell = node(
    "node",
    { x: col * (GAL.cellW + GAL.gapX), y: rowTop, w: GAL.cellW, h: h + 660 },
    gallery,
  );

  const n = slabsFor(doc.pages);
  const stack = node("node", { x: 0, y: 0, w: GAL.cellW, h }, cell, {
    opacity: 0,
    transition: "opacity .5s ease",
  });
  for (let s = n; s >= 1; s--) {
    node("slab", { x: s * SLAB_STEP, y: -s * SLAB_STEP, w: GAL.cellW, h }, stack);
  }

  const sheet = node("sheet", { x: 0, y: 0, w: GAL.cellW, h }, cell);
  sheet.innerHTML = `<img src="${doc.deadline.img.src}" alt="${esc(doc.label)}, page ${doc.deadline.page}">`;
  sheet.dataset["vizId"] = `gallery-${doc.stem}`;
  sheet.dataset["label"] =
    `${doc.label} — ${doc.pages} pages, deadline on page ${doc.deadline.page}`;

  /* The ring is drawn OUTSIDE the box with box-shadow, not as a `border`.
   *
   * A border is part of the box, and these boxes are one line of type tall — 65 world
   * units for Providence. The old 26px border took 52 of those 65 from both sides, so
   * the "highlight" rendered as a solid red bar with the quoted words underneath it.
   * The one thing this scene exists to let you do is read that line.
   *
   * box-shadow spreads outward and changes no geometry, so the ring can be as heavy as
   * it needs to be without ever touching the glyphs. The box is also inflated by PAD so
   * the ring clears the descenders instead of resting on them. */
  const PAD = Math.round(GAL.cellW * 0.009);
  // Heavy, because the wall is now only ever seen whole: a hairline ring that read fine
  // in a per-document close-up came out under a pixel wide once the camera stopped
  // visiting them one at a time, and where the answer sits is the whole point of the shot.
  const RING = Math.round(GAL.cellW * 0.014);

  /* Rects arrive one per line of type. Ringing each one separately draws a ring through
   * the middle of the line above it whenever a quote wraps — the line gap is ~13 world
   * units and a ring is 15, so the rings collide long before the words do. So lines that
   * continue each other are grouped into one run: a fill per line, which is what keeps
   * the words readable, and a single ring around the run, which is what makes it carry
   * to the back of a room. */
  const rects = doc.deadline.rects
    .map(rect4)
    .map(([x, y, w, hh]) => ({ x: x * GAL.cellW, y: y * h, w: w * GAL.cellW, h: hh * h }))
    .toSorted((a, b) => a.y - b.y);
  const runs: { x0: number; y0: number; x1: number; y1: number }[] = [];
  for (const r of rects) {
    const run = runs.at(-1);
    // Within one line-height of the run's bottom is the next line of the same quote.
    // Anything further down is a separate citation and gets its own ring.
    if (run && r.y < run.y1 + r.h) {
      run.x0 = Math.min(run.x0, r.x);
      run.x1 = Math.max(run.x1, r.x + r.w);
      run.y1 = Math.max(run.y1, r.y + r.h);
    } else {
      runs.push({ x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h });
    }
  }

  const marks = [
    ...rects.map((r) =>
      node("mark solid", r, sheet, {
        borderRadius: px(PAD / 2),
        background: "rgba(208,69,58,.34)",
      }),
    ),
    ...runs.map((r) =>
      node(
        "mark",
        {
          x: r.x0 - PAD,
          y: r.y0 - PAD,
          w: r.x1 - r.x0 + PAD * 2,
          h: r.y1 - r.y0 + PAD * 2,
        },
        sheet,
        {
          background: "transparent",
          borderRadius: px(PAD),
          boxShadow: `0 0 0 ${RING}px var(--mark)`,
        },
      ),
    ),
  ];

  /* The host is a live link to the PDF it came off. At 74px on a 3,000-unit cell it was
     unreadable grey text that looked like a caption artefact; at 130px and underlined it
     reads as what it is, and anyone who doubts a number on this page can click through
     to the original. `pointerEvents` because #galleryStage is pointer-events:none. */
  const cap = node("node", { x: 0, y: h + 60, w: GAL.cellW, h: 520 }, cell);
  cap.innerHTML = `<a href="${esc(doc.url)}" target="_blank" rel="noopener"
        style="font-family:var(--mono);font-size:130px;color:var(--muted);
        letter-spacing:.04em;text-decoration:underline;text-decoration-color:var(--faint);
        text-underline-offset:.25em;pointer-events:auto">${esc(doc.source)}</a>
     <div class="ppg" style="font-size:190px;font-weight:900;color:var(--ink);margin-top:30px;
       opacity:0;transition:opacity .45s ease">${doc.pages} pages</div>`;

  galItems.push({ marks, stack, pp: cap.querySelector<HTMLElement>(".ppg")!, i });
  GAL.h = Math.max(GAL.h || 0, rowTop + h + 620);
});
gallery.style.height = px(GAL.h);

/* ── the same field, ten times, read as a list ─────────────────────────────────── */

/* This used to be five keyframes, one per document: zoom out of the wall, pan, zoom
 * back in, five times over. Each landing was a different crop of a different page, so
 * the move read as a lurch, and the comparison the scene exists to make — one column,
 * ten shapes — was never on screen at once.
 *
 * The wall holds still now and the answers stack up beside it, which is the move the
 * hero page already makes with its own panel. What the eye compares is where ten red
 * boxes sit on ten pages; what makes the boxes mean something is the field name and the
 * value, and those are legible in the panel at any altitude. */
const GP = { x: GAL.x + GAL.w + 1500, y: GAL.y + STACK_OVER, w: 6600, h: GAL.h - STACK_OVER };

const galPanelBack = node(
  "node",
  { x: GP.x - 300, y: GP.y - 300, w: GP.w + 600, h: GP.h + 600 },
  world,
  {
    background: "rgba(6,16,34,.9)",
    borderRadius: "60px",
    opacity: 0,
    transition: "opacity .6s ease",
  },
);
const galPanel = node("node", GP, world, { opacity: 0, transition: "opacity .6s ease" });
galPanel.innerHTML = `<div style="font-family:var(--mono);font-size:190px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--accent);margin-bottom:150px">Submission deadline</div>`;

const galRows = D.docs.map((d) => {
  const row = document.createElement("div");
  row.className = "callout";
  row.style.cssText = "position:relative;margin-bottom:170px";
  row.innerHTML = `<div class="k" style="font-size:150px;margin-bottom:22px">${esc(d.source)} ·
       page ${d.deadline.page} of ${d.pages}</div>
     <div class="v" style="font-size:230px;line-height:1.25">${esc(short(d.deadline.value, 58))}</div>`;
  row.dataset["vizId"] = `gallery-answer-${d.stem}`;
  row.dataset["label"] = `${d.label} — submission deadline = ${d.deadline.value}`;
  galPanel.append(row);
  return row;
});

// Wall plus panel, as one thing to point the camera at.
const galleryStage = node(
  "node",
  {
    x: GAL.x - 300,
    y: GAL.y - 300,
    w: GP.x + GP.w + 300 - (GAL.x - 300),
    h: GAL.h + 600,
  },
  world,
  { pointerEvents: "none" },
);
galleryStage.id = "galleryStage";

export const galPanelOff = (): void => {
  galPanel.style.opacity = galPanelBack.style.opacity = "0";
};

export const SAME_FACT: Keyframe = {
  id: "samefact",
  el: "#galleryStage",
  pad: 0.04,
  beats: D.docs.length,
  eyebrow: "The same column, ten times",
  // "Ten different places" invited the obvious objection, because the rows below print
  // page numbers and six of the ten say page 1. The real finding survives that: no two
  // of the ten sit in the same spot on the page (y-fractions .116 .120 .192 .338 .362
  // .373 .396 .595 .627 .648, all distinct), so six can share page 1 and still be
  // nowhere near each other — which is harder, not easier, than ten different pages.
  title: "One field. Ten documents. Never the same place twice.",
  body: "",
  enter() {
    galPanel.style.opacity = galPanelBack.style.opacity = "1";
    galItems.forEach((g) => {
      g.stack.style.opacity = "1";
      g.pp.style.opacity = "1";
    });
  },
  on(b: number) {
    galItems.forEach((g) => {
      g.marks.forEach((m) => {
        m.classList.toggle("on", g.i <= b);
      });
    });
    galRows.forEach((r, i) => {
      r.classList.toggle("on", i <= b);
    });
  },
};

/* ── everything so far, at once: the corpus ───────────────────────────────────── */

/* Room above the evidence for the corpus to say its own number. This shot used to be
   ten documents and a paragraph in the narration card claiming 764 pages — a figure that
   pointed at nothing you could see. On screen, at the same size as the monster's own
   headline, it is a caption for the thing underneath it. */
const CORP_TITLE = 3400;
const corpusFrame = node("node", {
  x: DOC.x - 900,
  y: Math.min(DOC.y, GAL.y) - 2600 - CORP_TITLE,
  w: GAL.x + GAL.w - DOC.x + 1800,
  h: Math.max(DOC.h, GAL.h) + 4600 + CORP_TITLE,
});
corpusFrame.id = "corpusFrame";
node("wbig", null, corpusFrame, {
  left: px(900),
  top: px(300),
  fontSize: "2600px",
}).innerHTML = `${fmt(D.corpus.pages)} pages.`;
/* "2.9 copies of The Hobbit" was a joke that measured nothing: it converted one number
   nobody can feel into another one. The typical document and the time to read the stack
   are both things a person in this room has to plan around. */
const MEDIAN_PAGES = D.docs
  .map((d) => d.pages)
  .toSorted((a, b) => a - b)
  .slice(Math.floor((D.docs.length - 1) / 2), Math.floor(D.docs.length / 2) + 1)
  .reduce((a, b, _, s) => a + b / s.length, 0);
node("wlabel", null, corpusFrame, {
  left: px(900),
  top: px(3050),
  fontSize: "760px",
  letterSpacing: ".06em",
}).innerHTML = `${D.corpus.docs} documents · median ${Math.round(MEDIAN_PAGES)} pages ·
  ${readTime(D.corpus.words)} to read the stack`;

/* ── the monster: 275 pages, 38 of which matter ───────────────────────────────── */

const monScene = node("node", { x: MON.x, y: MON.y - 3400, w: MON.w, h: MON.h + 5600 });
monScene.id = "monScene";
const monGrid = pageSheet(
  monScene,
  { x: 0, y: 3400, w: MON.w, h: MON.h },
  MG,
  MON_CELL_W,
  MON_CELL_H,
  110,
  700,
  (n) => ({ vizId: `providence-page-${n}`, label: `Providence page ${n}` }),
);
export const monBlock = monGrid.wrap,
  monCells = monGrid.cells;
export const monCited = new Set(Object.keys(D.monster.citedPages).map(Number));

const monTitle = node("wbig", null, monScene, {
  left: px(0),
  top: px(200),
  width: px(MON.w),
  fontSize: "2000px",
});
monTitle.innerHTML = `${D.monster.pages} pages.`;
const MON_DOC = D.docs.find((d) => d.stem === D.monster.stem);
const monSub = node("wlabel", null, monScene, {
  left: px(0),
  top: px(MON.h + 3900),
  fontSize: "480px",
  letterSpacing: ".06em",
});
const monSrc = node("wlabel", null, monScene, {
  left: px(0),
  top: px(MON.h + 4700),
  fontSize: "420px",
  letterSpacing: ".06em",
});
if (MON_DOC) monSrc.innerHTML = srcLink(MON_DOC.url, MON_DOC.source, 420);
/* Staged like the hero's caption — the count arrives with the beat that shows it.
   It also no longer says "one of the 20 answers". Providence's schema really does have
   20 fields where Flagstaff's has 15 (five extra about castings and materials, which
   only a construction solicitation has), but nothing on screen explains that, so the
   number read as the story contradicting itself. */
export const monCap = (counted: boolean): string =>
  (monSub.innerHTML =
    `${D.monster.pages} pages · ${readTime(D.monster.words)} to read` +
    (counted ? ` · ${monCited.size} carry an answer` : ""));
monCap(false);

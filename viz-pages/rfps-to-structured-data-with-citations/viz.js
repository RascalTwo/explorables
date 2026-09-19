/* Three hundred pages, twenty facts — a scroll-driven zooming canvas.
 *
 * There are no slides. There is one enormous world, laid out once in world units,
 * and a camera that flies around it. Scroll position drives the camera; the arrow
 * keys jump it between stops. Both read the same scroll offset, which is why
 * presenting and self-serving are the same code path.
 *
 * The one structural rule that makes the zoom-outs mean anything: a thing and the
 * thing that contains it occupy the SAME world coordinates. Page 1 of Flagstaff is
 * drawn at exactly the position and size of cell 1 of the 22-page grid, so pulling
 * back doesn't cut to a new scene — the page you were reading becomes a page in a
 * document. Likewise the two lanes are laid out inside the pipeline's third stage,
 * so pulling back off the comparison reveals it was one box in a bigger process.
 *
 * Keyframes name DOM elements rather than hand-typed rectangles. The camera measures
 * the real layout at startup, so a scene can be moved or resized without a keyframe
 * silently pointing at empty space.
 *
 * Each keyframe is divided into BEATS — the discrete reveals inside it. A beat is
 * the unit of navigation: one arrow press, one dot on the rail, one integer handed
 * to `on()`. Reveals used to be driven by the raw scroll fraction, which meant ten
 * fields shared a fifth of a screen of travel and a single trackpad flick skipped
 * seven of them with nothing on screen to say so.
 */
import { $, esc } from "/_kit/viz.js";

// Imported, not fetched. A relative fetch() cannot travel into a single-file export —
// the publish step warns about the ones it can see in the HTML and never sees this one,
// because it is in here. An import is part of the module graph, so the bundler inlines it.
import D from "./story-data.json" with { type: "json" };

const world = $("#world");
/* `?motion=off` forces the reduced-motion path from any machine: camera flights become
 * cuts and beats land instantly. It exists for the same reason `?rig=off` does — the
 * behaviour was only reachable by changing an OS setting, so nobody ever checked it —
 * and it is what makes a beat inspectable, by a screenshot or by anyone who finds a
 * 2.8-second flight between beats more nauseating than useful. `?motion=on` forces the
 * animated path even when the OS asks for reduced motion. */
const MOTION_PARAM = new URLSearchParams(location.search).get("motion");
const REDUCED = MOTION_PARAM === "off" ? true
  : MOTION_PARAM === "on" ? false
  : matchMedia("(prefers-reduced-motion: reduce)").matches;

// Read before ANY render: the first apply() rewrites location.hash to the keyframe it
// lands on, so this is the only moment the requested one still exists.
const WANTED = location.hash.slice(1);
// Otherwise the browser restores the previous scroll offset on reload and fights the
// deep link for the first few frames.
history.scrollRestoration = "manual";

/* Every reading time on the page comes from here, at one fixed rate — the measured
 * average for adult silent reading of non-fiction (Brysbaert 2019). This used to be a
 * slider in the narration bar. A word count is a number nobody has a feel for: "6,733
 * words" lands nowhere and "28 min" lands immediately, but handing the room a dial
 * invited an argument about the rate instead of about the pile of paper. */
const WPM = D.reading.wpm;
const readTime = words => {
  const mins = Math.max(1, Math.round(words / WPM));
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? `${h} hr ${m} min` : `${m} min`;
};

const fmt = n => n.toLocaleString("en-US");
const px = n => `${n}px`;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** `submissionDeadline` -> `submission deadline`. The field names are the pipeline's
 *  own keys; showing them camelCased makes a schema look like an implementation. */
const human = k => k.replace(/([A-Z])/g, " $1").toLowerCase();

/** Trim to a word boundary. The panel shows what a field became, not its full prose;
 *  a two-line CSS clamp cut mid-word and reported as a layout overflow. */
function short(v, n = 74) {
  const t = String(v ?? "—");
  return t.length <= n ? t : t.slice(0, t.lastIndexOf(" ", n)) + "…";
}

/** Create an absolutely-positioned world element. */
function node(cls, box, parent = world, style = {}) {
  const e = document.createElement("div");
  e.className = cls;
  if (box) Object.assign(e.style, {
    position: "absolute", left: px(box.x), top: px(box.y),
    width: px(box.w), height: px(box.h),
  });
  Object.assign(e.style, style);
  parent.appendChild(e);
  return e;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   WORLD LAYOUT

   Everything below is in world units. They are arbitrary but consistent; think of
   one unit as one pixel at camera scale 1. The numbers are grouped here rather than
   scattered through the builders so the spatial story stays legible.
   ═══════════════════════════════════════════════════════════════════════════════ */

const HERO_W = 2000;                                  // hero page = grid cell = this
const HERO_H = Math.round(HERO_W * D.hero.aspect);
const HG = D.hero.grid;                               // 8 x 3 sprite of 22 pages
const DOC = { x: 0, y: 0, w: HG.cols * HERO_W, h: HG.rows * HERO_H };

const PANEL = { x: DOC.x + HERO_W + 380, y: 0, w: 3500, h: HERO_H };

// The gap to the hero document is clearance, not decoration: the wall's own shot is
// framed by height, so a tight gap put a sliver of page 22 in the left of frame.
const GAL = { x: DOC.x + DOC.w + 4800, y: -200, cols: 5, cellW: 3000, gapX: 640, gapY: 760 };
GAL.w = GAL.cols * (GAL.cellW + GAL.gapX) - GAL.gapX;

const MG = D.monster.grid;                            // 28 x 10 sprite of 275 pages
const MON_CELL_W = 700, MON_CELL_H = Math.round(MON_CELL_W * (MG.cellH / MG.cellW));
const MON = { w: MG.cols * MON_CELL_W, h: MG.rows * MON_CELL_H, y: 27000 };
MON.x = Math.round((DOC.x + DOC.w + GAL.x + GAL.w) / 2 - MON.w / 2);

/* The six-box pipeline diagram used to live here, and the tier diagram and the citation
   bar chart lived inside two of its boxes. All three are gone: the walkthrough shows a
   real page going through those same steps, so the boxes were a label for something the
   room had already watched happen. What is left is three floors — the comparison, the
   walkthrough, and what it cost. */
const LANES = { w: 30000, h: 15400 };            // the workbench's own footprint
const WORK = { y: 41000, w: 30000, h: 15400 };   // human and pipeline, side by side
const TRACE = { y: 62000, h: 15000 };            // one page, followed all the way
/* Deliberately tiny in world units, unlike everything else on this canvas: see the
   live-surfaces block for why one world unit has to equal one CSS pixel here. */
// Three panes of 1500 with 300 between them — keep this in step with `paneW` and the
// `panes` array in the live-surfaces block, since the camera frames this declared box
// and not the children that overflow it.
const LIVE = { y: 84000, w: 5100, h: 1320 };
// The cost chart is an appendix now, so it sits after everything else rather than
// between the walkthrough and the live surfaces. Its old slot made the piece end on a
// bar chart, and made the closing scene reuse the cost frame — the same picture twice,
// two scenes apart, which read as a bug.
/* 104,000, not 100,000. The index above it is a wide, short box, so framing it fills the
   width and leaves height to spare — and at 100,000 that spare height was showing the top
   two bars of this chart under a card offering to open it. Four thousand units of clearance
   is what it takes to keep the menu from previewing its own first item. */
const COST = { y: 104000, w: 26000, h: 14000 };
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
const APPX = { y: 92500, w: 24000, h: 6000 };
const NOW26 = { y: 150000, w: 26000, h: 13000 };
// A harder document than any RFP in the corpus, and the last floor on the canvas.
const CROP = { y: 188000, w: 30000, h: 23600 };
// Three more hard documents, on their own floor under the one the scene walks through.
// Same appendix, second keyframe — see `appendix: "crop"` on both.
const CROP2 = { y: 218000, w: 30000, h: 17000 };
const MID = Math.round((DOC.x + DOC.w + GAL.x + GAL.w) / 2);
WORK.x = MID - WORK.w / 2;
TRACE.x = WORK.x;
COST.x = MID - COST.w / 2;
APPX.x = MID - APPX.w / 2;
NOW26.x = MID - NOW26.w / 2;
CROP.x = MID - CROP.w / 2;
CROP2.x = MID - CROP2.w / 2;
LIVE.x = MID - LIVE.w / 2;


const FIELD_KEYS = Object.keys(D.hero.fields);

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
function pageSheet(parent, box, g, cellW, cellH, ring, glow, idFor) {
  const wrap = node("gridwrap", box, parent);
  const img = document.createElement("img");
  img.className = "gridsheet";
  img.src = g.src;
  img.alt = "";
  img.width = g.cols * g.cellW;
  img.height = g.rows * g.cellH;
  Object.assign(img.style, {
    width: px(g.cols * g.cellW), height: px(g.rows * g.cellH),
    transformOrigin: "0 0", transform: `scale(${cellW / g.cellW})`,
  });
  wrap.appendChild(img);

  /* The sheet is a full rectangle, so 22 pages in an 8x3 grid leave two slots of blank
     white paper in the corner. They used to be covered with opaque navy squares, which
     from the back of the room read as two black tiles someone forgot to fill. Clip the
     grid to the shape the document actually is instead: a ragged last row, which is
     what 22 pages in rows of 8 looks like. */
  const rem = g.pages % g.cols;
  if (rem) {
    const full = Math.floor(g.pages / g.cols) / g.rows * 100, part = rem / g.cols * 100;
    wrap.style.clipPath =
      `polygon(0 0, 100% 0, 100% ${full}%, ${part}% ${full}%, ${part}% 100%, 0 100%)`;
  }

  /* One dark band down every seam, drawn as a single background rather than by the
     overlays. The overlays are laid out on exact cell boundaries, but the camera scale
     is arbitrary, so a boundary lands mid-device-pixel and a hairline of undimmed sprite
     survives between two dimmed pages — bright white lines across the grid, worst in
     spotlight where everything around them is nearly black. A band centred on each seam
     covers the rounding whatever the scale, and reads as a page gutter. */
  const seam = Math.max(2, Math.round(cellW * .016));
  node("node", { x: 0, y: 0, w: g.cols * cellW, h: g.rows * cellH }, wrap, {
    backgroundImage:
      `repeating-linear-gradient(to right, #050d1c 0 ${seam}px, transparent ${seam}px ${cellW}px),` +
      `repeating-linear-gradient(to bottom, #050d1c 0 ${seam}px, transparent ${seam}px ${cellH}px)`,
    backgroundPosition: `${-seam / 2}px ${-seam / 2}px`,
    pointerEvents: "none",
  });

  const cells = [];
  for (let i = 0; i < g.pages; i++) {
    const c = node("cell", {
      x: (i % g.cols) * cellW, y: Math.floor(i / g.cols) * cellH, w: cellW, h: cellH,
    }, wrap, { "--hit-ring": px(ring), "--hit-glow": px(glow) });
    Object.assign(c.dataset, idFor(i + 1));
    cells.push(c);
  }
  return { wrap, cells };
}

/* ── the problem, before any of this is a PDF ─────────────────────────────────── */

// Five across, two down — the same shape the gallery uses for the same ten documents
// later on. It used to be four across (so 4/4/2) with a fixed per-cover jitter, on the
// theory that a tidy grid reads as "a system" and the point is that these are anything
// but. In the room it just read as broken, and it made the two scenes that show all ten
// documents look like two unrelated pictures. The variety is in the covers themselves,
// which is a better place for it than in the alignment.
const COVER_W = 2500;
const PILE = { cols: 5, gapX: 520, gapY: 700 };

const PILE_ROWS = Math.ceil(D.docs.length / PILE.cols);
const PILE_W = PILE.cols * COVER_W + (PILE.cols - 1) * PILE.gapX;
const COVER_H = Math.round(COVER_W * 1.3);
const PILE_H = PILE_ROWS * COVER_H + (PILE_ROWS - 1) * PILE.gapY;
// The arrow and the record are furniture; the covers are the subject. Both were sized
// when the covers were 1800 wide, and every unit they take is a unit off the paper.
const ARROW_W = 2400, CARD_W = 10000;
// The record's height is its own, not the pile's. It was `PILE_H` back when the pile was
// three rows tall and the two happened to match; at two rows that would have squeezed
// fifteen field rows into 6,800 world units, which is ~5px of type on a laptop.
const CARD_H = 10600;
// The container is a hair taller than its contents so the caption under the pile is
// inside the rect the camera frames — rectOf() measures the box, not the overflow.
const CAP_H = 1500;
/* ── the chain the whole thing hangs off ───────────────────────────────────────
 *
 * The piece used to open on the pile of PDFs, which buried the lead: nobody in the room
 * ever asked for a pile of PDFs. The work arrives as EMAIL — a link in a message, not an
 * attachment — and the reason anyone wants fifteen fields out of it is that somebody
 * downstream has to decide whether to bid, and route it to the right desk, before a
 * deadline that is itself buried on page 14.
 *
 * So the intro is one left-to-right chain, and the pile the story used to open on is now
 * the middle link of it:
 *
 *     inbox  →  fetch  →  ten PDFs  →  one record
 *
 * The first link is drawn in a different register on purpose — dashed, muted, tagged
 * "out of scope". Retrieval is a real part of the system and the one part this piece
 * does not prove, so it is marked as such rather than smuggled in looking like the
 * evidence. Everything after it is measured. */
const MAIL_W = 12600, FETCH_W = 8600;
// One x per link in the chain, so inserting or resizing a link moves everything after it.
const CX = { mail: 0 };
CX.fetch = CX.mail + MAIL_W + ARROW_W;
CX.pile = CX.fetch + FETCH_W + ARROW_W;
CX.card = CX.pile + PILE_W + ARROW_W;

const INTRO = { w: CX.card + CARD_W, h: Math.max(PILE_H + CAP_H, CARD_H) };
// Pile and record are different heights now, so each is centred against the taller one
// rather than both being assumed to start at y=0.
const PILE_Y = Math.round((INTRO.h - (PILE_H + CAP_H)) / 2);
const CARD_Y = Math.round((INTRO.h - CARD_H) / 2);
// Centred on the PILE, not on the whole chain: the dive from here lands on page 1 of the
// hero document at x=0, and centring a 60,000-unit chain would have started that flight
// two screens to the left of where it has to end up.
INTRO.x = Math.round(HERO_W / 2 - PILE_W / 2 - CX.pile);
// Far enough above the corpus that it stays out of frame there, and no further. The
// corpus camera reaches ~11,000 units above y=0; the old 26,000 cleared it three times
// over, and the surplus was dead world that the `need` → `line` flight then had to
// cross with nothing in it to look at. Falsifier for this number is the corpus
// keyframe: if the intro appears in its top corner, it is too small.
INTRO.y = -(INTRO.h + 13000);

const intro = node("node", INTRO);
intro.id = "intro";

const pile = node("node", { x: CX.pile, y: PILE_Y, w: PILE_W, h: PILE_H + CAP_H }, intro);
pile.id = "introPile";
D.docs.forEach((doc, i) => {
  const h = Math.round(COVER_W * (doc.cover.h / doc.cover.w));
  const s = node("sheet", {
    x: (i % PILE.cols) * (COVER_W + PILE.gapX),
    y: Math.floor(i / PILE.cols) * (COVER_H + PILE.gapY),
    w: COVER_W, h,
  }, pile);
  s.innerHTML = `<img src="${doc.cover.src}" alt="${esc(doc.label)}, page 1">`;
  s.dataset.vizId = `pile-${doc.stem}`;
  s.dataset.label = `${doc.label} — ${doc.pages} pages`;
});
// Centred under the pile it is a caption for; left-aligned it read as a stray label
// hanging off the first column.
node("wlabel", null, pile, {
  left: px(0), top: px(PILE_H + 340), width: px(PILE_W), textAlign: "center",
  fontSize: "440px", letterSpacing: ".08em",
// "Senders" was the wrong noun, not the wrong number: providenceri.gov sent two of the
// ten, so there are nine hosts and the line read as a correction of itself. Documents and
// layouts genuinely are ten and ten, and the point being made is that none of them match
// — which is about the layouts, not about who posted them.
}).textContent = `${D.corpus.docs} documents · ${D.corpus.docs} layouts · 0 templates`;

/* Which of the ten the camera is about to open. The next shot is page 1 of one of these
 * covers, and at pile altitude a cover is ~100px of grey — there is nothing in it that
 * says "this is the Flagstaff one", so the dive read as a cut to an unrelated document.
 * A ring and a label, on their own beat, are the connective tissue. */
const heroDoc = D.docs.find(d => d.stem === D.hero.stem);
const heroI = D.docs.indexOf(heroDoc);
const heroCover = {
  x: (heroI % PILE.cols) * (COVER_W + PILE.gapX),
  y: Math.floor(heroI / PILE.cols) * (COVER_H + PILE.gapY),
  w: COVER_W, h: Math.round(COVER_W * (heroDoc.cover.h / heroDoc.cover.w)),
};
const pileRing = node("node", heroCover, pile, {
  boxShadow: "0 0 0 44px var(--accent), 0 0 300px 90px rgba(55,217,160,.30)",
  opacity: 0, transition: "opacity .5s ease", pointerEvents: "none",
});
// Centred under the cover it points at, and clamped so it cannot leave the pile in
// either direction. It was right-aligned to the cover's own right edge, which fixed an
// earlier overflow off the RIGHT (left-aligned, a last-column cover ran under the record
// card) and created the mirror of it: the hero cover is in the FIRST column, so
// `x + COVER_W - 5200` put the label at left:-2700 and the camera clipped it.
const PILE_TAG_W = 5200;
const pileTagX = Math.min(Math.max(0, heroCover.x + COVER_W / 2 - PILE_TAG_W / 2),
                          PILE_W - PILE_TAG_W);
const pileTag = node("wlabel", null, pile, {
  left: px(pileTagX), width: px(PILE_TAG_W), textAlign: "center",
  top: px(heroCover.y + heroCover.h + 150),
  fontSize: "300px", letterSpacing: ".08em", color: "var(--accent)",
  opacity: 0, transition: "opacity .5s ease",
});
pileTag.textContent = `↑ let's dig into this one`;
const pilePick = on => { pileRing.style.opacity = pileTag.style.opacity = on ? 1 : 0; };

const arrow = node("node", { x: CX.card - ARROW_W, y: INTRO.h / 2 - 1600, w: ARROW_W, h: 3200 },
  intro, { display: "grid", placeItems: "center", color: "var(--accent)",
    fontSize: "2600px", lineHeight: "1", opacity: 0, transition: "opacity .5s ease" });
arrow.id = "introArrow";
arrow.textContent = "→";

const card = node("wbox", { x: CX.card, y: CARD_Y, w: CARD_W, h: CARD_H }, intro,
  { borderWidth: "22px", borderRadius: "160px", background: "rgba(8,44,36,.34)",
    borderColor: "rgba(55,217,160,.42)", opacity: 0, transition: "opacity .5s ease" });
card.id = "introCard";
card.dataset.vizId = "crm-schema";
card.dataset.label = `The CRM record: ${FIELD_KEYS.length} fields, always the same`;
const rowH = Math.floor((CARD_H - 2600) / FIELD_KEYS.length);
node("wlabel", null, card, {
  // 340, not 480: the heading is a sentence now, and at 480 it ran off the card.
  left: px(700), top: px(820), fontSize: "300px", color: "var(--accent)",
  letterSpacing: ".16em",
}).textContent = `One structured record · ${FIELD_KEYS.length} fields`;
FIELD_KEYS.forEach((k, i) => {
  const r = node("node", { x: 700, y: 2100 + i * rowH, w: CARD_W - 1400, h: rowH - 60 }, card,
    { display: "flex", alignItems: "center", gap: "500px" });
  // A 6px rule on a 10,000-unit-wide card was a hairline nobody read as a blank to be
  // filled in. These are the empty boxes on a form: thick, bright, and sitting on a
  // baseline, which is what makes the next scene's filling-in legible as filling-in.
  r.innerHTML =
    `<div style="font-family:var(--mono);font-size:${Math.round(rowH * .42)}px;
       color:var(--muted);white-space:nowrap;width:44%">${esc(human(k))}</div>
     <div style="flex:1;height:${Math.round(rowH * .30)}px;border-radius:20px;
       background:rgba(120,160,230,.14);
       border-bottom:${Math.round(rowH * .10)}px solid rgba(154,176,207,.55)"></div>`;
});

/* ── the inbox, the fetch, and what any of it is for ───────────────────────────
 *
 * Three links of the chain the pile sits in the middle of. Two of them are deliberately
 * drawn as out of scope; see the CX block for why that is a design decision rather than a
 * shortcut. */

/** A chain arrow, matching the one between the pile and the record. */
const chainArrow = (x, dim = false) => {
  const a = node("node", { x, y: INTRO.h / 2 - 1300, w: ARROW_W, h: 2600 }, intro,
    { display: "grid", placeItems: "center", fontSize: "2200px", lineHeight: "1",
      color: dim ? "var(--faint)" : "var(--accent)" });
  a.textContent = "→";
  return a;
};

/** A link of the chain this piece does NOT prove: dashed, muted, and labelled as such.
 *  The register is deliberate — a room of a hundred should be able to tell at a glance
 *  which parts are being demonstrated and which are being asserted. */
function handWave(x, w, h, y, title, lines) {
  const box = node("node", { x, y, w, h }, intro, {
    border: "16px dashed rgba(154,176,207,.34)", borderRadius: "160px",
    background: "rgba(10,20,40,.34)", padding: "700px 800px",
  });
  box.innerHTML =
    `<div style="display:inline-block;font-family:var(--mono);font-size:250px;
       letter-spacing:.2em;text-transform:uppercase;color:var(--faint);
       border:10px solid rgba(154,176,207,.3);border-radius:80px;padding:120px 260px;
       margin-bottom:520px">out of scope</div>
     <div style="font-family:var(--mono);font-size:340px;letter-spacing:.14em;
       text-transform:uppercase;color:var(--muted);margin-bottom:420px">${esc(title)}</div>
     <div style="font-size:400px;line-height:1.5;color:var(--muted)">${
       lines.map(l => esc(l)).join("<br>")}</div>`;
  return box;
}

/* 1 — the inbox. The senders and the links are the real ones, off the same provenance
   table the gallery links come from; nothing else about the mail is claimed. */
const MAIL_H = Math.min(CARD_H, 9800);
const mail = node("wbox", { x: CX.mail, y: Math.round((INTRO.h - MAIL_H) / 2), w: MAIL_W, h: MAIL_H },
  intro, { borderWidth: "18px", borderRadius: "160px", padding: "700px 800px",
    borderColor: "rgba(120,160,230,.34)", background: "rgba(10,26,53,.55)" });
mail.id = "mailBox";
mail.dataset.vizId = "inbox";
mail.dataset.label = "The inbox — where the work actually arrives";
const MAIL_ROWS = 5;
const mailRowH = Math.floor((MAIL_H - 3400) / MAIL_ROWS);
mail.innerHTML =
  `<div style="font-family:var(--mono);font-size:340px;letter-spacing:.16em;
     text-transform:uppercase;color:var(--t-blue);margin-bottom:260px">The inbox</div>
   <div style="font-size:300px;color:var(--faint);margin-bottom:520px">
     the RFP is a link in the message, not an attachment</div>` +
  D.docs.slice(0, MAIL_ROWS).map(d =>
    `<div style="height:${mailRowH}px;border-top:8px solid rgba(120,160,230,.22);
       display:flex;flex-direction:column;justify-content:center;gap:${Math.round(mailRowH * .10)}px">
       <div style="font-family:var(--mono);font-size:${Math.round(mailRowH * .21)}px;
         color:var(--muted);white-space:nowrap">✉ ${esc(d.source)}</div>
       <div style="font-family:var(--mono);font-size:${Math.round(mailRowH * .17)}px;
         color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
         ${esc(d.url)}</div>
     </div>`).join("") +
  `<div style="margin-top:300px;font-size:250px;color:var(--faint)">
     … and ${D.docs.length - MAIL_ROWS} more</div>`;

chainArrow(CX.fetch - ARROW_W, true);

/* 2 — the fetch. There really is a scraper that follows those links; it is somebody
   else's talk, and pretending otherwise would put an unproven step in the middle of an
   argument whose whole point is that the steps are checkable. */
const FETCH_H = 6400;
handWave(CX.fetch, FETCH_W, FETCH_H, Math.round((INTRO.h - FETCH_H) / 2),
  "automated retrieval",
  ["Unrelated AI-enhanced automation", "follows the link, retrieves the", "document, and hands it on."])
  .id = "fetchBox";

chainArrow(CX.pile - ARROW_W, true);

// The two links the story is really about, as one box for the camera to frame.
node("node", {
  x: CX.pile - 400, y: -400, w: (CX.card + CARD_W + 400) - (CX.pile - 400), h: INTRO.h + 800,
}, intro, { pointerEvents: "none" }).id = "chainCore";

/* ── the cold open: start line, finish line, and the gap ───────────────────────
 *
 * Everything else on this canvas is a detail of something. This is the one scene that
 * is not: it stands alone, and a person who saw only this would still know what the
 * problem is and what closing it would mean.
 *
 * It is a purpose-built card rather than a wide shot of the chain below, because the
 * chain is ~66,000 units end to end — framing all of it puts the record's fifteen rows
 * at about three pixels each. This is sized to be read at one altitude, in one look. */

const SUM = { w: 30000, h: 13000 };
// Directly above the inbox, so the first flight of the piece is a short drop into the
// first real thing rather than a journey across empty canvas.
SUM.x = INTRO.x + CX.mail + Math.round(MAIL_W / 2 - SUM.w / 2);
SUM.y = INTRO.y - 7000 - SUM.h;

const summary = node("node", SUM);
summary.id = "summary";

/** One end of the argument. `tone` picks the register: what arrives vs. what is needed. */
function sumBox(x, tone, label, lines) {
  const green = tone === "want";
  const box = node("wbox", { x, y: 2200, w: 10400, h: 9000 }, summary, {
    borderWidth: "22px", borderRadius: "200px", padding: "800px 800px",
    borderColor: green ? "rgba(55,217,160,.5)" : "rgba(120,160,230,.42)",
    background: green ? "rgba(8,44,36,.30)" : "rgba(10,26,53,.60)",
    opacity: 0, transition: "opacity .5s ease",
  });
  box.innerHTML =
    `<div style="font-family:var(--mono);font-size:520px;letter-spacing:.18em;
       text-transform:uppercase;color:${green ? "var(--accent)" : "var(--t-blue)"};
       margin-bottom:800px">${esc(label)}</div>` +
    lines.map(([big, small]) =>
      `<div style="margin-bottom:640px">
         <div style="font-size:${big.length > 34 ? 700 : 820}px;font-weight:900;
           color:var(--ink);line-height:1.18">${esc(big)}</div>
         <div style="font-size:480px;color:var(--muted);margin-top:150px">${esc(small)}</div>
       </div>`).join("");
  return box;
}

const sumStart = sumBox(0, "get", "what arrives", [
  [`${D.corpus.docs} solicitations`, "as links in an inbox, not attachments"],
  [`${fmt(D.corpus.pages)} pages of PDF`, "no two of them laid out the same way"],
]);

const sumFinish = sumBox(19600, "want", "what we need", [
  ["One record each", "in the system of record, not in someone's head"],
  [`The same ${FIELD_KEYS.length} fields`, "so it can be routed, analysed and bid on"],
]);

// The stubs either side of the gap stop short of it on purpose: the picture is a bridge
// with its middle section missing, which is the whole argument in one shape.
const sumWire = (x, w) => node("node", { x, y: 6685, w, h: 30 }, summary,
  { background: "rgba(120,160,230,.5)", opacity: 0, transition: "opacity .4s ease" });
const sumWireA = sumWire(10400, 500);
const sumWireB = sumWire(19100, 500);
/* The span the two stubs stop short of. Beat 4 says "the rest of this is how we close
   that gap" and, until this existed, showed exactly what beat 3 showed — the same two
   boxes and the same warning between them. A title that promises a bridge should draw
   one: the gap recedes, the wire completes, and the scene ends on the shape the rest of
   the piece delivers. */
const sumWireC = sumWire(10900, 8200);
sumWireC.style.background = "rgba(55,217,160,.55)";

const sumGap = node("wbox", { x: 10900, y: 3750, w: 8200, h: 5900 }, summary, {
  borderWidth: "22px", borderRadius: "200px", padding: "700px 600px",
  borderColor: "rgba(230,144,46,.6)", background: "rgba(48,30,10,.62)",
  opacity: 0, transition: "opacity .5s ease", textAlign: "center",
});
sumGap.innerHTML =
  `<div style="font-family:var(--mono);font-size:460px;letter-spacing:.18em;
     text-transform:uppercase;color:var(--warn);margin-bottom:520px">in between, today</div>
   <div style="font-size:1400px;font-weight:900;color:var(--ink);line-height:1;
     white-space:nowrap">${Math.round(D.corpus.words / WPM / 60)} hours</div>
   <div style="font-size:500px;color:var(--muted);margin-top:420px;line-height:1.45">
     of somebody reading, before<br>anyone can do anything with it</div>`;

const sumShow = b => {
  sumStart.style.opacity = 1;
  sumFinish.style.opacity = b >= 1 ? 1 : 0;
  sumWireA.style.opacity = sumWireB.style.opacity = b >= 2 ? 1 : 0;
  sumGap.style.opacity = b >= 2 ? (b >= 3 ? .28 : 1) : 0;
  sumWireC.style.opacity = b >= 3 ? 1 : 0;
};

/* ── the preamble: what a room needs before any of this means anything ─────────── */

/* Four things the talk this came from always said out loud before the first slide, and
 * that the piece itself never did. They are not decoration: a room that does not know
 * what an RFP is cannot read the corpus scene, and a room that thinks this is on their
 * roadmap is evaluating a proposal instead of an idea.
 *
 * The wording is the talk's, compressed — including the ask, which is the only thing the
 * speaker actually wanted anyone to leave with. The client is deliberately unnamed: this
 * file is served publicly and the repo is client-agnostic by rule. */

// 9600, not 9000: the third card's copy is the longest and overflowed its box by ~140
// units at 9000. Cards are sized as one block so they stay a row of equals — the
// tallest content sets the height for all four.
const PRE = { w: 30000, h: 9600 };
PRE.x = SUM.x;
PRE.y = SUM.y - 7000 - PRE.h;

const preamble = node("node", PRE);
preamble.id = "preamble";

/** One card of the preamble. Same register as the summary boxes so the two scenes read as
 *  one voice, and narrower because there are four of them rather than two. */
function preBox(i, label, big, small, tone) {
  const warm = tone === "warm";
  const box = node("wbox", { x: i * 7700, y: 0, w: 6900, h: PRE.h }, preamble, {
    borderWidth: "22px", borderRadius: "200px", padding: "700px 640px",
    borderColor: warm ? "rgba(230,144,46,.5)" : "rgba(120,160,230,.42)",
    background: warm ? "rgba(48,30,10,.45)" : "rgba(10,26,53,.60)",
    opacity: 0, transition: "opacity .5s ease",
  });
  box.innerHTML =
    `<div style="font-family:var(--mono);font-size:420px;letter-spacing:.18em;
       text-transform:uppercase;color:${warm ? "var(--warn)" : "var(--t-blue)"};
       margin-bottom:620px">${esc(label)}</div>
     <div style="font-size:640px;font-weight:900;color:var(--ink);line-height:1.18;
       margin-bottom:420px">${esc(big)}</div>
     <div style="font-size:440px;color:var(--muted);line-height:1.45">${small}</div>`;
  return box;
}

const preCards = [
  preBox(0, "first, the caveat", "Nothing here is on anybody's roadmap.",
    "It was built for another organisation, and it worked. Treat it as the art of the possible, not a proposal."),
  preBox(1, "what an RFP is", "Someone says what they need. Vendors bid. One wins.",
    "The bidder has to read every document that arrives and get the facts into a system of record before they can decide whether to bid at all."),
  preBox(2, "when this was built", "Early 2025, on the models of early 2025.",
    "Re-checked since against a current layout model: the shape of the answer has not moved. The appendix walks through what the platforms now do for you."),
  // `big` is escaped, so no markup here — an <em> rendered as literal tag text. Curly
  // quotes carry the same "this is the thought, in their voice" without any.
  preBox(3, "what to take away", "One thought: \u201cI have a process like that.\u201d",
    "If everyone leaves with a single one of those, it was worth doing.", "warm"),
];

const preShow = b => preCards.forEach((c, i) => { c.style.opacity = i <= b ? 1 : 0; });

/* ── the hero page, and the 22-page document that contains it ─────────────────── */

const docBlock = node("node", DOC);
docBlock.id = "docBlock";

// Grid first, so the sharp single page paints on top of its own cell.
const heroGrid = pageSheet(docBlock, { x: 0, y: 0, w: DOC.w, h: DOC.h }, HG, HERO_W, HERO_H,
  130, 900, n => ({ vizId: `flagstaff-page-${n}`, label: `Flagstaff page ${n}` }));
const gridWrap = heroGrid.wrap, heroCells = heroGrid.cells;

// The claim at this altitude is "six of these twenty-two carry an answer". A ring
// says which six; the boxes say where on the page, which is the actual evidence.
const heroPageMarks = [];
Object.entries(D.hero.citedPageRects).forEach(([page, rects]) => {
  const cell = heroCells[+page - 1];
  if (!cell) return;
  rects.forEach(([x, y, w, h]) => heroPageMarks.push(
    node("mark", { x: x * HERO_W, y: y * HERO_H, w: w * HERO_W, h: h * HERO_H }, cell)));
});

const heroSheet = node("sheet", { x: 0, y: 0, w: HERO_W, h: HERO_H }, docBlock);
heroSheet.id = "heroSheet";
heroSheet.dataset.vizId = "hero-page-1";
heroSheet.dataset.label = "Flagstaff RFP, page 1";
heroSheet.innerHTML = `<img src="${D.hero.img.src}" alt="Page 1 of the City of Flagstaff Request for Proposals">`;

// Real citation boxes, from real PDF coordinates, plus a synced answer panel.
const heroMarks = [], panelRows = [];
// The panel sits over page 2 of the grid. The page overlays are dark enough to read
// against, but only just — a backdrop means the answers never depend on that.
const panelBack = node("node", {
  x: PANEL.x - 300, y: PANEL.y - 260, w: PANEL.w + 600, h: PANEL.h + 520,
}, docBlock, {
  background: "rgba(6,16,34,.9)", borderRadius: "60px",
  opacity: 0, transition: "opacity .6s ease",
});
const panel = node("node", PANEL, docBlock, { opacity: 0, transition: "opacity .6s ease" });
panel.id = "heroPanel";
panel.innerHTML = `<div style="font-family:var(--mono);font-size:86px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--accent);margin-bottom:44px">What a bidder needs</div>`;

D.hero.marks.forEach((m, i) => {
  m.rects.forEach(([x, y, w, h]) => {
    const el = node("mark", { x: x * HERO_W, y: y * HERO_H, w: w * HERO_W, h: h * HERO_H },
      heroSheet, { borderWidth: "5px", borderRadius: "4px" });
    el.dataset.vizId = `hero-mark-${m.field}`;
    el.dataset.label = `${m.field} — cited on page 1`;
    heroMarks.push({ el, i, field: m.field });
  });
  const row = document.createElement("div");
  row.className = "callout";
  row.style.cssText = `position:relative;margin-bottom:34px`;
  row.innerHTML =
    `<div class="k" style="font-size:62px;margin-bottom:10px">${esc(human(m.field))}</div>
     <div class="v" style="font-size:78px;line-height:1.3">${esc(short(m.value))}</div>
     <div class="rule" style="margin-top:16px;width:100%"></div>`;
  row.dataset.vizId = `hero-answer-${m.field}`;
  row.dataset.label = `${m.field} = ${m.value}`;
  panel.appendChild(row);
  panelRows.push(row);
});

const deadlineMark = heroMarks.find(m => m.field === "submissionDeadline").el;
deadlineMark.id = "heroLine";

const heroCited = new Set(Object.keys(D.hero.citedPages).map(Number));
const docCaption = node("wlabel", null, docBlock, {
  left: px(0), top: px(DOC.h + 240), fontSize: "300px", letterSpacing: ".08em",
});
/* The "6 carry an answer" half arrives with the beat that shows which six. It used to
   be in the caption from the first frame, which answered the question the next beat is
   built to ask. */
/* No document name and no word count. "Flagstaff" is a label for a thing the story never
   uses again, and "6,733 words" is a number nobody can feel — the question the room is
   actually asking is how long this takes to read, so answer that instead. */
const HERO_DOC = D.docs.find(d => d.stem === D.hero.stem);
const docCap = counted => docCaption.innerHTML =
  `${D.hero.pages} pages · ${readTime(D.hero.words)} to read` +
  (counted ? ` · ${heroCited.size} carry an answer` : "") +
  (HERO_DOC ? ` · ${srcLink(HERO_DOC.url, HERO_DOC.source, 300)}` : "");
docCap(false);

/* ── nine more documents: the same fact, in nine other places ─────────────────── */

// One slab per seven pages, capped so the 275-page book stays inside its cell. The
// stack is the size story: page counts in a caption are a number you have to read,
// a brick next to a leaflet is a fact you already know.
const slabsFor = pages => Math.min(38, Math.max(1, Math.round(pages / 7)));
const SLAB_STEP = 34;

/* A stack is drawn up and to the right of its own page, so the tallest one reaches this
 * far above the top row. That overhang is part of the picture, so it has to be inside
 * the box the camera frames: the 275-page stack used to climb off the top of the screen
 * the moment the stacks appeared. Everything below is offset by it instead. */
const STACK_OVER = slabsFor(Math.max(...D.docs.map(d => d.pages))) * SLAB_STEP;

const gallery = node("node", { x: GAL.x, y: GAL.y, w: GAL.w, h: 10 });
gallery.id = "gallery";
const galItems = [];

D.docs.forEach((doc, i) => {
  const col = i % GAL.cols, row = Math.floor(i / GAL.cols);
  const h = Math.round(GAL.cellW * (doc.deadline.img.h / doc.deadline.img.w));
  const rowTop = STACK_OVER + row * (Math.round(GAL.cellW * 1.32) + GAL.gapY);
  const cell = node("node", { x: col * (GAL.cellW + GAL.gapX), y: rowTop, w: GAL.cellW, h: h + 660 },
    gallery);

  const n = slabsFor(doc.pages);
  const stack = node("node", { x: 0, y: 0, w: GAL.cellW, h }, cell,
    { opacity: 0, transition: "opacity .5s ease" });
  for (let s = n; s >= 1; s--) {
    node("slab", { x: s * SLAB_STEP, y: -s * SLAB_STEP, w: GAL.cellW, h }, stack);
  }

  const sheet = node("sheet", { x: 0, y: 0, w: GAL.cellW, h }, cell);
  sheet.innerHTML = `<img src="${doc.deadline.img.src}" alt="${esc(doc.label)}, page ${doc.deadline.page}">`;
  sheet.dataset.vizId = `gallery-${doc.stem}`;
  sheet.dataset.label = `${doc.label} — ${doc.pages} pages, deadline on page ${doc.deadline.page}`;

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
  const PAD = Math.round(GAL.cellW * .009);
  // Heavy, because the wall is now only ever seen whole: a hairline ring that read fine
  // in a per-document close-up came out under a pixel wide once the camera stopped
  // visiting them one at a time, and where the answer sits is the whole point of the shot.
  const RING = Math.round(GAL.cellW * .014);

  /* Rects arrive one per line of type. Ringing each one separately draws a ring through
   * the middle of the line above it whenever a quote wraps — the line gap is ~13 world
   * units and a ring is 15, so the rings collide long before the words do. So lines that
   * continue each other are grouped into one run: a fill per line, which is what keeps
   * the words readable, and a single ring around the run, which is what makes it carry
   * to the back of a room. */
  const rects = doc.deadline.rects
    .map(([x, y, w, hh]) => ({ x: x * GAL.cellW, y: y * h, w: w * GAL.cellW, h: hh * h }))
    .sort((a, b) => a.y - b.y);
  const runs = [];
  for (const r of rects) {
    const run = runs.at(-1);
    // Within one line-height of the run's bottom is the next line of the same quote.
    // Anything further down is a separate citation and gets its own ring.
    if (run && r.y < run.y1 + r.h) {
      run.x0 = Math.min(run.x0, r.x); run.x1 = Math.max(run.x1, r.x + r.w);
      run.y1 = Math.max(run.y1, r.y + r.h);
    } else {
      runs.push({ x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h });
    }
  }

  const marks = [
    ...rects.map(r => node("mark solid", r, sheet,
      { borderRadius: px(PAD / 2), background: "rgba(208,69,58,.34)" })),
    ...runs.map(r => node("mark", {
      x: r.x0 - PAD, y: r.y0 - PAD, w: r.x1 - r.x0 + PAD * 2, h: r.y1 - r.y0 + PAD * 2,
    }, sheet, {
      background: "transparent", borderRadius: px(PAD),
      boxShadow: `0 0 0 ${RING}px var(--mark)`,
    })),
  ];

  /* The host is a live link to the PDF it came off. At 74px on a 3,000-unit cell it was
     unreadable grey text that looked like a caption artefact; at 130px and underlined it
     reads as what it is, and anyone who doubts a number on this page can click through
     to the original. `pointerEvents` because #galleryStage is pointer-events:none. */
  const cap = node("node", { x: 0, y: h + 60, w: GAL.cellW, h: 520 }, cell);
  cap.innerHTML =
    `<a href="${esc(doc.url)}" target="_blank" rel="noopener"
        style="font-family:var(--mono);font-size:130px;color:var(--muted);
        letter-spacing:.04em;text-decoration:underline;text-decoration-color:var(--faint);
        text-underline-offset:.25em;pointer-events:auto">${esc(doc.source)}</a>
     <div class="ppg" style="font-size:190px;font-weight:900;color:var(--ink);margin-top:30px;
       opacity:0;transition:opacity .45s ease">${doc.pages} pages</div>`;

  galItems.push({ marks, stack, pp: cap.querySelector(".ppg"), i });
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

const galPanelBack = node("node",
  { x: GP.x - 300, y: GP.y - 300, w: GP.w + 600, h: GP.h + 600 }, world,
  { background: "rgba(6,16,34,.9)", borderRadius: "60px", opacity: 0, transition: "opacity .6s ease" });
const galPanel = node("node", GP, world, { opacity: 0, transition: "opacity .6s ease" });
galPanel.innerHTML = `<div style="font-family:var(--mono);font-size:190px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--accent);margin-bottom:150px">Submission deadline</div>`;

const galRows = D.docs.map(d => {
  const row = document.createElement("div");
  row.className = "callout";
  row.style.cssText = "position:relative;margin-bottom:170px";
  row.innerHTML =
    `<div class="k" style="font-size:150px;margin-bottom:22px">${esc(d.source)} ·
       page ${d.deadline.page} of ${d.pages}</div>
     <div class="v" style="font-size:230px;line-height:1.25">${esc(short(d.deadline.value, 58))}</div>`;
  row.dataset.vizId = `gallery-answer-${d.stem}`;
  row.dataset.label = `${d.label} — submission deadline = ${d.deadline.value}`;
  galPanel.appendChild(row);
  return row;
});

// Wall plus panel, as one thing to point the camera at.
const galleryStage = node("node", {
  x: GAL.x - 300, y: GAL.y - 300, w: (GP.x + GP.w + 300) - (GAL.x - 300), h: GAL.h + 600,
}, world, { pointerEvents: "none" });
galleryStage.id = "galleryStage";

const galPanelOff = () => { galPanel.style.opacity = galPanelBack.style.opacity = 0; };

const SAME_FACT = {
  id: "samefact", el: "#galleryStage", pad: .04, beats: D.docs.length,
  eyebrow: "The same column, ten times",
  // "Ten different places" invited the obvious objection, because the rows below print
  // page numbers and six of the ten say page 1. The real finding survives that: no two
  // of the ten sit in the same spot on the page (y-fractions .116 .120 .192 .338 .362
  // .373 .396 .595 .627 .648, all distinct), so six can share page 1 and still be
  // nowhere near each other — which is harder, not easier, than ten different pages.
  title: "One field. Ten documents. Never the same place twice.",
  body: "",
  enter() {
    galPanel.style.opacity = galPanelBack.style.opacity = 1;
    galItems.forEach(g => { g.stack.style.opacity = 1; g.pp.style.opacity = 1; });
  },
  on(b) {
    galItems.forEach(g => g.marks.forEach(m => m.classList.toggle("on", g.i <= b)));
    galRows.forEach((r, i) => r.classList.toggle("on", i <= b));
  },
};

/* ── everything so far, at once: the corpus ───────────────────────────────────── */

/* Room above the evidence for the corpus to say its own number. This shot used to be
   ten documents and a paragraph in the narration card claiming 764 pages — a figure that
   pointed at nothing you could see. On screen, at the same size as the monster's own
   headline, it is a caption for the thing underneath it. */
const CORP_TITLE = 3400;
const corpusFrame = node("node", {
  x: DOC.x - 900, y: Math.min(DOC.y, GAL.y) - 2600 - CORP_TITLE,
  w: (GAL.x + GAL.w) - DOC.x + 1800, h: Math.max(DOC.h, GAL.h) + 4600 + CORP_TITLE,
});
corpusFrame.id = "corpusFrame";
node("wbig", null, corpusFrame, { left: px(900), top: px(300), fontSize: "2600px" })
  .innerHTML = `${fmt(D.corpus.pages)} pages.`;
/* "2.9 copies of The Hobbit" was a joke that measured nothing: it converted one number
   nobody can feel into another one. The typical document and the time to read the stack
   are both things a person in this room has to plan around. */
const MEDIAN_PAGES = [...D.docs].map(d => d.pages).sort((a, b) => a - b)
  .slice(Math.floor((D.docs.length - 1) / 2), Math.floor(D.docs.length / 2) + 1)
  .reduce((a, b, _, s) => a + b / s.length, 0);
node("wlabel", null, corpusFrame, {
  left: px(900), top: px(3050), fontSize: "760px", letterSpacing: ".06em",
}).innerHTML = `${D.corpus.docs} documents · median ${Math.round(MEDIAN_PAGES)} pages ·
  ${readTime(D.corpus.words)} to read the stack`;

/* ── the monster: 275 pages, 38 of which matter ───────────────────────────────── */

const monScene = node("node", { x: MON.x, y: MON.y - 3400, w: MON.w, h: MON.h + 5600 });
monScene.id = "monScene";
const monGrid = pageSheet(monScene, { x: 0, y: 3400, w: MON.w, h: MON.h }, MG,
  MON_CELL_W, MON_CELL_H, 110, 700,
  n => ({ vizId: `providence-page-${n}`, label: `Providence page ${n}` }));
const monBlock = monGrid.wrap, monCells = monGrid.cells;
const monCited = new Set(Object.keys(D.monster.citedPages).map(Number));

const monTitle = node("wbig", null, monScene, {
  left: px(0), top: px(200), width: px(MON.w), fontSize: "2000px",
});
monTitle.innerHTML = `${D.monster.pages} pages.`;
const MON_DOC = D.docs.find(d => d.stem === D.monster.stem);
const monSub = node("wlabel", null, monScene, {
  left: px(0), top: px(MON.h + 3900), fontSize: "480px", letterSpacing: ".06em",
});
const monSrc = node("wlabel", null, monScene, {
  left: px(0), top: px(MON.h + 4700), fontSize: "420px", letterSpacing: ".06em",
});
if (MON_DOC) monSrc.innerHTML = srcLink(MON_DOC.url, MON_DOC.source, 420);
/* Staged like the hero's caption — the count arrives with the beat that shows it.
   It also no longer says "one of the 20 answers". Providence's schema really does have
   20 fields where Flagstaff's has 15 (five extra about castings and materials, which
   only a construction solicitation has), but nothing on screen explains that, so the
   number read as the story contradicting itself. */
const monCap = counted => monSub.innerHTML =
  `${D.monster.pages} pages · ${readTime(D.monster.words)} to read` +
  (counted ? ` · ${monCited.size} carry an answer` : "");
monCap(false);

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

const WB = { clockH: 2200, gridW: 16400, cardX: 18200, top: 3600 };
WB.cellW = Math.round(WB.gridW / HG.cols);
WB.cellH = Math.round(WB.cellW * (HG.cellH / HG.cellW));

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
const benchClock = node("node", { x: 0, y: 0, w: LANES.w, h: WB.clockH }, bench,
  { display: "flex", alignItems: "center", gap: "800px" });
benchClock.innerHTML =
  `<div id="benchWho" style="font-family:var(--mono);font-size:620px;font-weight:600;
     letter-spacing:.18em;padding:260px 460px;border-radius:200px;border:20px solid"></div>
   <div id="benchTime" style="font-family:var(--mono);font-size:1600px;font-weight:600;
     color:var(--ink);letter-spacing:.04em">00:00</div>
   <div style="display:flex;flex-direction:column;gap:120px">
     <div id="benchMode" style="font-family:var(--mono);font-size:640px;letter-spacing:.16em;
       text-transform:uppercase;color:var(--faint)"></div>
     <div id="benchNote" style="font-family:var(--mono);font-size:420px;letter-spacing:.10em;
       color:rgba(95,118,153,.9)"></div>
   </div>`;
const benchTime = benchClock.querySelector("#benchTime");
const benchMode = benchClock.querySelector("#benchMode");
const benchNote = benchClock.querySelector("#benchNote");
const benchWho = benchClock.querySelector("#benchWho");

/** Badge the bench as the manual run or the automated one. */
function benchBadge(kind) {
  const human = kind === "human";
  benchWho.textContent = human ? "BY HAND" : "AUTOMATED";
  benchWho.style.color = human ? "var(--warn)" : "var(--accent)";
  benchWho.style.borderColor = human ? "rgba(230,144,46,.55)" : "rgba(55,217,160,.55)";
  benchWho.style.background = human ? "rgba(48,30,10,.55)" : "rgba(8,44,36,.55)";
}

const benchGrid = pageSheet(bench, { x: 0, y: WB.top, w: WB.gridW, h: HG.rows * WB.cellH },
  HG, WB.cellW, WB.cellH, 120, 800,
  n => ({ vizId: `bench-page-${n}`, label: `Flagstaff page ${n}` }));
const benchCells = benchGrid.cells;

// The same citation rectangles the close-up used, at grid size — this is where "locate"
// stops being a claim and becomes a box on a page.
const benchMarks = [];
Object.entries(D.hero.citedPageRects).forEach(([page, rects]) => {
  const cell = benchCells[+page - 1];
  if (!cell) return;
  rects.forEach(([x, y, w, h]) => benchMarks.push(
    node("mark", { x: x * WB.cellW, y: y * WB.cellH, w: w * WB.cellW, h: h * WB.cellH }, cell)));
});

const CARD_H2 = LANES.h - WB.top + 700;
const benchCard = node("wbox",
  { x: WB.cardX, y: WB.top - 700, w: LANES.w - WB.cardX, h: CARD_H2 }, bench,
  { borderWidth: "22px", borderRadius: "300px", background: "rgba(8,44,36,.22)",
    borderColor: "rgba(55,217,160,.42)", padding: "600px 700px" });
benchCard.dataset.vizId = "bench-record";
benchCard.dataset.label = "The CRM record, filling in";
const CARD_ROW = Math.floor((CARD_H2 - 2600) / FIELD_KEYS.length);
benchCard.innerHTML =
  `<div style="font-family:var(--mono);font-size:520px;letter-spacing:.16em;
     text-transform:uppercase;color:var(--accent);margin-bottom:700px">The record</div>`;
const benchRows = {};
FIELD_KEYS.forEach(k => {
  const row = node("node", null, benchCard, {
    position: "relative", height: px(CARD_ROW), display: "flex", alignItems: "center",
    gap: "500px",
  });
  row.innerHTML =
    `<div style="font-family:var(--mono);font-size:${Math.round(CARD_ROW * .40)}px;
       color:var(--faint);width:38%;white-space:nowrap">${esc(human(k))}</div>
     <div class="v" style="flex:1;font-size:${Math.round(CARD_ROW * .44)}px;color:var(--ink);
       font-weight:700;opacity:0;transition:opacity .45s ease;white-space:nowrap;
       overflow:hidden"></div>`;
  benchRows[k] = row.querySelector(".v");
});

/* Reading time is the document's own words over the dial, so the clock cannot drift from
 * the claim: 22 pages is 6,733 words, and 6,733 words at 238 wpm is what it is. */
const wordsTo = n => D.hero.perPageWords.slice(0, n).reduce((a, b) => a + b, 0);
const clockText = mins => {
  const t = Math.round(mins * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
const fieldsBy = n => new Set(Object.entries(D.hero.citedPages)
  .filter(([p]) => +p <= n).flatMap(([, f]) => f));

/** Fill the record from a set of field keys; anything outside it stays visibly blank,
 *  which is the honest state — three of Flagstaff's fifteen are not in the document at
 *  all, and a person and the pipeline both end up with the same three holes. */
function benchFill(keys, settled = false) {
  FIELD_KEYS.forEach(k => {
    const v = D.hero.fields[k];
    const on = keys.has(k) && v != null;
    // "n/a" only once the document is exhausted. Until then an empty row means "not
    // found yet"; at the end it means "not in here" — which is the answer to "why did
    // you have to read all 22 pages?" A field is absent only when nothing is left.
    const na = settled && v == null;
    benchRows[k].textContent = on ? short(v, 40) : na ? "n/a" : "";
    benchRows[k].style.opacity = on || na ? 1 : 0;
    benchRows[k].style.color = na ? "var(--faint)" : "var(--ink)";
    benchRows[k].style.fontWeight = na ? 400 : 700;
  });
}

function benchPages({ read = 0, cited = false, boxes = false }) {
  benchCells.forEach((c, i) => {
    c.classList.toggle("seen", i < read);
    c.classList.toggle("hit", cited && heroCited.has(i + 1) && i < read);
  });
  benchMarks.forEach(m => m.classList.toggle("on", boxes));
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
const LN = {
  top: WB.top, modelX: 5200, modelW: 2600,
  mdX: 9200, mergeX: 13000, mergeW: 3800,
};
LN.h = LANES.h - LN.top;
LN.pitch = LN.h / D.hero.pages;
LN.bar = Math.round(LN.pitch * .78);              // a page's height
LN.pw = Math.round(LN.bar / D.hero.aspect);       // and its width, at the real aspect
LN.txtX = 0;
LN.imgX = LN.pw + 520;
LN.splitEnd = LN.imgX + LN.pw;
LN.y = i => LN.top + Math.round(i * LN.pitch);

const line = node("node", { x: 0, y: 0, w: WB.cardX - 800, h: LANES.h }, bench,
  { opacity: 0, transition: "opacity .5s ease" });

const lnLabel = (x, w, text, color = "var(--faint)", y = LN.top - 1150) => {
  const el = node("wlabel", null, line, {
    left: px(x), top: px(y), width: px(w), fontSize: "440px",
    letterSpacing: ".14em", color, opacity: 0, transition: "opacity .4s ease",
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
  merge: lnLabel(0, 4000, "one document"),   // repositioned onto the document below
};
lnHeads.split.style.opacity = 0;
lnHeads.model.style.textAlign = "center";

/* The carry chain — the one thing in this scene that is not obvious from the rows.
 *
 * This used to be a brace labelled "all 22 at once", because the rebuild had lost the
 * fact that page N's conversion takes page N-1's markdown as an input. It does (see the
 * departures note on the `machine` keyframe), and that data dependency is why the pages
 * cannot be in flight together. So: a spine down the markdown column with a tick per
 * page, which is what "in order, each one sees the last" looks like. */
const lnCarry = node("node",
  { x: LN.mdX - 900, y: LN.top, w: 40, h: LN.h }, line,
  { background: "rgba(55,217,160,.55)", opacity: 0, transition: "opacity .4s ease" });
// Indexed off the page count, not off lnRows — the rows are built below this.
const lnCarryTicks = Array.from({ length: D.hero.pages }, (_, i) => node("node",
  { x: LN.mdX - 900, y: LN.y(i) + LN.bar / 2 - 10, w: 900, h: 20 }, line,
  { background: "rgba(55,217,160,.45)", opacity: 0,
    transition: `opacity .3s ease ${i * 45}ms` }));
/* No tag on the spine. It said "each sees the last" 760 units under the word "markdown"
   — two labels overlapping in one column, and the second one repeating the beat title
   above it verbatim. The spine and its ticks carry the dependency on their own. */

/* One row per page. The three chips are the three states that page passes through, and
 * they all exist from the start — a beat only changes what is visible and where it is,
 * so the transitions are free and nothing is rebuilt mid-flight. */
const lnRows = D.hero.perPageWords.map((_, i) => {
  const y = LN.y(i), h = LN.bar, w = LN.pw;
  const sheetish = { borderRadius: "24px", transition: "opacity .4s ease" };
  const page = node("node", { x: 0, y, w, h }, line,
    { background: "var(--paper)", opacity: .92, ...sheetish });
  // The text layer is a page too — same shape, ruled like type, so "one page becomes
  // two things" is two page-shaped things and not a bar chart.
  const txt = node("node", { x: LN.imgX, y, w, h }, line,
    { background: "rgba(154,176,207,.30)", opacity: 0, ...sheetish,
      backgroundImage: `repeating-linear-gradient(to bottom,
        rgba(154,176,207,.85) 0 ${Math.round(h * .07)}px,
        transparent ${Math.round(h * .07)}px ${Math.round(h * .2)}px)`,
      backgroundSize: "72% 100%", backgroundRepeat: "no-repeat",
      backgroundPosition: `${Math.round(w * .14)}px ${Math.round(h * .16)}px` });
  const img = node("node", { x: LN.txtX, y, w, h }, line,
    { background: "var(--paper)", opacity: 0, ...sheetish });
  /* A clean top-to-bottom cascade, proportional to the page index. It was `(i % 8) * 60ms`
     once, which split the column into three visible waves because of the modulo rather
     than by design. A cascade is now the honest animation: the pages really are
     converted one after another, because each one needs the one before it. */
  const md = node("node", { x: LN.mdX, y, w, h }, line,
    { background: "rgba(55,217,160,.30)", opacity: 0, ...sheetish,
      border: "12px solid rgba(55,217,160,.65)",
      transition: `opacity .4s ease ${i * 45}ms, transform .75s cubic-bezier(.4,0,.2,1)` });
  // The citation mark rides the page row, so "locate" lands back on the paper it came
  // from rather than on a new diagram. One PAGE wide, not the whole split lane: the
  // locate beat has already put the text and image chips away and left only the page,
  // so a mark spanning `splitEnd` boxed the page plus two page-widths of empty canvas.
  const cite = node("node", { x: 0, y, w, h }, line,
    { boxShadow: "0 0 0 34px var(--mark)", borderRadius: "24px", opacity: 0,
      transition: "opacity .45s ease" });
  const wire = (x, w) => node("node", { x, y: y + h / 2 - 5, w, h: 10 }, line,
    { background: "rgba(55,217,160,.45)", opacity: 0, transition: "opacity .4s ease" });
  /* The lit column is a CAPSULE — straight sides with a semicircular cap at each end —
     so its edge at row i is inset only for the handful of rows inside a cap. It used to
     be solved as a full-height ellipse, which insets every row above and below centre:
     at 22 rows against a 2,600-wide column that pulled most of the wires up to 1,300
     units short, and they ended in open canvas beside a gradient with no visible edge
     for them to end on. Solve the cap for this row instead. */
  const r = LN.modelW / 2, yc = y + h / 2;
  const over = Math.max(0, (LN.top + r) - yc, yc - (LN.top + LN.h - r));
  const inset = r - Math.sqrt(Math.max(0, r * r - over * over));
  const inW = wire(LN.splitEnd, (LN.modelX + inset) - LN.splitEnd);
  const outW = wire(LN.modelX + LN.modelW - inset,
                    LN.mdX - (LN.modelX + LN.modelW - inset));
  return { page, txt, img, md, cite, inW, outW };
});

/* Not a bordered box. Every other rectangle on this canvas is a document, so drawing the
 * model as one more rounded rectangle made it read as another artefact in the row. A
 * soft-edged lit column has no border to mistake for a page edge, and matches the lit
 * spheres the walkthrough uses for the same thing. */
const lnModel = node("node", { x: LN.modelX, y: LN.top, w: LN.modelW, h: LN.h }, line,
  { borderRadius: `${LN.modelW / 2}px`,
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
    opacity: 0, transition: "opacity .45s ease" });

/* The merge target is a DOCUMENT, and it is document-shaped. It used to be a
 * full-height rounded box, and the 22 markdown chips flew into the middle of it and
 * flattened to `scaleY(.2)` — so twenty-two pages visibly became one horizontal line,
 * with the flight paths crossing into a shape the room read as a backwards 3. They land
 * on a page-shaped stack at page aspect instead, uniformly scaled, so nothing ever
 * stops looking like paper. */
const MERGE = {
  h: Math.round(LN.h * .52),
};
MERGE.w = Math.round(MERGE.h / D.hero.aspect);
MERGE.x = LN.mergeX + Math.round((LN.mergeW - MERGE.w) / 2);
MERGE.y = LN.top + Math.round((LN.h - MERGE.h) / 2);
MERGE.k = MERGE.w / LN.pw;

Object.assign(lnHeads.merge.style, {
  left: px(MERGE.x), top: px(MERGE.y - 800), width: px(MERGE.w), textAlign: "center",
});
const lnMerge = node("node", { x: MERGE.x, y: MERGE.y, w: MERGE.w, h: MERGE.h }, line,
  // Matched to the page chips that land inside it (24px at full size, scaled by MERGE.k),
  // so the container and its contents are one shape language. At a flat 40 it was a
  // squarer box holding rounder pages, which read as two unrelated rectangles.
  { borderRadius: px(Math.max(8, Math.round(24 * MERGE.k))),
    background: "rgba(55,217,160,.20)",
    opacity: 0, transition: "opacity .5s ease" });

/* Fifteen questions against one document, at the same instant — drawn as fifteen lines
 * from the merged document to the fifteen rows of the record, because that is the one
 * claim in this scene that a still picture can make on its own. */
const FAN_X = MERGE.x + MERGE.w;
const lnFan = FIELD_KEYS.map((k, i) => {
  const y0 = MERGE.y + MERGE.h / 2;
  const y1 = WB.top - 700 + 1900 + Math.round((i + .5) * CARD_ROW);
  const dx = (WB.cardX + 700) - FAN_X, dy = y1 - y0;
  const el = node("node", { x: FAN_X, y: y0, w: Math.round(Math.hypot(dx, dy)), h: 26 }, line,
    { background: "var(--accent)", opacity: 0, transformOrigin: "0 50%",
      transform: `rotate(${Math.atan2(dy, dx)}rad)`,
      transition: `opacity .4s ease ${i * 18}ms` });
  return el;
});

/* The fan's endpoints were re-derived from WB.top with two magic offsets and landed a
 * little above each row's text. The rows are flex, alignItems:center, so their real
 * centre is the only honest target — measure it. Once, lazily, because layout has to
 * have happened first. */
let fanPlaced = false;
function placeFan() {
  if (fanPlaced) return;
  const rowEls = FIELD_KEYS.map(k => benchRows[k] && benchRows[k].parentElement);
  if (!rowEls[0] || !rowEls[0].offsetHeight) return;
  const worldY = el => {
    let y = 0, e = el;
    while (e && e !== bench) { y += e.offsetTop; e = e.offsetParent; }
    return y;
  };
  const y0 = MERGE.y + MERGE.h / 2;
  lnFan.forEach((el, i) => {
    const r = rowEls[i];
    if (!r) return;
    const y1 = worldY(r) + r.offsetHeight / 2;
    const dx = (WB.cardX + 700) - FAN_X, dy = y1 - y0;
    el.style.width = px(Math.round(Math.hypot(dx, dy)));
    el.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  });
  fanPlaced = true;
}

function lineShow(beat) {
  const on = (el, v) => el.style.opacity = v ? 1 : 0;
  // Once the pages have become one document, the apparatus that made it is clutter.
  const upstream = beat < 3;
  lnRows.forEach((r, i) => {
    on(r.page, beat < 1);
    on(r.txt, beat >= 1 && upstream);
    on(r.img, beat >= 1 && upstream);
    on(r.md, beat >= 2);
    // Uniform scale onto the merged document's own footprint, from the chip's top-left.
    r.md.style.transformOrigin = "0 0";
    r.md.style.transform = beat >= 3
      ? `translate(${MERGE.x - LN.mdX}px, ${MERGE.y - LN.y(i)}px) scale(${MERGE.k})`
      : "none";
    // 22 chips stacked on the same footprint compound; at .16 each the merged document
    // came out a solid green slab instead of a document with pages in it.
    if (beat >= 3) { r.md.style.opacity = .05; r.md.style.borderColor = "transparent"; }
    else r.md.style.borderColor = "rgba(55,217,160,.65)";
    on(r.inW, beat >= 2 && upstream);
    on(r.outW, beat >= 2 && upstream);
    if (beat >= 5) { on(r.page, true); on(r.img, false); on(r.txt, false); }
    on(r.cite, beat >= 5 && heroCited.has(i + 1));
  });
  on(lnModel, beat >= 2 && upstream);
  on(lnCarry, beat >= 2 && beat < 3);
  lnCarryTicks.forEach(t => on(t, beat >= 2 && beat < 3));
  on(lnMerge, beat >= 3);
  if (beat >= 4) placeFan();
  lnFan.forEach(el => on(el, beat >= 4));
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
const TR = { pitch: 20000, panelH: 9000, y: TRACE.y + 2600, drop: 16000 };
// [column, row] per station. Row 1 is the fork's three branches, centred under station 4.
const TR_AT = [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1], [3, 1], [4, 1]];
TR.ox = i => TR_AT[i][0] * TR.pitch;
TR.oy = i => TR.y + TR_AT[i][1] * TR.drop;
const trace = node("node",
  { x: TRACE.x, y: TRACE.y, w: TR.pitch * 5, h: TRACE.h + TR.drop });
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
function trPanel(i, { x = 0, y = 0, w, h, label, text, mono, tint, id, io, size, dense }) {
  const green = tint;
  const box = node("wbox", { x: TR.ox(i) + x, y: TR.oy(i) + y, w, h }, trace, {
    borderWidth: io ? "24px" : "16px", borderRadius: "180px",
    padding: dense ? "300px 340px" : "460px 420px",
    borderColor: green ? "rgba(55,217,160,.55)"
      : io === "in" ? "rgba(63,143,212,.55)"
      : io === "out" ? "rgba(200,214,236,.45)" : "rgba(120,160,230,.3)",
    background: green ? "rgba(8,44,36,.30)"
      : io === "in" ? "rgba(10,26,53,.62)" : "rgba(12,28,56,.62)",
    overflow: "hidden",
  });
  if (id) box.id = id;
  box.innerHTML =
    `<div style="font-family:var(--mono);font-size:${dense ? 250 : 300}px;
       letter-spacing:.12em;white-space:nowrap;margin-bottom:${dense ? 190 : 300}px;
       text-transform:uppercase;color:${green ? "var(--accent)"
         : io === "in" ? "var(--t-blue)" : io === "out" ? "var(--ink)" : "var(--faint)"}
       ">${esc(label)}</div>` +
    (text == null ? "" :
      `<div style="white-space:pre-wrap;${mono ? "font-family:var(--mono);" : ""}
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
function trBrain(i, { x, y, d, label = "AI" }) {
  const el = node("node", { x: TR.ox(i) + x, y: TR.oy(i) + y, w: d, h: d }, trace, {
    borderRadius: "50%",
    background: `radial-gradient(circle at 50% 38%,
      rgba(120,255,215,.75), rgba(55,217,160,.42) 38%, rgba(8,44,36,.92) 70%)`,
    boxShadow: "0 0 0 26px rgba(55,217,160,.55), 0 0 1200px 260px rgba(55,217,160,.20)",
    display: "grid", placeItems: "center",
  });
  el.innerHTML = label
    ? `<div style="font-family:var(--mono);font-size:${Math.round(d * .18)}px;
       font-weight:600;letter-spacing:.2em;color:#eafff7">${esc(label)}</div>`
    : "";
  return el;
}

/** Gather several inputs onto one spine and take a single line into the model. Three
 *  separate arrows aimed at a sphere read as three unrelated pokes; a manifold reads as
 *  "all of this, together, is the input" — which is what a prompt is. */
function trBus(i, { fromX, ys, x, toY, toX }) {
  const wire = (bx, by, w, h) => node("node",
    { x: TR.ox(i) + bx, y: TR.oy(i) + by, w, h }, trace,
    { background: "rgba(154,176,207,.55)" });
  ys.forEach(y => wire(fromX, y, x - fromX, 26));
  wire(x, Math.min(...ys), 26, Math.max(...ys) - Math.min(...ys));
  wire(x, toY, toX - x, 26);
}

/** A column header — said once over a stack, instead of on every box in it. */
const trColHead = (i, x, w, text, color) => {
  const el = node("wlabel", null, trace, {
    left: px(TR.ox(i) + x), top: px(TR.oy(i) - 900), width: px(w),
    // Centred over the column it heads. Left-aligned, "input" sat against the left edge
    // of a group three panels wide and read as a label for the first panel only.
    textAlign: "center",
    fontSize: "320px", letterSpacing: ".22em", color,
  });
  el.textContent = text;
  return el;
};

/* No station number. Each title used to carry one, and because the frames overlap you
   also saw the NEXT station's number floating at the right edge of every shot — a
   counter nobody could act on, beside a step counter in the corner that already says
   where you are. The title is the station. */
const trStation = (i, t) => {
  const el = node("wlabel", null, trace, {
    left: px(TR.ox(i)), top: px(TR.oy(i) - 1800), width: px(TR.pitch - 1000),
    fontSize: "520px", letterSpacing: ".16em", color: "var(--faint)",
  });
  el.textContent = t;
  return el;
};

const trArrow = (i, x, y, w) => node("node",
  { x: TR.ox(i) + x, y: TR.oy(i) + y, w, h: 26 }, trace,
  { background: "rgba(154,176,207,.55)" });

/* No character counts anywhere in this strip. Every panel had one — 1,359 characters,
   1,533 characters, 47,263 characters — and not one of them was a fact anybody could do
   anything with. The artefact IS the evidence; its length is trivia. */

/* 1 — split. One page, and the two things the pipeline makes of it: the text the PDF
   was already carrying, and a picture of the same page. Both on screen at once, because
   they are one step, not two. */
trStation(0, "one page becomes two things");
const trPage = node("sheet",
  { x: TR.ox(0), y: TR.oy(0), w: 5600, h: Math.round(5600 * D.hero.aspect) }, trace);
trPage.id = "tracePage";
trPage.innerHTML = `<img src="${D.hero.img.src}" alt="Page ${T.page} of the Flagstaff RFP">`;
node("wlabel", null, trace, {
  left: px(TR.ox(0)), top: px(TR.oy(0) + Math.round(5600 * D.hero.aspect) + 300), width: px(5600),
  fontSize: "300px", letterSpacing: ".1em",
}).textContent = `page ${T.page}`;
trPanel(0, { x: 6600, w: 11600, h: TR.panelH,
  label: "and the text the PDF already had",
  text: T.textLayer.replace(/\n{2,}/g, "\n").trim().slice(0, 620) + " …", mono: true });

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
const tcImg = node("sheet",
  { x: TR.ox(1) + Math.round(TC.inW / 2 - 1000), y: TR.oy(1) + 150, w: 2000, h: tcImgH }, trace,
  { boxShadow: "0 0 0 24px rgba(63,143,212,.55), 0 40px 120px rgba(0,0,0,.5)" });
tcImg.innerHTML = `<img src="${D.hero.img.src}" alt="A picture of page ${T.page}">`;
node("wlabel", null, trace, {
  left: px(TR.ox(1)), top: px(TR.oy(1) + 150 + tcImgH + 150), width: px(TC.inW),
  textAlign: "center",
  fontSize: "240px", letterSpacing: ".1em", color: "var(--t-blue)",
}).textContent = "a picture of the page";
// The real text layer, not the words "its text". Cut at a line, because the point is
// that it is ragged PDF text, not that you can read all of it here.
const tcText = T.textLayer.split("\n").map(l => l.trim()).filter(Boolean).join("\n");
/* Three stacked inputs under the page image, on one shared grid inside the station's own
   vertical budget (0..9400 relative to TR.y). They were placed one at a time, and adding
   the fourth pushed it off the bottom of the frame. */
const TC_Y = [3350, 5400, 7450], TC_H = 1900;
trPanel(1, { x: 0, y: TC_Y[0], w: TC.inW, h: TC_H, io: "in", label: "its text",
  // Two real lines and an explicit marker. A character slice landed mid-word on the
  // fourth line and clipped it, which reads as a rendering bug rather than an excerpt.
  dense: true, mono: true, size: 160,
  text: tcText.split("\n").filter(l => !/^\d+$/.test(l)).slice(0, 2).join("\n")
    + "\n… truncated" });
trPanel(1, { x: 0, y: TC_Y[1], w: TC.inW, h: TC_H, io: "in", label: "the prompt",
  dense: true, size: 170,
  text: "One page. Trust the picture\nover the text. Write it out\nas markdown." });
/* The fourth input, and the one the rebuild had lost: what the previous page turned into,
   plus the headings seen so far. A table or a numbered clause straddling a page break is
   the normal case in a long solicitation, and a page converted with no idea what preceded
   it restarts the numbering and re-emits the table header as body text. */
trPanel(1, { x: 0, y: TC_Y[2], w: TC.inW, h: TC_H, io: "in",
  label: "page before", dense: true, size: 165,
  text: "The previous page's markdown,\nand every heading so far, so\ntables keep their shape." });
trBus(1, { fromX: TC.inW, ys: [1450, 4300, 6350, 8400], x: TC.inW + 900,
  toY: TR.panelH / 2, toX: TC.brainX });
trBrain(1, { x: TC.brainX, y: TR.panelH / 2 - TC.brainD / 2, d: TC.brainD });
// Length DERIVED, not guessed: the gap between the sphere's right edge and the output
// box. It was a round 1000 against an 800 gap, so 200 units of wire ran on behind a
// 62%-opaque panel and showed through it.
trArrow(1, TC.brainX + TC.brainD + 200, TR.panelH / 2,
        TC.outX - (TC.brainX + TC.brainD + 200));
// The whole page of markdown, untruncated: it is one page, it is short, and a "…" on
// the one artefact this step exists to produce invites the question of what was cut.
trPanel(1, { x: TC.outX, w: TC.outW, h: TR.panelH, io: "out",
  label: "one page of markdown", text: T.markdown.trim(), mono: true, size: 128 });

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
trPanel(2, { y: 700, w: TE.inW, h: 3600, io: "in", label: "the whole document",
  text: `<<<PAGE 1>>>\n${T.markdown.trim().slice(0, 110)} …`, mono: true, size: 190 });
trPanel(2, { y: 4700, w: TE.inW, h: 3600, io: "in", label: "one question",
  text: `“${T.question}”`, size: 250 });
trBus(2, { fromX: TE.inW, ys: [2400, 6400], x: TE.inW + 900,
  toY: TR.panelH / 2, toX: TE.brainX });

/* Three stacked spheres, not one: the claim of this station is that the same document
   goes to the model fifteen times over, simultaneously, once per field. Two ghosted
   copies behind the live one is the cheapest honest way to draw "and fourteen more of
   these are happening right now". */
[[-1100, .18], [-550, .38]].forEach(([dy, op]) => {
  const g = trBrain(2, { x: TE.brainX + 260, y: TR.panelH / 2 - TE.brainD / 2 + dy,
    d: TE.brainD, label: "" });
  g.style.opacity = op;
});
trBrain(2, { x: TE.brainX, y: TR.panelH / 2 - TE.brainD / 2, d: TE.brainD });
node("wlabel", null, trace, {
  left: px(TR.ox(2) + TE.brainX - 400), top: px(TR.oy(2) + TR.panelH / 2 + TE.brainD / 2 + 500),
  width: px(TE.brainD + 1200), textAlign: "center",
  fontSize: "300px", letterSpacing: ".1em", color: "var(--accent)",
}).textContent = `× ${FIELD_KEYS.length}, in parallel`;

trArrow(2, TE.brainX + TE.brainD + 200, TR.panelH / 2,
        TE.outX - (TE.brainX + TE.brainD + 200));

/* What actually comes back is not a value. It is a value AND the passage it rests on,
   which is the only reason the next three stations can exist at all. */
const trAnswers = node("wbox",
  { x: TR.ox(2) + TE.outX, y: TR.oy(2) + 700, w: TE.outW, h: 7600 }, trace,
  { borderWidth: "24px", borderRadius: "180px", padding: "460px 420px",
    borderColor: "rgba(154,176,207,.45)", background: "rgba(12,28,56,.62)" });
trAnswers.innerHTML =
  `<div style="font-family:var(--mono);font-size:280px;letter-spacing:.14em;
     text-transform:uppercase;color:var(--muted);margin-bottom:420px">what came back</div>
   <div style="font-family:var(--mono);font-size:250px;color:var(--faint);
     letter-spacing:.06em">value</div>
   <div style="font-size:340px;font-weight:700;color:var(--ink);line-height:1.35;
     margin:120px 0 480px">${esc(T.value)}</div>
   <div style="font-family:var(--mono);font-size:250px;color:var(--faint);
     letter-spacing:.06em">quote</div>
   <div style="font-family:var(--mono);font-size:225px;color:var(--ink);line-height:1.5;
     margin-top:120px;opacity:.92">${esc(T.quote.replace(/\*/g, "").trim())}</div>`;

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
const M3_CARD = i => i * 6300 - 500;
trStation(3, "three ways back to the page");
[["method 1", "the PDF's own words", "Search the text layer.\nNo model.", "var(--accent)"],
 // Labels here are nowrap in a 5600-wide box: "when the page is a picture" is 26
 // characters and clipped to "…IS A PICTU". Twenty is the ceiling.
 ["method 2", "when it is a picture", "OCR the pixels,\nthen search those.", "var(--t-blue)"],
 ["method 3", "when nothing matched", "Ask the model.\nOff by default.", "var(--warn)"],
].forEach(([n, k, v, c], i) => {
  const box = trPanel(3, { x: M3_CARD(i), y: 2200, w: 5600, h: 4600, label: k, text: v, size: 260 });
  box.style.borderColor = c;
  node("wlabel", null, trace, {
    left: px(TR.ox(3) + M3_CARD(i)), top: px(TR.oy(3) + 1500), width: px(5600),
    textAlign: "center", fontFamily: "var(--mono)", fontSize: "300px",
    letterSpacing: ".14em", textTransform: "uppercase", color: c,
  }).textContent = n;
  /* And the branch itself: an elbow from the bottom of this card down to the top of the
     station that carries it out. Without them the three stations below are just three
     more diagrams that happen to sit lower down; with them the frame you are looking at
     is visibly the place the path splits. Coordinates are derived from the same TR.ox /
     TR.oy the stations use, so moving a branch in TR_AT moves its wire with it. */
  const fromX = TR.ox(3) + M3_CARD(i) + 2800;   // centre of this method card
  const toX = TR.ox(4 + i) + (TR.pitch - 1600) / 2 - 600;   // centre of its station frame
  const y0 = TR.oy(3) + 6800;                   // the card's bottom edge
  const yMid = TR.y + TR.drop - 5000;           // the lane the elbows turn in
  const y1 = TR.oy(4 + i) - 2200;               // the station frame's top edge
  const seg = (x, y, w, h) => node("node", { x, y, w, h }, trace,
    { background: c, opacity: .5 });
  if (fromX === toX) {
    seg(fromX - 20, y0, 40, y1 - y0);        // straight down — no corner to draw
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
trPanel(4, { w: 5600, h: 2600, io: "in", label: "the quote",
  text: T.quote.replace(/\*/g, "").trim(), mono: true, size: 180 });
/* The words the locate pass matched, and the boxes the PDF carries for them — straight
   off D.trace.words, which build-assets reads out of the page. These were hand-typed
   until 2026-09-07, and wrong: the panel said `closing (148, 232)` where the PDF says
   `CLOSING (54, 152)`. It was the only illustrative thing in a strip whose whole
   argument is that every other panel is a real artefact. */
trPanel(4, { y: 3100, w: 5600, h: 4800, label: "words and boxes",
  text: T.words.slice(0, 7).map(w => `${w.w.padEnd(9)}(${w.x}, ${w.y})`).join("\n")
        + (T.words.length > 7 ? "\n…" : ""),
  mono: true, size: 200 });
trBus(4, { fromX: 5600, ys: [1300, 5500], x: 6500, toY: 4200, toX: 7600 });
trPanel(4, { x: 7600, y: 2600, w: 4600, h: 3200, label: "match the words",
  text: "No model.\nA plain text search.", size: 260 });
trArrow(4, 12400, 4200, 900);
{
  const w = 5400, h = Math.round(w * D.hero.aspect);
  const proof = node("sheet", { x: TR.ox(4) + 13400, y: TR.oy(4) + 600, w, h }, trace);
  proof.id = "traceProof";
  proof.innerHTML = `<img src="${D.hero.img.src}" alt="Page ${T.page}, with the quote located">`;
  node("mark", { x: T.rects[0][0] * w, y: T.rects[0][1] * h,
    w: T.rects[0][2] * w, h: T.rects[0][3] * h }, proof,
    { borderWidth: "20px", borderRadius: "14px" }).classList.add("on");
  node("wlabel", null, trace, {
    left: px(TR.ox(4) + 13400), top: px(TR.oy(4) + 600 + h + 240), width: px(w),
    fontSize: "280px", letterSpacing: ".1em", color: "var(--accent)",
  }).textContent = `page ${T.page} · ${T.rects.length} rectangle`;
}

/* 6 — method two: the page is a scan, so there are no words to search. Tesseract reads
   the pixels and hands back the same shape of answer — words and boxes — after which
   method one runs on those, unchanged. A rasterised copy of this very document is in
   the corpus precisely so this is demonstrable rather than asserted. */
trStation(5, "method 2 — when the page is a picture");
{
  const w = 4000, h = Math.round(w * D.hero.aspect);
  const scan = node("sheet", { x: TR.ox(5), y: TR.oy(5) + 700, w, h }, trace,
    { boxShadow: "0 0 0 24px rgba(63,143,212,.55), 0 40px 120px rgba(0,0,0,.5)" });
  // Filter on the IMG, not on the sheet: on the sheet it also desaturates any child
  // drawn over the page — which is how the proof below ended up with a grey citation
  // box where methods 1 and 3 have a red one.
  scan.innerHTML = `<img src="${D.hero.img.src}" alt="A scanned page, with no text layer"
    style="filter:grayscale(1) contrast(.82) blur(1.2px)">`;
  node("wlabel", null, trace, {
    left: px(TR.ox(5)), top: px(TR.oy(5) + 700 + h + 240), width: px(w + 2000),
    fontSize: "280px", letterSpacing: ".1em", color: "var(--t-blue)",
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
  trPanel(5, { x: 5200, y: 1200, w: 6200, h: 6400, label: "what tesseract read back",
    text: W.length
      ? W.slice(0, 7).map(w => `${w.w.padEnd(9)}(${w.x}, ${w.y})`).join("\n")
        + (W.length > 7 ? "\n…" : "")
      : "(no OCR words in story-data.json — re-run build-assets.py)",
    mono: true, size: 200 });
  node("wlabel", null, trace, {
    left: px(TR.ox(5) + 5200), top: px(TR.oy(5) + 7800), width: px(6200),
    fontSize: "250px", letterSpacing: ".08em", color: "var(--muted)",
  }).textContent = "still no model — this is optical character recognition";
}
trArrow(5, 11600, 4400, 800);
/* Method 1 ends on a page with a rectangle drawn on it; this one used to end on a panel
   asserting that "method 1 runs on those, unchanged". The rectangle is the claim, so draw
   it: D.traceScan is the SAME quote located on the rasterised copy of the same document,
   a page with no text layer, so every coordinate here is OCR's work. */
{
  const S = D.traceScan;
  const w = 4600, h = Math.round(w * D.hero.aspect);
  const proof = node("sheet", { x: TR.ox(5) + 12800, y: TR.oy(5) + 900, w, h }, trace);
  // Greyscale belongs to the PAGE. On the sheet it caught the citation mark too, so the
  // one station that ends on the same red rectangle methods 1 and 3 end on was drawing
  // it in grey — which read as a different, weaker kind of box.
  proof.innerHTML = `<img src="${D.hero.img.src}" alt="The scanned page, with the quote located by OCR"
    style="filter:grayscale(1) contrast(.82)">`;
  node("mark", { x: S.rects[0][0] * w, y: S.rects[0][1] * h,
    w: S.rects[0][2] * w, h: S.rects[0][3] * h }, proof,
    { borderWidth: "20px", borderRadius: "14px" }).classList.add("on");
  node("wlabel", null, trace, {
    left: px(TR.ox(5) + 12800), top: px(TR.oy(5) + 900 + h + 240), width: px(w + 2400),
    fontSize: "280px", letterSpacing: ".1em", color: "var(--accent)",
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
  const sheet = node("sheet", { x: TR.ox(6), y: TR.oy(6) + 300, ...M3_PAGE }, trace,
    { boxShadow: "0 0 0 24px rgba(63,143,212,.55), 0 40px 120px rgba(0,0,0,.5)" });
  sheet.innerHTML = `<img src="${D.hero.img.src}" alt="Page ${T.page}, as a picture">`;
  node("wlabel", null, trace, {
    left: px(TR.ox(6)), top: px(TR.oy(6) + 300 + M3_PAGE.h + 240), width: px(6400),
    fontSize: "250px", letterSpacing: ".1em", color: "var(--t-blue)",
  }).textContent = `page ${T.page}, as a picture`;
}
// The same quote the other two methods were handed, verbatim.
trPanel(6, { y: 5400, w: 6400, h: 3000, io: "in", label: "the same quote",
  text: T.quote.replace(/\*/g, "").trim(), mono: true, size: 180 });
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
  const w = 4600, h = Math.round(w * D.hero.aspect);
  const proof = node("sheet", { x: TR.ox(6) + 12200, y: TR.oy(6) + 500, w, h }, trace);
  const guess = (D.traceModel && D.traceModel.rects || [])[0];
  proof.innerHTML = `<img src="${D.hero.img.src}" alt="Page ${T.page}, with the box the model returned">`;
  if (guess) {
    node("mark", { x: guess[0] * w, y: guess[1] * h, w: guess[2] * w, h: guess[3] * h },
      proof, { borderWidth: "20px", borderRadius: "14px" }).classList.add("on");
  }
  /* Captions are held to the width they actually have — 12,200 to the frame's right edge —
     and allowed to wrap inside it. `.wlabel` is nowrap globally, which is right for a
     one-word column head and wrong here: an earlier set ran off the right of the frame and
     the last line lost its last three words. Wrapping is the safety net; the strings below
     are short enough not to need it. */
  const CAP_W = (TR.pitch - 1600 - 600) - 12200;
  const caption = (t, k, colour, size) => {
    node("wlabel", null, trace, {
      left: px(TR.ox(6) + 12200), top: px(TR.oy(6) + 500 + h + 240 + k * 420),
      width: px(CAP_W), whiteSpace: "normal", lineHeight: "1.3",
      fontSize: size, letterSpacing: ".08em", color: colour,
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
    const dh = Math.round((guess[3] / T.rects[0][3]) * 10) / 10;
    caption("the model's answer", 0, "var(--warn)", "280px");
    caption(`close · ${dh}\u00d7 too tall`, 1, "var(--muted)", "230px");
  } else {
    /* No box, so the frame says only what it can still show. It used to print "the model's
       box is not in story-data.json — re-run build-assets.py", which is a note to whoever
       maintains this addressed to a room that has never seen the repository. A build
       problem belongs in the console, where the person who can fix it is looking. */
    caption("the model returned nothing", 0, "var(--warn)", "280px");
    console.warn("[trace] D.traceModel.rects is empty — station 7 is missing the model's "
      + "box. Re-run build-assets.py with AWS credentials to populate it.");
  }
}

/* One frame per station, so the camera walks the strip instead of cutting between
   hand-typed rectangles. */
const TRACE_KF = [
  ["Split", "One page. Two things come off it."],
  ["Convert", "Four things in — including the page before. Markdown out."],
  ["Extract", `One question, one call — ${FIELD_KEYS.length} of them at the same time.`],
  ["Locate", "Three ways back to the page, tried in order."],
  ["Locate · method 1", "Search the words the PDF already knows."],
  ["Locate · method 2", "No text layer: read the pixels, then search those. Same rectangle."],
  ["Locate · method 3", "Ask the model where it is — and why we don't."],
].map(([eyebrow, title], i) => {
  node("node", { x: TR.ox(i) - 600, y: TR.oy(i) - 2200, w: TR.pitch - 1600,
    h: TR.panelH + 2600 }, trace, { pointerEvents: "none" }).id = `tr-${i}`;
  return { id: `trace-${i}`, el: `#tr-${i}`, pad: .04, beats: 1, eyebrow, title, body: "" };
});

/** A link to the document's own source PDF. `pointerEvents` because most world layers
 *  are pointer-events:none, and the underline is what makes it read as a link at all on
 *  a canvas where everything is already coloured text. */
function srcLink(url, text, fontPx, colour = "var(--muted)") {
  return `<a href="${esc(url)}" target="_blank" rel="noopener"
    style="font-family:var(--mono);font-size:${fontPx}px;color:${colour};
    text-decoration:underline;text-decoration-color:var(--faint);
    text-underline-offset:.25em;pointer-events:auto">${esc(text)}</a>`;
}

/* ── what each document cost ──────────────────────────────────────────────────── */

/* A corpus total is a number nobody can feel. Ten bars, cheapest to dearest, against the
   page counts the room has already seen, is the same fact in a shape you can argue with. */
const cost = node("node", COST);
cost.id = "cost";
const COST_ROW = Math.round(COST.h / (D.docs.length + 2));
const COST_BAR = COST.w - 11500;
const maxUsd = Math.max(...D.docs.map(d => d.usd));
D.docs.forEach((d, i) => {
  const row = node("node", { x: 0, y: i * COST_ROW, w: COST.w, h: COST_ROW - 120 }, cost,
    { display: "flex", alignItems: "center", gap: "460px" });
  row.dataset.vizId = `cost-${d.stem}`;
  row.dataset.label = `${d.label}: $${d.usd.toFixed(2)} for ${d.pages} pages`;
  row.innerHTML =
    `<div style="width:6600px;white-space:nowrap;text-align:right">${
       srcLink(d.url, d.source, Math.round(COST_ROW * .32))}</div>
     <div style="width:2000px;font-family:var(--mono);font-size:${Math.round(COST_ROW * .32)}px;
       color:var(--faint);white-space:nowrap">${d.pages}p</div>
     <div style="width:${Math.round((d.usd / maxUsd) * COST_BAR)}px;
       height:${Math.round(COST_ROW * .48)}px;background:var(--accent);opacity:.72;
       border-radius:60px"></div>
     <div style="font-family:var(--mono);font-size:${Math.round(COST_ROW * .36)}px;
       color:var(--ink);white-space:nowrap">$${d.usd.toFixed(2)}</div>`;
});
node("wlabel", null, cost, {
  left: px(6600), top: px(D.docs.length * COST_ROW + 600), fontSize: "560px",
  letterSpacing: ".08em", color: "var(--ink)",
}).innerHTML = `$${D.corpus.usd} for all ${D.corpus.docs} · ${fmt(D.corpus.pages)} pages`;

/* ── appendix · the same six steps, in 2026 ───────────────────────────────────── */

/* The six steps are quoted from the `machine` scene rather than restated, so the two
   scenes cannot drift apart. Index 0 is the document itself and has no 2026 answer. */
const STEPS_2025 = [
  "The document",
  "Split · text layer + a picture of the page",
  "Convert · one page at a time",
  "Merge · one markdown document",
  "Extract · one question per field, citations required",
  "Locate · find each quote back on the page",
];

/* Which 2025 steps each 2026 answer absorbs. `rows` is inclusive, and drives both the
   bracket geometry and which left-hand rows dim, so the picture cannot disagree with
   itself when a row moves. */
/* The 2026 answers, and where their numbers come from.

 * Row 3 is measured, but NOT from this repo and not reproducibly: Nemotron Parse 2.0 was run
 * by hand against ss427-corn.pdf, six times at four dpi. The full finding — including three
 * failure modes the IoU score hides, and the dpi trap that moves the number — is written up
 * in ../../rfps-to-structured-data-with-citations/docs/one-off-experiments.md. It used to
 * live in this comment, which is how it came to be the only copy.
 *
 * Rows 1 and 2 are desk research as of 2026-09-03, not measurement: native PDF input and
 * `strict: true` structured outputs are platform features, and the claim is only that they
 * exist — which dates. Re-check before showing this in a year. Row 2 now carries the
 * qualifier it always needed: the Bedrock InvokeModel path THIS project runs on rejects
 * `strict: true`, which is exactly why evaluate.well_formed() exists. Both are true; the
 * unqualified version reads as false to anyone in the room who has used Bedrock. */
const ANSWERS_2026 = [
  { rows: [1, 3], beat: 1, k: "The platform reads the PDF",
    v: "Models take the file natively — page images and text layer paired for you. Three steps we wrote are now an upload.", c: "var(--t-teal)" },
  { rows: [4, 4], beat: 2, k: "Schema conformance is guaranteed",
    v: "Structured outputs went GA. <code>strict: true</code> does what our validator did — though not on the Bedrock path this ran on, which rejects it.", c: "var(--t-blue)" },
  { rows: [5, 5], beat: 3, k: "A layout model covers the gap",
    v: "Measured once, by hand: Nemotron Parse 2.0 boxes the chart at IoU <b style=\"color:var(--ink)\">0.94–0.98</b> — but <em>the chart</em>, not <em>a value</em>. It does not replace this step; it covers what matching and OCR cannot.", c: "var(--good)" },
];

const now26 = node("node", NOW26);
now26.id = "now26";
/* Geometry and typography are deliberately SEPARATE constants. They used to be one:
   every font-size was a fraction of the row height, so growing a row to fit its copy
   grew the copy too and the overflow came straight back. N_ROW positions things,
   N_FS sizes type, and only N_ROW may change when something does not fit. */
const N_FS = 2000;
/* Laid out ACROSS, not down. Six steps stacked vertically used 16,000 of a 29,000-unit
   scene and left the width empty, so the camera pulled back far enough to make the type
   small AND the frame mostly background. Six columns spend the width instead.
   The encoding survives the rotation: a bracket's SPAN still says how many 2025 steps
   the 2026 answer absorbs — it is a width now rather than a height. */
const N_GAP = 400;
const N_COL_W = Math.round((NOW26.w - 5 * N_GAP) / 6);
const N_PITCH = N_COL_W + N_GAP;
const N_STEP_H = 3400;
const N_BRACKET_Y = N_STEP_H + 800;
const N_ANS_Y = N_BRACKET_Y + 380;

const n26Left = STEPS_2025.map((t, i) => {
  const row = node("station", { x: i * N_PITCH, y: 0, w: N_COL_W, h: N_STEP_H }, now26,
    { alignItems: "flex-start", textAlign: "left", padding: `0 ${px(360)}`,
      transition: "opacity .5s ease, border-color .5s ease, background .5s ease" });
  row.dataset.vizId = `step2025-${i}`;
  row.dataset.label = `2025 pipeline step: ${t}`;
  row.innerHTML = `<div style="font-family:var(--mono);font-size:${Math.round(N_FS * .19)}px;
    color:var(--ink);line-height:1.3">${esc(t)}</div>`;
  return row;
});

const n26Right = ANSWERS_2026.map(a => {
  const x0 = a.rows[0] * N_PITCH;
  const w = (a.rows[1] - a.rows[0] + 1) * N_PITCH - N_GAP;
  const wrap = node("node", { x: x0, y: N_BRACKET_Y, w, h: NOW26.h - N_BRACKET_Y }, now26,
    { opacity: 0, transition: "opacity .55s ease" });
  wrap.dataset.vizId = `step2026-${a.beat}`;
  wrap.dataset.label = `2026: ${a.k}`;
  // The bracket is the encoding: its height says how many 2025 steps this one absorbs.
  node("node", { x: 0, y: 0, w, h: 90 }, wrap,
    { background: a.c, opacity: .85, borderRadius: "45px" });
  // The BRACKET height is the encoding (how many 2025 steps this absorbs); the box is
  // only its label, so it may grow past a single row without saying anything false.
  /* 8300, not 6400. The bracket's WIDTH is the encoding; the box is only its label, and
     two of the three answers absorb a single step, so their boxes are 4000 wide holding
     170 and 211 characters. At 6400 they overflowed by 900 and 1732 units and the text
     ran out of the box. The two single-step boxes cannot be widened — they are adjacent
     and would collide — so the label grows DOWN, which the vertical layout always
     allowed it to do and the rotation accidentally forbade. */
  const box = node("station", { x: 0, y: N_ANS_Y - N_BRACKET_Y, w, h: 8300 }, wrap,
    { alignItems: "flex-start", textAlign: "left", padding: `0 ${px(420)}`, borderColor: a.c });
  box.innerHTML =
    // The heading scales with the box, because the boxes are not the same width: a
    // single-step answer is 4000 wide and "Schema conformance is guaranteed" at .25 set
    // four lines of mono hard against both edges. One size fits the widest box only.
    `<div style="font-family:var(--mono);font-size:${Math.round(N_FS * (w < 6000 ? .165 : .25))}px;
       color:${a.c};letter-spacing:.04em;line-height:1.25;margin-bottom:${px(200)}">${esc(a.k)}</div>
     <div style="font-size:${Math.round(N_FS * .175)}px;color:var(--muted);line-height:1.4">${a.v}</div>`;
  return wrap;
});

/** Reveal the 2026 answers one at a time, dimming the steps each one absorbs. */
function now26Show(b) {
  n26Left.forEach((row, i) => {
    const absorbed = ANSWERS_2026.some(a => a.beat <= b && i >= a.rows[0] && i <= a.rows[1]);
    // .55, not .3: at .3 an absorbed step faded so far into the background that you could
    // not tell it had ever been a box, and "these three became one" needs the three to
    // still be legible as three. Dim is the point; gone is not.
    row.style.opacity = absorbed ? .55 : 1;
  });
  n26Right.forEach((el, i) => el.style.opacity = b >= ANSWERS_2026[i].beat ? 1 : 0);
}

/* ── appendix · a document where the answers are not text ─────────────────────── */

/* Every document in the corpus above is an RFP: the answer is always a sentence
   somewhere, and the hard part is finding which sentence. This one is the other
   failure mode, and it is the one that motivates a schema-driven parser: a crop spec
   sheet, where seventeen of the values a buyer actually wants exist ONLY as the length
   of a bar.

   Everything asserted here was measured from the file, not eyeballed:
     - the text layer is 1129 chars and contains no rating value (get_text on p1)
     - the 17 bars are `re` items all anchored at x=305.65, the "2" tick
     - mapping right edges onto the tick scale lands every one within 0.018 of an
       integer, which is why the recovered column can be shown as fact rather than
       as a guess. Re-derive with samples/crop/ if you doubt any of it. */
/* The value column is what the PIPELINE returned when this document was actually run
   through it (cache/fields/ss427-corn.json, opus-5, $0.16 for the 2-page document),
   not what I measured. The two agree on all ten values the run was asked for, which is
   the point: `ok` marks a value the run produced and that matches the geometry. The
   seven it was not asked for individually still came back inside `diseaseRatings`. */
const CROP_RATINGS = [
  ["Stalk Strength", 6], ["Root Strength", 7], ["Kernel Depth Potential", 8],
  ["Test Weight", 6], ["Early Vigor", 7], ["Drought Tolerance", 8],
  ["Greensnap", 5], ["Intactness", 7], ["Husk Cover", 6], ["Drydown", 8],
  ["GLS", 8], ["NCLB", 8], ["Physoderma", 4], ["Southern Rust", 6],
  ["Tar Spot", 6], ["Goss’", 6], ["Stalk Health", 5],
];

const crop = node("node", CROP);
crop.id = "crop";

/* The page itself, laid out at natural pixel size and scaled by transform — same rule
   as the page sprites: setting width on a big raster repaints it at world scale. */
const CROP_PAGE_W = 9200;
const cropPageWrap = node("node", { x: 0, y: 0, w: CROP_PAGE_W, h: Math.round(CROP_PAGE_W * 1210 / 935) }, crop,
  { overflow: "hidden" });
const cropPageImg = document.createElement("img");
cropPageImg.src = "assets/crop/ss427-p1.jpg";
cropPageImg.alt = "";
cropPageImg.width = 935; cropPageImg.height = 1210;
Object.assign(cropPageImg.style, {
  position: "absolute", left: "0", top: "0",
  transformOrigin: "0 0", transform: `scale(${CROP_PAGE_W / 935})`,
});
cropPageWrap.appendChild(cropPageImg);
cropPageWrap.dataset.vizId = "crop-page";
cropPageWrap.dataset.label = "Martin Seed SS-427-4 corn product profile, page 1";

/* The page image opens the real PDF. This beat's whole claim is that the values are not
   in the document's text — the fastest way to believe that is to open the document. It
   is public dealer literature; provenance and the verified hash are in
   samples/PROVENANCE.md. */
const CROP_URL = "https://www.martinseed.com/Product_profiles/2025-26_SS-427-4_TRE_Corn_Product_Profile.pdf";
const cropPageLink = document.createElement("a");
Object.assign(cropPageLink, { href: CROP_URL, target: "_blank", rel: "noopener" });
Object.assign(cropPageLink.style, { position: "absolute", inset: "0", pointerEvents: "auto", zIndex: "2" });
cropPageLink.setAttribute("aria-label", "Open the Martin Seed SS-427-4 product profile PDF");
cropPageWrap.appendChild(cropPageLink);
node("wlabel", null, crop, {
  left: "0", top: px(Math.round(CROP_PAGE_W * 1210 / 935) + 120), fontSize: px(320),
  letterSpacing: ".06em",
}).innerHTML = srcLink(CROP_URL, "martinseed.com · open the original", 320);

/* A red box over the ratings chart, in the same visual language the walkthrough uses
   for "this is the bit that matters". These fractions are the SAME clip the blow-up is
   taken from (298..500 x 366..602 of a 612x792 page), measured from the chart's own text
   extent, so the box and the enlargement cannot drift apart. */
const CROP_CLIP = { x0: 298, y0: 366, x1: 500, y1: 602 }, CROP_PT = 612;
const cropMark = node("mark solid", {
  x: Math.round(CROP_PAGE_W * CROP_CLIP.x0 / CROP_PT), y: Math.round(CROP_PAGE_W * CROP_CLIP.y0 / CROP_PT),
  w: Math.round(CROP_PAGE_W * (CROP_CLIP.x1 - CROP_CLIP.x0) / CROP_PT),
  h: Math.round(CROP_PAGE_W * (CROP_CLIP.y1 - CROP_CLIP.y0) / CROP_PT),
}, cropPageWrap, { borderWidth: "40px" });

/* The chart, blown up so the room can see that the values genuinely are not written. */
const CROP_CH_X = CROP_PAGE_W + 1400, CROP_CH_W = 6400;
const cropChartWrap = node("node", { x: CROP_CH_X, y: 600, w: CROP_CH_W, h: Math.round(CROP_CH_W * 1115 / 955) }, crop,
  { overflow: "hidden", opacity: 0, transition: "opacity .5s ease" });
const cropChartImg = document.createElement("img");
cropChartImg.src = "assets/crop/ss427-chart.jpg";
cropChartImg.alt = "";
cropChartImg.width = 955; cropChartImg.height = 1115;
Object.assign(cropChartImg.style, {
  position: "absolute", left: "0", top: "0",
  transformOrigin: "0 0", transform: `scale(${CROP_CH_W / 955})`,
});
cropChartWrap.appendChild(cropChartImg);

/* Two columns of the same seventeen traits: what the text layer hands you, and what
   measuring the bars hands you. The blank column IS the argument. */
const CROP_T_X = CROP_CH_X + CROP_CH_W + 1400, CROP_T_W = CROP.w - CROP_T_X;
const cropTable = node("node", { x: CROP_T_X, y: 0, w: CROP_T_W, h: CROP.h }, crop,
  { opacity: 0, transition: "opacity .5s ease" });
const CR_ROW = 950;   // fixed: type size must not follow the region's height
// "measurements it returned", not "trait": the three sheets beside this one head their
// tables with the extractor's own vocabulary, and this scene heading the same table with
// a different word made it look like a different method rather than the same one.
// .40, not .52: the column heads sit on one line and the value head starts at 60% of the
// table's width, so "measurements it returned" at the old size ran straight through it.
node("wlabel", null, cropTable, { left: "0", top: "0", fontSize: px(Math.round(CR_ROW * .40)),
  color: "var(--accent)" }).textContent = "measurements it returned";
const cropValHead = node("wlabel", null, cropTable,
  { left: px(Math.round(CROP_T_W * .60)), top: "0", fontSize: px(Math.round(CR_ROW * .40)) });
cropValHead.textContent = "text layer";   // becomes "discovered" once the run lands
const cropCells = CROP_RATINGS.map(([name, v], i) => {
  const row = node("node", { x: 0, y: Math.round(CR_ROW * 1.5) + i * CR_ROW, w: CROP_T_W, h: CR_ROW - 60 }, cropTable,
    { display: "flex", alignItems: "center" });
  row.dataset.vizId = `crop-${name.replace(/\W+/g, "-").toLowerCase()}`;
  row.dataset.label = `${name}: rated ${v} on the drawn axis (which runs 2-10, though the printed legend says 1-9), recoverable only from the bar`;
  row.innerHTML =
    `<div style="width:${px(Math.round(CROP_T_W * .60))};font-family:var(--mono);
       font-size:${Math.round(CR_ROW * .48)}px;color:var(--muted);white-space:nowrap">${esc(name)}</div>
     <div class="cv" style="font-family:var(--mono);font-size:${Math.round(CR_ROW * .62)}px;
       color:var(--faint)">—</div>`;
  return row.querySelector(".cv");
});

/* The sheet contradicts itself and the extraction pass caught it unprompted: the printed
   legend reads "1=Poor, 9=Excellent" while the axis actually drawn runs 2 to 10, so a bar
   may sit one off the stated scale. That is why the beat says "an axis the legend
   contradicts" and why nothing here quotes a rating as "N of 9" — see
   cache/open/ss427-corn.json .catalogue.scaleNote, which is the model's own wording. */

/* No schema. The keys below are the model's own, chosen from the document's wording in
   a discovery pass that was shown no target shape (src/extract_open.py, two calls,
   $0.124). A second pass then filled them into open maps, so a soybean sheet rating
   Sudden Death Syndrome needs no code change. Numbers from cache/open/ss427-corn.json;
   all 17 bar values match the geometry.

   The soybean half of that sentence was an untested assertion until 2026-09-07, when it
   was run: cache/open/martin-seed-m355xf-soybean.json. It found SDS, SCN, PPR, BSR,
   FROGEYE and WHITE MOLD, and no corn field at all. The shape inverted too — 23 attributes
   and 1 measurement, against corn's 12 and 18, because this sheet prints its ratings as
   words where the corn sheet draws them as bars. Replays free from the cache. */
const CROP_OPEN = { attrs: 12, measures: 18, printed: 1, graphical: 17, usd: "0.124" };

// Both panels sit BELOW the page image, and .station centres its content without
// clipping it — so the height has to fit the copy, not the other way round.
const CROP_PANEL_TOP = Math.round(CROP_PAGE_W * 1210 / 935) + 500, CROP_PANEL_H = 4800;

const cropSchema = node("station", { x: 0, y: CROP_PANEL_TOP, w: CROP_PAGE_W + 1400 + CROP_CH_W, h: CROP_PANEL_H }, crop,
  { opacity: 0, transition: "opacity .5s ease", alignItems: "flex-start", textAlign: "left",
    padding: `0 ${px(520)}`, borderColor: "var(--t-violet)" });
cropSchema.dataset.vizId = "crop-discovered";
cropSchema.dataset.label = "The keys were discovered, not declared";
/* Two lines, not a paragraph.
 *
 * This panel used to run to about ninety words and it was skipped — which cost the scene
 * the one thing a room actually asks here, and asks in exactly these words: "so did you
 * tell it to go and get the traits?" No. Nothing in this repository has ever heard of
 * Goss' Wilt. The long version, for whoever is presenting:
 *
 *   Pass 1 (discover) is given the document and one open question — what does this
 *   document OFFER — with no target schema, told to use the page's own wording and not to
 *   skip a key because its value looks hard to read. Pass 2 (extract) fills in exactly the
 *   keys pass 1 chose, into `additionalProperties` maps, so no code knows their names. The
 *   split is deliberate: one call doing both quietly drops a trait it cannot read, because
 *   the key simply never appears and nothing looks missing.
 *
 * And the answer to the second half of the question, which is the line that is now on
 * screen: NEITHER pass sees the picture. Both are handed markdown. The bars became numbers
 * one stage earlier, in conversion — the step that IS given the page image and told to
 * trust it over the text layer — which wrote `*Horizontal bar chart rating traits on a
 * scale from 2 to 10 (1=Poor, 9=Excellent):*` and then a seventeen-row table. That is also
 * why the citation panel below says what it says. */
cropSchema.innerHTML =
  `<div style="font-family:var(--mono);font-size:${Math.round(CR_ROW * .5)}px;color:var(--t-violet);
     letter-spacing:.04em;margin-bottom:${px(180)}">nobody told it what to look for</div>
   <div style="font-size:${Math.round(CR_ROW * .58)}px;color:var(--ink);line-height:1.3;
     font-weight:700;margin-bottom:${px(200)}">It asked the page what it had, and the page said
     ${CROP_OPEN.attrs} attributes and ${CROP_OPEN.measures} measurements.</div>
   <div style="font-size:${Math.round(CR_ROW * .44)}px;color:var(--muted);line-height:1.4">
     The bars were already numbers by then — conversion read them off the picture, one step back.</div>`;

/* WHAT THE RUN ACTUALLY EXPOSED, and it is not the thing I expected.
   Citations located: 5/6 on text fields, 2/9 on chart fields. The failures are not
   "charts cannot be verified" — they are that the model quotes the MARKDOWN the
   conversion stage produced ("| Goss' | 6 |"), while the locate pass searches the PDF.
   For prose those coincide; for anything the converter turns into a table they cannot.
   relativeMaturity failed the same way even though "112" IS in the PDF text layer, and
   the only two chart citations that DID locate are the two quoting the one piece of
   printed chart text, "1=Poor, 9=Excellent". So the boundary is "did conversion
   restructure this", not "is it a chart". */
const CROP_CITES = { textFound: 5, textTotal: 6, chartFound: 2, chartTotal: 9 };

const cropCite = node("station", { x: 0, y: CROP_PANEL_TOP + CROP_PANEL_H + 500, w: CROP_PAGE_W + 1400 + CROP_CH_W, h: CROP_PANEL_H }, crop,
  { opacity: 0, transition: "opacity .5s ease", alignItems: "flex-start", textAlign: "left",
    padding: `0 ${px(520)}`, borderColor: "var(--warn)" });
cropCite.dataset.vizId = "crop-citations";
cropCite.dataset.label = "The values are right and the evidence check cannot confirm them";
/* "a separate fixed-schema run" is load-bearing and was briefly cut from this kicker in
   the name of fewer words, which left the panel implying that the open two-pass method
   above it produces citations. It does not. EXTRACT_SCHEMA in extract_open.py is
   documentType / subject / attributes / measurements / scale — there is no evidence field
   anywhere on that path and nothing on it draws a box. These numbers come from
   cache/fields/ss427-corn.json, the ordinary fixed-key extractor run over the same sheet,
   which does emit verbatim_quote. 7 of its 15 citations located; 2 of the 9 chart ones.

   The full finding, worth having in the room's head and not on its screen: the boundary is
   not "is it a chart", it is "did conversion restructure this". relativeMaturity failed
   identically and "112" IS in the text layer, while the only two chart citations that DID
   locate are the two quoting the one piece of printed chart text, "1=Poor, 9=Excellent". */
cropCite.innerHTML =
  `<div style="font-family:var(--mono);font-size:${Math.round(CR_ROW * .5)}px;color:var(--warn);
     letter-spacing:.04em;margin-bottom:${px(180)}">a separate fixed-schema run · ${CROP_CITES.chartFound} of ${CROP_CITES.chartTotal} chart citations located</div>
   <div style="font-size:${Math.round(CR_ROW * .58)}px;color:var(--ink);line-height:1.3;
     font-weight:700;margin-bottom:${px(200)}">The quote it gives for a bar is
     <span style="font-family:var(--mono)">| Goss’ | 6 |</span>.</div>
   <div style="font-size:${Math.round(CR_ROW * .44)}px;color:var(--muted);line-height:1.4">
     A row of the markdown we wrote from the picture. True, and nowhere in the PDF.</div>`;

/** Reveal: page → chart → the empty column → the recovered column → the schema. */
function cropShow(b) {
  cropMark.classList.toggle("on", b >= 1);
  cropChartWrap.style.opacity = b >= 1 ? 1 : 0;
  cropTable.style.opacity = b >= 2 ? 1 : 0;
  cropValHead.textContent = b >= 3 ? "read off the bar" : "text layer";
  cropCells.forEach((cell, i) => {
    cell.textContent = b >= 3 ? String(CROP_RATINGS[i][1]) : "—";
    cell.style.color = b >= 3 ? "var(--good)" : "var(--faint)";
  });
  cropSchema.style.opacity = b >= 4 ? 1 : 0;
  cropCite.style.opacity = b >= 5 ? 1 : 0;
}

/* ── harder documents: a wall of four, and a scene behind each ─────────────────
 *
 * SS-427 made one argument very well — a value that exists only as the length of a bar —
 * and for a while it made it alone, which quietly implied that a chart is THE hard case.
 * It is one of them. Three more were already sitting in samples/crop/ having been through
 * open extraction months ago, and the four of them fail in four different places:
 *
 *   SS-427     17 of 18 measurements are bar lengths, and it read every one.
 *   Armor      5 of 7 are bar lengths on an axis with no numbers, and it read NONE —
 *              it returned null rather than guess, which is the prompt working.
 *   DEKALB     nothing is a picture; all 15 measurements still came back null, because
 *              the table is eight hybrids wide and every column header is rotated 90°.
 *   M355-XF    a different crop. 23 attributes, no corn field, no code change.
 *
 * So this is an index, not a strip: four cards, each opening a scene of its own. The
 * per-document numbers all come off `D.crops`, which build-assets derives from cache/open/
 * — including the null counts, which are the sharpest thing on any of these pages and the
 * one I would otherwise have been tempted to describe rather than count. */

/* The editorial half — what to CALL each failure — is here rather than derived, because
 * it is a judgement about which of several true things is the point. Keyed by the stem
 * build-assets emits, so a sheet added there without a line here fails loudly. */
const CROP_DOCS = {
  "martin-seed-ss427-4-corn": { kf: "crop", name: "Martin Seed SS-427-4",
    short: "the value is a bar length" },
  "armor-1575-corn": { kf: "crop-armor", name: "Armor Seed 1575",
    short: "no numbers on the axis" },
  "dekalb-2021-corn-agronomic-ratings-p13": { kf: "crop-dekalb", name: "DEKALB 2021 ratings",
    short: "every header turned sideways" },
  "martin-seed-m355xf-soybean": { kf: "crop-soy", name: "Martin Seed M355-XF",
    short: "a different crop entirely" },
};

const crophub = node("node", CROP2);
crophub.id = "crophub";
let crophubShow;
{
  // Equal HEIGHT, not equal width: one of the four is landscape, and a shared width would
  // have stood a squat sheet beside three tall ones. Widths follow each page's own aspect.
  const H = 6800, GAP = 1200;
  const W = D.crops.map(c => Math.round(H * c.img.w / c.img.h));
  const total = W.reduce((a, b) => a + b, 0) + GAP * (D.crops.length - 1);
  let x = Math.round((CROP2.w - total) / 2);
  D.crops.forEach((c, i) => {
    const doc = CROP_DOCS[c.stem];
    const w = W[i], left = x;
    x += w + GAP;
    const card = node("node", { x: left, y: 0, w, h: H + 4200 }, crophub,
      { pointerEvents: "auto", cursor: "pointer" });
    card.dataset.vizId = `crophub-${c.stem}`;
    card.dataset.label = `Open ${c.subject} — ${doc.short}`;
    const sheet = node("sheet", { x: 0, y: 0, w, h: H }, card,
      { transition: "box-shadow .25s ease" });
    sheet.innerHTML = `<img src="${c.img.src}" alt="${esc(c.subject)}, page 1">`;
    const cap = node("wlabel", null, card, {
      left: "0", top: px(H + 300), width: px(w), fontSize: "300px",
      letterSpacing: ".1em", color: "var(--t-blue)", whiteSpace: "normal", lineHeight: "1.3",
    });
    cap.textContent = doc.short;
    // Held to the sheet's own width and allowed to wrap. At nowrap these ran straight
    // through the caption of the card to the right.
    const nums = node("wlabel", null, card, {
      left: "0", top: px(H + 900), width: px(w), fontSize: "250px",
      letterSpacing: ".08em", color: "var(--faint)", whiteSpace: "normal", lineHeight: "1.35",
    });
    nums.textContent = `${c.attributes} attributes · ${c.measurements} measurements`;
    nums.style.fontSize = "230px";   // 250 wrapped the narrowest card onto two lines
    const go = node("wlabel", null, card, {
      left: "0", top: px(H + 1900), width: px(w), fontSize: "280px",
      letterSpacing: ".16em", color: "var(--accent)",
    });
    go.textContent = "open →";
    card.addEventListener("click", () => pinTo(doc.kf, true));
    card.addEventListener("pointerenter", () => {
      sheet.style.boxShadow = "0 0 0 90px var(--accent), 0 60px 160px rgba(0,0,0,.55)";
    });
    card.addEventListener("pointerleave", () => { sheet.style.boxShadow = ""; });
  });

  /* The method, said once, at the top of the appendix that uses it.
   *
   * Four scenes hung off this wall showing the same two tables before anything on screen
   * said WHY there are two tables, and the question that produced this panel is the one a
   * room actually asks: "so did you tell it to go and get the traits?" No. Nothing here
   * has heard of Goss' Wilt.
   *
   * The third line is the one to be careful with. It is tempting to leave off, because the
   * appendix reads better without a caveat in it — and leaving it off would let the four
   * scenes below imply that this method produces the red boxes the rest of the piece spent
   * twenty scenes on. It does not. `EXTRACT_SCHEMA` has no evidence field; nothing on this
   * path draws a box. The citation numbers on the SS-427 scene come from the ordinary
   * fixed-key extractor run over the same sheet, and that panel says so. */
  const method = node("station", { x: 0, y: 12200, w: CROP2.w, h: 4600 }, crophub,
    { opacity: 0, transition: "opacity .5s ease", alignItems: "flex-start",
      textAlign: "left", padding: `0 ${px(700)}`, borderColor: "var(--t-violet)" });
  method.dataset.vizId = "crophub-method";
  method.dataset.label = "How these four are extracted without a schema";
  method.innerHTML =
    `<div style="font-family:var(--mono);font-size:460px;color:var(--t-violet);
       letter-spacing:.04em;margin-bottom:240px">no two of these are the same shape</div>
     <div style="font-size:560px;font-weight:700;color:var(--ink);line-height:1.3;
       margin-bottom:240px">One pass asks the document what it has. A second asks for those values.</div>
     <div style="font-size:400px;color:var(--muted);line-height:1.45">
       The keys come back in the page's own words — Goss’ Wilt, SCN race, Gibberella ear rot —
       and nothing in this pipeline has heard of any of them.</div>
     <div style="font-size:360px;color:var(--warn);line-height:1.45;margin-top:200px">
       There is no third pass. Nothing on this path draws a box.</div>`;
  crophubShow = b => { method.style.opacity = b >= 1 ? 1 : 0; };
  crophubShow(0);
}

/* ── one scene per document, built from its own run ────────────────────────────
 *
 * The same shape four times: the page, what the extractor named, what it actually
 * returned, and the scale it found — because the comparison only works if the four are
 * drawn identically. SS-427 keeps its own bespoke scene above (it has the chart blow-up,
 * the red box and the citation finding, none of which generalise); these three get this.
 *
 * The measurement table is the payload. A null there is not missing data — PROMPT_HEAD
 * tells the model a confidently wrong value is worse than none — so a column of dashes is
 * the extractor declining, in public, on a page whose numbers it could not read. */
const CROP_D = { w: 30000, h: 22000 };
CROP_D.x = MID - CROP_D.w / 2;
const cropDetail = {};
D.crops.filter(c => CROP_DOCS[c.stem].kf !== "crop").forEach((c, n) => {
  const doc = CROP_DOCS[c.stem];
  const box = { ...CROP_D, y: 242000 + n * 24000 };
  const scene = node("node", box);
  scene.id = doc.kf;

  // Height-led, then capped: the landscape sheet at a shared height came out 17,000 wide
  // and left no room for the tables the scene exists to show.
  const pw = Math.min(14000, Math.round(11000 * c.img.w / c.img.h));
  const ph = Math.round(pw * c.img.h / c.img.w);
  const sheet = node("sheet", { x: 0, y: 0, w: pw, h: ph }, scene);
  sheet.innerHTML = `<img src="${c.img.src}" alt="${esc(c.subject)}, page 1">`;
  sheet.dataset.vizId = `${doc.kf}-page`;
  sheet.dataset.label = `${c.subject} — ${c.docType}`;
  node("wlabel", null, scene, {
    left: "0", top: px(ph + 260), width: px(pw), textTransform: "none",
    whiteSpace: "normal",
  }).innerHTML = c.url
    ? srcLink(c.url, new URL(c.url).hostname.replace(/^www\./, "") + " · open the original", 300)
    : "";

  const TX = pw + 1800, TW = CROP_D.w - TX, ROW = 720;
  /** A key/value table that reveals as a block. `dash` renders a null as the extractor
   *  declining rather than as a blank nobody can tell from an unset row. */
  const table = (y, rows, head, dash) => {
    const el = node("node", { x: TX, y, w: TW, h: rows.length * ROW + ROW * 2 }, scene,
      { opacity: 0, transition: "opacity .5s ease" });
    node("wlabel", null, el, { left: "0", top: "0", fontSize: px(Math.round(ROW * .52)),
      color: "var(--accent)" }).textContent = head;
    rows.forEach(([k, v], i) => {
      const row = node("node", { x: 0, y: Math.round(ROW * 1.5) + i * ROW, w: TW, h: ROW - 40 },
        el, { display: "flex", alignItems: "center", gap: px(400) });
      row.innerHTML =
        `<div style="width:52%;font-family:var(--mono);font-size:${Math.round(ROW * .46)}px;
           color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(k)}</div>
         <div style="flex:1;font-family:var(--mono);font-size:${Math.round(ROW * .46)}px;
           color:${v == null ? "var(--faint)" : "var(--ink)"};white-space:nowrap;
           overflow:hidden;text-overflow:ellipsis">${v == null ? dash : esc(short(v, 44))}</div>`;
    });
    return el;
  };

  // Eight of each at most. These tables are evidence that the run named real things in the
  // page's own words, not a data dump — DEKALB's 11 attributes are whole columns of a
  // table flattened into one string each, and four of those fill the frame on their own.
  const attrs = table(0, c.attrRows.slice(0, 8), "attributes it named", "—");
  const meas = table(Math.round(ROW * 1.5) + 9 * ROW,
    c.measRows.slice(0, 8), "measurements it returned", "declined");

  /* Full width, under both columns. In a `pw`-wide column beside the page it was a
     30-line ribbon of text that started level with the source link and ran off the bottom
     of the frame; the note is a paragraph and wants a paragraph's shape. 16,200 clears the
     taller of the two tables. */
  const panel = node("station", { x: 0, y: 16200, w: CROP_D.w, h: 5600 }, scene,
    { opacity: 0, transition: "opacity .5s ease", alignItems: "flex-start",
      textAlign: "left", padding: `0 ${px(560)}`, borderColor: "var(--t-violet)" });
  panel.dataset.vizId = `${doc.kf}-scale`;
  // Truncated on screen, whole in the label: DEKALB's note is 700 characters and ends by
  // reciting every hybrid's rating, which is fascinating and is not a thing anyone reads
  // off a wall. The full text stays available to anything inspecting the canvas.
  panel.dataset.label = c.scaleNote;
  panel.innerHTML =
    `<div style="font-family:var(--mono);font-size:440px;color:var(--t-violet);
       letter-spacing:.04em;margin-bottom:220px">the scale, in its own words</div>
     <div style="font-size:400px;color:var(--muted);line-height:1.45">${esc(short(c.scaleNote, 260))}</div>`;

  cropDetail[doc.kf] = b => {
    attrs.style.opacity = b >= 1 ? 1 : 0;
    meas.style.opacity = b >= 2 ? 1 : 0;
    panel.style.opacity = b >= 3 ? 1 : 0;
  };
});

// Where the reader has got to at each beat. Page 1 alone carries ten of the fifteen,
// and the last fourteen pages carry nothing — which is the point, and is only visible
// if the beats stop where the citations actually are.
const READ_STOPS = [0, 1, 4, 8, D.hero.pages];
/* How many rows the record actually gains at a stop. Counted, not written down: these
   captions said "Two more" where the screen filled one, because pages 3 and 4 both cite
   only `scope`. A number typed next to a number the code computes will drift from it. */
const gained = b => ["No", "One", "Two", "Three", "Four", "Five"][
  fieldsBy(READ_STOPS[b]).size - fieldsBy(READ_STOPS[b - 1]).size] ?? "More";
let humanBeat = 0;

/* ═══════════════════════════════════════════════════════════════════════════════
   KEYFRAMES — each names an element to frame, how many beats it holds, and what the
   narration says. `body` may be a function of the beat index, in which case the
   narration is re-rendered on every press: a stepper whose caption never changes is
   a stepper you stop trusting.
   ═══════════════════════════════════════════════════════════════════════════════ */


const KF = [
  {
    /* Scene one is the preamble, and it exists because the piece used to open on the
       problem — which assumes a room that already knows what an RFP is, already knows
       this is not on their roadmap, and already knows it was built in early 2025 on the
       models of early 2025. The talk this came from said all of that before its first
       slide. The viz said none of it.

       "Early 2025" is the ORIGINAL POC, February 2025 — not the delivery that followed.
       Billed work ran 19 May to 25 November 2025, and dating the method from those
       records was wrong: they capture the implementation, after months of the client
       deciding whether to proceed. A billing record cannot see a POC. The month is off
       screen because it has one source; both sources agree on early 2025, so that is
       what the copy claims. Identifiers and the full dating are in the private ledger. */
    id: "preamble", el: "#preamble", pad: .05, beats: 4,
    eyebrow: "Before any of this",
    title: b => [
      "This is not on your roadmap.",
      "An RFP: someone says what they need, and vendors bid.",
      "It was built in early 2025, on the models of early 2025.",
      "If you leave with one thought, make it this.",
    ][b],
    body: "",
    // preShow(0), not preShow(-1): enter() runs after on(), so hiding everything here
    // left the scene blank on arrival. Same shape as the crop scene.
    enter() { preShow(0); },
    on(b) { preShow(b); },
  },
  {
    /* The cold open, and the only scene on this canvas that stands entirely on its own.
       Somebody who saw this and nothing else would still know what the problem is. Four
       beats: what arrives, where it has to end up, what is between them today, and the
       promise that the rest of the piece closes that gap. */
    id: "summary", el: "#summary", pad: .05, beats: 4,
    eyebrow: "Start line, finish line",
    title: b => [
      "This is what arrives.",
      "This is where it has to end up.",
      "Today, the only thing in between is a person reading.",
      "The rest of this is how we close that gap.",
    ][b],
    body: "",
    on(b) { sumShow(b); },
  },
  {
    /* The piece opened on the pile for a long time, and that buried the lead: a pile of
       PDFs is not a problem anybody has. An inbox full of links, on a Monday, is. */
    id: "inbox", el: "#mailBox", pad: .06, beats: 1,
    eyebrow: "Where the work arrives",
    title: "It starts as email.",
    // Senders and links are the real ones, from samples/PROVENANCE.md.
    body: "",
    enter() { arrow.style.opacity = 0; card.style.opacity = 0; pilePick(false); },
  },
  {
    id: "fetch", el: "#fetchBox", pad: .10, beats: 1,
    eyebrow: "Out of scope",
    title: "Automated retrieval collects the document.",
    // There is a real scraper. It is drawn as a step you are asked to take on trust,
    // because that is what it is here — and nothing after this point is.
    body: "",
  },
  {
    // No body. The title is the whole claim and the pile is the evidence; anything
    // more is a paragraph the room reads instead of listening to the person talking.
    id: "problem", el: "#introPile", pad: .04, beats: 1,
    eyebrow: "What comes out the other end",
    title: "Everyone sends paper. Nobody sends the same paper.",
    body: "",
    enter() { arrow.style.opacity = 0; card.style.opacity = 0; pilePick(false); },
  },
  {
    // Scoped to the pile and the record, not to `#intro` — the intro is the whole
    // five-link chain now, and framing all of it puts this shot two screens out.
    id: "need", el: "#chainCore", pad: .03, beats: 2,
    eyebrow: "What the business actually wants",
    // "Identical every time" was falsified by the page's own corpus table, which shows
    // providence at 20 — it was additionally run with the four image-only VISUAL_FIELDS
    // and castMarkings. The 15 really are asked of every document; they are just not the
    // whole of what one document was asked. The wording now says only the true half.
    title: `${FIELD_KEYS.length} fields, the same for every document.`,
    body: "",
    enter() { arrow.style.opacity = 1; card.style.opacity = 1; },
    on(b) { pilePick(b >= 1); },
  },
  {
    /* This used to be preceded by a `line` scene that framed the top half of page 1 to
       light one citation box. Cut: the flight into it crossed the pile's own caption at
       reading size and landed at ~40x, so the room read a slab of legalese, and the
       very next scene pulled straight back out of it again. The dive now lands on the
       page, which is the smallest thing that is still recognisably a document. */
    id: "page", el: "#heroSheet", pad: .16, beats: 1,
    eyebrow: "So: one of them",
    title: "Page 1 of a Request for Proposals.",
    enter() { panel.style.opacity = panelBack.style.opacity = 0; heroMarks.forEach(m => m.el.classList.remove("on")); },
    body: "",
  },
  {
    // Scoped to this panel: `.callout` is a bare document-wide selector, and the gallery
    // panel's rows are callouts too — framing all of them pulled this shot 30,000 units
    // out to include a scene that hasn't happened yet.
    id: "answers", el: "#docBlock", fit: ["#heroSheet", "#heroPanel .callout"], pad: .1,
    beats: D.hero.marks.length,
    eyebrow: "What a bidder actually needs",
    title: `${D.hero.marks.length} of the ${FIELD_KEYS.length} columns are on this one page.`,
    // One press, one field — and the field and its value are already in the panel, at
    // reading size. Saying them again in the card was the same sentence twice.
    body: "",
    enter() { panel.style.opacity = panelBack.style.opacity = 1; },
    on(b) {
      // heroMarks.i indexes the FIELD, not the rect — a field with two cited spans
      // lights both at once, in step with its one answer row.
      heroMarks.forEach(m => m.el.classList.toggle("on", m.i <= b));
      panelRows.forEach((r, i) => r.classList.toggle("on", i <= b));
    },
  },
  {
    /* Two beats, not three. The middle one lit the cited pages without dimming the
       rest, so the finding — six of twenty-two — had to be counted off a grid where
       everything was equally bright. Ringing and dimming are one moment. */
    id: "doc", el: "#docBlock", pad: .1, beats: 2,
    eyebrow: "Pull back again",
    title: `That page is one of ${D.hero.pages}.`,
    body: "",
    enter() {
      panel.style.opacity = panelBack.style.opacity = 0;
      heroMarks.forEach(m => m.el.classList.add("on"));
    },
    on(b) {
      docCap(b >= 1);
      heroCells.forEach((c, i) => {
        c.classList.add("seen");
        c.classList.toggle("hit", b >= 1 && heroCited.has(i + 1));
      });
      heroPageMarks.forEach(m => m.classList.toggle("on", b >= 1));
      gridWrap.classList.toggle("spotlight", b >= 1);
    },
  },
  {
    id: "gallery", el: "#gallery", pad: .07, beats: 2,
    eyebrow: "Now the others",
    title: "Ten real solicitations. No two alike.",
    body: "",
    enter() {
      gridWrap.classList.remove("spotlight");
      panel.style.opacity = panelBack.style.opacity = 0;
      galPanelOff();
    },
    on(b) {
      galItems.forEach(g => {
        g.stack.style.opacity = b >= 1 ? 1 : 0;
        g.pp.style.opacity = b >= 1 ? 1 : 0;
        g.marks.forEach(m => m.classList.remove("on"));
      });
    },
  },
  SAME_FACT,
  {
    id: "corpus", el: "#corpusFrame", pad: .03, beats: 1,
    eyebrow: "All of it at once",
    // The headline in the world says the size now, so the card says the consequence,
    // which is the thing the picture cannot say and the next two scenes are about.
    title: "Somebody has to read all of it.",
    body: "",
    // Word counts come from the pipeline's own extracted text, not estimated from
    // page counts. Reading time at 238 wpm (Brysbaert 2019).
    enter() {
      gridWrap.classList.remove("spotlight");
      heroCells.forEach(c => c.classList.remove("hit"));
      galItems.forEach(g => g.marks.forEach(m => m.classList.add("on")));
      galPanelOff();   // it sits outside the corpus frame, and this shot is the corpus
    },
  },
  {
    /* Two beats. The middle one lit the cited pages without dimming the rest, which is
       the same non-moment it was on the hero document. */
    id: "monster", el: "#monScene", pad: .04, beats: 2,
    eyebrow: "The worst one",
    title: "Twenty facts, somewhere in there.",
    body: "",
    on(b) {
      monCap(b >= 1);
      monCells.forEach((c, i) => {
        c.classList.add("seen");
        c.classList.toggle("hit", b >= 1 && monCited.has(i + 1));
      });
      monBlock.classList.toggle("spotlight", b >= 1);
    },
  },
  {
    /* Beat titles, not beat paragraphs: the six-step correspondence survives as the
       name of what is happening on screen while it happens. */
    id: "human", el: "#bench", pad: .04, beats: READ_STOPS.length,
    eyebrow: "What a person does",
    title: b => [
      "Open it. Twenty-two pages.",
      `Page 1 gives up ${D.hero.citedPages["1"].length} of the ${FIELD_KEYS.length}.`,
      `Keep reading. ${gained(2)} more.`,
      `Keep reading. ${gained(3)} more.`,
      "Three of them were never in the document.",
    ][b],
    // Reading rate is Brysbaert 2019: 190 studies, 18,573 participants.
    body: "",
    enter() { line.style.opacity = 0; benchGrid.wrap.style.opacity = 1; benchBadge("human");
      benchNote.textContent = ""; },
    on(b) {
      humanBeat = b;
      const n = READ_STOPS[b], last = b === READ_STOPS.length - 1;
      benchPages({ read: n, cited: true });
      benchFill(fieldsBy(n), last);
      benchMode.textContent = n
        ? `Reading · page ${n} of ${D.hero.pages}` : "Reading · not started";
      benchTime.textContent = clockText(wordsTo(n) / WPM);
    },
  },
  {
    /* Checked against the source, with departures — and one of them is load-bearing.
     *
     * 1. Extract. This repo's extract stage defaults to all-at-once (one call, whole
     *    document) with per-field fan-out as a second mode (`extract_per_field.py`).
     *    The system this describes fanned out per field, so that is what is on screen.
     *
     * 2. Convert — READ THIS BEFORE TRUSTING BEAT 2. The real system converts pages
     *    IN ORDER, handing each page the previous page's markdown plus a running table
     *    of contents, because tables and clauses straddle page breaks — the previous
     *    page's markdown and the running TOC are both inputs to the per-page signature
     *    there. That data dependency makes parallel conversion impossible by
     *    construction.
     *
     *    This rebuild had lost that, which is why this scene could claim "all 22 at
     *    once, eight in flight" — the most impressive number in the piece was an
     *    artefact of a missing feature. `src/doc_to_markdown.py` now carries the
     *    context and converts in order by default, with the parallel path kept behind
     *    `carry_context=False`.
     *
     *    The clock and the cost on screen were measured on the OLD parallel run, so
     *    they are still internally consistent with each other and no longer describe
     *    the default path. Re-run the corpus and rebuild the assets before showing this
     *    to anyone who will ask how long conversion takes.
     *
     * 3. Locate is accurate as drawn — exact match, then OCR, model tier switched off —
     *    but be careful how it is INTRODUCED to a room. The production system does not
     *    do this. It produces per-field prose reasons ("the address is at the bottom of
     *    page 1 as ..."), not verbatim quotes resolved to rectangles; resolving a quote
     *    to a bounding box was on its backlog and never built. So these stations are a
     *    proposal that was implemented and measured HERE — which is a good story, and a
     *    different one from "this is what the system does". Say the former.
     *
     * 4. Extract fan-out, on second look, is MORE faithful than the note above implied:
     *    production runs one prediction per question signature as its own task, each
     *    against the same merged markdown. Per-field fan-out is right.
     *
     * 5. Cosmetic: the real page marker there is `*Page N of TOTAL*`, not the
     *    `<<<PAGE N>>>` shown at stations 3 and 4.
     *    What is on screen is this repo's real output, so it stays. */
    id: "machine", el: "#bench", pad: .04, beats: 6,
    eyebrow: "What the pipeline does",
    title: b => [
      "Same document. Same fifteen fields.",
      "Every page becomes two things.",
      `All ${D.hero.pages} pages, in order. Each sees the one before.`,
      `${D.hero.pages} answers become one document.`,
      `${FIELD_KEYS.length} questions, at the same instant.`,
      "Every answer had to cite the page.",
    ][b],
    body: "",
    /* PRESENTER NOTE, since it is no longer on screen: the clock is measured
       (${D.throughput.basis}) but on the parallel path, before pages carried context.
       Carrying context serialises conversion and that has NOT been re-measured — expect
       minutes, not seconds. Extraction and locate are not in the number either. */
    enter() { line.style.opacity = 1; benchGrid.wrap.style.opacity = 0; benchBadge("machine"); },
    on(b) {
      // The hero is NOT guaranteed to be in `runs`. build-assets.py only counts a run
      // as a clean parallel burst if it averaged under 2s/page, and re-converting the
      // hero with carry-context — in order, ~20s a page — drops it straight out of the
      // list. This was an unguarded .find().seconds, so the day that happened the scene
      // threw on every beat and the whole thing sat there unanimated. Fall back to the
      // corpus's own measured rate, which is the same number this clock always meant.
      const run = D.throughput.runs.find(r => r.stem === D.hero.stem);
      const secs = run ? run.seconds
                       : D.hero.pages / D.throughput.pagesPerMin * 60;
      lineShow(b);
      benchFill(b >= 4 ? new Set(FIELD_KEYS) : new Set(), b >= 5);
      benchTime.textContent = clockText(b >= 2 ? secs / 60 : 0);
      // Say where the number came from rather than letting it imply a runtime for the
      // ordered path, which has not been measured. Removing the qualifier is a
      // re-measurement away, not a wording change.
      // The clock covers CONVERSION and nothing else, so from the merge beat on it stops
      // being a running total and starts being a figure that happens to still be on
      // screen. Saying so is the difference between a stalled timer and a scoped one:
      // extract and locate have never been measured.
      benchNote.textContent = b >= 4
        ? "conversion only — extract and locate are not in this number"
        : b >= 2 ? "conversion time measured on the parallel path" : "";
      // No dpi anywhere. The render resolution is an implementation detail of a step
      // whose point is "a picture of the page", and every mention of it was a number
      // the room had to park somewhere to keep following the sentence.
      benchMode.textContent = [
        "The document",
        "Split · text layer + a picture of the page",
        "Convert · one page at a time",
        "Merge · one markdown document",
        "Extract · one question per field, citations required",
        "Locate · find each quote back on the page",
      ][b];
    },
  },
  ...TRACE_KF,
  {
    id: "live", el: "#liveWall", pad: .04, beats: 1,
    eyebrow: "Live, right now",
    title: "Every value lands somewhere you can click, and traces back to its page.",
    body: "",
    enter() { nudgeLive(); setTimeout(nudgeLive, 900); },
  },
  {
    /* The last stop on the rail, and the reason the three scenes after it are not stops
       at all. They are unrelated single-scene detours, and running the rail straight
       through them meant the final flight of the piece set you down inside one with no
       idea why you were there — a bar chart of ten documents arriving unannounced after
       the live surfaces reads as a bug, not an appendix. */
    id: "appendix", el: "#appendix", pad: .06, beats: 1,
    eyebrow: "Appendix",
    title: "Three things we did not get to.",
    body: "",
  },
  {
    id: "cost", el: "#cost", pad: .06, beats: 1, appendix: "cost",
    eyebrow: "Appendix · what it cost",
    title: `Ten documents. $${D.corpus.usd}.`,
    body: "",
  },
  {
    id: "now26", el: "#now26", pad: .05, beats: 4, appendix: "now26",
    eyebrow: "Appendix · the year is 2026",
    title: b => [
      `This took six steps. Now it takes ${ANSWERS_2026.length}.`,
      "Three of them are an upload now.",
      "The schema is enforced by the server.",
      "The box comes back with the text.",
    ][b],
    body: "",
    enter() { now26Show(0); },
    on(b) { now26Show(b); },
  },
  {
    id: "crop", el: "#crop", pad: .05, beats: 6, appendix: "crop",
    eyebrow: "Appendix · harder documents",
    title: b => [
      "Not every answer is a sentence.",
      "Seventeen ratings. Read them off.",
      "Here is everything the text layer knows.",
      "Measure the bars and every one lands on an integer — on an axis the legend contradicts.",
      "And nobody had to write a schema for any of it.",
      "And here is the part we did not expect.",
    ][b],
    body: "",
    enter() { cropShow(0); },
    on(b) { cropShow(b); },
  },
];

/* The `harder documents` appendix is itself an index, so its FIRST frame is the wall and
   the four documents hang off it. Splicing them in here rather than writing them into the
   literal above keeps the four detail scenes generated from D.crops — the alternative was
   four near-identical keyframe objects differing only in a stem. */
{
  const at = KF.findIndex(k => k.id === "crop");
  KF.splice(at, 0, {
    /* The wall. Its own frame rather than more beats on a document, because beats cannot
       move the camera and these are different floors of the canvas. */
    id: "crophub", el: "#crophub", pad: .05, beats: 2, appendix: "crop",
    eyebrow: "Appendix · harder documents",
    title: b => [
      "Four documents. Four different places to break.",
      "None of them share a schema. Nothing does.",
    ][b],
    body: "",
    enter() { crophubShow(0); },
    on(b) { crophubShow(b); },
  });
  /* Numbers in the titles are interpolated, not typed: `5 of 7 came back empty` is the
     finding, and a finding written by hand beside a number the code computes will drift
     from it the first time anything is re-run. */
  const TITLES = {
    "crop-armor": c => [
      "A bar chart with no scale under it.",
      `${c.attributes} things it named off the page.`,
      `${c.measurements} measurements. ${c.nulls} came back empty.`,
      "It would not guess, and it said why.",
    ],
    "crop-dekalb": c => [
      "Eight hybrids. A table of nothing but text.",
      `${c.attributes} attributes — each one a whole column.`,
      `${c.measurements} measurements. All ${c.nulls} empty.`,
      "Nothing is a picture. The headers are sideways.",
    ],
    "crop-soy": c => [
      "A different crop entirely.",
      `${c.attributes} attributes, and not one of them corn.`,
      `${c.measurements} measurement. The rest are words.`,
      "Nothing in the code knew what a soybean was.",
    ],
  };
  D.crops.filter(c => CROP_DOCS[c.stem].kf !== "crop").forEach(c => {
    const kf = CROP_DOCS[c.stem].kf, titles = TITLES[kf](c);
    KF.push({
      id: kf, el: `#${kf}`, pad: .05, beats: 4, appendix: "crop",
      // CROP_DOCS.name, not c.subject: the run's own subject key is up to 58 characters
      // of trademark ("ARMOR SEED 1575 (VT Double PRO® RIB Complete®) corn hybrid") and
      // the eyebrow is set in caps at the top of the frame.
      eyebrow: `Appendix · ${CROP_DOCS[c.stem].name}`,
      title: b => titles[b],
      body: "",
      enter() { cropDetail[kf](0); },
      on(b) { cropDetail[kf](b); },
    });
  });
}

/* ── the appendix index ────────────────────────────────────────────────────────
 *
 * Three cards, built FROM the appendix keyframes rather than beside them, so a card
 * cannot end up advertising something the scene it opens no longer says. Each one is a
 * real click target — the only one in the world besides the source links — because a
 * click is the whole point: you have to ask for an appendix to get one. */
const appendixScene = node("node", APPX);
appendixScene.id = "appendix";
{
  const N = new Set(KF.filter(k => k.appendix).map(k => k.appendix)).size;
  const GAP = 900, CARD_W = Math.round((APPX.w - (N - 1) * GAP) / N);
  const IDLE = ["rgba(63,143,212,.45)", "rgba(10,26,53,.62)"];
  const HOVER = ["rgba(55,217,160,.75)", "rgba(8,44,36,.34)"];
  // One card per appendix, not per keyframe: `harder documents` is two frames now, and
  // `k.appendix` is the group name they share. The card opens the first of them.
  const heads = KF.filter((k, i) => k.appendix
    && KF.findIndex(x => x.appendix === k.appendix) === i);
  heads.forEach((k, i) => {
    const card = node("node", { x: i * (CARD_W + GAP), y: 0, w: CARD_W, h: APPX.h },
      appendixScene, {
        border: `24px solid ${IDLE[0]}`, borderRadius: "260px", background: IDLE[1],
        padding: "900px 800px", boxSizing: "border-box",
        pointerEvents: "auto", cursor: "pointer",
        transition: "border-color .25s ease, background .25s ease",
      });
    card.dataset.vizId = `appendix-${k.id}`;
    card.dataset.label = `Open the appendix: ${k.eyebrow}`;
    card.innerHTML =
      `<div style="font-family:var(--mono);font-size:420px;letter-spacing:.14em;
         text-transform:uppercase;color:var(--t-blue);margin-bottom:620px">${
           esc(k.eyebrow.replace(/^Appendix\s*·\s*/i, ""))}</div>
       <div style="font-size:520px;font-weight:700;color:var(--ink);line-height:1.3">${
         esc(typeof k.title === "function" ? k.title(0) : k.title)}</div>
       <div style="font-family:var(--mono);font-size:380px;letter-spacing:.16em;
         text-transform:uppercase;color:var(--accent);margin-top:760px">open &rarr;</div>`;
    card.addEventListener("click", () => pinTo(k.id));
    const paintCard = ([b, g]) => { card.style.borderColor = b; card.style.background = g; };
    card.addEventListener("pointerenter", () => paintCard(HOVER));
    card.addEventListener("pointerleave", () => paintCard(IDLE));
  });
}

const beatsOf = k => k.beats ?? 1;
// A one-beat scene needs a screen and a bit; a ten-beat scene needs ten times the
// dwell or the beats are back to sharing a trackpad flick between them.
const dwellOf = k => k.dwell ?? (.53 + .42 * beatsOf(k));

/* ═══════════════════════════════════════════════════════════════════════════════
   CAMERA
   ═══════════════════════════════════════════════════════════════════════════════ */

/* PACING — every segment is a fly-in followed by its beats, but the fly-in's share of
 * the scroll is measured, not fixed.
 *
 * It used to be a flat 34% of a fixed-length segment, which gave the same scroll
 * distance to "pull back a bit off the pile" and to "drop 35,000 world units and zoom
 * in 40x onto one sentence". The small moves were leisurely and the big ones snapped —
 * the `need` → `line` cut in particular read as a cut rather than a flight.
 *
 * So each fly-in gets scroll in proportion to how much the picture actually changes,
 * in two units a viewer's sense of pace really is tracking: octaves of zoom, and pans
 * measured in frame-widths (so crossing the frame counts the same whether the frame is
 * 2,000 units wide or 30,000). Both are computed from the measured cameras, so moving
 * or resizing a scene re-paces its approach for free. */
const TRAVEL_MIN = .40;      // even a small nudge is a move, not a jump
const TRAVEL_PER_MOVE = .34; // scroll-screens per octave-or-frame-width of change
const TRAVEL_MAX = 3.2;      // past this a fly-in is a chore, however far it goes

/* ARC — a long pan pulls back over the middle of its own flight.
 *
 * Interpolating the centre in a straight line while the zoom moves monotonically means
 * the camera tunnels: `need` sits ~35,000 world units above the hero document, so the
 * middle of that flight was six seconds of empty navy. Giving the travel more scroll
 * only bought more of the void.
 *
 * So the frame widens over the middle by `sin(πt)` — zero at both ends, so the two
 * keyframes are still hit exactly — scaled by how far the camera pans, measured in
 * frame-widths. A long flight zooms out until both the place you left and the place
 * you are going are on screen together, then drops in. Which is the argument for a
 * zooming canvas in the first place: you can always see where you are. Van Wijk &
 * Nuij's smooth-and-efficient zooming, in one term. */
/* The deadzone is the whole difference between a flight and a bounce. Without it every
 * lateral step — page → answers, doc → gallery, gallery → samefact, all neighbours a
 * frame or two apart — pulled back and dropped in again for a move the eye could have
 * followed in a straight line, which reads as the camera fidgeting. An arc only earns
 * its keep when the destination is off screen at the altitude you are leaving from,
 * i.e. past about one frame-width of pan; below that, just slide. */
const ARC_DEADZONE = 1.15;   // frame-widths of pan below which the camera moves flat
const ARC_PER_PAN = .80;     // natural-log units of extra width per frame-width panned
const ARC_MAX = 2.0;         // ~7x; past this the marks are specks and the pull-back is its own scene

/** How much the picture changes between two cameras: octaves of zoom, and pan measured
 *  in frame-widths (so crossing the frame counts the same at any altitude). */
function moveBetween(a, b) {
  const octaves = Math.abs(Math.log2(b.w / a.w));
  const pan = Math.hypot(b.cx - a.cx, b.cy - a.cy) / Math.sqrt(a.w * b.w);
  return { octaves, pan, total: octaves + pan };
}

// Filled by measure(), which is the first moment the real cameras exist.
let travels = [], lens = [], arcs = [];

/** World-space rect of an element, measured with the transform neutralised. */
function rectOf(sel) {
  const el = typeof sel === "string" ? document.querySelector(sel) : sel;
  if (!el) throw new Error(`keyframe target not found: ${sel}`);
  const w = world.getBoundingClientRect(), r = el.getBoundingClientRect();
  const s = world._scale || 1;
  return { x: (r.left - w.left) / s, y: (r.top - w.top) / s, w: r.width / s, h: r.height / s };
}

function union(rects) {
  const x = Math.min(...rects.map(r => r.x)), y = Math.min(...rects.map(r => r.y));
  return {
    x, y,
    w: Math.max(...rects.map(r => r.x + r.w)) - x,
    h: Math.max(...rects.map(r => r.y + r.h)) - y,
  };
}

/* The topbar and the rail are opaque screen furniture. Framing against the raw viewport
 * put content underneath them and called it visible, which is how the lane comparison
 * ended up half-hidden behind its own caption. Everything is framed into this sub-rect
 * instead.
 *
 * The 178px lower third is gone — the caption lives in the topbar now — so the only
 * reservation left is the caption block itself. Keep TOP in step with #topbar's CSS:
 * top:24 + eyebrow 17 + up to two lines of 25px/1.14 headline. */
const TOP_RESERVE = 104;
function safeArea() {
  return { x: 46, y: TOP_RESERVE, w: innerWidth - 92,
           h: Math.max(220, innerHeight - TOP_RESERVE - 34) };
}

/** Fit a world rect into the safe area (contain), returning a camera.
 *  `w` is the world width that must span the safe area's width. */
function fit(rect, pad) {
  const s = safeArea();
  const w = rect.w * (1 + pad * 2), h = rect.h * (1 + pad * 2);
  return { cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2, w: Math.max(w, h * (s.w / s.h)) };
}

let cams = [], starts = [], totalLen = 0, stops = [], TL = [];

/* THE RAIL IS NOT THE WHOLE DECK. `TL` is the list of keyframe indices currently on the
 * scroll rail, and until you open one, the three appendices are not on it: the rail ends
 * on the appendix INDEX, `#next` goes disabled there, and the scroll range stops with it.
 * Everything downstream — travels, arcs, lens, starts, stops, camAt — is indexed by
 * position ALONG THE RAIL rather than by keyframe, which is the whole of the change.
 *
 * `cams` stays keyed by keyframe, because a scene off the rail still needs a camera the
 * moment someone clicks through to it.
 *
 * They never join it, either. Unlocking them on the first click was the wrong shape: it
 * put three unrelated detours back under the arrow keys, which is the thing the index
 * exists to prevent. An appendix is PINNED instead — see pinTo() — so the only way into
 * one is a click on a card, and the only ways out are a click, Escape, or arrowing back
 * off its first beat. */
const onRail = () => KF.map((k, i) => i).filter(i => !KF[i].appendix);

function measure() {
  world.style.transform = "none";
  world._scale = 1;
  cams = KF.map(k => {
    const rects = (k.fit ? k.fit.flatMap(s => [...document.querySelectorAll(s)].map(rectOf))
                         : [rectOf(k.el)]);
    return fit(union(rects), k.pad ?? .1);
  });
  TL = onRail();
  // Travel and arc first (both need the cameras), then the lengths that contain them.
  const moves = TL.map((i, j) => j === 0 ? null : moveBetween(cams[TL[j - 1]], cams[i]));
  travels = moves.map(m =>
    m ? clamp(TRAVEL_MIN + TRAVEL_PER_MOVE * m.total, TRAVEL_MIN, TRAVEL_MAX) : 0);
  arcs = moves.map(m =>
    m ? clamp(ARC_PER_PAN * Math.max(0, m.pan - ARC_DEADZONE), 0, ARC_MAX) : 0);
  lens = TL.map((i, j) => travels[j] + dwellOf(KF[i]));

  starts = []; totalLen = 0;
  TL.forEach((i, j) => { starts.push(totalLen); totalLen += lens[j]; });

  // The flat list of stops is what the arrow keys and the rail iterate. Beat b of a
  // scene parks at the middle of its own slice of the dwell, so a press lands on a
  // settled frame and a small scroll nudge cannot straddle two beats.
  stops = [];
  TL.forEach((i, j) => {
    const n = beatsOf(KF[i]);
    for (let b = 0; b < n; b++) {
      const u = travels[j] + dwellOf(KF[i]) * ((b + .5) / n);
      stops.push({ i, b, frac: (starts[j] + u) / totalLen });
    }
  });

  $("#scrollrail").style.height = `${totalLen * 100}vh`;
  $("#rail").innerHTML = stops.map((s, j) =>
    `<button class="${s.b === 0 ? "head" : ""}" data-j="${j}"
       title="${esc(KF[s.i].eyebrow)} — beat ${s.b + 1} of ${beatsOf(KF[s.i])}"></button>`).join("");
  apply();
}

function camAt(scrollFrac) {
  const s = scrollFrac * totalLen;
  // `j` is a position on the rail; `i` is the keyframe it lands on. They are the same
  // number right up until the appendices come off the rail, and then they are not.
  let j = 0;
  while (j < TL.length - 1 && s >= starts[j + 1]) j++;
  const i = TL[j];
  // u is an offset into the segment, in the same scroll-screen units as travels/lens —
  // not a 0..1 fraction of it, because the fly-in and the dwell are now sized apart.
  const u = clamp(s - starts[j], 0, lens[j]);
  const travel = j === 0 ? 1 : easeInOut(clamp(u / travels[j]));
  const from = cams[TL[Math.max(0, j - 1)]];
  const to = cams[i];
  const t = REDUCED ? (u >= travels[j] ? 1 : 0) : travel;
  const p = clamp((u - travels[j]) / dwellOf(KF[i]));
  return {
    i, p,
    beat: clamp(Math.floor(p * beatsOf(KF[i])), 0, beatsOf(KF[i]) - 1),
    cam: {
      cx: lerp(from.cx, to.cx, t), cy: lerp(from.cy, to.cy, t),
      // Zoom is interpolated in log space so the perceived rate is constant. Linear
      // interpolation of width makes long pull-backs lurch, which is most of what
      // makes this style of presentation nauseating. The sin() term is the arc — see
      // ARC_PER_PAN; it is zero at t=0 and t=1, so both keyframes are still exact.
      w: Math.exp(lerp(Math.log(from.w), Math.log(to.w), t)
                  + arcs[j] * Math.sin(Math.PI * t)),
    },
  };
}

let current = -1, currentBeat = -1;

/** Put a camera on screen. The only place the world transform is written. */
function paint(c) {
  const a = safeArea();
  const s = a.w / c.w;
  world._scale = s;
  world.style.transform =
    `translate(${a.x + a.w / 2}px, ${a.y + a.h / 2}px) scale(${s}) translate(${-c.cx}px, ${-c.cy}px)`;
  return s;
}

function apply() {
  if (free) return;   // the hand has the camera
  if (pinned != null) {
    const i = pinned, beat = pinnedBeat;
    // Not while a pin flight is running, or every beat change would snap the camera to
    // the destination halfway through its own approach.
    if (!pinFlying) paint(cams[i]);
    if (i !== current || beat !== currentBeat) {
      const swapped = i !== current;
      current = i; currentBeat = beat;
      showNarration(i, beat, swapped);
    }
    KF[i].on?.(beat);
    const fam = appendixFrames(KF[i].appendix);
    $("#prev").disabled = false;   // off the front is the way out, so it always does something
    $("#next").disabled = beat >= beatsOf(KF[i]) - 1 && fam.indexOf(i) === fam.length - 1;
    return;
  }
  const max = document.documentElement.scrollHeight - innerHeight;
  const { i, p, beat, cam: c } = camAt(max > 0 ? clamp(scrollY / max) : 0);
  paint(c);

  if (i !== current || beat !== currentBeat) {
    const swapped = i !== current;
    current = i; currentBeat = beat;
    showNarration(i, beat, swapped);
  }
  KF[i].on?.(beat);

  const j = stops.findIndex(s => s.i === i && s.b === beat);
  [...$("#rail").children].forEach((b, k) => {
    b.classList.toggle("act", k === j);
    b.classList.toggle("actin", k < j);
    // Beats collapse to their scene's head until you're in that scene — see #rail in
    // index.html for why the full 67-mark stack cannot fit a laptop viewport.
    b.classList.toggle("show", stops[k].i === i);
  });
  $("#prev").disabled = j <= 0;
  $("#next").disabled = j >= stops.length - 1;
}

/* ── narration (screen space, so it is never scaled or blurred) ───────────────── */

function showNarration(i, beat, swapped) {
  const k = KF[i];
  if (swapped) k.enter?.();
  const n = $("#topbar");
  if (swapped) { n.classList.remove("swap"); void n.offsetWidth; n.classList.add("swap"); }
  /* Two lines, not three. There used to be a source note under the headline at 10.5px —
     unreadable from the back of a room of a hundred people, and skipped by everyone
     closer than that. The provenance it carried now lives in comments beside the
     keyframes that make the claims, where the presenter can find it and the audience is
     not asked to squint at it. */
  n.innerHTML =
    `<div class="eyebrow">${esc(k.eyebrow)}</div>
     <h2>${typeof k.title === "function" ? k.title(beat) : k.title}</h2>`;
  const nb = beatsOf(k);
  // Position on the RAIL, over the rail's own length. Counting keyframes would promise
  // 27 scenes to a viewer who can only reach 24 of them, and the three it was counting
  // are the ones they have not opted into yet.
  const rail = TL.indexOf(i);
  $("#stepcount").innerHTML = rail < 0
    // A pinned scene has no position on the rail, and inventing one — 25 of 24, or 01 of
    // 24 from a -1 — would be the counter lying about where you can get to from here.
    ? `<i>appendix</i>`
    : `${String(rail + 1).padStart(2, "0")}<i>/${String(TL.length).padStart(2, "0")}</i>`;
  $("#beatcount").textContent = rail < 0
    ? (nb > 1 ? `beat ${beat + 1} / ${nb} · esc to go back` : "esc to go back")
    : nb > 1 ? `beat ${beat + 1} / ${nb}` : "";
  if (location.hash.slice(1) !== k.id) history.replaceState(null, "", `#${k.id}`);
}

/* ── the two live surfaces, in the world ──────────────────────────────────────────
 *
 * These used to be a screen-space overlay, on the theory that an iframe inside a CSS
 * transform is a rendering hazard and unclickable at any scale but 1. They belong in the
 * world — the whole point of the piece is that all of this is one canvas, and an overlay
 * is the one thing on the page that isn't — but the warning was half right, and the half
 * that is right decides the geometry here.
 *
 * An iframe scaled UP by a local transform paints white. Laying one out at 1,500px and
 * blowing it up 11x to fill a 17,000-unit box gave two blank rectangles: content loaded,
 * cross-origin, sized correctly, and rendering nothing. Sizing it in world units instead
 * paints — but then the embedded page's viewport IS 17,000px, so it lays itself out for
 * a monitor nobody owns.
 *
 * So this one block works in a different unit: 1 world unit = 1 CSS pixel. The frames are
 * 1500x950 both ways, there is no local transform at all, and the camera's own scale
 * (~0.45 here, a downscale) is the only scaling that ever happens. Everything else in
 * this file is sized for a canvas 200,000 units wide; the numbers in here are small on
 * purpose, and text in here is in points, not thousands. */

const liveWall = node("node", LIVE);
liveWall.id = "liveWall";
const paneW = 1500, paneH = 950;

/* An iframe inside a transformed ancestor loads, sizes and hit-tests correctly and then
 * paints nothing until something invalidates it. Both frames came up as white rectangles
 * — cross-origin, correctly sized, blank — and stayed that way until any style on them
 * changed. So: kick them once when the camera arrives, and again when it has settled,
 * because the first kick can land mid-flight and be undone by the next composite. */
let nudges = 0;
function nudgeLive() {
  // The change has to STICK, and it has to be on an explicit pixel height. Setting a
  // style and putting it back — display, or opacity via a forced reflow — invalidates
  // and un-invalidates inside one frame, and the frames stay white; so does nudging a
  // percentage height, because the used value never actually moves. A quarter pixel off
  // an absolute height is a real layout change every time, and is invisible at any scale
  // this is ever seen at.
  // Never zero, or the second nudge lands back on the height the frame was already
  // painted at — which is not a change, and the white comes back.
  const d = (nudges++ % 2) ? .25 : .5;
  document.querySelectorAll("#liveWall iframe").forEach(f => {
    f.style.height = `${paneH - d}px`;
  });
}

/* Two hosts, two truths.
 *
 * On the demo rig the three surfaces are real services on localhost and the embeds are the
 * whole point — the claim of the scene is that this is running, not drawn. Published, those
 * ports do not exist for the reader, and the honest version of the same claim is a still of
 * the real thing plus a note saying so. A dead iframe making a promise it cannot keep is
 * worse than a screenshot admitting what it is.
 *
 * Hostname, not the connection probe below: the probe costs a 4s wait and races a slow SPA,
 * where the hostname is known before a single byte is fetched and cannot be wrong. The probe
 * still runs on the rig, because there a service really can be down. */
// Loopback only, and it fails CLOSED: anything unrecognised — a LAN address, a Pages
// host, a file:// copy with no hostname at all — gets the stills. The wrong guess in that
// direction costs a screenshot where an embed would have worked; the other direction ships
// three dead frames to a stranger.
/* Loopback means the demo rig is probably up, so the live panes mount as iframes. That
 * guess is right when presenting and wrong when checking what a stranger sees, and the
 * only way to check used to be to deploy and open the public URL.
 *
 * `?rig=off` forces the published behaviour — screenshots, captions, no iframes — from
 * localhost, and `?rig=on` forces the opposite from anywhere. Shift+R toggles it and
 * reloads, keeping the hash so you land on the scene you were reading. The panes are
 * built once at construction, so flipping this genuinely needs the reload. */
const RIG_PARAM = new URLSearchParams(location.search).get("rig");
const LIVE_RIG = RIG_PARAM === "on" ? true
  : RIG_PARAM === "off" ? false
  : ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

/* Both settings live in the URL, so a link carries them: someone handed
 * `…?rig=off&motion=off` sees exactly what the sender saw. The cog writes the same
 * params the keyboard shortcut does and reloads, keeping the hash so you come back to
 * the beat you were on. */
function setParam(name, on) {
  const u = new URL(location.href);
  u.searchParams.set(name, on ? "on" : "off");
  location.replace(u);
}

addEventListener("keydown", e => {
  if (e.key !== "R" || !e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable) return;
  setParam("rig", !LIVE_RIG);
});

{
  const cog = $("#cog"), panel = $("#settings");
  const motion = $("#setMotion"), rig = $("#setRig");
  motion.checked = REDUCED;
  rig.checked = LIVE_RIG;
  const close = () => { panel.hidden = true; cog.setAttribute("aria-expanded", "false"); };
  cog.addEventListener("click", e => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
    cog.setAttribute("aria-expanded", String(!panel.hidden));
  });
  // Click-away and Escape, because a panel over a canvas you scroll has no other way out.
  addEventListener("click", e => { if (!panel.hidden && !panel.contains(e.target)) close(); });
  addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  // Inverted on purpose: the param answers "is motion on?", the checkbox asks "reduce
  // it?". Wiring them straight through made ticking "Reduce motion" turn animation back
  // on, which is the kind of bug a toggle hides well because it still visibly does
  // something.
  motion.addEventListener("change", () => setParam("motion", !motion.checked));
  rig.addEventListener("change", () => setParam("rig", rig.checked));
}

let liveMounted = false;
function mountLive() {
  if (liveMounted) return;
  liveMounted = true;
  const panes = [
    { url: `http://localhost:8099/${D.hero.stem}.html`, t: "the citation viewer",
      what: "the citation viewer", cmd: "python -m http.server 8099 --directory ui",
      still: "assets/live/viewer.jpg" },
    { url: "http://localhost:3000/objects/rfps", t: "the CRM record",
      what: "Twenty CRM", cmd: "docker compose up -d",
      still: "assets/live/crm.jpg" },
    // The third surface is the one the other two do not show: what it cost to get here.
    // Phoenix is on 6786, not its default 6006 — that port is held by podman's gvproxy
    // (see compose.phoenix.yml), and the compose overlay only works with both -f files.
    // `timeRangeKey` because the projects page defaults to the last 7 days, and the
    // model calls worth showing are older than that — the cards read 0 traces without
    // it. It is the same key the range picker writes into the URL itself.
    { url: "http://localhost:6786/projects?timeRangeKey=30d", t: "the model calls",
      what: "Phoenix", cmd: "docker compose -f compose.yml -f compose.phoenix.yml up -d",
      still: "assets/live/phoenix.jpg" },
  ];
  panes.forEach((p, i) => {
    const label = node("wlabel", null, liveWall, {
      left: px(i * (paneW + 300)), top: px(0), width: px(paneW),
      fontSize: "42px", letterSpacing: ".14em", color: "var(--accent)",
    });
    /* The label is the way out of the embed: the surfaces are real running services, and
       an iframe at camera scale is for showing, not for using. Same underlined-link idiom
       as the gallery captions — but only on the rig, because an underline and an arrow on
       a published page promise a destination, and `localhost:3000` is not one. */
    label.innerHTML = LIVE_RIG
      ? `<a href="${esc(p.url)}" target="_blank" rel="noopener"
             style="color:inherit;text-decoration:underline;
             text-decoration-color:var(--faint);text-underline-offset:.3em;
             pointer-events:auto">${esc(p.t)} ↗</a>`
      : esc(p.t);
    const host = node("node",
      { x: i * (paneW + 300), y: 120, w: paneW, h: paneH }, liveWall,
      { overflow: "hidden", borderRadius: "14px", background: "#0a1526",
        border: "1px solid rgba(120,160,230,.3)" });
    // Published: a still of the same surface, captured from the running stack, and a note
    // saying which it is. No iframe at all — which also means the blank-iframe repaint bug
    // simply cannot happen on the copy that strangers see.
    if (!LIVE_RIG) {
      host.innerHTML =
        `<img src="${esc(p.still)}" alt="${esc(p.t)}, captured from the running stack"
           style="width:${paneW}px;height:${paneH}px;object-fit:cover;display:block">`;
      const cap = node("wlabel", null, liveWall, {
        left: px(i * (paneW + 300)), top: px(120 + paneH + 26), width: px(paneW),
        fontSize: "30px", letterSpacing: ".1em", color: "var(--faint)",
      });
      cap.textContent = "screenshot · runs locally";
      return;
    }

    host.innerHTML =
      `<iframe src="${p.url}" loading="lazy"
         style="width:${paneW}px;height:${paneH}px;border:0;background:#fff;
         opacity:.999"></iframe>
       <div class="dead"><div>Waiting for ${p.what}…</div></div>`;
    const fr = host.querySelector("iframe"), dead = host.querySelector(".dead");

    // A refused connection paints a blank frame and fires no error event, so it has
    // to be probed. Reading location.href on a frame that LOADED throws (cross-origin)
    // and on one that failed returns "about:blank" — so a successful read is the
    // failure case. The first version had this backwards and reported a dead CRM as
    // healthy, which is the direction that embarrasses you in front of a room.
    const settle = () => {
      let live;
      try { live = fr.contentWindow.location.href !== "about:blank"; }
      catch { live = true; }
      if (live) { dead.style.display = "none"; return; }
      fr.style.display = "none";
      dead.innerHTML =
        `<div>${p.what} isn't running.<br><code>${p.cmd}</code><br>${p.url}</div>`;
    };
    // Two looks: one early so a dead service is called out before anyone asks, and
    // one later so a slow single-page app is not.
    fr.addEventListener("load", () => setTimeout(settle, 400));
    setTimeout(settle, 4000);
  });
}

/* ── free look ────────────────────────────────────────────────────────────────────
 *
 * A quarter of the argument for building this as a zooming canvas is that it IS one
 * canvas — not twenty slides that happen to be in a row. You cannot make that point
 * from inside a scripted flight, because a flight looks the same either way. So: drop
 * the script, hand over the camera, and let someone drag the whole thing around and
 * find the pile, the wall, the workbench and the walkthrough still sitting where they
 * were, in whatever state they were left in.
 *
 * The world goes pointer-events:none while it is on, so a drag over an embedded frame
 * pans the canvas instead of scrolling the frame. Leave free look to click into them. */

let free = null;   // { cx, cy, w } while the hand has it, null while the scroll does

function setFree(on) {
  if (!!free === on) return;
  if (on) {
    // `liveCam()`, not camAt(scroll). In a pinned appendix the scroll offset still points
    // at the index, so seeding from it threw the camera back two scenes the moment you
    // reached for free look — which made free look look broken exactly where a reader is
    // most likely to want it, on a chart they are trying to read.
    free = { ...liveCam() };
  } else {
    free = null;
  }
  document.body.classList.toggle("freelook", on);
  nudgeLive();   // panning here by hand hits the same blank-iframe bug
  $("#pan").classList.toggle("act", on);
  if (!on) apply();
}

{
  const cam = $("#cam");
  let drag = null;
  cam.addEventListener("pointerdown", e => {
    if (!free) return;
    drag = { x: e.clientX, y: e.clientY };
    cam.setPointerCapture(e.pointerId);
    document.body.classList.add("dragging");
  });
  cam.addEventListener("pointermove", e => {
    if (!free || !drag) return;
    const s = safeArea().w / free.w;
    free.cx -= (e.clientX - drag.x) / s;
    free.cy -= (e.clientY - drag.y) / s;
    drag = { x: e.clientX, y: e.clientY };
    paint(free);
  });
  const drop = () => { drag = null; document.body.classList.remove("dragging"); };
  cam.addEventListener("pointerup", drop);
  cam.addEventListener("pointercancel", drop);

  // Zoom about the cursor: the world point under the pointer has to stay under it,
  // or every wheel notch walks the thing you were looking at off the screen.
  addEventListener("wheel", e => {
    /* Zoom from anywhere in the piece, not only from free look. A trackpad pinch
       arrives as ctrl+wheel and cmd+wheel is the mouse equivalent, so either one means
       "zoom in here" — take the camera off the script and hand it to the same
       cursor-anchored zoom below. A bare wheel stays the scroll, or the narrative
       would have no driver. */
    if (!free && (e.ctrlKey || e.metaKey)) setFree(true);
    if (!free) return;
    e.preventDefault();
    const a = safeArea(), s = a.w / free.w;
    const px = e.clientX - (a.x + a.w / 2), py = e.clientY - (a.y + a.h / 2);
    const wx = free.cx + px / s, wy = free.cy + py / s;
    free.w = clamp(free.w * Math.exp(e.deltaY * .0015), 600, 500000);
    const s2 = a.w / free.w;
    free.cx = wx - px / s2;
    free.cy = wy - py / s2;
    paint(free);
  }, { passive: false });
}

/* ── navigation: scroll, keys, rail, hash ─────────────────────────────────────── */

/* Where a key press or rail click is taking us. Arrow keys step from HERE rather than
 * from the live camera position: a smooth scroll takes ~400ms, and stepping from
 * wherever the animation happened to be meant two quick presses advanced one beat. */
let navStop = -1;

/* Key and button navigation used `behavior: "smooth"`, whose duration Chrome fixes at
 * a few hundred milliseconds no matter how far it is going. Scrolling by hand, the
 * pacing work above governs the fly-ins; clicking, it did not — every flight, including
 * the 3,200px one, was over in the same ~300ms snap.
 *
 * So the tween is ours, and its duration is the distance. The camera's own easing lives
 * in camAt(); this only has to deliver scroll offsets at a sane rate. */
const NAV_MS_BASE = 700;        // a within-scene beat: short, but not a cut
const NAV_MS_PER_SCREEN = 430;  // added per viewport-height of scroll travelled
const NAV_MS_MAX = 2800;        // the longest flight in the piece, and enough for it

let navRaf = 0;

function animateScrollTo(top) {
  cancelAnimationFrame(navRaf);
  const from = scrollY, dist = top - from;
  const ms = REDUCED ? 0
    : clamp(NAV_MS_BASE + NAV_MS_PER_SCREEN * Math.abs(dist) / innerHeight,
            NAV_MS_BASE, NAV_MS_MAX);
  if (ms <= 0 || Math.abs(dist) < 2) { scrollTo({ top, behavior: "auto" }); return; }
  const t0 = performance.now();
  const step = now => {
    const t = clamp((now - t0) / ms);
    scrollTo({ top: from + dist * easeInOut(t), behavior: "auto" });
    if (t < 1) navRaf = requestAnimationFrame(step);
  };
  navRaf = requestAnimationFrame(step);
}

function scrollToStop(j, smooth = true) {
  navStop = clamp(j, 0, stops.length - 1);
  const max = document.documentElement.scrollHeight - innerHeight;
  const top = stops[navStop].frac * max;
  if (smooth) animateScrollTo(top);
  else { cancelAnimationFrame(navRaf); scrollTo({ top, behavior: "auto" }); }
}

/* ── pinned scenes: the appendices, and the only way in or out of one ──────────
 *
 * A pinned scene is off the scroll rail entirely, so `camAt` cannot reach it and the
 * arrow keys cannot walk into it. The camera is held on its keyframe directly and the
 * document is frozen at whatever offset the index was sitting at, which is what makes
 * "you have to click" true rather than merely discouraged: there is no scroll position
 * that corresponds to being here.
 *
 * Beats still work — the 2026 appendix has four and the harder document has six — they
 * just run off `pinnedBeat` instead of off scroll. Arrowing back past beat one is one of
 * the three ways out, along with Escape and the ↩ in the nav. */
const PIN_MS = 900;
let pinned = null, pinnedBeat = 0, pinRaf = 0, pinFlying = false, pinScrollY = 0;
/* Where "back" goes, innermost last. An appendix can itself be an index — `harder
 * documents` opens a card wall, and each card on it opens a document — so backing out of
 * a document has to land on the wall you chose it from rather than all the way out. One
 * frame deep would have been a boolean; the stack costs the same and does not have to be
 * revisited if anything else grows a second level. */
let pinBack = [];

/** Where the camera is right now, pinned or not — the departure point for a pin flight. */
function liveCam() {
  if (pinned != null) return cams[pinned];
  const max = document.documentElement.scrollHeight - innerHeight;
  return camAt(max > 0 ? clamp(scrollY / max) : 0).cam;
}

/** Fly the camera between two cameras without touching scroll. Same easing and the same
 *  log-space zoom as the rail's own flights, so a detour does not move differently from
 *  the piece it is a detour from. */
function pinFly(from, to) {
  cancelAnimationFrame(pinRaf);
  if (REDUCED) { pinFlying = false; paint(to); return; }
  pinFlying = true;
  const t0 = performance.now();
  const step = now => {
    const e = easeInOut(clamp((now - t0) / PIN_MS));
    paint({ cx: lerp(from.cx, to.cx, e), cy: lerp(from.cy, to.cy, e),
            w: Math.exp(lerp(Math.log(from.w), Math.log(to.w), e)) });
    if (e < 1) pinRaf = requestAnimationFrame(step); else pinFlying = false;
  };
  pinRaf = requestAnimationFrame(step);
}

/** @param push  true when this is a drill-down: remember where to come back to. */
function pinTo(id, push = false) {
  const i = KF.findIndex(k => k.id === id);
  if (i < 0 || i === pinned) return;
  const from = liveCam();
  if (push && pinned != null) pinBack.push(pinned);
  else if (!push) pinBack.length = 0;
  pinScrollY = scrollY;
  pinned = i; pinnedBeat = 0;
  // Freezing the document is the enforcement. Without it the scrollbar still moves under
  // a hand that scrolls, nothing on screen answers it, and letting go lands you wherever
  // the offset drifted to.
  document.documentElement.style.overflow = "hidden";
  document.body.classList.add("pinned");
  apply();
  pinFly(from, cams[i]);
}

/** One step back: out to the index you drilled in from, or out of the pin entirely. */
function popPin() {
  if (!pinBack.length) { unpin(); return; }
  const from = cams[pinned];
  pinned = pinBack.pop();
  pinnedBeat = 0;
  apply();
  pinFly(from, cams[pinned]);
}

function unpin() {
  if (pinned == null) return;
  const from = cams[pinned];
  pinned = null; pinBack.length = 0;
  document.documentElement.style.overflow = "";
  document.body.classList.remove("pinned");
  // Belt and braces: some browsers drop the offset when the overflow lock lifts, and the
  // whole camera is a function of it.
  if (scrollY !== pinScrollY) scrollTo({ top: pinScrollY, behavior: "auto" });
  apply();
  pinFly(from, liveCam());
}

/** Every keyframe in one appendix, in order. Usually one; `harder documents` is two. */
const appendixFrames = g => KF.map((k, i) => i).filter(i => KF[i].appendix === g);

/** Step inside a pinned appendix: beats first, then frames. Off the front is the way out;
 *  off the back is the end of the appendix and does nothing, the way the end of the rail
 *  does nothing. */
function stepPin(d) {
  const b = pinnedBeat + d;
  if (b >= 0 && b < beatsOf(KF[pinned])) { pinnedBeat = b; apply(); return; }
  // Backwards off the first beat is "back", and back means the index you came in from
  // when there is one — not the previous document in the strip, which is somewhere you
  // may never have been.
  if (d < 0 && pinBack.length) { popPin(); return; }
  const fam = appendixFrames(KF[pinned].appendix);
  const next = fam[fam.indexOf(pinned) + d];
  if (next == null) { if (d < 0) unpin(); return; }
  const from = cams[pinned];
  pinned = next;
  pinnedBeat = d > 0 ? 0 : beatsOf(KF[next]) - 1;
  apply();
  pinFly(from, cams[next]);
}

/** The stop the arrow keys step from: the one we are flying to if a nav is in
 *  flight, otherwise whatever the camera actually settled on (a manual scroll). */
function stopNow() {
  if (navStop >= 0) return navStop;
  return Math.max(0, stops.findIndex(s => s.i === current && s.b === currentBeat));
}

// Any hand-driven scroll cancels a pending nav — otherwise scrolling away and then
// pressing an arrow would yank you back to wherever the last press was headed. The
// tween has to be killed too, or it keeps writing scrollY out from under the hand.
const cancelNav = () => { navStop = -1; cancelAnimationFrame(navRaf); };
addEventListener("wheel", cancelNav, { passive: true });
addEventListener("touchmove", cancelNav, { passive: true });

$("#rail").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (b) scrollToStop(+b.dataset.j);
});

$("#pan").addEventListener("click", () => setFree(!free));
$("#prev").addEventListener("click", () =>
  pinned != null ? stepPin(-1) : scrollToStop(stopNow() - 1));
$("#next").addEventListener("click", () =>
  pinned != null ? stepPin(1) : scrollToStop(stopNow() + 1));
$("#unpin").addEventListener("click", popPin);

addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT") return;
  const k = e.key;
  if (k === "p" || k === "P") { e.preventDefault(); setFree(!free); return; }
  if (free) {
    // Nothing else steers while the hand does; Escape is the way back.
    if (k === "Escape") { e.preventDefault(); setFree(false); }
    return;
  }
  const fwd = k === " " || k === "ArrowRight" || k === "PageDown" || k === "ArrowDown";
  const back = k === "ArrowLeft" || k === "PageUp" || k === "ArrowUp";
  if (pinned != null) {
    // Inside an appendix the arrows walk its own beats and nothing else. Home and End
    // belong to the rail, and the rail is not where you are.
    if (fwd || back) { e.preventDefault(); stepPin(fwd ? 1 : -1); }
    else if (k === "Escape") { e.preventDefault(); popPin(); }
    return;
  }
  if (fwd) {
    e.preventDefault(); scrollToStop(stopNow() + 1);
  } else if (back) {
    e.preventDefault(); scrollToStop(stopNow() - 1);
  } else if (k === "Home") { e.preventDefault(); scrollToStop(0); }
  else if (k === "End") { e.preventDefault(); scrollToStop(stops.length - 1); }
  else if (k === "f" || k === "F") document.documentElement.requestFullscreen?.();
});

// `finally`, because the flag latching on is unrecoverable: one throw inside apply(),
// or one rAF that never fires because the tab was in the background when the scroll
// happened, and the camera is frozen for the rest of the page's life with nothing on
// screen to say so.
let ticking = false;
addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { try { apply(); } finally { ticking = false; } });
}, { passive: true });
// A tab that was scrolled while hidden has a stale camera; re-sync when it comes back.
addEventListener("visibilitychange", () => { if (!document.hidden) apply(); });

let rt;
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(measure, 150); });

// Fonts, NOT images: every image on this page sits in a box with an explicit width
// and height, so nothing about the layout waits on one. Text does — #docBlock is
// framed around the answer callouts, whose height is whatever Lato makes it.
//
// This used to await `img.decode()` on all of them. Once the pile and the two sprite
// sheets took the count from 11 images to 23, one of those decodes stopped settling
// and took the whole module's top-level await down with it: the world was built and
// on screen, but measure() never ran, so there was no camera, no rail and no
// narration — and no error anywhere to say why.
await document.fonts.ready.catch(() => {});

measure();
// Cheap insurance: anything that does land late gets one free re-measure.
addEventListener("load", () => measure(), { once: true });
mountLive();

const wantedKF = KF.findIndex(k => k.id === WANTED);
if (wantedKF > 0) {
  // A link written straight to an appendix is somebody asking for it on purpose, which is
  // the same consent a click on a card gives. Park on the index first so backing out of
  // the pin lands somewhere that makes sense rather than on scene one.
  if (KF[wantedKF].appendix) {
    scrollToStop(stops.findIndex(s => KF[s.i].id === "appendix"), false);
    pinTo(KF[wantedKF].id);
  } else {
    scrollToStop(stops.findIndex(s => s.i === wantedKF), false);
  }
}
apply();

// Exposed for verify.interactions.ts — it needs to park the camera on a beat
// deterministically rather than guessing scroll offsets.
window.__story = {
  KF, measure, apply,
  get stops() { return stops; },
  scrollToStop,
  pinTo, unpin, popPin,
  get pinned() { return pinned; },
  get rail() { return TL; },
  scrollToKF: (i, smooth) => scrollToStop(stops.findIndex(s => s.i === i), smooth),
  get step() { return current; },
  get beat() { return currentBeat; },
};

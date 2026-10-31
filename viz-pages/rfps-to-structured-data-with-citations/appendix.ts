import { esc } from "@viz/kit";
import {
  type Box,
  COST,
  CROP,
  CROP2,
  D,
  MID,
  NOW26,
  fmt,
  node,
  px,
  short,
  srcLink,
} from "./world.js";
import { fieldsBy } from "./workbench.js";
import { nav } from "./world.js";

/* ── what each document cost ──────────────────────────────────────────────────── */

/* A corpus total is a number nobody can feel. Ten bars, cheapest to dearest, against the
   page counts the room has already seen, is the same fact in a shape you can argue with. */
const cost = node("node", COST);
cost.id = "cost";
const COST_ROW = Math.round(COST.h / (D.docs.length + 2));
const COST_BAR = COST.w - 11500;
const maxUsd = Math.max(...D.docs.map((d) => d.usd));
D.docs.forEach((d, i) => {
  const row = node("node", { x: 0, y: i * COST_ROW, w: COST.w, h: COST_ROW - 120 }, cost, {
    display: "flex",
    alignItems: "center",
    gap: "460px",
  });
  row.dataset["vizId"] = `cost-${d.stem}`;
  row.dataset["label"] = `${d.label}: $${d.usd.toFixed(2)} for ${d.pages} pages`;
  row.innerHTML = `<div style="width:6600px;white-space:nowrap;text-align:right">${srcLink(
    d.url,
    d.source,
    Math.round(COST_ROW * 0.32),
  )}</div>
     <div style="width:2000px;font-family:var(--mono);font-size:${Math.round(COST_ROW * 0.32)}px;
       color:var(--faint);white-space:nowrap">${d.pages}p</div>
     <div style="width:${Math.round((d.usd / maxUsd) * COST_BAR)}px;
       height:${Math.round(COST_ROW * 0.48)}px;background:var(--accent);opacity:.72;
       border-radius:60px"></div>
     <div style="font-family:var(--mono);font-size:${Math.round(COST_ROW * 0.36)}px;
       color:var(--ink);white-space:nowrap">$${d.usd.toFixed(2)}</div>`;
});
node("wlabel", null, cost, {
  left: px(6600),
  top: px(D.docs.length * COST_ROW + 600),
  fontSize: "560px",
  letterSpacing: ".08em",
  color: "var(--ink)",
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
export const ANSWERS_2026: {
  rows: [number, number];
  beat: number;
  k: string;
  v: string;
  c: string;
}[] = [
  {
    rows: [1, 3],
    beat: 1,
    k: "The platform reads the PDF",
    v: "Models take the file natively — page images and text layer paired for you. Three steps we wrote are now an upload.",
    c: "var(--t-teal)",
  },
  {
    rows: [4, 4],
    beat: 2,
    k: "Schema conformance is guaranteed",
    v: "Structured outputs went GA. <code>strict: true</code> does what our validator did — though not on the Bedrock path this ran on, which rejects it.",
    c: "var(--t-blue)",
  },
  {
    rows: [5, 5],
    beat: 3,
    k: "A layout model covers the gap",
    v: 'Measured once, by hand: Nemotron Parse 2.0 boxes the chart at IoU <b style="color:var(--ink)">0.94–0.98</b> — but <em>the chart</em>, not <em>a value</em>. It does not replace this step; it covers what matching and OCR cannot.',
    c: "var(--good)",
  },
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
  const row = node("station", { x: i * N_PITCH, y: 0, w: N_COL_W, h: N_STEP_H }, now26, {
    alignItems: "flex-start",
    textAlign: "left",
    padding: `0 ${px(360)}`,
    transition: "opacity .5s ease, border-color .5s ease, background .5s ease",
  });
  row.dataset["vizId"] = `step2025-${i}`;
  row.dataset["label"] = `2025 pipeline step: ${t}`;
  row.innerHTML = `<div style="font-family:var(--mono);font-size:${Math.round(N_FS * 0.19)}px;
    color:var(--ink);line-height:1.3">${esc(t)}</div>`;
  return row;
});

const n26Right = ANSWERS_2026.map((a) => {
  const x0 = a.rows[0] * N_PITCH;
  const w = (a.rows[1] - a.rows[0] + 1) * N_PITCH - N_GAP;
  const wrap = node("node", { x: x0, y: N_BRACKET_Y, w, h: NOW26.h - N_BRACKET_Y }, now26, {
    opacity: 0,
    transition: "opacity .55s ease",
  });
  wrap.dataset["vizId"] = `step2026-${a.beat}`;
  wrap.dataset["label"] = `2026: ${a.k}`;
  // The bracket is the encoding: its height says how many 2025 steps this one absorbs.
  node("node", { x: 0, y: 0, w, h: 90 }, wrap, {
    background: a.c,
    opacity: 0.85,
    borderRadius: "45px",
  });
  // The BRACKET height is the encoding (how many 2025 steps this absorbs); the box is
  // only its label, so it may grow past a single row without saying anything false.
  /* 8300, not 6400. The bracket's WIDTH is the encoding; the box is only its label, and
     two of the three answers absorb a single step, so their boxes are 4000 wide holding
     170 and 211 characters. At 6400 they overflowed by 900 and 1732 units and the text
     ran out of the box. The two single-step boxes cannot be widened — they are adjacent
     and would collide — so the label grows DOWN, which the vertical layout always
     allowed it to do and the rotation accidentally forbade. */
  const box = node("station", { x: 0, y: N_ANS_Y - N_BRACKET_Y, w, h: 8300 }, wrap, {
    alignItems: "flex-start",
    textAlign: "left",
    padding: `0 ${px(420)}`,
    borderColor: a.c,
  });
  box.innerHTML =
    // The heading scales with the box, because the boxes are not the same width: a
    // single-step answer is 4000 wide and "Schema conformance is guaranteed" at .25 set
    // four lines of mono hard against both edges. One size fits the widest box only.
    `<div style="font-family:var(--mono);font-size:${Math.round(N_FS * (w < 6000 ? 0.165 : 0.25))}px;
       color:${a.c};letter-spacing:.04em;line-height:1.25;margin-bottom:${px(200)}">${esc(a.k)}</div>
     <div style="font-size:${Math.round(N_FS * 0.175)}px;color:var(--muted);line-height:1.4">${a.v}</div>`;
  return wrap;
});

/** Reveal the 2026 answers one at a time, dimming the steps each one absorbs. */
export function now26Show(b: number): void {
  n26Left.forEach((row, i) => {
    const absorbed = ANSWERS_2026.some((a) => a.beat <= b && i >= a.rows[0] && i <= a.rows[1]);
    // .55, not .3: at .3 an absorbed step faded so far into the background that you could
    // not tell it had ever been a box, and "these three became one" needs the three to
    // still be legible as three. Dim is the point; gone is not.
    row.style.opacity = absorbed ? ".55" : "1";
  });
  n26Right.forEach((el, i) => {
    el.style.opacity = b >= ANSWERS_2026[i]!.beat ? "1" : "0";
  });
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
  ["Stalk Strength", 6],
  ["Root Strength", 7],
  ["Kernel Depth Potential", 8],
  ["Test Weight", 6],
  ["Early Vigor", 7],
  ["Drought Tolerance", 8],
  ["Greensnap", 5],
  ["Intactness", 7],
  ["Husk Cover", 6],
  ["Drydown", 8],
  ["GLS", 8],
  ["NCLB", 8],
  ["Physoderma", 4],
  ["Southern Rust", 6],
  ["Tar Spot", 6],
  ["Goss’", 6],
  ["Stalk Health", 5],
] satisfies [string, number][];

const crop = node("node", CROP);
crop.id = "crop";

/* The page itself, laid out at natural pixel size and scaled by transform — same rule
   as the page sprites: setting width on a big raster repaints it at world scale. */
const CROP_PAGE_W = 9200;
const cropPageWrap = node(
  "node",
  { x: 0, y: 0, w: CROP_PAGE_W, h: Math.round((CROP_PAGE_W * 1210) / 935) },
  crop,
  { overflow: "hidden" },
);
const cropPageImg = document.createElement("img");
cropPageImg.src = "assets/crop/ss427-p1.jpg";
cropPageImg.alt = "";
cropPageImg.width = 935;
cropPageImg.height = 1210;
Object.assign(cropPageImg.style, {
  position: "absolute",
  left: "0",
  top: "0",
  transformOrigin: "0 0",
  transform: `scale(${CROP_PAGE_W / 935})`,
});
cropPageWrap.append(cropPageImg);
cropPageWrap.dataset["vizId"] = "crop-page";
cropPageWrap.dataset["label"] = "Martin Seed SS-427-4 corn product profile, page 1";

/* The page image opens the real PDF. This beat's whole claim is that the values are not
   in the document's text — the fastest way to believe that is to open the document. It
   is public dealer literature; provenance and the verified hash are in
   samples/PROVENANCE.md. */
const CROP_URL =
  "https://www.martinseed.com/Product_profiles/2025-26_SS-427-4_TRE_Corn_Product_Profile.pdf";
const cropPageLink = document.createElement("a");
Object.assign(cropPageLink, { href: CROP_URL, target: "_blank", rel: "noopener" });
Object.assign(cropPageLink.style, {
  position: "absolute",
  inset: "0",
  pointerEvents: "auto",
  zIndex: "2",
});
cropPageLink.setAttribute("aria-label", "Open the Martin Seed SS-427-4 product profile PDF");
cropPageWrap.append(cropPageLink);
node("wlabel", null, crop, {
  left: "0",
  top: px(Math.round((CROP_PAGE_W * 1210) / 935) + 120),
  fontSize: px(320),
  letterSpacing: ".06em",
}).innerHTML = srcLink(CROP_URL, "martinseed.com · open the original", 320);

/* A red box over the ratings chart, in the same visual language the walkthrough uses
   for "this is the bit that matters". These fractions are the SAME clip the blow-up is
   taken from (298..500 x 366..602 of a 612x792 page), measured from the chart's own text
   extent, so the box and the enlargement cannot drift apart. */
const CROP_CLIP = { x0: 298, y0: 366, x1: 500, y1: 602 },
  CROP_PT = 612;
const cropMark = node(
  "mark solid",
  {
    x: Math.round((CROP_PAGE_W * CROP_CLIP.x0) / CROP_PT),
    y: Math.round((CROP_PAGE_W * CROP_CLIP.y0) / CROP_PT),
    w: Math.round((CROP_PAGE_W * (CROP_CLIP.x1 - CROP_CLIP.x0)) / CROP_PT),
    h: Math.round((CROP_PAGE_W * (CROP_CLIP.y1 - CROP_CLIP.y0)) / CROP_PT),
  },
  cropPageWrap,
  { borderWidth: "40px" },
);

/* The chart, blown up so the room can see that the values genuinely are not written. */
const CROP_CH_X = CROP_PAGE_W + 1400,
  CROP_CH_W = 6400;
const cropChartWrap = node(
  "node",
  { x: CROP_CH_X, y: 600, w: CROP_CH_W, h: Math.round((CROP_CH_W * 1115) / 955) },
  crop,
  { overflow: "hidden", opacity: 0, transition: "opacity .5s ease" },
);
const cropChartImg = document.createElement("img");
cropChartImg.src = "assets/crop/ss427-chart.jpg";
cropChartImg.alt = "";
cropChartImg.width = 955;
cropChartImg.height = 1115;
Object.assign(cropChartImg.style, {
  position: "absolute",
  left: "0",
  top: "0",
  transformOrigin: "0 0",
  transform: `scale(${CROP_CH_W / 955})`,
});
cropChartWrap.append(cropChartImg);

/* Two columns of the same seventeen traits: what the text layer hands you, and what
   measuring the bars hands you. The blank column IS the argument. */
const CROP_T_X = CROP_CH_X + CROP_CH_W + 1400,
  CROP_T_W = CROP.w - CROP_T_X;
const cropTable = node("node", { x: CROP_T_X, y: 0, w: CROP_T_W, h: CROP.h }, crop, {
  opacity: 0,
  transition: "opacity .5s ease",
});
const CR_ROW = 950; // fixed: type size must not follow the region's height
// "measurements it returned", not "trait": the three sheets beside this one head their
// tables with the extractor's own vocabulary, and this scene heading the same table with
// a different word made it look like a different method rather than the same one.
// .40, not .52: the column heads sit on one line and the value head starts at 60% of the
// table's width, so "measurements it returned" at the old size ran straight through it.
node("wlabel", null, cropTable, {
  left: "0",
  top: "0",
  fontSize: px(Math.round(CR_ROW * 0.4)),
  color: "var(--accent)",
}).textContent = "measurements it returned";
const cropValHead = node("wlabel", null, cropTable, {
  left: px(Math.round(CROP_T_W * 0.6)),
  top: "0",
  fontSize: px(Math.round(CR_ROW * 0.4)),
});
cropValHead.textContent = "text layer"; // becomes "discovered" once the run lands
const cropCells = CROP_RATINGS.map(([name, v], i) => {
  const row = node(
    "node",
    { x: 0, y: Math.round(CR_ROW * 1.5) + i * CR_ROW, w: CROP_T_W, h: CR_ROW - 60 },
    cropTable,
    { display: "flex", alignItems: "center" },
  );
  row.dataset["vizId"] = `crop-${name.replaceAll(/\W+/gu, "-").toLowerCase()}`;
  row.dataset["label"] =
    `${name}: rated ${v} on the drawn axis (which runs 2-10, though the printed legend says 1-9), recoverable only from the bar`;
  row.innerHTML = `<div style="width:${px(Math.round(CROP_T_W * 0.6))};font-family:var(--mono);
       font-size:${Math.round(CR_ROW * 0.48)}px;color:var(--muted);white-space:nowrap">${esc(name)}</div>
     <div class="cv" style="font-family:var(--mono);font-size:${Math.round(CR_ROW * 0.62)}px;
       color:var(--faint)">—</div>`;
  return row.querySelector<HTMLElement>(".cv")!;
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
const CROP_PANEL_TOP = Math.round((CROP_PAGE_W * 1210) / 935) + 500,
  CROP_PANEL_H = 4800;

const cropSchema = node(
  "station",
  { x: 0, y: CROP_PANEL_TOP, w: CROP_PAGE_W + 1400 + CROP_CH_W, h: CROP_PANEL_H },
  crop,
  {
    opacity: 0,
    transition: "opacity .5s ease",
    alignItems: "flex-start",
    textAlign: "left",
    padding: `0 ${px(520)}`,
    borderColor: "var(--t-violet)",
  },
);
cropSchema.dataset["vizId"] = "crop-discovered";
cropSchema.dataset["label"] = "The keys were discovered, not declared";
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
cropSchema.innerHTML = `<div style="font-family:var(--mono);font-size:${Math.round(CR_ROW * 0.5)}px;color:var(--t-violet);
     letter-spacing:.04em;margin-bottom:${px(180)}">nobody told it what to look for</div>
   <div style="font-size:${Math.round(CR_ROW * 0.58)}px;color:var(--ink);line-height:1.3;
     font-weight:700;margin-bottom:${px(200)}">It asked the page what it had, and the page said
     ${CROP_OPEN.attrs} attributes and ${CROP_OPEN.measures} measurements.</div>
   <div style="font-size:${Math.round(CR_ROW * 0.44)}px;color:var(--muted);line-height:1.4">
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

const cropCite = node(
  "station",
  {
    x: 0,
    y: CROP_PANEL_TOP + CROP_PANEL_H + 500,
    w: CROP_PAGE_W + 1400 + CROP_CH_W,
    h: CROP_PANEL_H,
  },
  crop,
  {
    opacity: 0,
    transition: "opacity .5s ease",
    alignItems: "flex-start",
    textAlign: "left",
    padding: `0 ${px(520)}`,
    borderColor: "var(--warn)",
  },
);
cropCite.dataset["vizId"] = "crop-citations";
cropCite.dataset["label"] = "The values are right and the evidence check cannot confirm them";
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
cropCite.innerHTML = `<div style="font-family:var(--mono);font-size:${Math.round(CR_ROW * 0.5)}px;color:var(--warn);
     letter-spacing:.04em;margin-bottom:${px(180)}">a separate fixed-schema run · ${CROP_CITES.chartFound} of ${CROP_CITES.chartTotal} chart citations located</div>
   <div style="font-size:${Math.round(CR_ROW * 0.58)}px;color:var(--ink);line-height:1.3;
     font-weight:700;margin-bottom:${px(200)}">The quote it gives for a bar is
     <span style="font-family:var(--mono)">| Goss’ | 6 |</span>.</div>
   <div style="font-size:${Math.round(CR_ROW * 0.44)}px;color:var(--muted);line-height:1.4">
     A row of the markdown we wrote from the picture. True, and nowhere in the PDF.</div>`;

/** Reveal: page → chart → the empty column → the recovered column → the schema. */
export function cropShow(b: number): void {
  cropMark.classList.toggle("on", b >= 1);
  cropChartWrap.style.opacity = b >= 1 ? "1" : "0";
  cropTable.style.opacity = b >= 2 ? "1" : "0";
  cropValHead.textContent = b >= 3 ? "read off the bar" : "text layer";
  cropCells.forEach((cell, i) => {
    cell.textContent = b >= 3 ? String(CROP_RATINGS[i]![1]) : "—";
    cell.style.color = b >= 3 ? "var(--good)" : "var(--faint)";
  });
  cropSchema.style.opacity = b >= 4 ? "1" : "0";
  cropCite.style.opacity = b >= 5 ? "1" : "0";
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
export const CROP_DOCS: Record<string, { kf: string; name: string; short: string }> = {
  "martin-seed-ss427-4-corn": {
    kf: "crop",
    name: "Martin Seed SS-427-4",
    short: "the value is a bar length",
  },
  "armor-1575-corn": { kf: "crop-armor", name: "Armor Seed 1575", short: "no numbers on the axis" },
  "dekalb-2021-corn-agronomic-ratings-p13": {
    kf: "crop-dekalb",
    name: "DEKALB 2021 ratings",
    short: "every header turned sideways",
  },
  "martin-seed-m355xf-soybean": {
    kf: "crop-soy",
    name: "Martin Seed M355-XF",
    short: "a different crop entirely",
  },
};

const crophub = node("node", CROP2);
crophub.id = "crophub";
export let crophubShow: (b: number) => void;
{
  // Equal HEIGHT, not equal width: one of the four is landscape, and a shared width would
  // have stood a squat sheet beside three tall ones. Widths follow each page's own aspect.
  const H = 6800,
    GAP = 1200;
  const W = D.crops.map((c) => Math.round((H * c.img.w) / c.img.h));
  const total = W.reduce((a, b) => a + b, 0) + GAP * (D.crops.length - 1);
  let x = Math.round((CROP2.w - total) / 2);
  D.crops.forEach((c, i) => {
    const doc = CROP_DOCS[c.stem]!;
    const w = W[i]!,
      left = x;
    x += w + GAP;
    const cropCard = node("node", { x: left, y: 0, w, h: H + 4200 }, crophub, {
      pointerEvents: "auto",
      cursor: "pointer",
    });
    cropCard.dataset["vizId"] = `crophub-${c.stem}`;
    cropCard.dataset["label"] = `Open ${c.subject} — ${doc.short}`;
    const sheet = node("sheet", { x: 0, y: 0, w, h: H }, cropCard, {
      transition: "box-shadow .25s ease",
    });
    sheet.innerHTML = `<img src="${c.img.src}" alt="${esc(c.subject)}, page 1">`;
    const cap = node("wlabel", null, cropCard, {
      left: "0",
      top: px(H + 300),
      width: px(w),
      fontSize: "300px",
      letterSpacing: ".1em",
      color: "var(--t-blue)",
      whiteSpace: "normal",
      lineHeight: "1.3",
    });
    cap.textContent = doc.short;
    // Held to the sheet's own width and allowed to wrap. At nowrap these ran straight
    // through the caption of the cropCard to the right.
    const nums = node("wlabel", null, cropCard, {
      left: "0",
      top: px(H + 900),
      width: px(w),
      fontSize: "250px",
      letterSpacing: ".08em",
      color: "var(--faint)",
      whiteSpace: "normal",
      lineHeight: "1.35",
    });
    nums.textContent = `${c.attributes} attributes · ${c.measurements} measurements`;
    nums.style.fontSize = "230px"; // 250 wrapped the narrowest cropCard onto two lines
    const go = node("wlabel", null, cropCard, {
      left: "0",
      top: px(H + 1900),
      width: px(w),
      fontSize: "280px",
      letterSpacing: ".16em",
      color: "var(--accent)",
    });
    go.textContent = "open →";
    cropCard.addEventListener("click", () => nav.pinTo(doc.kf, true));
    cropCard.addEventListener("pointerenter", () => {
      sheet.style.boxShadow = "0 0 0 90px var(--accent), 0 60px 160px rgba(0,0,0,.55)";
    });
    cropCard.addEventListener("pointerleave", () => {
      sheet.style.boxShadow = "";
    });
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
  const method = node("station", { x: 0, y: 12200, w: CROP2.w, h: 4600 }, crophub, {
    opacity: 0,
    transition: "opacity .5s ease",
    alignItems: "flex-start",
    textAlign: "left",
    padding: `0 ${px(700)}`,
    borderColor: "var(--t-violet)",
  });
  method.dataset["vizId"] = "crophub-method";
  method.dataset["label"] = "How these four are extracted without a schema";
  method.innerHTML = `<div style="font-family:var(--mono);font-size:460px;color:var(--t-violet);
       letter-spacing:.04em;margin-bottom:240px">no two of these are the same shape</div>
     <div style="font-size:560px;font-weight:700;color:var(--ink);line-height:1.3;
       margin-bottom:240px">One pass asks the document what it has. A second asks for those values.</div>
     <div style="font-size:400px;color:var(--muted);line-height:1.45">
       The keys come back in the page's own words — Goss’ Wilt, SCN race, Gibberella ear rot —
       and nothing in this pipeline has heard of any of them.</div>
     <div style="font-size:360px;color:var(--warn);line-height:1.45;margin-top:200px">
       There is no third pass. Nothing on this path draws a box.</div>`;
  crophubShow = (b) => {
    method.style.opacity = b >= 1 ? "1" : "0";
  };
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
const CROP_D: Box = { x: MID - 30000 / 2, y: 0, w: 30000, h: 22000 };
export const cropDetail: Record<string, (b: number) => void> = {};
D.crops
  .filter((c) => CROP_DOCS[c.stem]!.kf !== "crop")
  .forEach((c, n) => {
    const doc = CROP_DOCS[c.stem]!;
    const box = { ...CROP_D, y: 242000 + n * 24000 };
    const scene = node("node", box);
    scene.id = doc.kf;

    // Height-led, then capped: the landscape sheet at a shared height came out 17,000 wide
    // and left no room for the tables the scene exists to show.
    const pw = Math.min(14000, Math.round((11000 * c.img.w) / c.img.h));
    const ph = Math.round((pw * c.img.h) / c.img.w);
    const sheet = node("sheet", { x: 0, y: 0, w: pw, h: ph }, scene);
    sheet.innerHTML = `<img src="${c.img.src}" alt="${esc(c.subject)}, page 1">`;
    sheet.dataset["vizId"] = `${doc.kf}-page`;
    sheet.dataset["label"] = `${c.subject} — ${c.docType}`;
    node("wlabel", null, scene, {
      left: "0",
      top: px(ph + 260),
      width: px(pw),
      textTransform: "none",
      whiteSpace: "normal",
    }).innerHTML = c.url
      ? srcLink(c.url, new URL(c.url).hostname.replace(/^www\./u, "") + " · open the original", 300)
      : "";

    const TX = pw + 1800,
      TW = CROP_D.w - TX,
      ROW = 720;
    /** A key/value table that reveals as a block. `dash` renders a null as the extractor
     *  declining rather than as a blank nobody can tell from an unset row. */
    const table = (y: number, rows: (string | null)[][], head: string, dash: string) => {
      const el = node("node", { x: TX, y, w: TW, h: rows.length * ROW + ROW * 2 }, scene, {
        opacity: 0,
        transition: "opacity .5s ease",
      });
      node("wlabel", null, el, {
        left: "0",
        top: "0",
        fontSize: px(Math.round(ROW * 0.52)),
        color: "var(--accent)",
      }).textContent = head;
      rows.forEach(([k, v], i) => {
        const missing = v === null || v === undefined;
        const row = node(
          "node",
          { x: 0, y: Math.round(ROW * 1.5) + i * ROW, w: TW, h: ROW - 40 },
          el,
          { display: "flex", alignItems: "center", gap: px(400) },
        );
        row.innerHTML = `<div style="width:52%;font-family:var(--mono);font-size:${Math.round(ROW * 0.46)}px;
           color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(k)}</div>
         <div style="flex:1;font-family:var(--mono);font-size:${Math.round(ROW * 0.46)}px;
           color:${missing ? "var(--faint)" : "var(--ink)"};white-space:nowrap;
           overflow:hidden;text-overflow:ellipsis">${missing ? dash : esc(short(v, 44))}</div>`;
      });
      return el;
    };

    // Eight of each at most. These tables are evidence that the run named real things in the
    // page's own words, not a data dump — DEKALB's 11 attributes are whole columns of a
    // table flattened into one string each, and four of those fill the frame on their own.
    const attrs = table(0, c.attrRows.slice(0, 8), "attributes it named", "—");
    const meas = table(
      Math.round(ROW * 1.5) + 9 * ROW,
      c.measRows.slice(0, 8),
      "measurements it returned",
      "declined",
    );

    /* Full width, under both columns. In a `pw`-wide column beside the page it was a
     30-line ribbon of text that started level with the source link and ran off the bottom
     of the frame; the note is a paragraph and wants a paragraph's shape. 16,200 clears the
     taller of the two tables. */
    const scalePanel = node("station", { x: 0, y: 16200, w: CROP_D.w, h: 5600 }, scene, {
      opacity: 0,
      transition: "opacity .5s ease",
      alignItems: "flex-start",
      textAlign: "left",
      padding: `0 ${px(560)}`,
      borderColor: "var(--t-violet)",
    });
    scalePanel.dataset["vizId"] = `${doc.kf}-scale`;
    // Truncated on screen, whole in the label: DEKALB's note is 700 characters and ends by
    // reciting every hybrid's rating, which is fascinating and is not a thing anyone reads
    // off a wall. The full text stays available to anything inspecting the canvas.
    scalePanel.dataset["label"] = c.scaleNote;
    scalePanel.innerHTML = `<div style="font-family:var(--mono);font-size:440px;color:var(--t-violet);
       letter-spacing:.04em;margin-bottom:220px">the scale, in its own words</div>
     <div style="font-size:400px;color:var(--muted);line-height:1.45">${esc(short(c.scaleNote, 260))}</div>`;

    cropDetail[doc.kf] = (b) => {
      attrs.style.opacity = b >= 1 ? "1" : "0";
      meas.style.opacity = b >= 2 ? "1" : "0";
      scalePanel.style.opacity = b >= 3 ? "1" : "0";
    };
  });

// Where the reader has got to at each beat. Page 1 alone carries ten of the fifteen,
// and the last fourteen pages carry nothing — which is the point, and is only visible
// if the beats stop where the citations actually are.
export const READ_STOPS = [0, 1, 4, 8, D.hero.pages];
/* How many rows the record actually gains at a stop. Counted, not written down: these
   captions said "Two more" where the screen filled one, because pages 3 and 4 both cite
   only `scope`. A number typed next to a number the code computes will drift from it. */
export const gained = (b: number): string =>
  ["No", "One", "Two", "Three", "Four", "Five"][
    fieldsBy(READ_STOPS[b]!).size - fieldsBy(READ_STOPS[b - 1]!).size
  ] ?? "More";

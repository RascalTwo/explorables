import { esc } from "@viz/kit";
import { APPX, D, FIELD_KEYS, type Keyframe, WPM, node } from "./world.js";
import { arrow, card, pilePick, preShow, sumShow } from "./intro.js";
import {
  SAME_FACT,
  docCap,
  galItems,
  galPanelOff,
  gridWrap,
  heroCells,
  heroCited,
  heroMarks,
  heroPageMarks,
  monBlock,
  monCap,
  monCells,
  monCited,
  panel,
  panelBack,
  panelRows,
} from "./hero.js";
import {
  TRACE_KF,
  benchBadge,
  benchFill,
  benchGrid,
  benchMode,
  benchNote,
  benchPages,
  benchTime,
  clockText,
  fieldsBy,
  line,
  lineShow,
  wordsTo,
} from "./workbench.js";
import {
  ANSWERS_2026,
  CROP_DOCS,
  READ_STOPS,
  cropDetail,
  cropShow,
  crophubShow,
  gained,
  now26Show,
} from "./appendix.js";
import { nav } from "./world.js";

/* ═══════════════════════════════════════════════════════════════════════════════
   KEYFRAMES — each names an element to frame, how many beats it holds, and what the
   narration says. `body` may be a function of the beat index, in which case the
   narration is re-rendered on every press: a stepper whose caption never changes is
   a stepper you stop trusting.
   ═══════════════════════════════════════════════════════════════════════════════ */

export const KF: Keyframe[] = [
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
    id: "preamble",
    el: "#preamble",
    pad: 0.05,
    beats: 4,
    eyebrow: "Before any of this",
    title: (b) =>
      [
        "This is not on your roadmap.",
        "An RFP: someone says what they need, and vendors bid.",
        "It was built in early 2025, on the models of early 2025.",
        "If you leave with one thought, make it this.",
      ][b],
    body: "",
    // preShow(0), not preShow(-1): enter() runs after on(), so hiding everything here
    // left the scene blank on arrival. Same shape as the crop scene.
    enter() {
      preShow(0);
    },
    on(b) {
      preShow(b);
    },
  },
  {
    /* The cold open, and the only scene on this canvas that stands entirely on its own.
       Somebody who saw this and nothing else would still know what the problem is. Four
       beats: what arrives, where it has to end up, what is between them today, and the
       promise that the rest of the piece closes that gap. */
    id: "summary",
    el: "#summary",
    pad: 0.05,
    beats: 4,
    eyebrow: "Start line, finish line",
    title: (b) =>
      [
        "This is what arrives.",
        "This is where it has to end up.",
        "Today, the only thing in between is a person reading.",
        "The rest of this is how we close that gap.",
      ][b],
    body: "",
    on(b) {
      sumShow(b);
    },
  },
  {
    /* The piece opened on the pile for a long time, and that buried the lead: a pile of
       PDFs is not a problem anybody has. An inbox full of links, on a Monday, is. */
    id: "inbox",
    el: "#mailBox",
    pad: 0.06,
    beats: 1,
    eyebrow: "Where the work arrives",
    title: "It starts as email.",
    // Senders and links are the real ones, from samples/PROVENANCE.md.
    body: "",
    enter() {
      arrow.style.opacity = "0";
      card.style.opacity = "0";
      pilePick(false);
    },
  },
  {
    id: "fetch",
    el: "#fetchBox",
    pad: 0.1,
    beats: 1,
    eyebrow: "Out of scope",
    title: "Automated retrieval collects the document.",
    // There is a real scraper. It is drawn as a step you are asked to take on trust,
    // because that is what it is here — and nothing after this point is.
    body: "",
  },
  {
    // No body. The title is the whole claim and the pile is the evidence; anything
    // more is a paragraph the room reads instead of listening to the person talking.
    id: "problem",
    el: "#introPile",
    pad: 0.04,
    beats: 1,
    eyebrow: "What comes out the other end",
    title: "Everyone sends paper. Nobody sends the same paper.",
    body: "",
    enter() {
      arrow.style.opacity = "0";
      card.style.opacity = "0";
      pilePick(false);
    },
  },
  {
    // Scoped to the pile and the record, not to `#intro` — the intro is the whole
    // five-link chain now, and framing all of it puts this shot two screens out.
    id: "need",
    el: "#chainCore",
    pad: 0.03,
    beats: 2,
    eyebrow: "What the business actually wants",
    // "Identical every time" was falsified by the page's own corpus table, which shows
    // providence at 20 — it was additionally run with the four image-only VISUAL_FIELDS
    // and castMarkings. The 15 really are asked of every document; they are just not the
    // whole of what one document was asked. The wording now says only the true half.
    title: `${FIELD_KEYS.length} fields, the same for every document.`,
    body: "",
    enter() {
      arrow.style.opacity = "1";
      card.style.opacity = "1";
    },
    on(b) {
      pilePick(b >= 1);
    },
  },
  {
    /* This used to be preceded by a `line` scene that framed the top half of page 1 to
       light one citation box. Cut: the flight into it crossed the pile's own caption at
       reading size and landed at ~40x, so the room read a slab of legalese, and the
       very next scene pulled straight back out of it again. The dive now lands on the
       page, which is the smallest thing that is still recognisably a document. */
    id: "page",
    el: "#heroSheet",
    pad: 0.16,
    beats: 1,
    eyebrow: "So: one of them",
    title: "Page 1 of a Request for Proposals.",
    enter() {
      panel.style.opacity = panelBack.style.opacity = "0";
      heroMarks.forEach((m) => m.el.classList.remove("on"));
    },
    body: "",
  },
  {
    // Scoped to this panel: `.callout` is a bare document-wide selector, and the gallery
    // panel's rows are callouts too — framing all of them pulled this shot 30,000 units
    // out to include a scene that hasn't happened yet.
    id: "answers",
    el: "#docBlock",
    fit: ["#heroSheet", "#heroPanel .callout"],
    pad: 0.1,
    beats: D.hero.marks.length,
    eyebrow: "What a bidder actually needs",
    title: `${D.hero.marks.length} of the ${FIELD_KEYS.length} columns are on this one page.`,
    // One press, one field — and the field and its value are already in the panel, at
    // reading size. Saying them again in the card was the same sentence twice.
    body: "",
    enter() {
      panel.style.opacity = panelBack.style.opacity = "1";
    },
    on(b) {
      // heroMarks.i indexes the FIELD, not the rect — a field with two cited spans
      // lights both at once, in step with its one answer row.
      heroMarks.forEach((m) => {
        m.el.classList.toggle("on", m.i <= b);
      });
      panelRows.forEach((r, i) => {
        r.classList.toggle("on", i <= b);
      });
    },
  },
  {
    /* Two beats, not three. The middle one lit the cited pages without dimming the
       rest, so the finding — six of twenty-two — had to be counted off a grid where
       everything was equally bright. Ringing and dimming are one moment. */
    id: "doc",
    el: "#docBlock",
    pad: 0.1,
    beats: 2,
    eyebrow: "Pull back again",
    title: `That page is one of ${D.hero.pages}.`,
    body: "",
    enter() {
      panel.style.opacity = panelBack.style.opacity = "0";
      heroMarks.forEach((m) => m.el.classList.add("on"));
    },
    on(b) {
      docCap(b >= 1);
      heroCells.forEach((c, i) => {
        c.classList.add("seen");
        c.classList.toggle("hit", b >= 1 && heroCited.has(i + 1));
      });
      heroPageMarks.forEach((m) => {
        m.classList.toggle("on", b >= 1);
      });
      gridWrap.classList.toggle("spotlight", b >= 1);
    },
  },
  {
    id: "gallery",
    el: "#gallery",
    pad: 0.07,
    beats: 2,
    eyebrow: "Now the others",
    title: "Ten real solicitations. No two alike.",
    body: "",
    enter() {
      gridWrap.classList.remove("spotlight");
      panel.style.opacity = panelBack.style.opacity = "0";
      galPanelOff();
    },
    on(b) {
      galItems.forEach((g) => {
        g.stack.style.opacity = b >= 1 ? "1" : "0";
        g.pp.style.opacity = b >= 1 ? "1" : "0";
        g.marks.forEach((m) => m.classList.remove("on"));
      });
    },
  },
  SAME_FACT,
  {
    id: "corpus",
    el: "#corpusFrame",
    pad: 0.03,
    beats: 1,
    eyebrow: "All of it at once",
    // The headline in the world says the size now, so the card says the consequence,
    // which is the thing the picture cannot say and the next two scenes are about.
    title: "Somebody has to read all of it.",
    body: "",
    // Word counts come from the pipeline's own extracted text, not estimated from
    // page counts. Reading time at 238 wpm (Brysbaert 2019).
    enter() {
      gridWrap.classList.remove("spotlight");
      heroCells.forEach((c) => c.classList.remove("hit"));
      galItems.forEach((g) => g.marks.forEach((m) => m.classList.add("on")));
      galPanelOff(); // it sits outside the corpus frame, and this shot is the corpus
    },
  },
  {
    /* Two beats. The middle one lit the cited pages without dimming the rest, which is
       the same non-moment it was on the hero document. */
    id: "monster",
    el: "#monScene",
    pad: 0.04,
    beats: 2,
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
    id: "human",
    el: "#bench",
    pad: 0.04,
    beats: READ_STOPS.length,
    eyebrow: "What a person does",
    title: (b) =>
      [
        "Open it. Twenty-two pages.",
        `Page 1 gives up ${D.hero.citedPages["1"].length} of the ${FIELD_KEYS.length}.`,
        `Keep reading. ${gained(2)} more.`,
        `Keep reading. ${gained(3)} more.`,
        "Three of them were never in the document.",
      ][b],
    // Reading rate is Brysbaert 2019: 190 studies, 18,573 participants.
    body: "",
    enter() {
      line.style.opacity = "0";
      benchGrid.wrap.style.opacity = "1";
      benchBadge("human");
      benchNote.textContent = "";
    },
    on(b) {
      const n = READ_STOPS[b]!,
        last = b === READ_STOPS.length - 1;
      benchPages({ read: n, cited: true });
      benchFill(fieldsBy(n), last);
      benchMode.textContent = n
        ? `Reading · page ${n} of ${D.hero.pages}`
        : "Reading · not started";
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
    id: "machine",
    el: "#bench",
    pad: 0.04,
    beats: 6,
    eyebrow: "What the pipeline does",
    title: (b) =>
      [
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
    enter() {
      line.style.opacity = "1";
      benchGrid.wrap.style.opacity = "0";
      benchBadge("machine");
    },
    on(b) {
      // The hero is NOT guaranteed to be in `runs`. build-assets.py only counts a run
      // as a clean parallel burst if it averaged under 2s/page, and re-converting the
      // hero with carry-context — in order, ~20s a page — drops it straight out of the
      // list. This was an unguarded .find().seconds, so the day that happened the scene
      // threw on every beat and the whole thing sat there unanimated. Fall back to the
      // corpus's own measured rate, which is the same number this clock always meant.
      const run = D.throughput.runs.find((r) => r.stem === D.hero.stem);
      const secs = run ? run.seconds : (D.hero.pages / D.throughput.pagesPerMin) * 60;
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
      benchNote.textContent =
        b >= 4
          ? "conversion only — extract and locate are not in this number"
          : b >= 2
            ? "conversion time measured on the parallel path"
            : "";
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
      ][b]!;
    },
  },
  ...TRACE_KF,
  {
    id: "live",
    el: "#liveWall",
    pad: 0.04,
    beats: 1,
    eyebrow: "Live, right now",
    title: "Every value lands somewhere you can click, and traces back to its page.",
    body: "",
    enter() {
      nav.nudgeLive();
      setTimeout(nav.nudgeLive, 900);
    },
  },
  {
    /* The last stop on the rail, and the reason the three scenes after it are not stops
       at all. They are unrelated single-scene detours, and running the rail straight
       through them meant the final flight of the piece set you down inside one with no
       idea why you were there — a bar chart of ten documents arriving unannounced after
       the live surfaces reads as a bug, not an appendix. */
    id: "appendix",
    el: "#appendix",
    pad: 0.06,
    beats: 1,
    eyebrow: "Appendix",
    title: "Three things we did not get to.",
    body: "",
  },
  {
    id: "cost",
    el: "#cost",
    pad: 0.06,
    beats: 1,
    appendix: "cost",
    eyebrow: "Appendix · what it cost",
    title: `Ten documents. $${D.corpus.usd}.`,
    body: "",
  },
  {
    id: "now26",
    el: "#now26",
    pad: 0.05,
    beats: 4,
    appendix: "now26",
    eyebrow: "Appendix · the year is 2026",
    title: (b) =>
      [
        `This took six steps. Now it takes ${ANSWERS_2026.length}.`,
        "Three of them are an upload now.",
        "The schema is enforced by the server.",
        "The box comes back with the text.",
      ][b],
    body: "",
    enter() {
      now26Show(0);
    },
    on(b) {
      now26Show(b);
    },
  },
  {
    id: "crop",
    el: "#crop",
    pad: 0.05,
    beats: 6,
    appendix: "crop",
    eyebrow: "Appendix · harder documents",
    title: (b) =>
      [
        "Not every answer is a sentence.",
        "Seventeen ratings. Read them off.",
        "Here is everything the text layer knows.",
        "Measure the bars and every one lands on an integer — on an axis the legend contradicts.",
        "And nobody had to write a schema for any of it.",
        "And here is the part we did not expect.",
      ][b],
    body: "",
    enter() {
      cropShow(0);
    },
    on(b) {
      cropShow(b);
    },
  },
];

/* The `harder documents` appendix is itself an index, so its FIRST frame is the wall and
   the four documents hang off it. Splicing them in here rather than writing them into the
   literal above keeps the four detail scenes generated from D.crops — the alternative was
   four near-identical keyframe objects differing only in a stem. */
{
  const at = KF.findIndex((k) => k.id === "crop");
  KF.splice(at, 0, {
    /* The wall. Its own frame rather than more beats on a document, because beats cannot
       move the camera and these are different floors of the canvas. */
    id: "crophub",
    el: "#crophub",
    pad: 0.05,
    beats: 2,
    appendix: "crop",
    eyebrow: "Appendix · harder documents",
    title: (b) =>
      [
        "Four documents. Four different places to break.",
        "None of them share a schema. Nothing does.",
      ][b],
    body: "",
    enter() {
      crophubShow(0);
    },
    on(b) {
      crophubShow(b);
    },
  });
  /* Numbers in the titles are interpolated, not typed: `5 of 7 came back empty` is the
     finding, and a finding written by hand beside a number the code computes will drift
     from it the first time anything is re-run. */
  const TITLES: Record<string, (c: (typeof D.crops)[number]) => string[]> = {
    "crop-armor": (c) => [
      "A bar chart with no scale under it.",
      `${c.attributes} things it named off the page.`,
      `${c.measurements} measurements. ${c.nulls} came back empty.`,
      "It would not guess, and it said why.",
    ],
    "crop-dekalb": (c) => [
      "Eight hybrids. A table of nothing but text.",
      `${c.attributes} attributes — each one a whole column.`,
      `${c.measurements} measurements. All ${c.nulls} empty.`,
      "Nothing is a picture. The headers are sideways.",
    ],
    "crop-soy": (c) => [
      "A different crop entirely.",
      `${c.attributes} attributes, and not one of them corn.`,
      `${c.measurements} measurement. The rest are words.`,
      "Nothing in the code knew what a soybean was.",
    ],
  };
  D.crops
    .filter((c) => CROP_DOCS[c.stem]!.kf !== "crop")
    .forEach((c) => {
      const kf = CROP_DOCS[c.stem]!.kf,
        titles = TITLES[kf]!(c);
      KF.push({
        id: kf,
        el: `#${kf}`,
        pad: 0.05,
        beats: 4,
        appendix: "crop",
        // CROP_DOCS.name, not c.subject: the run's own subject key is up to 58 characters
        // of trademark ("ARMOR SEED 1575 (VT Double PRO® RIB Complete®) corn hybrid") and
        // the eyebrow is set in caps at the top of the frame.
        eyebrow: `Appendix · ${CROP_DOCS[c.stem]!.name}`,
        title: (b) => titles[b],
        body: "",
        enter() {
          cropDetail[kf]!(0);
        },
        on(b) {
          cropDetail[kf]!(b);
        },
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
  const N = new Set(KF.filter((k) => k.appendix).map((k) => k.appendix)).size;
  const GAP = 900,
    APPX_CARD_W = Math.round((APPX.w - (N - 1) * GAP) / N);
  const IDLE: [string, string] = ["rgba(63,143,212,.45)", "rgba(10,26,53,.62)"];
  const HOVER: [string, string] = ["rgba(55,217,160,.75)", "rgba(8,44,36,.34)"];
  // One tile per appendix, not per keyframe: `harder documents` is two frames now, and
  // `k.appendix` is the group name they share. The tile opens the first of them.
  const heads = KF.filter(
    (k, i) => k.appendix && KF.findIndex((x) => x.appendix === k.appendix) === i,
  );
  heads.forEach((k, i) => {
    const tile = node(
      "node",
      { x: i * (APPX_CARD_W + GAP), y: 0, w: APPX_CARD_W, h: APPX.h },
      appendixScene,
      {
        border: `24px solid ${IDLE[0]}`,
        borderRadius: "260px",
        background: IDLE[1],
        padding: "900px 800px",
        boxSizing: "border-box",
        pointerEvents: "auto",
        cursor: "pointer",
        transition: "border-color .25s ease, background .25s ease",
      },
    );
    tile.dataset["vizId"] = `appendix-${k.id}`;
    tile.dataset["label"] = `Open the appendix: ${k.eyebrow}`;
    tile.innerHTML = `<div style="font-family:var(--mono);font-size:420px;letter-spacing:.14em;
         text-transform:uppercase;color:var(--t-blue);margin-bottom:620px">${esc(
           k.eyebrow.replace(/^Appendix\s*·\s*/iu, ""),
         )}</div>
       <div style="font-size:520px;font-weight:700;color:var(--ink);line-height:1.3">${esc(
         typeof k.title === "function" ? k.title(0) : k.title,
       )}</div>
       <div style="font-family:var(--mono);font-size:380px;letter-spacing:.16em;
         text-transform:uppercase;color:var(--accent);margin-top:760px">open &rarr;</div>`;
    tile.addEventListener("click", () => nav.pinTo(k.id));
    const paintCard = ([b, g]: [string, string]) => {
      tile.style.borderColor = b;
      tile.style.background = g;
    };
    tile.addEventListener("pointerenter", () => paintCard(HOVER));
    tile.addEventListener("pointerleave", () => paintCard(IDLE));
  });
}

export const beatsOf = (k: Keyframe): number => k.beats ?? 1;
// A one-beat scene needs a screen and a bit; a ten-beat scene needs ten times the
// dwell or the beats are back to sharing a trackpad flick between them.
export const dwellOf = (k: Keyframe): number => k.dwell ?? 0.53 + 0.42 * beatsOf(k);

import { esc } from "@viz/kit";
import { type Box, D, FIELD_KEYS, HERO_W, WPM, fmt, human, node, px } from "./world.js";

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
const ARROW_W = 2400,
  CARD_W = 10000;
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
const MAIL_W = 12600,
  FETCH_W = 8600;
// One x per link in the chain, so inserting or resizing a link moves everything after it.
const CX_PILE = MAIL_W + ARROW_W + FETCH_W + ARROW_W;
const CX = { mail: 0, fetch: MAIL_W + ARROW_W, pile: CX_PILE, card: CX_PILE + PILE_W + ARROW_W };

const INTRO: Box = { x: 0, y: 0, w: CX.card + CARD_W, h: Math.max(PILE_H + CAP_H, CARD_H) };
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
  const s = node(
    "sheet",
    {
      x: (i % PILE.cols) * (COVER_W + PILE.gapX),
      y: Math.floor(i / PILE.cols) * (COVER_H + PILE.gapY),
      w: COVER_W,
      h,
    },
    pile,
  );
  s.innerHTML = `<img src="${doc.cover.src}" alt="${esc(doc.label)}, page 1">`;
  s.dataset["vizId"] = `pile-${doc.stem}`;
  s.dataset["label"] = `${doc.label} — ${doc.pages} pages`;
});
// Centred under the pile it is a caption for; left-aligned it read as a stray label
// hanging off the first column.
node("wlabel", null, pile, {
  left: px(0),
  top: px(PILE_H + 340),
  width: px(PILE_W),
  textAlign: "center",
  fontSize: "440px",
  letterSpacing: ".08em",
  // "Senders" was the wrong noun, not the wrong number: providenceri.gov sent two of the
  // ten, so there are nine hosts and the line read as a correction of itself. Documents and
  // layouts genuinely are ten and ten, and the point being made is that none of them match
  // — which is about the layouts, not about who posted them.
}).textContent = `${D.corpus.docs} documents · ${D.corpus.docs} layouts · 0 templates`;

/* Which of the ten the camera is about to open. The next shot is page 1 of one of these
 * covers, and at pile altitude a cover is ~100px of grey — there is nothing in it that
 * says "this is the Flagstaff one", so the dive read as a cut to an unrelated document.
 * A ring and a label, on their own beat, are the connective tissue. */
const heroDoc = D.docs.find((d) => d.stem === D.hero.stem)!;
const heroI = D.docs.indexOf(heroDoc);
const heroCover = {
  x: (heroI % PILE.cols) * (COVER_W + PILE.gapX),
  y: Math.floor(heroI / PILE.cols) * (COVER_H + PILE.gapY),
  w: COVER_W,
  h: Math.round(COVER_W * (heroDoc.cover.h / heroDoc.cover.w)),
};
const pileRing = node("node", heroCover, pile, {
  boxShadow: "0 0 0 44px var(--accent), 0 0 300px 90px rgba(55,217,160,.30)",
  opacity: 0,
  transition: "opacity .5s ease",
  pointerEvents: "none",
});
// Centred under the cover it points at, and clamped so it cannot leave the pile in
// either direction. It was right-aligned to the cover's own right edge, which fixed an
// earlier overflow off the RIGHT (left-aligned, a last-column cover ran under the record
// card) and created the mirror of it: the hero cover is in the FIRST column, so
// `x + COVER_W - 5200` put the label at left:-2700 and the camera clipped it.
const PILE_TAG_W = 5200;
const pileTagX = Math.min(
  Math.max(0, heroCover.x + COVER_W / 2 - PILE_TAG_W / 2),
  PILE_W - PILE_TAG_W,
);
const pileTag = node("wlabel", null, pile, {
  left: px(pileTagX),
  width: px(PILE_TAG_W),
  textAlign: "center",
  top: px(heroCover.y + heroCover.h + 150),
  fontSize: "300px",
  letterSpacing: ".08em",
  color: "var(--accent)",
  opacity: 0,
  transition: "opacity .5s ease",
});
pileTag.textContent = `↑ let's dig into this one`;
export const pilePick = (on: boolean): void => {
  pileRing.style.opacity = pileTag.style.opacity = on ? "1" : "0";
};

export const arrow = node(
  "node",
  { x: CX.card - ARROW_W, y: INTRO.h / 2 - 1600, w: ARROW_W, h: 3200 },
  intro,
  {
    display: "grid",
    placeItems: "center",
    color: "var(--accent)",
    fontSize: "2600px",
    lineHeight: "1",
    opacity: 0,
    transition: "opacity .5s ease",
  },
);
arrow.id = "introArrow";
arrow.textContent = "→";

export const card = node("wbox", { x: CX.card, y: CARD_Y, w: CARD_W, h: CARD_H }, intro, {
  borderWidth: "22px",
  borderRadius: "160px",
  background: "rgba(8,44,36,.34)",
  borderColor: "rgba(55,217,160,.42)",
  opacity: 0,
  transition: "opacity .5s ease",
});
card.id = "introCard";
card.dataset["vizId"] = "crm-schema";
card.dataset["label"] = `The CRM record: ${FIELD_KEYS.length} fields, always the same`;
const rowH = Math.floor((CARD_H - 2600) / FIELD_KEYS.length);
node("wlabel", null, card, {
  // 340, not 480: the heading is a sentence now, and at 480 it ran off the card.
  left: px(700),
  top: px(820),
  fontSize: "300px",
  color: "var(--accent)",
  letterSpacing: ".16em",
}).textContent = `One structured record · ${FIELD_KEYS.length} fields`;
FIELD_KEYS.forEach((k, i) => {
  const r = node("node", { x: 700, y: 2100 + i * rowH, w: CARD_W - 1400, h: rowH - 60 }, card, {
    display: "flex",
    alignItems: "center",
    gap: "500px",
  });
  // A 6px rule on a 10,000-unit-wide card was a hairline nobody read as a blank to be
  // filled in. These are the empty boxes on a form: thick, bright, and sitting on a
  // baseline, which is what makes the next scene's filling-in legible as filling-in.
  r.innerHTML = `<div style="font-family:var(--mono);font-size:${Math.round(rowH * 0.42)}px;
       color:var(--muted);white-space:nowrap;width:44%">${esc(human(k))}</div>
     <div style="flex:1;height:${Math.round(rowH * 0.3)}px;border-radius:20px;
       background:rgba(120,160,230,.14);
       border-bottom:${Math.round(rowH * 0.1)}px solid rgba(154,176,207,.55)"></div>`;
});

/* ── the inbox, the fetch, and what any of it is for ───────────────────────────
 *
 * Three links of the chain the pile sits in the middle of. Two of them are deliberately
 * drawn as out of scope; see the CX block for why that is a design decision rather than a
 * shortcut. */

/** A chain arrow, matching the one between the pile and the record. */
const chainArrow = (x: number, dim = false) => {
  const a = node("node", { x, y: INTRO.h / 2 - 1300, w: ARROW_W, h: 2600 }, intro, {
    display: "grid",
    placeItems: "center",
    fontSize: "2200px",
    lineHeight: "1",
    color: dim ? "var(--faint)" : "var(--accent)",
  });
  a.textContent = "→";
  return a;
};

/** A link of the chain this piece does NOT prove: dashed, muted, and labelled as such.
 *  The register is deliberate — a room of a hundred should be able to tell at a glance
 *  which parts are being demonstrated and which are being asserted. */
function handWave(x: number, w: number, h: number, y: number, title: string, lines: string[]) {
  const box = node("node", { x, y, w, h }, intro, {
    border: "16px dashed rgba(154,176,207,.34)",
    borderRadius: "160px",
    background: "rgba(10,20,40,.34)",
    padding: "700px 800px",
  });
  box.innerHTML = `<div style="display:inline-block;font-family:var(--mono);font-size:250px;
       letter-spacing:.2em;text-transform:uppercase;color:var(--faint);
       border:10px solid rgba(154,176,207,.3);border-radius:80px;padding:120px 260px;
       margin-bottom:520px">out of scope</div>
     <div style="font-family:var(--mono);font-size:340px;letter-spacing:.14em;
       text-transform:uppercase;color:var(--muted);margin-bottom:420px">${esc(title)}</div>
     <div style="font-size:400px;line-height:1.5;color:var(--muted)">${lines
       .map((l) => esc(l))
       .join("<br>")}</div>`;
  return box;
}

/* 1 — the inbox. The senders and the links are the real ones, off the same provenance
   table the gallery links come from; nothing else about the mail is claimed. */
const MAIL_H = Math.min(CARD_H, 9800);
const mail = node(
  "wbox",
  { x: CX.mail, y: Math.round((INTRO.h - MAIL_H) / 2), w: MAIL_W, h: MAIL_H },
  intro,
  {
    borderWidth: "18px",
    borderRadius: "160px",
    padding: "700px 800px",
    borderColor: "rgba(120,160,230,.34)",
    background: "rgba(10,26,53,.55)",
  },
);
mail.id = "mailBox";
mail.dataset["vizId"] = "inbox";
mail.dataset["label"] = "The inbox — where the work actually arrives";
const MAIL_ROWS = 5;
const mailRowH = Math.floor((MAIL_H - 3400) / MAIL_ROWS);
mail.innerHTML =
  `<div style="font-family:var(--mono);font-size:340px;letter-spacing:.16em;
     text-transform:uppercase;color:var(--t-blue);margin-bottom:260px">The inbox</div>
   <div style="font-size:300px;color:var(--faint);margin-bottom:520px">
     the RFP is a link in the message, not an attachment</div>` +
  D.docs
    .slice(0, MAIL_ROWS)
    .map(
      (d) =>
        `<div style="height:${mailRowH}px;border-top:8px solid rgba(120,160,230,.22);
       display:flex;flex-direction:column;justify-content:center;gap:${Math.round(mailRowH * 0.1)}px">
       <div style="font-family:var(--mono);font-size:${Math.round(mailRowH * 0.21)}px;
         color:var(--muted);white-space:nowrap">✉ ${esc(d.source)}</div>
       <div style="font-family:var(--mono);font-size:${Math.round(mailRowH * 0.17)}px;
         color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
         ${esc(d.url)}</div>
     </div>`,
    )
    .join("") +
  `<div style="margin-top:300px;font-size:250px;color:var(--faint)">
     … and ${D.docs.length - MAIL_ROWS} more</div>`;

chainArrow(CX.fetch - ARROW_W, true);

/* 2 — the fetch. There really is a scraper that follows those links; it is somebody
   else's talk, and pretending otherwise would put an unproven step in the middle of an
   argument whose whole point is that the steps are checkable. */
const FETCH_H = 6400;
handWave(CX.fetch, FETCH_W, FETCH_H, Math.round((INTRO.h - FETCH_H) / 2), "automated retrieval", [
  "Unrelated AI-enhanced automation",
  "follows the link, retrieves the",
  "document, and hands it on.",
]).id = "fetchBox";

chainArrow(CX.pile - ARROW_W, true);

// The two links the story is really about, as one box for the camera to frame.
node(
  "node",
  {
    x: CX.pile - 400,
    y: -400,
    w: CX.card + CARD_W + 400 - (CX.pile - 400),
    h: INTRO.h + 800,
  },
  intro,
  { pointerEvents: "none" },
).id = "chainCore";

/* ── the cold open: start line, finish line, and the gap ───────────────────────
 *
 * Everything else on this canvas is a detail of something. This is the one scene that
 * is not: it stands alone, and a person who saw only this would still know what the
 * problem is and what closing it would mean.
 *
 * It is a purpose-built card rather than a wide shot of the chain below, because the
 * chain is ~66,000 units end to end — framing all of it puts the record's fifteen rows
 * at about three pixels each. This is sized to be read at one altitude, in one look. */

const SUM_W = 30000,
  SUM_H = 13000;
// Directly above the inbox, so the first flight of the piece is a short drop into the
// first real thing rather than a journey across empty canvas.
const SUM: Box = {
  x: INTRO.x + CX.mail + Math.round(MAIL_W / 2 - SUM_W / 2),
  y: INTRO.y - 7000 - SUM_H,
  w: SUM_W,
  h: SUM_H,
};

const summary = node("node", SUM);
summary.id = "summary";

/** One end of the argument. `tone` picks the register: what arrives vs. what is needed. */
function sumBox(x: number, tone: string, label: string, lines: [string, string][]) {
  const green = tone === "want";
  const box = node("wbox", { x, y: 2200, w: 10400, h: 9000 }, summary, {
    borderWidth: "22px",
    borderRadius: "200px",
    padding: "800px 800px",
    borderColor: green ? "rgba(55,217,160,.5)" : "rgba(120,160,230,.42)",
    background: green ? "rgba(8,44,36,.30)" : "rgba(10,26,53,.60)",
    opacity: 0,
    transition: "opacity .5s ease",
  });
  box.innerHTML =
    `<div style="font-family:var(--mono);font-size:520px;letter-spacing:.18em;
       text-transform:uppercase;color:${green ? "var(--accent)" : "var(--t-blue)"};
       margin-bottom:800px">${esc(label)}</div>` +
    lines
      .map(
        ([big, small]) =>
          `<div style="margin-bottom:640px">
         <div style="font-size:${big.length > 34 ? 700 : 820}px;font-weight:900;
           color:var(--ink);line-height:1.18">${esc(big)}</div>
         <div style="font-size:480px;color:var(--muted);margin-top:150px">${esc(small)}</div>
       </div>`,
      )
      .join("");
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
const sumWire = (x: number, w: number) =>
  node("node", { x, y: 6685, w, h: 30 }, summary, {
    background: "rgba(120,160,230,.5)",
    opacity: 0,
    transition: "opacity .4s ease",
  });
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
  borderWidth: "22px",
  borderRadius: "200px",
  padding: "700px 600px",
  borderColor: "rgba(230,144,46,.6)",
  background: "rgba(48,30,10,.62)",
  opacity: 0,
  transition: "opacity .5s ease",
  textAlign: "center",
});
sumGap.innerHTML = `<div style="font-family:var(--mono);font-size:460px;letter-spacing:.18em;
     text-transform:uppercase;color:var(--warn);margin-bottom:520px">in between, today</div>
   <div style="font-size:1400px;font-weight:900;color:var(--ink);line-height:1;
     white-space:nowrap">${Math.round(D.corpus.words / WPM / 60)} hours</div>
   <div style="font-size:500px;color:var(--muted);margin-top:420px;line-height:1.45">
     of somebody reading, before<br>anyone can do anything with it</div>`;

export const sumShow = (b: number): void => {
  sumStart.style.opacity = "1";
  sumFinish.style.opacity = b >= 1 ? "1" : "0";
  sumWireA.style.opacity = sumWireB.style.opacity = b >= 2 ? "1" : "0";
  sumGap.style.opacity = String(b >= 2 ? (b >= 3 ? 0.28 : 1) : 0);
  sumWireC.style.opacity = b >= 3 ? "1" : "0";
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
const PRE_H = 9600;
const PRE: Box = { x: SUM.x, y: SUM.y - 7000 - PRE_H, w: 30000, h: PRE_H };

const preamble = node("node", PRE);
preamble.id = "preamble";

/** One card of the preamble. Same register as the summary boxes so the two scenes read as
 *  one voice, and narrower because there are four of them rather than two. */
function preBox(i: number, label: string, big: string, small: string, tone?: string) {
  const warm = tone === "warm";
  const box = node("wbox", { x: i * 7700, y: 0, w: 6900, h: PRE.h }, preamble, {
    borderWidth: "22px",
    borderRadius: "200px",
    padding: "700px 640px",
    borderColor: warm ? "rgba(230,144,46,.5)" : "rgba(120,160,230,.42)",
    background: warm ? "rgba(48,30,10,.45)" : "rgba(10,26,53,.60)",
    opacity: 0,
    transition: "opacity .5s ease",
  });
  box.innerHTML = `<div style="font-family:var(--mono);font-size:420px;letter-spacing:.18em;
       text-transform:uppercase;color:${warm ? "var(--warn)" : "var(--t-blue)"};
       margin-bottom:620px">${esc(label)}</div>
     <div style="font-size:640px;font-weight:900;color:var(--ink);line-height:1.18;
       margin-bottom:420px">${esc(big)}</div>
     <div style="font-size:440px;color:var(--muted);line-height:1.45">${small}</div>`;
  return box;
}

const preCards = [
  preBox(
    0,
    "first, the caveat",
    "Nothing here is on anybody's roadmap.",
    "It was built for another organisation, and it worked. Treat it as the art of the possible, not a proposal.",
  ),
  preBox(
    1,
    "what an RFP is",
    "Someone says what they need. Vendors bid. One wins.",
    "The bidder has to read every document that arrives and get the facts into a system of record before they can decide whether to bid at all.",
  ),
  preBox(
    2,
    "when this was built",
    "Early 2025, on the models of early 2025.",
    "Re-checked since against a current layout model: the shape of the answer has not moved. The appendix walks through what the platforms now do for you.",
  ),
  // `big` is escaped, so no markup here — an <em> rendered as literal tag text. Curly
  // quotes carry the same "this is the thought, in their voice" without any.
  preBox(
    3,
    "what to take away",
    "One thought: \u201CI have a process like that.\u201D",
    "If everyone leaves with a single one of those, it was worth doing.",
    "warm",
  ),
];

export const preShow = (b: number): void =>
  preCards.forEach((c, i) => {
    c.style.opacity = i <= b ? "1" : "0";
  });

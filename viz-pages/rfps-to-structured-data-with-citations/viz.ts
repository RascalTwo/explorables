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
import { $, esc } from "@viz/kit";
import { type Box, type Cam, REDUCED, WANTED, clamp, easeInOut, lerp, world } from "./world.js";
import { KF, beatsOf, dwellOf } from "./keyframes.js";
import { mountLive, nudgeLive } from "./live.js";
import { nav } from "./world.js";

nav.pinTo = pinTo;
nav.nudgeLive = nudgeLive;

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
const TRAVEL_MIN = 0.4; // even a small nudge is a move, not a jump
const TRAVEL_PER_MOVE = 0.34; // scroll-screens per octave-or-frame-width of change
const TRAVEL_MAX = 3.2; // past this a fly-in is a chore, however far it goes

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
const ARC_DEADZONE = 1.15; // frame-widths of pan below which the camera moves flat
const ARC_PER_PAN = 0.8; // natural-log units of extra width per frame-width panned
const ARC_MAX = 2.0; // ~7x; past this the marks are specks and the pull-back is its own scene

/** How much the picture changes between two cameras: octaves of zoom, and pan measured
 *  in frame-widths (so crossing the frame counts the same at any altitude). */
function moveBetween(a: Cam, b: Cam) {
  const octaves = Math.abs(Math.log2(b.w / a.w));
  const pan = Math.hypot(b.cx - a.cx, b.cy - a.cy) / Math.sqrt(a.w * b.w);
  return { octaves, pan, total: octaves + pan };
}

// Filled by measure(), which is the first moment the real cameras exist.
let travels: number[] = [],
  lens: number[] = [],
  arcs: number[] = [];

/** World-space rect of an element, measured with the transform neutralised. */
function rectOf(sel: string | Element): Box {
  const el = typeof sel === "string" ? document.querySelector(sel) : sel;
  if (!el)
    throw new Error(`keyframe target not found: ${typeof sel === "string" ? sel : "element"}`);
  const w = world.getBoundingClientRect(),
    r = el.getBoundingClientRect();
  // oxlint-disable-next-line typescript/prefer-nullish-coalescing -- zero or NaN scale (a zero-width safe area) must fall back to 1 too, not only undefined
  const s = world._scale || 1;
  return { x: (r.left - w.left) / s, y: (r.top - w.top) / s, w: r.width / s, h: r.height / s };
}

function union(rects: Box[]): Box {
  const x = Math.min(...rects.map((r) => r.x)),
    y = Math.min(...rects.map((r) => r.y));
  return {
    x,
    y,
    w: Math.max(...rects.map((r) => r.x + r.w)) - x,
    h: Math.max(...rects.map((r) => r.y + r.h)) - y,
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
  return {
    x: 46,
    y: TOP_RESERVE,
    w: innerWidth - 92,
    h: Math.max(220, innerHeight - TOP_RESERVE - 34),
  };
}

/** Fit a world rect into the safe area (contain), returning a camera.
 *  `w` is the world width that must span the safe area's width. */
function fit(rect: Box, pad: number): Cam {
  const s = safeArea();
  const w = rect.w * (1 + pad * 2),
    h = rect.h * (1 + pad * 2);
  return { cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2, w: Math.max(w, h * (s.w / s.h)) };
}

let cams: Cam[] = [],
  starts: number[] = [],
  totalLen = 0,
  stops: { i: number; b: number; frac: number }[] = [],
  TL: number[] = [];

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
const onRail = () => KF.map((_k, i) => i).filter((i) => !KF[i]!.appendix);

function measure() {
  world.style.transform = "none";
  world._scale = 1;
  cams = KF.map((k) => {
    const rects = k.fit
      ? k.fit.flatMap((s) => [...document.querySelectorAll(s)].map(rectOf))
      : [rectOf(k.el)];
    return fit(union(rects), k.pad ?? 0.1);
  });
  TL = onRail();
  // Travel and arc first (both need the cameras), then the lengths that contain them.
  const moves = TL.map((i, j) => (j === 0 ? null : moveBetween(cams[TL[j - 1]!]!, cams[i]!)));
  travels = moves.map((m) =>
    m ? clamp(TRAVEL_MIN + TRAVEL_PER_MOVE * m.total, TRAVEL_MIN, TRAVEL_MAX) : 0,
  );
  arcs = moves.map((m) =>
    m ? clamp(ARC_PER_PAN * Math.max(0, m.pan - ARC_DEADZONE), 0, ARC_MAX) : 0,
  );
  lens = TL.map((i, j) => travels[j]! + dwellOf(KF[i]!));

  starts = [];
  totalLen = 0;
  TL.forEach((_i, j) => {
    starts.push(totalLen);
    totalLen += lens[j]!;
  });

  // The flat list of stops is what the arrow keys and the rail iterate. Beat b of a
  // scene parks at the middle of its own slice of the dwell, so a press lands on a
  // settled frame and a small scroll nudge cannot straddle two beats.
  stops = [];
  TL.forEach((i, j) => {
    const n = beatsOf(KF[i]!);
    for (let b = 0; b < n; b++) {
      const u = travels[j]! + dwellOf(KF[i]!) * ((b + 0.5) / n);
      stops.push({ i, b, frac: (starts[j]! + u) / totalLen });
    }
  });

  $("#scrollrail")!.style.height = `${totalLen * 100}vh`;
  $("#rail")!.innerHTML = stops
    .map(
      (s, j) =>
        `<button class="${s.b === 0 ? "head" : ""}" data-j="${j}"
       title="${esc(KF[s.i]!.eyebrow)} — beat ${s.b + 1} of ${beatsOf(KF[s.i]!)}"></button>`,
    )
    .join("");
  apply();
}

function camAt(scrollFrac: number) {
  const s = scrollFrac * totalLen;
  // `j` is a position on the rail; `i` is the keyframe it lands on. They are the same
  // number right up until the appendices come off the rail, and then they are not.
  let j = 0;
  while (j < TL.length - 1 && s >= starts[j + 1]!) j++;
  const i = TL[j]!;
  // u is an offset into the segment, in the same scroll-screen units as travels/lens —
  // not a 0..1 fraction of it, because the fly-in and the dwell are now sized apart.
  const u = clamp(s - starts[j]!, 0, lens[j]);
  const travel = j === 0 ? 1 : easeInOut(clamp(u / travels[j]!));
  const from = cams[TL[Math.max(0, j - 1)]!]!;
  const to = cams[i]!;
  const t = REDUCED ? (u >= travels[j]! ? 1 : 0) : travel;
  const p = clamp((u - travels[j]!) / dwellOf(KF[i]!));
  return {
    i,
    p,
    beat: clamp(Math.floor(p * beatsOf(KF[i]!)), 0, beatsOf(KF[i]!) - 1),
    cam: {
      cx: lerp(from.cx, to.cx, t),
      cy: lerp(from.cy, to.cy, t),
      // Zoom is interpolated in log space so the perceived rate is constant. Linear
      // interpolation of width makes long pull-backs lurch, which is most of what
      // makes this style of presentation nauseating. The sin() term is the arc — see
      // ARC_PER_PAN; it is zero at t=0 and t=1, so both keyframes are still exact.
      w: Math.exp(lerp(Math.log(from.w), Math.log(to.w), t) + arcs[j]! * Math.sin(Math.PI * t)),
    },
  };
}

let current = -1,
  currentBeat = -1;

/** Put a camera on screen. The only place the world transform is written. */
function paint(c: Cam) {
  const a = safeArea();
  const s = a.w / c.w;
  world._scale = s;
  world.style.transform = `translate(${a.x + a.w / 2}px, ${a.y + a.h / 2}px) scale(${s}) translate(${-c.cx}px, ${-c.cy}px)`;
  return s;
}

function apply() {
  if (free) return; // the hand has the camera
  if (pinned !== null) {
    const i = pinned,
      beat = pinnedBeat;
    // Not while a pin flight is running, or every beat change would snap the camera to
    // the destination halfway through its own approach.
    if (!pinFlying) paint(cams[i]!);
    if (i !== current || beat !== currentBeat) {
      const swapped = i !== current;
      current = i;
      currentBeat = beat;
      showNarration(i, beat, swapped);
    }
    KF[i]!.on?.(beat);
    const fam = appendixFrames(KF[i]!.appendix);
    $<HTMLButtonElement>("#prev")!.disabled = false; // off the front is the way out, so it always does something
    $<HTMLButtonElement>("#next")!.disabled =
      beat >= beatsOf(KF[i]!) - 1 && fam.indexOf(i) === fam.length - 1;
    return;
  }
  const max = document.documentElement.scrollHeight - innerHeight;
  const { i, beat, cam: c } = camAt(max > 0 ? clamp(scrollY / max) : 0);
  paint(c);

  if (i !== current || beat !== currentBeat) {
    const swapped = i !== current;
    current = i;
    currentBeat = beat;
    showNarration(i, beat, swapped);
  }
  KF[i]!.on?.(beat);

  const j = stops.findIndex((s) => s.i === i && s.b === beat);
  [...$("#rail")!.children].forEach((b, k) => {
    b.classList.toggle("act", k === j);
    b.classList.toggle("actin", k < j);
    // Beats collapse to their scene's head until you're in that scene — see #rail in
    // index.html for why the full 67-mark stack cannot fit a laptop viewport.
    b.classList.toggle("show", stops[k]!.i === i);
  });
  $<HTMLButtonElement>("#prev")!.disabled = j <= 0;
  $<HTMLButtonElement>("#next")!.disabled = j >= stops.length - 1;
}

/* ── narration (screen space, so it is never scaled or blurred) ───────────────── */

function showNarration(i: number, beat: number, swapped: boolean) {
  const k = KF[i]!;
  if (swapped) k.enter?.();
  const n = $("#topbar")!;
  if (swapped) {
    n.classList.remove("swap");
    n.getBoundingClientRect();
    n.classList.add("swap");
  }
  /* Two lines, not three. There used to be a source note under the headline at 10.5px —
     unreadable from the back of a room of a hundred people, and skipped by everyone
     closer than that. The provenance it carried now lives in comments beside the
     keyframes that make the claims, where the presenter can find it and the audience is
     not asked to squint at it. */
  n.innerHTML = `<div class="eyebrow">${esc(k.eyebrow)}</div>
     <h2>${typeof k.title === "function" ? k.title(beat) : k.title}</h2>`;
  const nb = beatsOf(k);
  // Position on the RAIL, over the rail's own length. Counting keyframes would promise
  // 27 scenes to a viewer who can only reach 24 of them, and the three it was counting
  // are the ones they have not opted into yet.
  const rail = TL.indexOf(i);
  $("#stepcount")!.innerHTML =
    rail < 0
      ? // A pinned scene has no position on the rail, and inventing one — 25 of 24, or 01 of
        // 24 from a -1 — would be the counter lying about where you can get to from here.
        `<i>appendix</i>`
      : `${String(rail + 1).padStart(2, "0")}<i>/${String(TL.length).padStart(2, "0")}</i>`;
  $("#beatcount")!.textContent =
    rail < 0
      ? nb > 1
        ? `beat ${beat + 1} / ${nb} · esc to go back`
        : "esc to go back"
      : nb > 1
        ? `beat ${beat + 1} / ${nb}`
        : "";
  if (location.hash.slice(1) !== k.id) history.replaceState(null, "", `#${k.id}`);
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

let free: Cam | null = null; // { cx, cy, w } while the hand has it, null while the scroll does

function setFree(on: boolean) {
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
  nudgeLive(); // panning here by hand hits the same blank-iframe bug
  $("#pan")!.classList.toggle("act", on);
  if (!on) apply();
}

{
  const cam = $("#cam")!;
  let drag: { x: number; y: number } | null = null;
  cam.addEventListener("pointerdown", (e) => {
    if (!free) return;
    drag = { x: e.clientX, y: e.clientY };
    cam.setPointerCapture(e.pointerId);
    document.body.classList.add("dragging");
  });
  cam.addEventListener("pointermove", (e) => {
    if (!free || !drag) return;
    const s = safeArea().w / free.w;
    free.cx -= (e.clientX - drag.x) / s;
    free.cy -= (e.clientY - drag.y) / s;
    drag = { x: e.clientX, y: e.clientY };
    paint(free);
  });
  const drop = () => {
    drag = null;
    document.body.classList.remove("dragging");
  };
  cam.addEventListener("pointerup", drop);
  cam.addEventListener("pointercancel", drop);

  // Zoom about the cursor: the world point under the pointer has to stay under it,
  // or every wheel notch walks the thing you were looking at off the screen.
  addEventListener(
    "wheel",
    (e) => {
      /* Zoom from anywhere in the piece, not only from free look. A trackpad pinch
       arrives as ctrl+wheel and cmd+wheel is the mouse equivalent, so either one means
       "zoom in here" — take the camera off the script and hand it to the same
       cursor-anchored zoom below. A bare wheel stays the scroll, or the narrative
       would have no driver. */
      if (!free && (e.ctrlKey || e.metaKey)) setFree(true);
      if (!free) return;
      e.preventDefault();
      const a = safeArea(),
        s = a.w / free.w;
      const dx = e.clientX - (a.x + a.w / 2),
        dy = e.clientY - (a.y + a.h / 2);
      const wx = free.cx + dx / s,
        wy = free.cy + dy / s;
      free.w = clamp(free.w * Math.exp(e.deltaY * 0.0015), 600, 500000);
      const s2 = a.w / free.w;
      free.cx = wx - dx / s2;
      free.cy = wy - dy / s2;
      paint(free);
    },
    { passive: false },
  );
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
const NAV_MS_BASE = 700; // a within-scene beat: short, but not a cut
const NAV_MS_PER_SCREEN = 430; // added per viewport-height of scroll travelled
const NAV_MS_MAX = 2800; // the longest flight in the piece, and enough for it

let navRaf = 0;

function animateScrollTo(top: number) {
  cancelAnimationFrame(navRaf);
  const from = scrollY,
    dist = top - from;
  const ms = REDUCED
    ? 0
    : clamp(
        NAV_MS_BASE + (NAV_MS_PER_SCREEN * Math.abs(dist)) / innerHeight,
        NAV_MS_BASE,
        NAV_MS_MAX,
      );
  if (ms <= 0 || Math.abs(dist) < 2) {
    scrollTo({ top, behavior: "auto" });
    return;
  }
  const t0 = performance.now();
  const step = (now: number) => {
    const t = clamp((now - t0) / ms);
    scrollTo({ top: from + dist * easeInOut(t), behavior: "auto" });
    if (t < 1) navRaf = requestAnimationFrame(step);
  };
  navRaf = requestAnimationFrame(step);
}

function scrollToStop(j: number, smooth = true) {
  navStop = clamp(j, 0, stops.length - 1);
  const max = document.documentElement.scrollHeight - innerHeight;
  const top = stops[navStop]!.frac * max;
  if (smooth) animateScrollTo(top);
  else {
    cancelAnimationFrame(navRaf);
    scrollTo({ top, behavior: "auto" });
  }
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
let pinned: number | null = null,
  pinnedBeat = 0,
  pinRaf = 0,
  pinFlying = false,
  pinScrollY = 0;
/* Where "back" goes, innermost last. An appendix can itself be an index — `harder
 * documents` opens a card wall, and each card on it opens a document — so backing out of
 * a document has to land on the wall you chose it from rather than all the way out. One
 * frame deep would have been a boolean; the stack costs the same and does not have to be
 * revisited if anything else grows a second level. */
let pinBack: number[] = [];

/** Where the camera is right now, pinned or not — the departure point for a pin flight. */
function liveCam() {
  if (pinned !== null) return cams[pinned]!;
  const max = document.documentElement.scrollHeight - innerHeight;
  return camAt(max > 0 ? clamp(scrollY / max) : 0).cam;
}

/** Fly the camera between two cameras without touching scroll. Same easing and the same
 *  log-space zoom as the rail's own flights, so a detour does not move differently from
 *  the piece it is a detour from. */
function pinFly(from: Cam, to: Cam) {
  cancelAnimationFrame(pinRaf);
  if (REDUCED) {
    pinFlying = false;
    paint(to);
    return;
  }
  pinFlying = true;
  const t0 = performance.now();
  const step = (now: number) => {
    const e = easeInOut(clamp((now - t0) / PIN_MS));
    paint({
      cx: lerp(from.cx, to.cx, e),
      cy: lerp(from.cy, to.cy, e),
      w: Math.exp(lerp(Math.log(from.w), Math.log(to.w), e)),
    });
    if (e < 1) pinRaf = requestAnimationFrame(step);
    else pinFlying = false;
  };
  pinRaf = requestAnimationFrame(step);
}

/** @param push  true when this is a drill-down: remember where to come back to. */
export function pinTo(id: string, push = false): void {
  const i = KF.findIndex((k) => k.id === id);
  if (i < 0 || i === pinned) return;
  const from = liveCam();
  if (push && pinned !== null) pinBack.push(pinned);
  else if (!push) pinBack.length = 0;
  pinScrollY = scrollY;
  pinned = i;
  pinnedBeat = 0;
  // Freezing the document is the enforcement. Without it the scrollbar still moves under
  // a hand that scrolls, nothing on screen answers it, and letting go lands you wherever
  // the offset drifted to.
  document.documentElement.style.overflow = "hidden";
  document.body.classList.add("pinned");
  apply();
  pinFly(from, cams[i]!);
}

/** One step back: out to the index you drilled in from, or out of the pin entirely. */
function popPin() {
  if (pinBack.length === 0) {
    unpin();
    return;
  }
  const from = cams[pinned!]!;
  pinned = pinBack.pop()!;
  pinnedBeat = 0;
  apply();
  pinFly(from, cams[pinned]!);
}

function unpin() {
  if (pinned === null) return;
  const from = cams[pinned]!;
  pinned = null;
  pinBack.length = 0;
  document.documentElement.style.overflow = "";
  document.body.classList.remove("pinned");
  // Belt and braces: some browsers drop the offset when the overflow lock lifts, and the
  // whole camera is a function of it.
  if (scrollY !== pinScrollY) scrollTo({ top: pinScrollY, behavior: "auto" });
  apply();
  pinFly(from, liveCam());
}

/** Every keyframe in one appendix, in order. Usually one; `harder documents` is two. */
const appendixFrames = (g: string | undefined) =>
  KF.map((_k, i) => i).filter((i) => KF[i]!.appendix === g);

/** Step inside a pinned appendix: beats first, then frames. Off the front is the way out;
 *  off the back is the end of the appendix and does nothing, the way the end of the rail
 *  does nothing. */
function stepPin(d: number) {
  const b = pinnedBeat + d;
  if (b >= 0 && b < beatsOf(KF[pinned!]!)) {
    pinnedBeat = b;
    apply();
    return;
  }
  // Backwards off the first beat is "back", and back means the index you came in from
  // when there is one — not the previous document in the strip, which is somewhere you
  // may never have been.
  if (d < 0 && pinBack.length > 0) {
    popPin();
    return;
  }
  const fam = appendixFrames(KF[pinned!]!.appendix);
  const next = fam[fam.indexOf(pinned!) + d];
  if (next === undefined) {
    if (d < 0) unpin();
    return;
  }
  const from = cams[pinned!]!;
  pinned = next;
  pinnedBeat = d > 0 ? 0 : beatsOf(KF[next]!) - 1;
  apply();
  pinFly(from, cams[next]!);
}

/** The stop the arrow keys step from: the one we are flying to if a nav is in
 *  flight, otherwise whatever the camera actually settled on (a manual scroll). */
function stopNow() {
  if (navStop >= 0) return navStop;
  return Math.max(
    0,
    stops.findIndex((s) => s.i === current && s.b === currentBeat),
  );
}

// Any hand-driven scroll cancels a pending nav — otherwise scrolling away and then
// pressing an arrow would yank you back to wherever the last press was headed. The
// tween has to be killed too, or it keeps writing scrollY out from under the hand.
const cancelNav = () => {
  navStop = -1;
  cancelAnimationFrame(navRaf);
};
addEventListener("wheel", cancelNav, { passive: true });
addEventListener("touchmove", cancelNav, { passive: true });

$("#rail")!.addEventListener("click", (e) => {
  const b = e.target instanceof Element ? e.target.closest("button") : null;
  if (b) scrollToStop(+b.dataset["j"]!);
});

$("#pan")!.addEventListener("click", () => setFree(!free));
$("#prev")!.addEventListener("click", () =>
  pinned !== null ? stepPin(-1) : scrollToStop(stopNow() - 1),
);
$("#next")!.addEventListener("click", () =>
  pinned !== null ? stepPin(1) : scrollToStop(stopNow() + 1),
);
$("#unpin")!.addEventListener("click", popPin);

/** Inside an appendix the arrows walk its own beats and nothing else. Home and End
 *  belong to the rail, and the rail is not where you are. */
function pinnedKey(e: KeyboardEvent, fwd: boolean, back: boolean) {
  if (fwd || back) {
    e.preventDefault();
    stepPin(fwd ? 1 : -1);
  } else if (e.key === "Escape") {
    e.preventDefault();
    popPin();
  }
}

addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.target instanceof HTMLElement && e.target.tagName === "INPUT") return;
  const k = e.key;
  if (k === "p" || k === "P") {
    e.preventDefault();
    setFree(!free);
    return;
  }
  if (free) {
    // Nothing else steers while the hand does; Escape is the way back.
    if (k === "Escape") {
      e.preventDefault();
      setFree(false);
    }
    return;
  }
  const fwd = k === " " || k === "ArrowRight" || k === "PageDown" || k === "ArrowDown";
  const back = k === "ArrowLeft" || k === "PageUp" || k === "ArrowUp";
  if (pinned !== null) {
    pinnedKey(e, fwd, back);
    return;
  }
  if (fwd) {
    e.preventDefault();
    scrollToStop(stopNow() + 1);
  } else if (back) {
    e.preventDefault();
    scrollToStop(stopNow() - 1);
  } else if (k === "Home") {
    e.preventDefault();
    scrollToStop(0);
  } else if (k === "End") {
    e.preventDefault();
    scrollToStop(stops.length - 1);
  } else if (k === "f" || k === "F")
    document.documentElement.requestFullscreen?.().catch(() => null);
});

// `finally`, because the flag latching on is unrecoverable: one throw inside apply(),
// or one rAF that never fires because the tab was in the background when the scroll
// happened, and the camera is frozen for the rest of the page's life with nothing on
// screen to say so.
let ticking = false;
addEventListener(
  "scroll",
  () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      try {
        apply();
      } finally {
        ticking = false;
      }
    });
  },
  { passive: true },
);
// A tab that was scrolled while hidden has a stale camera; re-sync when it comes back.
addEventListener("visibilitychange", () => {
  if (!document.hidden) apply();
});

let rt: ReturnType<typeof setTimeout> | undefined;
addEventListener("resize", () => {
  clearTimeout(rt);
  rt = setTimeout(measure, 150);
});

// Fonts, NOT images: every image on this page sits in a box with an explicit width
// and height, so nothing about the layout waits on one. Text does — #docBlock is
// framed around the answer callouts, whose height is whatever Lato makes it.
//
// This used to await `img.decode()` on all of them. Once the pile and the two sprite
// sheets took the count from 11 images to 23, one of those decodes stopped settling
// and took the whole module's top-level await down with it: the world was built and
// on screen, but measure() never ran, so there was no camera, no rail and no
// narration — and no error anywhere to say why.
await document.fonts.ready.catch(() => null);

measure();
// Cheap insurance: anything that does land late gets one free re-measure.
addEventListener("load", () => measure(), { once: true });
mountLive();

const wantedKF = KF.findIndex((k) => k.id === WANTED);
if (wantedKF > 0) {
  // A link written straight to an appendix is somebody asking for it on purpose, which is
  // the same consent a click on a card gives. Park on the index first so backing out of
  // the pin lands somewhere that makes sense rather than on scene one.
  if (KF[wantedKF]!.appendix) {
    scrollToStop(
      stops.findIndex((s) => KF[s.i]!.id === "appendix"),
      false,
    );
    pinTo(KF[wantedKF]!.id);
  } else {
    scrollToStop(
      stops.findIndex((s) => s.i === wantedKF),
      false,
    );
  }
}
apply();

// Exposed for verify.interactions.ts — it needs to park the camera on a beat
// deterministically rather than guessing scroll offsets.
declare global {
  interface Window {
    __story: unknown;
  }
}
window.__story = {
  KF,
  measure,
  apply,
  get stops() {
    return stops;
  },
  scrollToStop,
  pinTo,
  unpin,
  popPin,
  get pinned() {
    return pinned;
  },
  get rail() {
    return TL;
  },
  scrollToKF: (i: number, smooth?: boolean) =>
    scrollToStop(
      stops.findIndex((s) => s.i === i),
      smooth,
    ),
  get step() {
    return current;
  },
  get beat() {
    return currentBeat;
  },
};

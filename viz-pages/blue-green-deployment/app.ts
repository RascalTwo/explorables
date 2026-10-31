import { arrowMarkers, stepper, loadHash, saveHash, $, $$, vizAudit } from "@viz/kit";

const stage = $("#stage")!;
stage.insertAdjacentHTML("afterbegin", arrowMarkers());
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- traffic dots ---------------- */
function fill(groupId: string, wireId: string, n: number, dur: number, cls = "") {
  const g = $(groupId)!;
  g.innerHTML = Array.from(
    { length: n },
    (_, i) => `
    <circle class="pkt ${cls}" r="5" data-viz-id="pkt-${wireId}-${i}" data-label="a visitor travelling to the live copy">
      <animateMotion dur="${dur}s" repeatCount="indefinite" begin="-${((i * dur) / n).toFixed(2)}s">
        <mpath href="#${wireId}"/>
      </animateMotion>
    </circle>`,
  ).join("");
  if (still) {
    const path = $<SVGPathElement>("#" + wireId)!,
      len = path.getTotalLength();
    $$("circle", g).forEach((c, i) => {
      const p = path.getPointAtLength((len * (i + 0.5)) / n);
      c.setAttribute("cx", String(p.x));
      c.setAttribute("cy", String(p.y));
      c.querySelector("animateMotion")?.remove();
    });
  }
}
fill("#pktTrunk", "wireTrunk", 4, 2.0);
fill("#pktTop", "wireTop", 5, 2.4);
fill("#pktBottom", "wireBottom", 5, 2.4);
fill("#pktTest", "wireTest", 3, 2.8, "test");

/* ---------------- the walkthrough ----------------
   Boxes are slots — "top" and "bottom". A box's NAME and COLOUR are per-step data,
   which is the whole point: under one convention they never change, under the other
   the winner is renamed on step 7.                                                  */
type Slot = "top" | "bottom";
type Colour = "b" | "g" | "x";
type Status = "live" | "standby" | "off" | "retired" | "testing" | "broken";
interface Env {
  nm: string;
  c: Colour;
  v: string | null;
  st: Status;
  note: string;
}
interface Ghost {
  on: Slot;
  txt: string;
}
interface Step {
  t: string;
  live: Slot;
  p: string;
  top: Env;
  bottom: Env;
  test?: boolean;
  spot?: Slot;
  ghost?: Ghost;
}
const E = (nm: string, c: Colour, v: string | null, st: Status, note: string): Env => ({
  nm,
  c,
  v,
  st,
  note,
});
const G = (on: Slot, txt: string): Ghost => ({ on, txt });

const BLUE_LIVE = E("BLUE", "b", "v4", "live", "the version everyone knows");
const BLUE_SPARE = E("BLUE", "b", "v4", "standby", "still running, just nobody's home");

/* Steps 1-5: same shape either way, a couple of lines differ. */
const prefix = (conv: string): Step[] => {
  const slots = conv === "slots";
  return [
    {
      t: "Right now",
      live: "top",
      top: BLUE_LIVE,
      bottom: E("GREEN", "g", null, "off", "doesn't exist yet"),
      p: `One copy of your website is running and every visitor lands on it. It is called
          <b>Blue</b>. ${
            slots
              ? `Here, <b>Blue</b> and <b>Green</b> are nothing but the names of two bays — like
               Platform 1 and Platform 2. Neither one is "the real one".`
              : `Here, <b>Blue</b> means "production" and <b>Green</b> means "whatever is hoping to
               become production". The names are job titles, not addresses.`
          }`,
    },

    {
      t: "Build the second copy",
      live: "top",
      top: BLUE_LIVE,
      bottom: E(
        "GREEN",
        "g",
        null,
        "standby",
        slots
          ? "the other bay — a permanent fixture, currently empty"
          : "a throwaway clone of Blue, for this release only",
      ),
      p: slots
        ? `You stand up a second copy beside it — same size, same setup, same everything. It is a
           permanent fixture: this bay will still be here in a year. Nobody is being sent there yet.
           It just sits there, humming, costing you money.`
        : `You take a <b>copy of production</b> — same size, same setup, same everything — and that
           copy is what "Green" means here. It exists for this one release and no longer. Nobody is
           being sent there. It just sits there, humming, costing you money.`,
    },

    {
      t: "Install the new version on it",
      live: "top",
      top: BLUE_LIVE,
      bottom: E("GREEN", "g", "v5", "standby", "the new version, installed and waiting"),
      p: `The new version goes onto the <b>empty</b> copy. Take an hour, take three — it doesn't
          matter, because not one visitor is touching it. Everyone is still happily on Blue.`,
    },

    {
      t: "Try it before anyone else does",
      live: "top",
      test: true,
      top: BLUE_LIVE,
      bottom: E("GREEN", "g", "v5", "testing", "your team is clicking around in here"),
      p: `Your own people go and use the new copy: click the buttons, place a fake order, check the
          pages. If it's broken, you find out <b>now</b> — with exactly zero customers affected.`,
    },

    {
      t: "Flip the switch",
      live: "bottom",
      top: BLUE_SPARE,
      bottom: E("GREEN", "g", "v5", "live", "what everybody now sees"),
      p: `One change at the front door and every arriving visitor is sent to the new copy instead.
          There is no "be right back" page, because nothing was ever taken down — the new copy was
          already running. <b>The flip itself takes about a second.</b>`,
    },
  ];
};

/* Steps 6-8: four different endings. */
const TAILS: Record<string, Step[]> = {
  "slots-well": [
    {
      t: "Watch it like a hawk",
      live: "bottom",
      spot: "top",
      top: E("BLUE", "b", "v4", "standby", "your undo button — leave it running"),
      bottom: E("GREEN", "g", "v5", "live", "what everybody now sees"),
      p: `The temptation is to switch Blue off and stop paying for it. Don't, not yet. For the next
          few hours it is the <b>only</b> thing standing between you and a bad afternoon.`,
    },

    {
      t: "It holds",
      live: "bottom",
      ghost: G("top", "v6 lands here next"),
      top: E("BLUE", "b", "v4", "standby", "no longer the undo button — now the workshop"),
      bottom: E("GREEN", "g", "v5", "live", "the new normal"),
      p: `A day goes by. No fires. Blue stops being your parachute and becomes the place the
          <b>next</b> version gets built. Look at the labels: nothing was renamed, and nothing was
          thrown away. Green is production and it is still called Green.`,
    },

    {
      t: "…and next time it runs backwards",
      live: "bottom",
      top: E("BLUE", "b", "v6", "standby", "the next new version, installed and waiting"),
      bottom: E("GREEN", "g", "v5", "live", "still what everybody sees"),
      p: `v6 installs onto Blue. You test Blue. You flip to Blue, and Green becomes the spare. That
          is step 3 again with the colours the other way round — <b>the two bays just take turns</b>,
          and you always have exactly one of each.`,
    },
  ],

  "slots-wrong": [
    {
      t: "Trouble",
      live: "bottom",
      spot: "bottom",
      top: E("BLUE", "b", "v4", "standby", "still running, still untouched"),
      bottom: E("GREEN", "g", "v5", "broken", "something only a real crowd could find"),
      p: `Twenty minutes in, orders start failing. Real visitors are hitting it — the dots are still
          flowing to Green. This is the moment the whole arrangement exists for.`,
    },

    {
      t: "Flip back",
      live: "top",
      top: E("BLUE", "b", "v4", "live", "everyone's back on the version that worked"),
      bottom: E("GREEN", "g", "v5", "broken", "parked, with the evidence still on it"),
      p: `You move the lever. Everyone is back on the version that worked, and it's over —
          <b>seconds, not an emergency</b>. No restoring backups, no undoing an upgrade at speed,
          because the old copy was never touched in the first place.`,
    },

    {
      t: "Nothing changed hands",
      live: "top",
      ghost: G("bottom", "the fixed v5 tries again here"),
      top: E("BLUE", "b", "v4", "live", "still Blue, still live, never replaced"),
      bottom: E("GREEN", "g", null, "standby", "wiped, ready for another go"),
      p: `You are on v4 — exactly where you woke up. Being live never moved for good, because it
          only moves when the new version <b>survives</b>. Your customers had a bad few minutes
          instead of a bad afternoon, and the next attempt picks up at step 3.`,
    },
  ],

  "promote-well": [
    {
      t: "Watch it like a hawk",
      live: "bottom",
      spot: "top",
      top: E("BLUE", "b", "v4", "standby", "the old production — your undo button"),
      bottom: E("GREEN", "g", "v5", "live", "still only the candidate, on probation"),
      p: `Green is serving everybody, but it has not <b>earned</b> anything yet — it's a candidate
          doing the job on trial. Blue is still called Blue, because Blue means production and
          production is what you'd fall back to.`,
    },

    {
      t: "Green becomes Blue",
      live: "bottom",
      top: E("BLUE-OLD", "x", "v4", "standby", "now blue-old1 — not Green; it's a has-been"),
      bottom: E("BLUE", "b", "v5", "live", "promoted — this is production now"),
      p: `It has been stable long enough. The copy that was called Green is <b>renamed</b>: it is
          Blue now. Watch the colour change — no machine moved and no visitor noticed, the
          <b>label</b> is the only thing that changed hands. And the old one does <b>not</b> become
          Green. Green means "candidate", and this is a has-been: it just gets <code>-old1</code>
          stuck on the end of its name.`,
    },

    {
      t: "Delete the leftover",
      live: "bottom",
      ghost: G("top", "next Green: a fresh clone of Blue"),
      top: E(
        "BLUE-OLD",
        "x",
        null,
        "retired",
        "deleted by hand — it was billing you until you did",
      ),
      bottom: E("BLUE", "b", "v5", "live", "production, full stop"),
      p: `Nothing does this for you: the old copy is <b>kept running and kept charging</b>, just with
          <code>-old1</code> on its name, until somebody goes and deletes it. And now there is
          <b>no Green anywhere on this screen</b> — because Green was never a place, it was a
          disposable copy of production made for one release. v6 gets a brand-new one, cloned from
          Blue. <b>Blue always ends up being production.</b>
          <br><br>Keep that leftover instead of deleting it, and reuse it as the next candidate?
          Congratulations — you've just reinvented the other convention.`,
    },
  ],

  "promote-wrong": [
    {
      t: "Trouble",
      live: "bottom",
      spot: "bottom",
      top: E("BLUE", "b", "v4", "standby", "the old production — your undo button"),
      bottom: E("GREEN", "g", "v5", "broken", "something only a real crowd could find"),
      p: `Twenty minutes in, orders start failing. Real visitors are hitting it — the dots are still
          flowing to Green. This is the moment the whole arrangement exists for.`,
    },

    {
      t: "Flip back",
      live: "top",
      top: E("BLUE", "b", "v4", "live", "never stopped being Blue"),
      bottom: E("GREEN", "g", "v5", "broken", "still Green, still just a candidate"),
      p: `You move the lever. Everyone is back on the version that worked, and it's over —
          <b>seconds, not an emergency</b>. Notice that no renaming ever took place, so there is
          nothing to undo: production has been sitting there called Blue the whole time.`,
    },

    {
      t: "The promotion never happens",
      live: "top",
      top: E("BLUE", "b", "v4", "live", "production, unchanged, untouched"),
      bottom: E("GREEN", "g", null, "off", "torn down — it never earned the name"),
      p: `Green is thrown away without ever being called Blue. That is the difference between the
          two habits in one picture: here the name is the <b>prize</b>, and this candidate didn't
          win it. Build a fresh Green tomorrow and try again.`,
    },
  ],
};

const PILL: Record<Status, { txt: string; cls: string }> = {
  live: { txt: "LIVE · ALL VISITORS", cls: "" },
  standby: { txt: "STANDBY · NO VISITORS", cls: "" },
  off: { txt: "NOT BUILT", cls: "" },
  retired: { txt: "SWITCHED OFF", cls: "" },
  testing: { txt: "TESTING · STAFF ONLY", cls: "warn" },
  broken: { txt: "TROUBLE", cls: "danger" },
};
const PILL_TINT: Record<Colour, string> = { b: "accent", g: "good", x: "" };

const h = loadHash<{ conv: string; path: string }>();
let conv = h.conv === "promote" ? "promote" : "slots";
let path = h.path === "wrong" ? "wrong" : "well";
let idx = 0;
const steps = () => prefix(conv).concat(TAILS[conv + "-" + path]!);

function paintChrome() {
  $$("#conv button").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset["c"] === conv)),
  );
  $$("#paths button").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset["p"] === path)),
  );
  $("#steplist")!.innerHTML = steps()
    .map(
      (s, i) =>
        (i === 5
          ? `<div class="fork ${path}">${path === "well" ? "…and it holds" : "…and it doesn't"}</div>`
          : "") +
        `<button data-i="${i}"><span class="n">${i + 1}</span><span>${s.t}</span></button>`,
    )
    .join("");
}

function paintEnv(slot: Slot, cfg: Env, ghost: Ghost | undefined) {
  const Slot = slot === "top" ? "Top" : "Bottom";
  const g = $("#env" + Slot)!;
  const marked = ghost?.on === slot;
  g.setAttribute("class", `env is-${cfg.st}${marked ? " ghost" : ""}`);
  g.dataset["c"] = cfg.c;
  $("#nm" + Slot)!.textContent = cfg.nm;
  const p = $("#pill" + Slot)!;
  p.className = "pill " + (PILL[cfg.st].cls || (cfg.st === "live" ? PILL_TINT[cfg.c] : ""));
  p.textContent = PILL[cfg.st].txt;
  $("#ver" + Slot)!.innerHTML = cfg.v
    ? `running <b>${cfg.v}</b><span class="envnote">${cfg.note}</span>`
    : `<span class="envnote" style="margin-top:6px">${cfg.note}</span>`;
  $("#nxt" + Slot)!.textContent = marked ? ghost.txt : "";
  $("#wire" + Slot)!.dataset["c"] = cfg.c;
}

function render(i: number) {
  idx = i;
  const all = steps(),
    s = all[i]!;
  $("#stTitle")!.textContent = `${i + 1}. ${s.t}`;
  $("#stBody")!.innerHTML = s.p;
  $("#count")!.textContent = `${i + 1} / ${all.length}`;
  $<HTMLButtonElement>("#prev")!.disabled = i === 0;
  $<HTMLButtonElement>("#next")!.disabled = i === all.length - 1;
  $$("#steplist button").forEach((b) =>
    b.setAttribute("aria-current", String(Number(b.dataset["i"]) === i)),
  );

  paintEnv("top", s.top, s.ghost);
  paintEnv("bottom", s.bottom, s.ghost);
  if (s.spot) $("#env" + (s.spot === "top" ? "Top" : "Bottom"))!.classList.add("spot");

  const topOn = s.live === "top";
  $("#wireTop")!.classList.toggle("on", topOn);
  $("#wireBottom")!.classList.toggle("on", !topOn);
  $("#pktTop")!.classList.toggle("on", topOn);
  $("#pktBottom")!.classList.toggle("on", !topOn);
  $("#wireTest")!.classList.toggle("on", !!s.test);
  $("#pktTest")!.classList.toggle("on", !!s.test);

  $("#lever")!.style.transform = `rotate(${topOn ? 28 : 152}deg)`;
  $("#leverKnob")!.setAttribute(
    "fill",
    `var(--${(topOn ? s.top : s.bottom).c === "b" ? "accent" : "good"})`,
  );
}

paintChrome();
const step = stepper({ n: 8, onStep: render, hashKey: "step" });
$("#prev")!.addEventListener("click", () => {
  step.prev();
});
$("#next")!.addEventListener("click", () => {
  step.next();
});
$("#steplist")!.addEventListener("click", (e) => {
  const b = e.target instanceof Element ? e.target.closest("button") : null;
  if (b) step.go(+b.dataset["i"]!);
});
function switchTo(k: string, v: string) {
  if (k === "conv") conv = v;
  else path = v;
  saveHash({ ...loadHash(), conv, path });
  paintChrome();
  render(idx);
}
$("#conv")!.addEventListener("click", (e) => {
  const b = e.target instanceof Element ? e.target.closest("button") : null;
  if (b && b.dataset["c"] !== conv) switchTo("conv", b.dataset["c"]!);
});
$("#paths")!.addEventListener("click", (e) => {
  const b = e.target instanceof Element ? e.target.closest("button") : null;
  if (b && b.dataset["p"] !== path) switchTo("path", b.dataset["p"]!);
});

/* ---------------- downtime comparison ---------------- */
const SCALE = 125; // minutes across the full track width
const SEC = 0.02; // a one-second flip, in minutes

type Kind = "old" | "new" | "bad" | "down";
type Seg = [Kind, number];
const SCEN: Record<string, { label: string; old: Seg[]; bg: Seg[] }> = {
  routine: {
    label: "A routine update",
    old: [
      ["old", 10],
      ["down", 12],
      ["new", 30],
    ],
    bg: [
      ["old", 10],
      ["down", SEC],
      ["new", 30],
    ],
  },
  big: {
    label: "A big, slow update",
    old: [
      ["old", 10],
      ["down", 45],
      ["new", 30],
    ],
    bg: [
      ["old", 10],
      ["down", SEC],
      ["new", 30],
    ],
  },
  wrong: {
    label: "…and then it goes wrong",
    old: [
      ["old", 10],
      ["down", 45],
      ["bad", 6],
      ["down", 40],
      ["old", 20],
    ],
    bg: [
      ["old", 10],
      ["down", SEC],
      ["bad", 6],
      ["down", SEC],
      ["old", 20],
    ],
  },
};

const WORD: Record<Kind, string> = {
  old: "old version serving people",
  new: "new version serving people",
  bad: "new version live but misbehaving",
  down: "nobody can use the site",
};

const mins = (m: number): string => {
  if (m >= 60) return `${Math.floor(m / 60)} h ${Math.round(m % 60)} m`;
  if (m >= 1) return `${Math.round(m)} minutes`;
  const s = Math.max(1, Math.round(m * 60));
  return `${s} second${s === 1 ? "" : "s"}`;
};

function track(el: HTMLElement, segs: Seg[], id: string) {
  el.innerHTML = segs
    .map(
      ([k, m], i) => `
    <div class="seg s-${k}" style="width:${((m / SCALE) * 100).toFixed(3)}%"
         data-viz-id="${id}-seg-${i}" data-label="${mins(m)}: ${WORD[k]}"
         title="${mins(m)} — ${WORD[k]}"></div>`,
    )
    .join("");
}

function stat(el: HTMLElement, segs: Seg[]) {
  const down = segs.filter(([k]) => k === "down").reduce((a, [, m]) => a + m, 0);
  el.innerHTML = `<span class="n${down < 1 ? " ok" : ""}">${mins(down)}</span><span class="l">unusable</span>`;
}

$("#scen")!.innerHTML = Object.entries(SCEN)
  .map(([k, v]) => `<button data-k="${k}">${v.label}</button>`)
  .join("");

$("#axis")!.innerHTML = [0, 25, 50, 75, 100, 125]
  .map((m) => `<span style="left:${(m / SCALE) * 100}%">${m}m</span>`)
  .join("");

function showScen(key: string) {
  const s = SCEN[key]!;
  track($("#trackOld")!, s.old, "old");
  track($("#trackBg")!, s.bg, "bg");
  stat($("#statOld")!, s.old);
  stat($("#statBg")!, s.bg);
  $$("#scen button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset["k"] === key)));
}
$("#scen")!.addEventListener("click", (e) => {
  const b = e.target instanceof Element ? e.target.closest("button") : null;
  if (b) showScen(b.dataset["k"]!);
});
showScen("routine");

vizAudit();

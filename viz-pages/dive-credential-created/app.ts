import { stepper, $ } from "@viz/kit";

// ---- the real artifacts ------------------------------------------------
// Generated 2026-08-06: `crypto.randomBytes(32).toString('base64url')` for the
// secret, then bcrypt cost 10 three times over that same secret. All three
// hashes verified true against it before being pasted here.
const SECRET = "40zAU4KlBhlYbiWf-JasKEs9Xji4zBqZ6_RUd8BJonA";
const HASHES = [
  "$2b$10$CrGr3XZ/ARykWfLvSgF0Fu0d4uQUd62WtGanotLs/8qf7H/680BA2",
  "$2b$10$b3lEZhnee7vIRrmbtj9KfeRHRUvUgpiuV1uS8itH5bBT7FRSmZdK.",
  "$2b$10$qcy3lt7huXlHt6HwI1Hkz.D.ZjTil7BoMHYrGWWTfiC.8QxeHnJw2",
];
const HASH = HASHES[0]!;
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

// ---- 0. the hero machine ----------------------------------------------
// One timeline, six phases, driven by class toggles rather than by animating
// attributes from JS — so `prefers-reduced-motion` can kill the motion in CSS
// while the timeline still walks to the same end state.
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const svg = document.querySelector<SVGSVGElement>(".hero svg")!;
const el = (s: string) => svg.querySelector(s)!;
let run = 0;

// Paint the stored string, revealing `shown` characters. Segment colours come
// from the same 4/6/7/29 offsets the anatomy section uses, so the salt run the
// machine just dropped in is the salt run highlighted here.
function paintOut(hash: string, shown: number, hot: boolean) {
  const cls = (i: number) =>
    i < 4 ? "sv" : i < 6 ? "sc" : i < 7 ? "sv" : i < 29 ? (hot ? "ss" : "sv") : "sd";
  el("#hOut").innerHTML = Array.from(hash)
    .map((c, i) =>
      i < shown ? `<span class="${cls(i)}">${c}</span>` : `<span class="pending">·</span>`,
    )
    .join("");
}

// Eight steps. Each `render` is ABSOLUTE — it draws the state for step i from
// scratch rather than accumulating — so stepping backwards, jumping on the
// track and deep-linking all land on exactly the same picture.
const HSTEPS = [
  `Here is the secret: 256 random bits from a cryptographically secure generator. Right now this is the only thing in the world that has to stay private.`,
  `It goes into bcrypt.`,
  `A brand-new random salt is drawn — <b>a different one every single time this runs</b>.`,
  `The two get chewed on together, 1,024 times over. That is what <b>cost 10</b> means: 2¹⁰ rounds. Cost 11 would be 2,048, and twice as slow.`,
  `Out comes exactly 60 characters. <b>The secret itself is not in there.</b>`,
  `And the salt from step 3? Stored right there in the open, inside the same string. <b>There is no salt column.</b>`,
  `Nothing goes back the other way. There is no key that undoes this, because it is not encryption.`,
  `So how is a secret ever <i>checked</i>? The salt is read back out of the stored string and the machine is run again with it. Same secret plus same salt gives the same 60 characters — and those can be compared.`,
];

function renderHero(i: number) {
  const hash = HASHES[run % HASHES.length]!;
  $("#hNo")!.innerHTML = i + 1 + "<small>of " + HSTEPS.length + "</small>";
  $("#hStatus")!.innerHTML = HSTEPS[i]!;
  [...$("#hTrack")!.children].forEach((t, k) => {
    t.className = "tick" + (k < i ? " done" : k === i ? " now" : "");
  });

  const verifying = i >= 7;
  el("#hLine1").classList.toggle("live", i === 1 || verifying);
  el("#hLine2").classList.toggle("live", i === 4);
  el("#hHopper").classList.toggle("on", i >= 2);
  // re-trigger the drop only on the step that shows it happening
  svg.classList.remove("dropping");
  // reading a layout property forces the reflow that lets the animation
  // re-trigger; SVG elements have no offsetWidth, so measure the box instead
  if (i === 2 && !REDUCED) {
    svg.getBoundingClientRect();
    svg.classList.add("dropping");
  }
  svg.classList.toggle("spinning", i === 3 && !REDUCED);

  el("#hRounds").textContent = i >= 3 ? "1,024 of 1,024 rounds" : "0 of 1,024 rounds";
  paintOut(hash, i >= 4 ? hash.length : 0, i >= 5);
  $("#hOutCap")!.textContent =
    i >= 5 ? "the highlighted run IS the salt — no second column" : "60 characters, every time";

  // step 8 swaps the whole figure into its verify reading
  el("#hInLbl").textContent = verifying ? "The secret, presented again" : "The secret";
  el("#hSaltLbl").textContent = verifying ? "The SAME salt" : "A fresh salt";
  el("#hSaltVal").textContent = verifying ? "reused, not redrawn" : "128 random bits";
  $("#hNoway")!.classList.toggle("on", i === 6);
  $("#hVerify")!.classList.toggle("on", verifying);
}

$("#hTrack")!.innerHTML = HSTEPS.map(() => `<div class="tick"></div>`).join("");
let playing = false;
const setPlayLabel = () => {
  $("#hPlay")!.textContent = playing ? "❚❚ Pause" : "▶ Play";
};

const HERO = stepper({
  n: HSTEPS.length,
  hashKey: "hero",
  autoplayMs: 3200,
  target: document.querySelector<HTMLElement>(".hero")!, // scoped: the beats stepper below owns document arrows
  onStep: (i) => {
    renderHero(i);
    if (i >= HSTEPS.length - 1 && playing) {
      playing = false;
      setPlayLabel();
    }
  },
});
HERO.pause(); // stepper autostarts when given autoplayMs
setPlayLabel();

$("#hPlay")!.addEventListener("click", () => {
  if (playing) {
    HERO.pause();
    playing = false;
  } else {
    if (HERO.current >= HSTEPS.length - 1) HERO.go(0);
    HERO.play();
    playing = true;
  }
  setPlayLabel();
});
$("#hNext")!.addEventListener("click", () => {
  playing = false;
  setPlayLabel();
  HERO.next();
});
$("#hPrev")!.addEventListener("click", () => {
  playing = false;
  setPlayLabel();
  HERO.prev();
});
// Restart also draws a NEW salt, so replaying is the demonstration: same
// secret, genuinely different string.
$("#hRestart")!.addEventListener("click", () => {
  playing = false;
  setPlayLabel();
  run++;
  HERO.go(0);
  renderHero(0);
});
[...$("#hTrack")!.children].forEach((t, k) => {
  t.addEventListener("click", () => {
    playing = false;
    setPlayLabel();
    HERO.go(k);
  });
});

// ---- 1. the custody track ---------------------------------------------
// Six places, six beats. `state` is one of: clear | hashed | gone | "" .
const PLACES = [
  "Random source",
  "Operator's screen",
  "Client config",
  "The network",
  "Server memory",
  "Credential store",
];
type PlaceState = "clear" | "hashed" | "gone" | "";
const BEATS: { t: string; n?: number; d: string; v: [PlaceState, string][] }[] = [
  {
    t: "Generate",
    n: 6,
    d: `32 bytes are drawn from a cryptographically secure random source and encoded — ${SECRET.length} characters, 256 bits of entropy. Not a passphrase somebody thought of, and not <code>Math.random()</code>: an attacker who can predict the generator does not need to guess the output.`,
    v: [
      ["clear", trunc(SECRET, 22)],
      ["", "—"],
      ["", "—"],
      ["", "—"],
      ["", "—"],
      ["", "—"],
    ],
  },
  {
    t: "Hash",
    d: `Before it is shown to anyone, it is hashed with bcrypt at cost 10. The server derives the value it will keep <b>first</b> — the readable secret is already on its way out.`,
    v: [
      ["gone", "discarded"],
      ["", "—"],
      ["", "—"],
      ["", "—"],
      ["clear", trunc(SECRET, 20)],
      ["hashed", trunc(HASH, 20)],
    ],
  },
  {
    t: "Show it once",
    d: `The only moment the secret is legible to a human. It is on the screen, and after this page is closed it can never be displayed again — not by support, not by an administrator, not by the database owner. Nobody is withholding it; nobody has it.`,
    v: [
      ["gone", "discarded"],
      ["clear", trunc(SECRET, 20)],
      ["", "—"],
      ["", "—"],
      ["gone", "wiped"],
      ["hashed", trunc(HASH, 20)],
    ],
  },
  {
    t: "Store",
    d: `What remains on the server is one 60-character string. Read the whole credential store and you have no working credential — only proof of what one would look like.`,
    v: [
      ["gone", "discarded"],
      ["gone", "closed"],
      ["clear", trunc(SECRET, 20)],
      ["", "—"],
      ["gone", "wiped"],
      ["hashed", trunc(HASH, 20)],
    ],
  },
  {
    t: "Present",
    d: `The client sends the secret to the token endpoint over TLS to get a token. This happens <b>once per token</b>, not once per API call — which is exactly why a deliberately slow hash is affordable here and would not be on every request.`,
    v: [
      ["gone", "discarded"],
      ["gone", "closed"],
      ["clear", trunc(SECRET, 20)],
      ["clear", "TLS"],
      ["clear", trunc(SECRET, 20)],
      ["hashed", trunc(HASH, 20)],
    ],
  },
  {
    t: "Verify",
    d: `The server reads the cost and salt back out of the stored string, re-derives with them, and compares in constant time. One bit comes out. The presented secret is dropped and the whole cycle can start again from an empty server.`,
    v: [
      ["gone", "discarded"],
      ["gone", "closed"],
      ["clear", trunc(SECRET, 20)],
      ["gone", "closed"],
      ["gone", "compared, dropped"],
      ["hashed", trunc(HASH, 20)],
    ],
  },
];

const track = $("#track")!;
track.innerHTML = PLACES.map(
  (p, i) =>
    `<div class="place" data-viz-id="place-${i}" data-label="${p}">
       <div class="pn">${p}</div><div class="pv" id="pv${i}">—</div>
     </div>`,
).join("");

function renderBeat(i: number) {
  const b = BEATS[i]!;
  $("#beatNo")!.innerHTML = i + 1 + "<small>of " + BEATS.length + "</small>";
  $("#beatT")!.textContent = b.t;
  $("#beatD")!.innerHTML = b.d;
  b.v.forEach(([state, text], k) => {
    const place = track.children[k]!;
    place.className = "place" + (state ? " " + state : "");
    place.querySelector(".pv")!.textContent = text;
  });
}
stepper({ n: BEATS.length, onStep: renderBeat, hashKey: "beat" });

// ---- 2. the anatomy ----------------------------------------------------
// Sliced from HASH itself: $2b$ | 10 | $ | 22 salt | 31 digest. Deriving the
// offsets means the labels can never point at the wrong characters.
const rest = HASH.slice(7); // after "$2b$10$"
const SEGS: [string, string, string, string, string][] = [
  [
    "s-ver",
    HASH.slice(0, 4),
    "Algorithm",
    "4 chars",
    "bcrypt, revision <b>2b</b>. Not a choice made per credential — it names which implementation quirks apply.",
  ],
  [
    "s-cost",
    HASH.slice(4, 6),
    "Cost",
    "2 chars",
    "A base-2 logarithm: <b>2¹⁰ = 1,024 rounds</b>. Raise it as hardware gets faster; old hashes keep verifying at their own cost.",
  ],
  ["s-sep", HASH.slice(6, 7), "", "", ""],
  [
    "s-salt",
    rest.slice(0, 22),
    "Salt",
    rest.slice(0, 22).length + " chars",
    '<b>128 bits of random, stored in the clear, right here.</b> Not secret, not separate, not optional — this is the answer to "where is the salt?".',
  ],
  [
    "s-dig",
    rest.slice(22),
    "Digest",
    rest.slice(22).length + " chars",
    "184 bits of the bcrypt output. The only part that depends on the secret — and the only part that is one-way.",
  ],
];
$("#anat")!.innerHTML = SEGS.map(
  ([cls, txt, lab]) =>
    `<span class="seg ${cls}" data-viz-id="seg-${lab || "sep"}" data-label="${lab || "separator"}">${txt}` +
    (lab ? `<span class="bar"></span>` : "") +
    `</span>`,
).join("");
$("#anatRows")!.innerHTML = SEGS.filter((s) => s[2])
  .map(
    ([cls, , lab, size, what]) =>
      `<div class="r-name ${cls}">${lab}</div><div class="r-size">${size}</div>` +
      `<div class="r-what">${what}</div>`,
  )
  .join("");

// ---- 3. three hashes ---------------------------------------------------
// Highlight per character against the first hash, so "identical up to the
// cost, divergent after it" is something the reader sees rather than is told.
$("#hashes")!.innerHTML = HASHES.map((h, i) => {
  const marked = Array.from(h)
    .map((c, k) =>
      HASHES.every((o) => o[k] === c)
        ? `<span class="same">${c}</span>`
        : `<span class="diff">${c}</span>`,
    )
    .join("");
  return `<div><span class="lbl">run ${i + 1}</span>${marked}</div>`;
}).join("");

// ---- 5. the work factor ------------------------------------------------
// Measured on this machine 2026-08-06 with Bun's bcrypt. Absolute numbers are
// hardware-specific; the doubling per cost step is the invariant.
const COSTS: [number, number][] = [
  [4, 0.9],
  [10, 52.8],
  [12, 205.5],
  [14, 771.0],
];
const max = Math.max(...COSTS.map((c) => c[1]));
$("#bars")!.innerHTML = COSTS.map(
  ([c, ms]) =>
    `<div class="bl">cost ${c}</div>` +
    `<div class="bb" style="width:${Math.max(2, (ms / max) * 100)}%" ` +
    `data-viz-id="cost-${c}" data-label="cost ${c}"></div>` +
    `<div class="bv">${ms.toFixed(1)} ms</div>`,
).join("");

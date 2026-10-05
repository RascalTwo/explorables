import { stepper, saveHash, loadHash, $, $$, esc } from "@viz/kit";

type Dur = number | "never" | "ongoing";
interface Lever {
  nm: string;
  sub: string;
  attack: Dur;
  attackNote: string;
  coll: Dur;
  collNote?: string;
  total?: boolean;
}
type Cell = [string, string, string];
interface Work {
  nm: string;
  h: string;
  cls?: string;
  c: Cell[];
}

const UNIVERSES = [
  {
    tag: "UNIVERSE A",
    nm: "Ephemeral signing key",
    as: "In memory, never written down. Rotation is a restart.",
    rotate: 0.3,
    rotName: "Restart the issuer",
    rotSub: "the key dies with the process",
  },
  {
    tag: "UNIVERSE B",
    nm: "Key from a secret manager",
    as: "Persisted and guarded. Rotation is a procedure someone owns.",
    rotate: 8,
    rotName: "Emergency key rotation",
    rotSub: "write a new key, then roll every instance",
  },
];
const TTLS = [
  { m: 1, l: "1 min" },
  { m: 5, l: "5 min" },
  { m: 15, l: "15 min" },
  { m: 60, l: "60 min" },
];

/* Assumed JWKS cache lifetime at the verifier, in minutes. Five is a common
   library default and the page states it rather than hiding it.

   This constant exists because rotation does NOT contain instantly, and drawing
   it as though it does was wrong. Discarding a key stops the ISSUER using it; a
   verifier goes on accepting tokens signed with it until either its cached copy
   expires or the token hits its own `exp`, whichever comes first. So the real
   containment time is min(CACHE, ttl) — and at a short lifetime that is just the
   lifetime, which makes rotation no faster than doing nothing.

   Do not "fix" this by shortening CACHE. The cache is an availability buffer as
   much as a performance one: every expiry forces a fetch, and a fetch that fails
   with an empty cache fails the request. Rotation is picked up by the
   unknown-kid refresh path regardless of this number. */
const CACHE = 5;
const contain = (ttl: number) => Math.min(CACHE, ttl);

/* Every duration is in minutes from the moment you find out. `end` may be a
   number, "ttl" (bounded by token lifetime), "rot" (this universe's rotation
   time) or "never". Collateral is drawn on the same row, beneath. */
const LEVERS = (u: number, ttl: number): Lever[] => {
  const U = UNIVERSES[u]!;
  return [
    {
      nm: "Wait it out",
      sub: "no action; rely on expiry",
      attack: "never",
      attackNote: "they keep re-authenticating and minting fresh tokens",
      coll: 0,
    },
    {
      nm: "Deactivate the credential",
      sub: "stop the client getting new tokens",
      attack: ttl,
      attackNote: `no new tokens, but the one they hold works for its full ${ttl} min`,
      coll: 0,
    }, // that client going down afterwards is intended, not collateral
    {
      nm: "Block it at the edge",
      sub: "a gateway or firewall rule",
      attack: 3,
      attackNote: "as fast as your change process; only covers traffic through the edge",
      coll: 0,
    },
    {
      nm: "Deny-list + introspect",
      sub: "check every token against the issuer",
      attack: 1,
      attackNote: "near-immediate once it propagates",
      coll: "ongoing",
      collNote: "permanent: the issuer is now on the path of every single API call",
    },
    {
      nm: U.rotName,
      sub: U.rotSub,
      // The ACT is fast; the CONTAINMENT is not. Verifiers keep honouring the
      // discarded key until their cache turns over or the token expires.
      attack: U.rotate + contain(ttl),
      attackNote:
        contain(ttl) >= ttl
          ? `the act takes ${u === 0 ? "seconds" : "minutes"}, but verifiers honour the old key until it turns over — bounded here by the ${ttl} min lifetime, so no faster than waiting`
          : `the act takes ${u === 0 ? "seconds" : "minutes"}, then up to ${CACHE} min while verifiers still hold the old key — still well inside the ${ttl} min lifetime`,
      coll: U.rotate + contain(ttl),
      collNote: "every outstanding token dies — but as each verifier notices, not at one instant",
      total: true,
    },
  ];
};

const WORKS: Work[] = [
  {
    nm: "Wait it out",
    h: "no action",
    c: [
      ["part", "◑", "bounded by exp"],
      ["no", "✗", "they just mint another"],
      ["no", "✗", "they mint their own"],
      ["no", "✗", "nothing changes"],
    ],
  },
  {
    nm: "Deactivate the credential",
    h: "at the issuer",
    c: [
      ["part", "◑", "stops renewal only"],
      ["yes", "✓", "cuts off new tokens"],
      ["no", "✗", "forgery needs no credential"],
      ["no", "✗", "irrelevant"],
    ],
  },
  {
    nm: "Block it at the edge",
    h: "gateway / firewall",
    c: [
      ["part", "◑", "if it comes via the edge"],
      ["part", "◑", "if it comes via the edge"],
      ["no", "✗", "forged tokens look normal"],
      ["part", "◑", "blocks reads of the key set"],
    ],
  },
  {
    nm: "Deny-list + introspect",
    h: "issuer on every call",
    c: [
      ["yes", "✓", "the fastest fix here"],
      ["yes", "✓", "deny per token"],
      ["part", "◑", "only if you can enumerate them"],
      ["no", "✗", "the forgery is still valid"],
    ],
  },
  // "Stolen client secret → yes, kills it too" was wrong and is now corrected.
  // Rotating the key invalidates the tokens they are holding; it does nothing to
  // their ability to present the secret and mint a fresh one, signed with the new
  // key, moments later. That is what deactivating the credential is for. Killing
  // the tokens while leaving the credential live is a pause, not containment.
  {
    nm: "Rotate the signing key",
    h: "restart, or vault write",
    cls: "only",
    c: [
      ["yes", "✓", "kills it, once verifiers turn over"],
      ["part", "◑", "kills their current token; they mint a new one with the secret"],
      ["yes", "✓", "the only lever that works"],
      ["yes", "✓", "republishes a key they do not hold"],
    ],
  },
];

const unis = $("#unis")!,
  ttls = $("#ttls")!,
  chart = $("#chart")!,
  cap = $("#cap")!,
  wrows = $("#wrows")!,
  notes = $("#notes")!;

unis.innerHTML = UNIVERSES.map(
  (u, i) =>
    `<button class="uni" role="tab" id="uni-${i}" aria-selected="false">
     <span class="num">${u.tag}</span><span class="nm">${esc(u.nm)}</span><span class="as">${esc(u.as)}</span>
   </button>`,
).join("");
ttls.innerHTML = TTLS.map(
  (t, i) => `<button class="ttl" role="tab" id="ttl-${i}" aria-selected="false">${t.l}</button>`,
).join("");

const X0 = 300,
  X1 = 1130,
  ROW0 = 92,
  RH = 74;

function draw(u: number, ti: number) {
  const ttl = TTLS[ti]!.m;
  const levers = LEVERS(u, ttl);
  const finite = levers.map((l) => l.attack).filter((v): v is number => typeof v === "number");
  const span = Math.max(ttl * 1.6, Math.max(...finite) * 1.4, 3); // fits the lifetime AND every lever
  const sx = (m: number) => X0 + Math.min(m / span, 1) * (X1 - X0);
  const H = ROW0 + levers.length * RH + 66;

  /* At the shortest lifetimes the expiry mark sits almost on the origin, and the
     two labels run together as one string. The origin tick is the expendable one. */
  const ticks = [0, ttl, span]
    .filter((v, i, a) => a.indexOf(v) === i)
    .filter((t) => t !== 0 || (ttl / span) * (X1 - X0) > 74);
  const bar = (m: Dur, y: number, cls: string, h: number) => {
    if (m === "ongoing")
      return `<rect class="bar ongoing" x="${sx(0)}" y="${y}" width="${X1 - sx(0)}" height="${h}" rx="4"/>`;
    if (m === "never")
      return `<rect class="bar ${cls}" x="${sx(0)}" y="${y}" width="${X1 - sx(0)}" height="${h}" rx="4"/>`;
    const w = sx(m) - sx(0);
    return w < 1.5
      ? ""
      : `<rect class="bar ${cls}" x="${sx(0)}" y="${y}" width="${w}" height="${h}" rx="4"/>`;
  };
  /* Once a bar is past halfway there is no room to its right, so the note goes
     inside it, right-aligned. Clamping the start x only moved the overflow. */
  const HALF = X0 + (X1 - X0) * 0.5;
  const note = (m: Dur, y: number, t: string | undefined) => {
    if (!t) return "";
    const inside = m === "never" || m === "ongoing" || sx(m) > HALF;
    const x = inside ? (m === "never" || m === "ongoing" ? X1 : sx(m)) - 10 : sx(m) + 10;
    return `<text class="blabel" x="${x}" y="${y}"${inside ? ' text-anchor="end"' : ""}>${esc(t)}</text>`;
  };

  chart.innerHTML = `<svg viewBox="0 0 1180 ${H}" role="img" aria-label="Five containment levers drawn against time from the moment a compromise is found. Each shows how long the attacker stays capable, and how much legitimate traffic the lever itself breaks. Rotating the signing key contains fastest and breaks the most.">
    ${ticks.map((t) => `<line class="grid" x1="${sx(t)}" y1="${ROW0 - 26}" x2="${sx(t)}" y2="${ROW0 + levers.length * RH - 14}"/>`).join("")}
    <line class="grid" x1="${sx(ttl)}" y1="${ROW0 - 26}" x2="${sx(ttl)}" y2="${ROW0 + levers.length * RH - 14}" stroke="var(--accent)"/>
    ${ticks.map((t) => `<text class="tick ${t === ttl ? "hi" : ""}" x="${sx(t)}" y="${ROW0 - 34}" text-anchor="${t === 0 ? "start" : t === span ? "end" : "middle"}">${t === ttl ? `token expiry · ${t} min` : t === span ? `${Math.round(t)} min` : "0"}</text>`).join("")}

    ${levers
      .map((l, i) => {
        const y = ROW0 + i * RH;
        return `<text class="lname" x="24" y="${y + 16}">${esc(l.nm)}</text>
        <text class="lsub" x="24" y="${y + 33}">${esc(l.sub)}</text>
        ${bar(l.attack, y, "attack", 20)}
        ${note(l.attack, y + 15, l.attackNote)}
        ${l.coll ? bar(l.coll, y + 26, "coll", 14) + note(l.coll, y + 37, l.collNote) : ""}`;
      })
      .join("")}

    <line class="axis" x1="${X0}" y1="${ROW0 + levers.length * RH - 14}" x2="${X1}" y2="${ROW0 + levers.length * RH - 14}"/>
    <text class="axname" x="${X0}" y="${ROW0 + levers.length * RH + 14}">TIME FROM THE MOMENT YOU FIND OUT &#8594;</text>
  </svg>`;

  cap.textContent =
    u === 0
      ? `With an ephemeral key, the fastest and most complete lever is a restart — seconds, no tooling, no runbook. Everything else is slower or narrower. The price is the amber bar beside it: every outstanding token, for every client, dies at that same instant.`
      : `With a persisted key, rotation is a procedure — a write plus a rollout — so containment takes minutes rather than seconds. It still breaks every outstanding token, and it is still the only lever that answers a stolen signing key.`;

  $$(".uni").forEach((b, i) => b.setAttribute("aria-selected", String(i === u)));
  $$(".ttl").forEach((b, i) => b.setAttribute("aria-selected", String(i === ti)));

  wrows.innerHTML = WORKS.map((w) => {
    const nm = w.nm === "Rotate the signing key" ? UNIVERSES[u]!.rotName : w.nm;
    return `<tr class="${w.cls ?? ""}">
      <td class="lev">${esc(nm)}<span class="h">${esc(w.h)}</span></td>
      ${w.c.map(([k, g, t]) => `<td class="${k}"><span class="v"><span class="g">${g}</span> ${esc(t)}</span></td>`).join("")}
    </tr>`;
  }).join("");

  notes.innerHTML = `
    <div class="takeaway"><strong>Only one lever answers a stolen signing key, and it is the one with
      the worst collateral.</strong> Deactivating a credential does nothing to a forger — they never
      needed a credential. Deny-listing does nothing either, because you cannot enumerate tokens you
      never issued. Rotation is the whole answer — but <em>how fast you can rotate</em> is not the
      number that matters. Rotating is quick; <strong>being believed takes longer</strong>, because
      every verifier goes on honouring its cached copy of the key you just discarded. The number to
      know about your own deployment is how long that cache lives.</div>

    <div class="takeaway warn"><strong>Token lifetime is the dial that moves everything else.</strong>
      At ${ttl} minutes, “wait it out” and “deactivate the credential” both leave the attacker working
      for up to ${ttl} minutes. Halve the lifetime and you halve every red bar on this page without
      building anything. It is the cheapest control here and the only one that is already paid for.
      ${
        ttl <= 1
          ? `<br><br><strong>At one minute, look at what just happened:</strong> blocking at the
      edge, and rotating a persisted key, both take <em>longer than the token lives</em>. Below a
      certain lifetime most of your levers stop being containment at all — expiry beats them — and the
      only ones still worth pulling are those that stop the attacker <em>renewing</em>.`
          : ""
      }</div>

    <h2>Planned rotation and emergency rotation are not the same operation</h2>
    <p class="lede">This is the part that gets missed, and it quietly contradicts the tidy rotation
    story people take away from the key-distribution diagrams.</p>
    <div class="split">
      <div class="plan"><div class="h">Planned rotation — has an overlap</div>
        <p>Publish the new key <strong>alongside</strong> the old one, let tokens signed under the old
        key drain naturally, then withdraw it. Nothing breaks, nobody notices, and this is the
        behaviour the key set is plural for.</p></div>
      <div class="emrg"><div class="h">Emergency rotation — cannot have one</div>
        <p>If the old key is compromised you <strong>cannot keep publishing it</strong> — that is the
        entire point of the exercise. So the overlap window is unavailable exactly when you most want
        it, and <strong>every legitimate outstanding token dies with the attacker's</strong>. Plan for
        the re-authentication storm; it is not optional.</p></div>
    </div>

    <div class="takeaway"><strong>Every one of these levers is a decision made before the incident.</strong>
      Whether you can deny-list, whether there is an edge to block at, whether anyone is allowed to
      restart the issuer at 3am, and how long a token lives — all of it is settled in advance. During
      an incident you are only choosing among the levers you already built.</div>`;
}

let ti = Math.min(Math.max(loadHash<{ ttl: number }>().ttl ?? 0, 0), TTLS.length - 1); // default: 1 min — the family's stated lifetime
const step = stepper({ n: UNIVERSES.length, hashKey: "universe", onStep: (u) => draw(u, ti) });
$$(".uni").forEach((b, i) =>
  b.addEventListener("click", () => {
    step.go(i);
    draw(i, ti);
  }),
);
$$(".ttl").forEach((b, i) =>
  b.addEventListener("click", () => {
    ti = i;
    saveHash({ ...loadHash(), ttl: i });
    draw(step.current, ti);
  }),
);

/* --- lever 4 detail figure ---------------------------------------------
   Static: it does not react to the universe or the TTL, because the mechanism
   does not change with either. What changes with the TTL is whether you would
   BOTHER, and that argument is prose beside the figure rather than a fourth
   interactive control on a page that already has two. */
{
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    cls: string,
    num: string,
    title: string,
    desc: string,
  ) => {
    const lines = desc.split("|");
    return (
      `<rect class="dstep ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="7"/>` +
      (num ? `<text class="dnum" x="${x + 12}" y="${y + 20}">${num}</text>` : "") +
      `<text class="dt" x="${x + (num ? 30 : 12)}" y="${y + 21}">${title}</text>` +
      lines
        .map((l, i) => `<text class="dd" x="${x + 12}" y="${y + 41 + i * 15}">${l}</text>`)
        .join("")
    );
  };
  const arrow = (x1: number, y1: number, x2: number, _y2?: number, cls = "") =>
    `<path class="dedge ${cls}" d="M${x1},${y1} H${x2}" marker-end="url(#dar)"/>`;

  document.querySelector("#denyfig")!.innerHTML =
    `<defs><marker id="dar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6"
       markerHeight="6" orient="auto-start-reverse">
       <path d="M0,0 L10,5 L0,10 z" fill="var(--border)"/></marker></defs>` +
    // shared step 1 and 2
    `<text class="dplane" x="24" y="26">SHARED BY BOTH — HAPPENS ONCE PER TOKEN</text>` +
    box(
      24,
      40,
      236,
      92,
      "",
      "1",
      "Mint and stamp",
      "The issuer puts a unique|<tspan font-family='var(--mono)'>jti</tspan> in the claims. It is|signed, so nobody can alter it.",
    ) +
    arrow(266, 86, 296) +
    box(
      302,
      40,
      236,
      92,
      "",
      "2",
      "Revoke",
      "Somebody — or an alert —|says this one token is done.|The <tspan font-family='var(--mono)'>jti</tspan> goes on a list.",
    ) +
    // the split
    `<text class="dplane" x="24" y="180">STEP 3 — THE ONLY DIFFERENCE, AND IT REPEATS ON EVERY REQUEST</text>` +
    `<path class="dedge" d="M420,132 V162 H180 V196" marker-end="url(#dar)"/>` +
    `<path class="dedge" d="M420,132 V162 H660 V196" marker-end="url(#dar)"/>` +
    `<text class="dtag local" x="24" y="212">Option A · local deny-list</text>` +
    box(
      24,
      222,
      380,
      104,
      "local",
      "3a",
      "Check in memory",
      "The list is pushed to the resource server out of band.|The check is a set lookup — no network call, no|database. The issuer can be down and the API serves.|<tspan fill='var(--muted)'>Cost: a propagation delay, and one small update channel.</tspan>",
    ) +
    `<text class="dtag intro" x="504" y="212">Option B · introspection</text>` +
    box(
      504,
      222,
      380,
      104,
      "intro",
      "3b",
      "Ask the issuer",
      "The resource server calls the authorization server|about every token it sees. No delay at all.|<tspan fill='var(--warn)'>Cost: the issuer is now on the path of every request,</tspan>|<tspan fill='var(--warn)'>and its outage is your outage.</tspan>",
    ) +
    `<text class="dnote" x="906" y="252">Both read the same</text>` +
    `<text class="dnote" x="906" y="266" font-family="var(--mono)">jti</text>` +
    `<text class="dnote" x="906" y="284">claim. Only the</text>` +
    `<text class="dnote" x="906" y="298">lookup differs.</text>` +
    // shared step 4
    `<text class="dplane" x="24" y="366">SHARED BY BOTH — THE LIST BOUNDS ITSELF</text>` +
    box(
      24,
      380,
      860,
      72,
      "",
      "4",
      "Expire",
      "An entry only has to outlive the token it names. Once <tspan font-family='var(--mono)'>exp</tspan> passes the token is dead anyway, so the entry is dropped.|At a short lifetime the list holds only what was revoked in the last minute — bounded storage, not an append-only ledger.",
    );
}

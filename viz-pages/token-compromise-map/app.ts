import { labelBox, stepper, $, $$, esc } from "@viz/kit";

/* Two universes, one system. The ONLY thing that differs is where the signing
   key lives — everything else on this page is identical, which is the point:
   that one choice moves the worst node on the map and adds a new one.

   These are no longer presented as an open pick. A is the chosen design; B is
   kept as the contrast that shows what persisting would buy and what it would
   cost, because "there is no key at rest" only reads as an answer next to the
   alternative it is an answer to. */
type Cell = string | [string, string];
type Pos = [number, number];
interface MapNode {
  id: string;
  t: string;
  d: string;
  detect: Cell;
  sig: Cell;
  pos: [Pos, Pos];
  moves?: boolean;
  only?: number;
}
interface Row {
  id: string;
  what: string;
  hint: string;
  cls?: string;
  flag?: string;
  only?: number;
  can: Cell;
  bound: Cell;
  know: Cell;
  off: Cell;
}

const UNIVERSES = [
  {
    tag: "CHOSEN",
    nm: "Ephemeral signing key",
    as: "Generated in memory at start-up and never written down. No copy exists at rest — not on disk, not in a vault, not in a backup. Rotation is a restart.",
    cap: "With no key at rest there is nothing to read, so the signing key sits at the far right: an attacker must reach into the memory of a live process. Two costs, both accepted deliberately: if they ever do get in, nothing on earth records it — and the design requires a SINGLE INSTANCE. Two instances each generate their own keypair, and a token minted by one fails against the other's key set.",
  },
  {
    tag: "THE ALTERNATIVE",
    nm: "Key from a secret manager",
    as: "Generated once, stored in a vault or secret manager, read at start-up. It persists, it is backed up, and something guards it.",
    cap: "Persisting the key moves it left — it is now a thing with an address, readable by anyone the vault permits. What it buys is real: more than one instance can mint, and theft leaves a record. What it costs is a new worst node — whatever credential can read the vault — plus a rotation procedure and a custody question that the chosen design does not have to answer.",
  },
];

/* Node geometry. Position is (universe → {x,y}); a node absent from a universe
   fades rather than vanishing, so the switch reads as one continuous system. */
const W = 230,
  H = 88;
const NODES: MapNode[] = [
  {
    id: "token",
    t: "An access token",
    d: "in a header, a log, a crash dump",
    detect: "none",
    sig: "✗ looks legitimate",
    pos: [
      [220, 400],
      [220, 400],
    ],
  },
  {
    id: "secret",
    t: "The client secret",
    d: "the caller's own copy",
    detect: "part",
    sig: "◑ new source, odd rate",
    pos: [
      [570, 300],
      [570, 300],
    ],
  },
  {
    id: "store",
    t: "The credential store",
    d: "a table of bcrypt rows",
    detect: "part",
    sig: "◑ database access logs",
    pos: [
      [900, 400],
      [900, 400],
    ],
  },
  {
    id: "jwks",
    t: "Control of the JWKS host",
    d: "publish your own key; verifiers accept it",
    detect: "part",
    sig: "◑ config drift, TLS change",
    pos: [
      [900, 182],
      [900, 182],
    ],
  },
  {
    id: "key",
    t: "The signing key",
    d: "mint any token, any audience",
    detect: ["none", "good"],
    sig: ["✗ nothing records it", "✓ vault read log"],
    pos: [
      [900, 78],
      [570, 78],
    ],
    moves: true,
  },
  {
    id: "vault",
    t: "Whatever reads the vault",
    d: "the key to the key",
    detect: "good",
    sig: "✓ vault audit log",
    pos: [
      [570, 182],
      [570, 182],
    ],
    only: 1,
  },
];

/* Row content. A cell may be a single string (same in both universes) or a
   two-element array (A, B). */
const ROWS: Row[] = [
  {
    id: "key",
    what: "The signing key",
    hint: "the issuer's private RSA key",
    cls: "worst",
    flag: '<span class="flag d">worst case</span>',
    can: "Mint a valid token for <strong>any</strong> client, audience, scope and lifetime. Every verifier accepts it, because it is genuinely signed.",
    bound:
      "Nothing. Audience and scope are claims <em>they</em> now control. The only real bound is how long the key stays published.",
    know: [
      "<strong>You would not.</strong> The key is only ever in memory, so there is no read to log and no artifact to diff. Forged tokens are indistinguishable from real ones.",
      "<strong>The vault read is logged.</strong> “Who read the signing key, and when” is an answerable question — which is the single strongest argument for this universe.",
    ],
    off: [
      "Restart. The key dies with the process and the key set changes on the spot.",
      "Emergency rotation — write a new key, withdraw the old one immediately.",
    ],
  },
  {
    id: "vault",
    what: "Whatever can read the vault",
    hint: "a role, a machine token, a CI runner",
    cls: "newrow",
    flag: '<span class="flag n">exists only in universe B</span>',
    only: 1,
    can: "Read the signing key, and therefore everything in the row above. Persisting the key creates this row; it did not exist before.",
    bound:
      "Vault ACLs, short-lived credentials, and whether the read path is separated from the deploy path.",
    know: "Vault audit logs — provided somebody actually reads them, and provided a legitimate start-up read looks different from an illegitimate one.",
    off: "Revoke the role or token, then rotate the signing key anyway, because you must assume it was read.",
  },
  {
    id: "jwks",
    what: "Control of the JWKS host",
    hint: "the server, or its TLS private key",
    can: "Publish an attacker's own public key. Verifiers fetch it, trust it, and accept tokens the attacker signed — <strong>without ever touching your signing key</strong>.",
    bound:
      "TLS itself, and the fact that verifiers cache — a poisoned key set only reaches verifiers that refetch while you hold the host.",
    know: 'Indirectly: certificate transparency, configuration drift, an unexpected <span class="m">kid</span> appearing in the published set.',
    off: 'Restore the host and the key set. Outstanding forged tokens still verify until their <span class="m">exp</span>, so treat it as a key compromise too.',
  },
  {
    id: "secret",
    what: "The client secret",
    hint: "the calling service's credential",
    can: "Request tokens as that client, for as long as the credential stays active. Not a forgery — a genuine impersonation.",
    bound:
      "That client's scopes and audience. This is exactly what scope is for, and the only row where it does real containment work.",
    know: "Indirect signals only: issuance from a new source, an unusual token-request rate, use outside a normal window.",
    off: "Deactivate the credential at the issuer. New tokens stop at once; tokens already issued live until they expire.",
  },
  {
    id: "token",
    what: "One access token",
    hint: "in a log, a proxy, a crash dump",
    can: "Everything that one token's claims allow, until it expires. Bearer means exactly that — holding it is the whole qualification.",
    bound:
      '<span class="m">exp</span>, <span class="m">aud</span> and scope, all baked in at issue. Short lifetimes are the containment.',
    know: "Generally not. A valid token used from an unexpected place still verifies perfectly — unless it is sender-constrained.",
    off: 'Wait for <span class="m">exp</span>, or introspect on every request and deny-list it. There is no third option.',
  },
  {
    id: "store",
    what: "The credential store",
    hint: "the table of bcrypt rows",
    can: "Very little, immediately. These are bcrypt hashes, not secrets — each one has to be cracked, at the cost the work factor sets.",
    bound:
      "The bcrypt work factor, and the fact that the secrets are high-entropy random strings rather than passwords people chose.",
    know: "Database access logs, if the read looks different from normal application traffic.",
    off: "Rotate every client secret. Painful and slow, but the exposure grows only as fast as cracking does.",
  },
];

const cell = (v: Cell, u: number): string => (Array.isArray(v) ? v[u]! : v);

const unis = $("#unis")!,
  map = $("#map")!,
  rows = $("#rows")!,
  cap = $("#cap")!,
  notes = $("#notes")!;

unis.innerHTML = UNIVERSES.map(
  (u, i) =>
    `<button class="uni" role="tab" id="uni-${i}" aria-selected="false">
     <span class="num">${u.tag}</span><span class="nm">${esc(u.nm)}</span><span class="as">${esc(u.as)}</span>
   </button>`,
).join("");

/* Bands are ordered guides, not scales — so they are drawn as plain solid
   hairlines and labelled in words. No numbers, because there are none. */
const PX = [200, 510, 820, 1150] as const,
  PY = [70, 280, 400, 500] as const;
/* Band captions are TWO short lines, not one long one: a single sentence per band
   is wider than the band, and the three then overprint each other. */
const XB: [string, string][] = [
  ["EXPOSED", "places you do not fully control"],
  ["GUARDED", "something must be compromised"],
  ["DEEP", "a live process, or a server you own"],
];
const YB = ["TOTAL", "BROAD", "NARROW"];

const midX = (i: number) => (PX[i]! + PX[i + 1]!) / 2,
  midY = (i: number) => (PY[i]! + PY[i + 1]!) / 2;
/* Rotated text is anchored MIDDLE about the band's own centre. Anchoring at an
   edge is what previously stacked all three labels on the same point. */
const vtext = (x: number, y: number, t: string, cls: string) =>
  `<text class="${cls}" x="${x}" y="${y}" text-anchor="middle" transform="rotate(-90 ${x} ${y})">${t}</text>`;

map.innerHTML = `<svg viewBox="0 0 1180 620" role="img" aria-label="A map of the secrets in a client-credentials and JWKS design. The horizontal axis is how hard a secret is to obtain, from exposed to deep. The vertical axis is what obtaining it buys an attacker, from narrow to total. The signing key and control of the JWKS host both sit in the top band; an access token sits at the bottom left.">
  ${PX.slice(1, 3)
    .map((x) => `<line class="grid" x1="${x}" y1="${PY[0]}" x2="${x}" y2="${PY[3]}"/>`)
    .join("")}
  ${PY.slice(1, 3)
    .map((y) => `<line class="grid" x1="${PX[0]}" y1="${y}" x2="${PX[3]}" y2="${y}"/>`)
    .join("")}
  <line class="axis" x1="${PX[0]}" y1="${PY[3]}" x2="${PX[3]}" y2="${PY[3]}"/>
  <line class="axis" x1="${PX[0]}" y1="${PY[0]}" x2="${PX[0]}" y2="${PY[3]}"/>

  ${XB.map(
    (
      b,
      i,
    ) => `<text class="bandname strong" x="${midX(i)}" y="${PY[3] + 26}" text-anchor="middle">${b[0]}</text>
     <text class="bandname" x="${midX(i)}" y="${PY[3] + 43}" text-anchor="middle">${b[1]}</text>`,
  ).join("")}
  ${YB.map((t, i) => vtext(PX[0] - 20, midY(i), t, "bandname strong")).join("")}

  <text class="axname" x="${PX[0]}" y="${PY[3] + 72}">HOW HARD IT IS TO GET HOLD OF &#8594;</text>
  ${vtext(36, midY(1), "WHAT IT BUYS THEM &#8594;", "axname")}

  ${NODES.map(
    (
      n,
    ) => `<g class="node" id="n-${n.id}" style="transform: translate(${n.pos[0][0]}px, ${n.pos[0][1]}px)">
      <rect class="body" x="0" y="0" width="${W}" height="${H}" rx="8"/>
      ${labelBox({ x: 0, y: 0, w: W, h: H }, "", "")}
    </g>`,
  ).join("")}
</svg>`;

const paint = (u: number) => {
  $$(".uni").forEach((b, i) => b.setAttribute("aria-selected", String(i === u)));
  cap.textContent = UNIVERSES[u]!.cap;

  for (const n of NODES) {
    const g = $<SVGGElement>("#n-" + n.id)!;
    const [x, y] = n.pos[u]!;
    g.style.transform = `translate(${x}px, ${y}px)`;
    const det = cell(n.detect, u),
      sig = cell(n.sig, u);
    g.setAttribute(
      "class",
      `node detect-${det}${n.only !== undefined && n.only !== u ? " absent" : ""}${n.moves ? " moved" : ""}`,
    );
    g.querySelector(".vsvg-label")!.innerHTML =
      `<span class="t">${esc(n.t)}</span><span class="d">${esc(n.d)}</span>` +
      `<span class="sig ${det === "none" ? "none" : det === "part" ? "part" : "good"}">${esc(sig)}</span>`;
  }

  rows.innerHTML = ROWS.filter((r) => r.only === undefined || r.only === u)
    .map(
      (r) =>
        `<tr class="${r.cls ?? ""}">
       <td class="what">${r.what}${r.flag ?? ""}<span class="h">${r.hint}</span></td>
       <td>${cell(r.can, u)}</td><td>${cell(r.bound, u)}</td>
       <td>${cell(r.know, u)}</td><td>${cell(r.off, u)}</td>
     </tr>`,
    )
    .join("");

  notes.innerHTML = `
    <div class="takeaway"><strong>Two rows reach “total”, and only one of them is the signing key.</strong>
      Whoever controls the JWKS host can publish their own public key and have every verifier accept
      tokens they signed — <em>without ever obtaining your private key</em>. Key custody is only half
      the problem; the integrity of the published key set is the other half, and it is the half nobody
      draws.</div>
    <div class="takeaway"><strong>Only one row is genuinely contained by scope.</strong> A stolen
      client secret is bounded by that client's scopes and audience — which is exactly what they are
      for. A forged token is not bounded by anything, because the attacker writes the claims. Scope is
      a real control in one row of six; treating it as a general defence overstates it.</div>
    <div class="trade">
      <div class="a"><div class="h">Universe A · ephemeral · what it buys you</div>
        <p><strong>There is no artifact to steal.</strong> No file, no vault path, no backup, no disk
        image, no snapshot in a decommissioned environment. The attack requires reaching into the
        memory of a running process, which is a much smaller set of people.</p>
        <p><strong>The kill switch is free.</strong> A restart is a complete key rotation, needs no
        tooling, no runbook and no key-management story at all.</p></div>
      <div class="b"><div class="h">Universe A · ephemeral · what it costs you</div>
        <p><strong>You would never know.</strong> There is no read to audit. A compromise of this key
        is silent, permanent until restart, and undetectable — the worst combination on the page.</p>
        <p><strong>Every restart is a hard cutover.</strong> No overlap window: the old key leaves the
        set the moment the process dies, so every outstanding token stops verifying at once. And with
        more than one instance, each holds a <em>different</em> key — a token signed by one can fail
        at a verifier that fetched the key set from another.</p></div>
    </div>
    <div class="trade">
      <div class="b"><div class="h">Universe B · managed · what it buys you</div>
        <p><strong>The worst secret becomes auditable.</strong> “Who read the signing key” goes from
        an unanswerable question to a log line. Given that this is the one compromise with no other
        detection story, that is not a small win.</p>
        <p><strong>Rotation becomes a decision rather than an accident</strong>, with a real overlap
        window — and every instance signs with the same key, so restarts and deploys stop breaking
        outstanding tokens.</p></div>
      <div class="a"><div class="h">Universe B · managed · what it costs you</div>
        <p><strong>The key now has an address.</strong> It exists at rest, in backups, and in
        whatever read it last. Its security is now the vault's ACLs, and it moved left on the map.</p>
        <p><strong>You inherit a new row.</strong> Whatever credential reads the vault is now itself
        a path to total compromise, and it has to be governed, rotated and watched like the key it
        protects.</p></div>
    </div>`;
};

const step = stepper({ n: UNIVERSES.length, hashKey: "universe", onStep: paint });
$$(".uni").forEach((b, i) =>
  b.addEventListener("click", () => {
    step.go(i);
    paint(i);
  }),
);

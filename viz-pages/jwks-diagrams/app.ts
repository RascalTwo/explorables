import { side, labelBox, stepper, $, $$, type Box, type Point } from "@viz/kit";

/* Geometry discipline (kit rule): every node is declared ONCE as {x,y,w,h} and
   every edge endpoint is derived from it with side(). No arrow endpoint is ever
   typed as an independent literal, so moving a box cannot strand its arrows. */
/* Geometry discipline (kit rule): every node is declared ONCE as {x,y,w,h} and
   every edge endpoint is derived from it with side(). No arrow endpoint is ever
   typed as an independent literal, so moving a box cannot strand its arrows. */
const N = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
const at = (x: number, y: number): Point => ({ x, y });
const path = (...pts: Point[]) => pts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");

/* One arrowhead per line colour. SVG markers cannot inherit a path's stroke, so
   the marker is derived FROM the edge's own class — a mismatched arrowhead
   colour then becomes impossible rather than merely unlikely. */
const MK: Record<string, string> = {
  act: "m-acc",
  pub: "m-pub",
  priv: "m-pri",
  good: "m-good",
  warn: "m-warn",
  faint: "m-mut",
};
const MARK = (id: string, c: string) =>
  `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5"
    orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--${c})"/></marker>`;
const DEFS =
  `<defs>${MARK("m-mut", "muted")}${MARK("m-acc", "accent")}${MARK("m-pub", "c4")}` +
  `${MARK("m-pri", "danger")}${MARK("m-good", "good")}${MARK("m-warn", "warn")}</defs>`;
const edge = (d: string, cls = "") =>
  `<path d="${d}" class="edge ${cls}" marker-end="url(#${MK[cls.split(" ").find((c) => c in MK) ?? ""] ?? "m-mut"})"/>`;

const box = (n: Box, html: string, cls = "", r = 9) =>
  `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${r}" class="nbox ${cls}"/>` +
  labelBox(n, html, "stack");
const zone = (n: Box, label: string, cls = "") =>
  `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="11" class="zone ${cls}"/>` +
  `<text class="zlabel" x="${n.x + 18}" y="${n.y + 24}">${label}</text>`;
const lbl = (x: number, y: number, t: string, cls = "", anchor = "middle") =>
  `<text class="elabel ${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;
const badge = (x: number, y: number, n: number, c = "accent") =>
  `<circle cx="${x}" cy="${y}" r="14" fill="var(--bg)" stroke="var(--${c})" stroke-width="2"/>` +
  `<text class="bnum" x="${x}" y="${y + 4.5}" text-anchor="middle" fill="var(--${c})">${n}</text>`;

/* THE MARK. The same glyph is drawn in three places in level 1 — on the ring's
   face, in the wax on the letter, and on the public noticeboard — because the
   reader recognising it as *the same shape* IS the explanation. A tick was the
   first attempt and was wrong: ✓ already means "valid" everywhere else here. */
const sigil = (cx: number, cy: number, s: number, c: string, w: number) =>
  `<path d="M ${cx - s} ${cy + s * 0.55} L ${cx - s * 0.52} ${cy - s * 0.62} L ${cx} ${cy + s * 0.16}
            L ${cx + s * 0.52} ${cy - s * 0.62} L ${cx + s} ${cy + s * 0.55}" fill="none"
     stroke="var(--${c})" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const forgedMark = (cx: number, cy: number, s: number, c: string, w: number) =>
  `<path d="M ${cx - s} ${cy - s * 0.5} L ${cx} ${cy + s * 0.6} L ${cx + s} ${cy - s * 0.5}" fill="none"
     stroke="var(--${c})" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

/* ------------------------------------------------------------------ L1 --- */
function level1() {
  const room = N(30, 46, 340, 252);
  const ringL = N(196, 110, 158, 120);
  const letter = N(452, 72, 196, 152);
  const check = N(858, 44, 300, 300);
  const okBox = N(880, 84, 256, 108);
  const noBox = N(880, 214, 256, 108);
  const board = N(400, 368, 432, 180);
  const boardL = N(586, 392, 224, 132);
  const RX = 128,
    RY = 172,
    MX = 492,
    MY = 462;

  return `<svg viewBox="0 0 1180 590" role="img" aria-label="A signet ring locked in a room seals letters. A picture of the ring's mark is published on a public noticeboard, so anyone can compare a letter's seal against it: matching marks mean genuine, a different mark means forged.">
    ${DEFS}
    ${zone(room, "THE ISSUER’S ROOM — nobody else comes in")}

    <circle cx="${RX}" cy="${RY}" r="42" fill="none" stroke="var(--danger)" stroke-width="8"/>
    <circle cx="${RX}" cy="${RY - 52}" r="28" fill="var(--bg)" stroke="var(--danger)" stroke-width="3"/>
    ${sigil(RX, RY - 52, 13, "danger", 3)}
    ${labelBox(
      ringL,
      `<b style="color:var(--danger)">the signet ring</b>
      <span class="s">never copied, never lent, never leaves this room</span>`,
      "stack",
    )}

    ${edge(path(side(room, "right"), at(letter.x, side(room, "right").y)), "priv")}
    ${lbl((room.x + room.w + letter.x) / 2, side(room, "right").y - 13, "seals them", "priv")}

    <rect x="${letter.x + 16}" y="${letter.y - 14}" width="${letter.w}" height="${letter.h}" rx="6" class="nbox ghost"/>
    <rect x="${letter.x + 8}" y="${letter.y - 7}" width="${letter.w}" height="${letter.h}" rx="6" class="nbox ghost"/>
    <rect x="${letter.x}" y="${letter.y}" width="${letter.w}" height="${letter.h}" rx="6" class="nbox"/>
    ${[0, 1, 2, 3].map((i) => `<line x1="${letter.x + 22}" y1="${letter.y + 30 + i * 18}" x2="${letter.x + letter.w - 66}" y2="${letter.y + 30 + i * 18}" stroke="var(--border)" stroke-width="4" stroke-linecap="round"/>`).join("")}
    <circle cx="${letter.x + letter.w - 48}" cy="${letter.y + letter.h - 44}" r="26" fill="none" stroke="var(--danger)" stroke-width="3"/>
    ${sigil(letter.x + letter.w - 48, letter.y + letter.h - 44, 13, "danger", 3)}
    ${lbl(letter.x + letter.w / 2, letter.y + letter.h + 26, "letters, each closed with a wax seal")}

    ${edge(path(side(letter, "right"), at(check.x, side(letter, "right").y)), "act")}
    ${lbl((letter.x + letter.w + check.x) / 2, side(letter, "right").y - 13, "sent to anyone", "act")}

    ${zone(check, "THE CHECK — hold one against the other", "act")}
    <rect x="${okBox.x}" y="${okBox.y}" width="${okBox.w}" height="${okBox.h}" rx="9" class="nbox good"/>
    ${labelBox(N(okBox.x, okBox.y + 6, okBox.w, 40), `<b style="color:var(--good)">the marks match → genuine</b>`, "stack")}
    ${sigil(okBox.x + 62, okBox.y + 74, 16, "danger", 3.4)}
    ${lbl(okBox.x + 128, okBox.y + 82, "=", "", "middle")}
    ${sigil(okBox.x + 194, okBox.y + 74, 16, "c4", 3.4)}

    <rect x="${noBox.x}" y="${noBox.y}" width="${noBox.w}" height="${noBox.h}" rx="9" class="nbox priv"/>
    ${labelBox(N(noBox.x, noBox.y + 6, noBox.w, 40), `<b style="color:var(--danger)">a different mark → forged</b>`, "stack")}
    ${forgedMark(noBox.x + 62, noBox.y + 74, 16, "danger", 3.4)}
    ${lbl(noBox.x + 128, noBox.y + 82, "≠", "", "middle")}
    ${sigil(noBox.x + 194, noBox.y + 74, 16, "c4", 3.4)}

    ${zone(board, "PUBLIC NOTICEBOARD — anyone may look, no one need ask", "act")}
    <circle cx="${MX}" cy="${MY}" r="62" fill="none" stroke="var(--c4)" stroke-width="3" stroke-dasharray="4 6"/>
    ${sigil(MX, MY, 34, "c4", 6)}
    ${labelBox(
      boardL,
      `<b style="color:var(--c4)">a PICTURE of the mark</b>
      <span class="s">published on purpose. It lets anyone <b>check</b> a seal.
      It does not let anyone <b>make</b> one.</span>`,
      "stack",
    )}

    ${edge(path(at(RX, RY + 42), at(RX, MY), side(board, "left")), "pub")}
    ${lbl(RX + 14, MY - 12, "we publish a picture of the mark — never the ring", "pub", "start")}

    ${edge(path(side(board, "right"), at(846, side(board, "right").y), at(846, 250), at(check.x, 250)), "pub")}
    ${lbl(852, 372, "anyone may copy the picture — that is the point", "pub", "start")}
  </svg>`;
}

/* ------------------------------------------------------------------ L2 --- */
function level2() {
  const client = N(50, 60, 220, 100);
  const rs = N(910, 60, 220, 100);
  const rsNote = N(878, 196, 194, 78);
  const as = N(420, 250, 340, 232);
  const tok = N(448, 286, 284, 76);
  const jwks = N(448, 388, 284, 76);
  const t = side(tok, "left"),
    j = side(jwks, "right");

  return `<svg viewBox="0 0 1180 545" role="img" aria-label="The client gets a token from the authorization server's token endpoint and calls the resource server with it. Separately, the resource server fetches the key set from the JWKS endpoint. The client is never involved in that fetch.">
    ${DEFS}
    ${box(client, `<b>client</b><span class="s">a service, not a person</span>`)}
    ${box(rs, `<b>resource server</b><span class="s">the API being called</span>`)}
    ${labelBox(
      rsNote,
      `<span class="s">select the key by <span class="m">kid</span>,
      then verify the signature</span>`,
      "stack",
    )}
    ${zone(as, "AUTHORIZATION SERVER")}
    ${box(tok, `<b>token endpoint</b><span class="s">holds the private key</span>`, "priv")}
    ${box(jwks, `<b>JWKS endpoint</b><span class="s">publishes the public half</span>`, "pub")}

    ${edge(path(at(140, side(client, "bottom").y), at(140, t.y - 14), at(tok.x, t.y - 14)), "act flowing")}
    ${badge(140, 232, 1)} ${lbl(160, 236, "request a token", "act", "start")}

    ${edge(path(at(tok.x, t.y + 18), at(202, t.y + 18), at(202, side(client, "bottom").y)), "act")}
    ${badge(202, 300, 2)} ${lbl(222, 304, "the signed token comes back", "act", "start")}

    ${edge(path(side(client, "right"), at(rs.x, side(client, "right").y)), "act flowing")}
    ${badge(590, side(client, "right").y, 3)}
    ${lbl(612, side(client, "right").y - 22, "call the API — Authorization: Bearer …", "act", "start")}

    ${edge(path(at(1092, side(rs, "bottom").y), at(1092, j.y), j), "pub flowing slow")}
    ${badge(1092, 320, 4, "c4")}
    ${lbl(1070, 316, "GET the key set — no credentials,", "pub", "end")}
    ${lbl(1070, 332, "once per cache period, not per request", "pub", "end")}

    ${badge(975, 176, 5)}
    <text class="zlabel" x="50" y="522">NO HUMAN · NO BROWSER REDIRECT · NO CONSENT SCREEN — HOP 4 IS SERVER-TO-SERVER AND THE CLIENT NEVER SEES IT</text>
  </svg>`;
}

/* ------------------------------------------------------------------ L3 --- */
function level3() {
  const si = N(70, 60, 356, 256);
  const hdr = N(86, 92, 324, 96);
  const pay = N(86, 204, 324, 96);
  const sig = N(86, 344, 324, 84);
  const set = N(756, 50, 384, 372);
  const jwkA = N(782, 100, 332, 142);
  const jwkB = N(782, 262, 332, 142);
  const ver = N(440, 492, 306, 126);

  return `<svg viewBox="0 0 1180 660" role="img" aria-label="The token header's kid selects the matching JWK from the key set. That key's n and e, the signed bytes, and the signature all converge on one verification step.">
    ${DEFS}
    ${zone(si, "JWS SIGNING INPUT — the bytes the signature covers", "act")}
    ${box(hdr, `<b>header</b><span class="m">{"alg":"RS256","kid":"2011-04-29"}</span>`, "act", 7)}
    ${box(pay, `<b>payload</b><span class="m">{"iss":"…","sub":"svc-reporting","exp":…}</span>`, "", 7)}
    ${box(sig, `<b>signature</b><span class="m">TjkxNmRlM2Y…</span>`, "priv", 7)}

    ${zone(set, 'JWK SET — {"keys": [ … ]}')}
    ${box(
      jwkA,
      `<b style="color:var(--accent)">kid "2011-04-29"</b>
      <span class="m">n: 0vx7agoeb… · e: AQAB</span>
      <span class="s">selected — the kid matches</span>`,
      "act",
    )}
    ${box(
      jwkB,
      `<span style="opacity:.5"><b>kid "2026-08-06"</b><br>
      <span class="m">n: k3Kv91Qb… · e: AQAB</span><br>
      <span class="s">present, but not this token’s key</span></span>`,
      "ghost",
    )}

    ${edge(path(side(hdr, "right"), at(568, side(hdr, "right").y), at(568, side(jwkA, "left").y), side(jwkA, "left")), "act flowing")}
    ${lbl(576, side(hdr, "right").y - 12, "match on kid", "act", "start")}

    ${edge(path(side(si, "left"), at(48, side(si, "left").y), at(48, 555), at(ver.x, 555)), "act flowing")}
    ${lbl(58, 546, "the bytes that were signed", "act", "start")}

    ${edge(path(side(sig, "bottom"), at(side(sig, "bottom").x, 462), at(side(ver, "top").x, 462), side(ver, "top")), "priv")}
    ${lbl(300, 454, "the signature to check against", "priv", "start")}

    ${edge(path(side(jwkA, "right"), at(1160, side(jwkA, "right").y), at(1160, 555), side(ver, "right")), "pub flowing")}
    ${lbl(1150, 546, "n and e — the public key itself", "pub", "end")}

    ${box(
      ver,
      `<b>verify — RSASSA-PKCS1-v1_5, SHA-256</b>
      <span class="s" style="color:var(--good)">✓ signature valid — only now may the claims be read</span>`,
      "good",
    )}
  </svg>`;
}

/* ------------------------------------------------------------------ L4 --- */
function level4() {
  const store = N(56, 50, 380, 92);
  const root = N(96, 186, 300, 66);
  const inter = N(96, 296, 300, 66);
  const leaf = N(66, 406, 360, 236);
  const https = N(700, 186, 396, 76);
  const jwk = N(730, 406, 336, 150);
  const gone = N(730, 578, 336, 64);
  const F = (rows: string) => `<div class="fld">${rows}</div>`;

  return `<svg viewBox="0 0 1180 700" role="img" aria-label="Left: an X.509 leaf certificate chaining up through an intermediate and a root CA to your trust store, with seven fields per certificate. Right: a single JWK of five members fetched over HTTPS, with six certificate fields shown struck out as absent, and the TLS certificate on that host chaining back to the same trust store.">
    ${DEFS}
    <text class="zlabel" x="56" y="30">DISTRIBUTING A KEY WITH X.509</text>
    <text class="zlabel" x="700" y="30" fill="var(--c4)">DISTRIBUTING A KEY WITH JWKS</text>

    ${box(store, `<b>your trust store</b><span class="s">root CAs you already hold — the anchor everything else hangs from</span>`, "good")}
    ${box(root, `<b>root CA certificate</b>`, "warn")}
    ${box(inter, `<b>intermediate CA certificate</b>`, "warn")}
    <rect x="${leaf.x}" y="${leaf.y}" width="${leaf.w}" height="${leaf.h}" rx="9" class="nbox warn"/>
    ${labelBox(
      leaf,
      F(`<b>leaf certificate</b><br>serial number<br>signature (by the CA)<br>issuer<br>
      validity — notBefore / notAfter<br>subject<br>subject public key info<br>extensions`),
      "left",
    )}

    ${edge(path(side(root, "top"), side(store, "bottom")), "good")}
    ${lbl(406, 168, "chains to", "", "start")}
    ${edge(path(side(inter, "top"), side(root, "bottom")), "warn")}
    ${lbl(406, 278, "chains to", "", "start")}
    ${edge(path(side(leaf, "top"), side(inter, "bottom")), "warn")}
    ${lbl(406, 388, "chains to", "", "start")}
    ${lbl(246, 672, "three objects · a chain to walk · a signature to check at every step")}

    ${box(
      https,
      `<b>GET https://issuer.example.com/oauth2/jwks</b>
      <span class="s">one unauthenticated request, over TLS</span>`,
      "act",
    )}
    ${edge(path(side(https, "bottom"), side(jwk, "top")), "pub flowing")}
    <rect x="${jwk.x}" y="${jwk.y}" width="${jwk.w}" height="${jwk.h}" rx="9" class="nbox pub"/>
    ${labelBox(jwk, F(`<b>one JWK</b><br>kty · alg · kid<br>n — the modulus<br>e — the exponent`), "left")}
    <rect x="${gone.x}" y="${gone.y}" width="${gone.w}" height="${gone.h}" rx="9" class="nbox ghost"/>
    ${labelBox(gone, F(`<span class="gone">serial · signature · issuer · validity · subject · chain</span>`), "left")}
    ${lbl(898, 672, "one object · nothing to walk · no signature over it at all")}

    ${edge(path(side(https, "left"), at(568, side(https, "left").y), at(568, side(store, "right").y), side(store, "right")), "faint")}
    ${lbl(568, 252, "the TLS certificate on this host", "act")}
    ${lbl(568, 269, "chains to the SAME trust store", "act")}
  </svg>`;
}

/* ------------------------------------------------------------------ L5 --- */
function level5() {
  const X0 = 90,
    X1 = 1120,
    AXIS = 470,
    ROT = 520,
    RET = 812;
  const T2END = 638;
  const TOK = (i: number) => 300 + i * 44; // one source of truth for every token row
  const band = (x: number, w: number, y: number, c: string, t: string) =>
    `<rect x="${x}" y="${y}" width="${w}" height="44" rx="7" fill="color-mix(in srgb, var(--${c}) 16%, transparent)"
       stroke="var(--${c})" stroke-width="1.8"/>` +
    `<text class="tick" x="${x + 14}" y="${y + 28}" fill="var(--${c})">${t}</text>`;
  const guide = (x: number, t: string) =>
    `<line x1="${x}" y1="96" x2="${x}" y2="${AXIS}" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="5 5" opacity=".85"/>` +
    `<text class="tick" x="${x}" y="${AXIS + 26}" text-anchor="middle" fill="var(--accent)">${t}</text>`;

  const tokens = [
    { x: 250, w: 130, c: "warn", t: 'signed with "2011-04-29"' },
    { x: 470, w: T2END - 470, c: "warn", t: 'signed with "2011-04-29"' }, // the slack marker explains this one
    { x: 596, w: 150, c: "c4", t: 'signed with "2026-08-06"' },
    { x: 900, w: 150, c: "c4", t: 'signed with "2026-08-06"' },
  ];

  return `<svg viewBox="0 0 1180 570" role="img" aria-label="A time axis. The old key is published from the start until it is withdrawn; the new key from the rotation moment onwards; the two overlap in between. Four token lifetimes are drawn below, each ending while the key that signed it is still published.">
    ${DEFS}
    <rect x="${ROT}" y="100" width="${RET - ROT}" height="${AXIS - 100}" rx="6"
          fill="color-mix(in srgb, var(--accent) 9%, transparent)"/>
    <text class="zlabel" x="${(ROT + RET) / 2}" y="116" text-anchor="middle" fill="var(--accent)">OVERLAP WINDOW — BOTH KEYS PUBLISHED</text>

    ${band(X0, RET - X0, 126, "warn", 'kid "2011-04-29" is in the published set')}
    ${band(ROT, X1 - ROT, 184, "c4", 'kid "2026-08-06" is in the published set')}

    <!-- The slack bracket measures a REAL gap: from where token 2's bar ends to
         where its key stops being published. Both ends are derived from the same
         constants the bar and the guide line use, so it cannot drift off them. -->
    <path d="M ${T2END} 252 L ${RET} 252" stroke="var(--good)" stroke-width="1.4"/>
    <line x1="${T2END}" y1="246" x2="${T2END}" y2="258" stroke="var(--good)" stroke-width="1.4"/>
    <line x1="${RET}" y1="246" x2="${RET}" y2="258" stroke="var(--good)" stroke-width="1.4"/>
    <line x1="${T2END}" y1="260" x2="${T2END}" y2="${TOK(1)}" stroke="var(--good)" stroke-width="1.4" stroke-dasharray="4 4"/>
    <text class="elabel" x="${(T2END + RET) / 2}" y="242" text-anchor="middle" fill="var(--good)">slack — the key outlives the token</text>

    ${tokens
      .map((t, i) => {
        const y = TOK(i);
        return (
          `<text class="tick" x="${t.x}" y="${y - 7}">${t.t}</text>` +
          `<rect x="${t.x}" y="${y}" width="${t.w}" height="16" rx="8" fill="var(--${t.c})" opacity=".9"/>` +
          `<text class="tick" x="${t.x + t.w + 10}" y="${y + 13}" fill="var(--good)">✓ verifies</text>`
        );
      })
      .join("")}

    <line x1="${X0}" y1="${AXIS}" x2="${X1}" y2="${AXIS}" stroke="var(--border)" stroke-width="2"/>
    <text class="tick" x="${X1}" y="${AXIS + 26}" text-anchor="end">time →</text>
    ${guide(ROT, "new key published")}
    ${guide(RET, "old key withdrawn")}

    <text class="zlabel" x="${X0}" y="540">THE OVERLAP MUST OUTLAST THE LONGEST-LIVED TOKEN — NOT THE LONGEST-LIVED CLIENT. NOTHING IS REVOKED; A KEY SIMPLY STOPS BEING PUBLISHED.</text>
  </svg>`;
}

/* ------------------------------------------------------------------------ */
const LEVELS = [
  {
    tab: "The idea",
    assumes: "assumes nothing at all",
    aud: "Level 1 · analogy",
    title: "A signet ring, and a picture of its mark",
    intro:
      "Before any acronym. This is an <em>analogy</em>, not the mechanism — but it is an exact one, and everything in levels 2–5 maps onto it.",
    svg: level1,
    takeaway: `<strong>Publishing the picture is the whole design, not a risk being tolerated.</strong>
      A picture of a seal lets anyone <em>check</em> a letter; it never lets anyone <em>make</em> one.
      And notice what the noticeboard is not: nobody signed it, it carries no expiry, and it names
      nobody. You trust it because you know which noticeboard is ours — not because it came with
      paperwork.`,
    extra: `<div class="maps">
      <div><span class="a">the signet ring</span><div class="arw">is</div><span class="b">the private key</span></div>
      <div><span class="a">a sealed letter</span><div class="arw">is</div><span class="b">a signed token (JWT)</span></div>
      <div><span class="a">the picture of the mark</span><div class="arw">is</div><span class="b">a JWK — n and e</span></div>
      <div><span class="a">the noticeboard</span><div class="arw">is</div><span class="b">the JWKS endpoint</span></div>
      <div><span class="a">holding one up to the other</span><div class="arw">is</div><span class="b">verifying the signature</span></div>
    </div>`,
  },
  {
    tab: "The flow",
    assumes: "assumes you think in systems and hops",
    aud: "Level 2 · the flow",
    title: "Three actors, and where the key fetch actually sits",
    intro:
      "The diagram most often drawn wrong. The key fetch is <strong>hop 4</strong> — server-to-server, off to one side, and not on the request path at all.",
    svg: level2,
    takeaway: `<strong>The client never touches the key set.</strong> Key distribution is a private
      arrangement between the resource server and the authorization server; the client only ever
      carries a token. Draw it any other way and every question that follows will be the wrong one.`,
    extra: `<div class="callouts">
      <div><strong>Hop 4 is not per request.</strong> The key set is cached — five minutes is a common
        default — so the overwhelming majority of API calls involve no fetch at all.</div>
      <div><strong>Hop 4 carries no credentials.</strong> Requiring a token to fetch the key that
        validates tokens is circular; there would be no first token.</div>
      <div><strong>There is no human anywhere.</strong> No redirect, no consent screen, no browser.
        That is what distinguishes this from every user-facing grant.</div>
    </div>`,
  },
  {
    tab: "The bytes",
    assumes: "assumes you will implement or review it",
    aud: "Level 3 · the mechanism",
    title: "Where the bytes actually meet",
    intro:
      "Four things come together at one point: which key, what was signed, the signature itself, and the algorithm. This is the entire verification step.",
    svg: level3,
    takeaway: `<strong><span style="font-family:var(--mono)">kid</span> is a name lookup, and that is
      all it is.</strong> It carries no authority — it just says which of the published keys to try.
      Everything about rotation follows from that one property, which is why the set is plural.`,
    extra: `<div class="callouts">
      <div><strong>The header is readable before anything is verified.</strong> That is not a
        weakness; it is what makes selecting a key possible at all.</div>
      <div><strong>Signed, not encrypted.</strong> The payload is base64url — an encoding. Anyone
        holding the token can read every claim.</div>
      <div><strong>Signature first, then claims.</strong> Until the check passes,
        <span style="font-family:var(--mono)">iss</span>, <span style="font-family:var(--mono)">aud</span>
        and <span style="font-family:var(--mono)">exp</span> are attacker-controlled bytes.</div>
    </div>`,
  },
  {
    tab: "Versus PKI",
    assumes: "assumes you already know X.509 well",
    aud: "Level 4 · the payoff",
    title: "The same job, done with certificates and done with a JWK",
    intro:
      "For the reader who is pattern-matching this onto PKI — which is the right instinct and the reason it misleads. The difference is not stylistic; the right-hand side is <em>missing six things on purpose</em>.",
    svg: level4,
    takeaway: `<strong>A JWK is one field of a certificate — the public key — with a name attached.</strong>
      No subject, no issuer, no validity window, no CA signature, no serial, no chain. There is no file
      to install and no expiry to diary, because there is no certificate. And the trust anchor has not
      disappeared: it moved to the transport, where the TLS certificate on the JWKS host chains to the
      very same store.`,
    extra: `<div class="tally">
      <div class="l"><div class="h">X.509 path</div><div class="big">3 objects · 1 chain</div>
        <p>Each with a subject, an issuer, a validity window and a CA signature, every one of which
        must be checked, and any one of which can expire and take the system down.</p></div>
      <div class="r"><div class="h">JWKS path</div><div class="big">1 object · 5 members</div>
        <p>Fetched over TLS from a URL you configured. Nothing signs it, nothing expires, and rotation
        is a change to a list rather than a coordinated re-issue.</p></div>
    </div>`,
  },
  {
    tab: "Over time",
    assumes: "assumes you have to operate it",
    aud: "Level 5 · rotation",
    title: "Rotation, drawn on a time axis",
    intro:
      "The question everyone asks — “how do you rotate a key nobody signed?” — has a shape, and the shape is the answer.",
    svg: level5,
    takeaway: `<strong>The set is plural so that two keys can be published at once.</strong> A token
      signed a minute before the rotation still names the old
      <span style="font-family:var(--mono)">kid</span>, and still selects successfully, because that
      key is still in the set. Nothing is revoked and nothing expires — the old key simply stops being
      published once the last token that used it has died of old age.`,
    extra: `<div class="callouts">
      <div><strong>The window is bounded by token lifetime</strong> — typically minutes. Compare a
        certificate rollover, which is coordinated against every relying party’s trust store.</div>
      <div><strong>A verifier that meets an unknown kid re-fetches immediately</strong> and re-selects
        within the same call, so the request that triggers the refresh succeeds rather than failing first.</div>
      <div><strong>So do not shorten the cache TTL to chase rotation</strong>, and do not disable the
        cache — that makes the authorization server a synchronous dependency of every API call.</div>
    </div>`,
  },
];

const tabs = $("#tabs")!,
  figs = $("#figs")!;

tabs.innerHTML = LEVELS.map(
  (l, i) =>
    `<button class="lvl" role="tab" id="tab-${i}" aria-selected="false" aria-controls="fig-${i}">
     <span class="num">LEVEL ${i + 1}</span><span class="nm">${l.tab}</span><span class="as">${l.assumes}</span>
   </button>`,
).join("");

// Every level is rendered into the DOM up front and only shown/hidden. That keeps
// a shared link, a print, and the "show all" view carrying the whole set rather
// than whichever one happened to be active.
figs.innerHTML = LEVELS.map(
  (l, i) =>
    `<figure class="fig" id="fig-${i}" role="tabpanel" aria-labelledby="tab-${i}" hidden>
     <div class="fig-head">
       <span class="aud">${l.aud}</span>
       <h2>${l.title}</h2>
       <p>${l.intro}</p>
     </div>
     ${l.svg()}
     <div class="takeaway">${l.takeaway}</div>
     ${l.extra ?? ""}
   </figure>`,
).join("");

const showAll = $<HTMLInputElement>("#all")!;
const paint = (i: number) => {
  const all = showAll.checked;
  $$(".fig").forEach((f, k) => {
    f.hidden = all ? false : k !== i;
  });
  $$(".lvl").forEach((b, k) => b.setAttribute("aria-selected", String(!all && k === i)));
};

const step = stepper({ n: LEVELS.length, hashKey: "level", onStep: paint });
$$(".lvl").forEach((b, i) =>
  b.addEventListener("click", () => {
    showAll.checked = false;
    step.go(i);
    paint(i); // stepper's go() is a no-op when the level is unchanged
  }),
);
showAll.addEventListener("change", () => paint(step.current));

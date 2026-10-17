import { stepper, $, $$, esc } from "@viz/kit";

// ---- the real token ----------------------------------------------------
// node:crypto, RSA-2048, RS256, regenerated 2026-08-07 when the lifetime moved
// from 300 s to 60 s. Verified against its public key
// before being pasted here; a one-character change to the signing input makes
// that verification fail.
const H = "eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCIsImtpZCI6Ims4RVZMZEtGOWdaUE13X3UifQ";
const P =
  "eyJpc3MiOiJodHRwczovL2FzLmV4YW1wbGUuY29tIiwic3ViIjoiOWY0YzJhZTEiLCJjbGllbnRfaWQiOiI5ZjRjMmFlMSIsImF1ZCI6Imh0dHBzOi8vYXBpLmV4YW1wbGUuY29tIiwiZXhwIjoxNzg2MDQ2NDYwLCJpYXQiOjE3ODYwNDY0MDAsImp0aSI6ImU4NGJjZTRkLTIyNWQtNGY4MC1iYzRlLWE1MTgxNmVkMWQ5OSIsInNjb3BlIjoicmVwb3J0czpyZWFkIn0";
const S =
  "ffTp6QlrXOKdMpCejFzsG-9LMG_lleDP1zBO6yH2RlUO4IqozZCZYdPC4SPOCriS7Y40aanpcywKr8nBnD6JgKlOLWGtYtG_cX9cG0mUppfevp_evRfCSTKEPf0Ve-WSMDbyU-WHDUm3yMDS82syKa4CgR8s_VTt5tUuFKDBxXFlFSFFW1GtobUzZBBz3tI9oF40tG2mXGDcDgay_btJNCZ_6n_t6ZlzCugEUN6JyGPKZoVJw1LjmQCMmDtvs8rhCRTmmymcxxwkjASFpPapLR0renldedv2a8BLa2IaCHL_Au3_rWFL2QZgVNgEG3hxiJgQmxh5vtq27n5VMtg0Sw";

// base64url → text. Standard base64 with two substitutions and no padding,
// which is the whole of what "url-safe" means here.
const b64uDecode = (s: string): string =>
  atob(s.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((s.length + 3) % 4));

interface Payload {
  iss: string;
  sub: string;
  client_id: string;
  aud: string;
  exp: number;
  iat: number;
  jti: string;
  scope: string;
}
const headerObj: unknown = JSON.parse(b64uDecode(H));
const NUM_CLAIMS = ["exp", "iat"],
  STR_CLAIMS = ["iss", "sub", "client_id", "aud", "jti", "scope"];
const isPayload = (o: unknown): o is Payload =>
  typeof o === "object" &&
  o !== null &&
  [...NUM_CLAIMS, ...STR_CLAIMS].every((k) => k in o) &&
  Object.entries(o).every(([k, v]) => typeof v === (NUM_CLAIMS.includes(k) ? "number" : "string"));
const parsePayload = (s: string): Payload => {
  const o: unknown = JSON.parse(s);
  if (!isPayload(o)) throw new Error("token payload is not the expected claims");
  return o;
};
const payloadObj = parsePayload(b64uDecode(P));

const pretty = (obj: unknown) =>
  esc(JSON.stringify(obj, null, 2))
    .replaceAll(/&quot;([a-z_]+)&quot;:/gu, '<span class="k">"$1"</span>:')
    .replaceAll(/: &quot;(.*?)&quot;/gu, ': <span class="s">"$1"</span>')
    .replaceAll(/: (\d+)/gu, ': <span class="num">$1</span>');
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

// ---- 0. the hero: signed vs encrypted ----------------------------------
// Same five claims on both sides; the only thing that differs is whether an
// uninvited eye can read them. The payload shown is decoded from the real
// token above, so the left panel is not an illustration of a token — it is one.
const PAY_ROWS = [
  ["iss", payloadObj.iss],
  ["sub", payloadObj.sub],
  ["aud", payloadObj.aud],
  ["exp", payloadObj.exp],
  ["scope", payloadObj.scope],
] satisfies [string, string | number][];
const paintPay = (tampered: boolean) => {
  $("#bPay")!.innerHTML = PAY_ROWS.map(
    ([k, v]) =>
      `<div><span class="k">${k}</span>: ` +
      (tampered && k === "scope" ? `<span class="edited">reports:WRITE</span>` : esc(String(v))) +
      `</div>`,
  ).join("");
};

// Eight steps, absolute rather than cumulative, so stepping backwards and
// jumping on the track land on exactly the same picture.
const HSTEPS = [
  `The authorization server holds <b>one keypair</b> — two halves that belong together and do opposite jobs.`,
  `The private half signs, and never leaves. The public half only <i>checks</i> signatures, so it is handed to anyone who asks. Giving it away costs nothing.`,
  `It writes down the claims: who issued this, who it is for, when it stops working.`,
  `Then it stamps the whole thing with the private half. <b>That stamp is the signature</b> — and that is the only thing the private key was ever used for.`,
  `Now, for contrast, here is what an <i>encrypted</i> blob looks like. Same claims inside. Completely different treatment.`,
  `Somebody with no key at all — not the client, not you, anybody — takes a look at both.`,
  `On the left they read every word, instantly, for free. On the right they hit a wall. <b>That</b> is what encryption looks like, and a JWT is not it.`,
  `Change one word on the left and the seal breaks. So signing bought you <b>unchangeable</b>. It never bought you <b>unreadable</b>.`,
];

function renderHeroB(i: number) {
  $("#hNo")!.innerHTML = i + 1 + "<small>of " + HSTEPS.length + "</small>";
  $("#hStatus")!.innerHTML = HSTEPS[i]!;
  [...$("#hTrack")!.children].forEach((t, k) => {
    t.className = "tick" + (k < i ? " done" : k === i ? " now" : "");
  });

  const on = (sel: string, yes: boolean) => $(sel)!.classList.toggle("on", yes);
  on("#bKeys", true);
  $("#bPriv")!.classList.toggle("act", i === 3);
  $("#bPub")!.classList.toggle("act", i === 1);
  on("#bGlass", i >= 2);
  on("#bSeal", i >= 3);
  on("#bSolid", i >= 4);
  on("#bEyes", i >= 5);
  on("#bRayL", i >= 5);
  on("#bRayR", i >= 5);
  on("#bWall", i >= 6);
  $("#bPay")!.classList.toggle("dim", i < 2);
  $("#bPay")!.classList.toggle("lit", i >= 6);
  paintPay(i >= 7);
  $("#bSeal")!.classList.toggle("broken", i >= 7);
  on("#bVerdL", i >= 7);
  on("#bVerdR", i >= 7);

  $("#bCapL")!.textContent =
    i >= 7
      ? "anyone can read it · nobody can change it"
      : i >= 6
        ? "read it all — instantly, for free"
        : " ";
  $("#bCapR")!.textContent = i >= 6 ? "nothing. it needs a key just to look." : " ";
  $("#bVerdL")!.textContent = "SIGNED = you cannot fake it";
  $("#bVerdR")!.textContent = "ENCRYPTED = you cannot read it";
}

$("#hTrack")!.innerHTML = HSTEPS.map(() => `<div class="tick"></div>`).join("");
let playing = false;
const setPlayLabel = () => {
  $("#hPlay")!.textContent = playing ? "❚❚ Pause" : "▶ Play";
};

const HERO = stepper({
  n: HSTEPS.length,
  hashKey: "hero",
  autoplayMs: 3400,
  target: document.querySelector(".hero")!, // scoped: the assembly stepper owns document arrows
  onStep: (i: number) => {
    renderHeroB(i);
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
$("#hRestart")!.addEventListener("click", () => {
  playing = false;
  setPlayLabel();
  HERO.go(0);
});
$$("#hTrack > div").forEach((t, k) => {
  t.addEventListener("click", () => {
    playing = false;
    setPlayLabel();
    HERO.go(k);
  });
});

// ---- 2. the assembly line ---------------------------------------------
// Five rows, revealed cumulatively: each stage's output is the next one's input.
const ROWS = [
  { l: "Header", s: "JSON", v: () => JSON.stringify(headerObj) },
  { l: "Payload", s: "JSON", v: () => JSON.stringify(payloadObj) },
  {
    l: "Signing input",
    s: "base64url(header) . base64url(payload)",
    v: () =>
      `<span class="c-head">${clip(H, 46)}</span><span class="dot">.</span><span class="c-pay">${clip(P, 60)}</span>`,
  },
  {
    l: "Signature",
    s: "RSASSA-PKCS1-v1_5 · SHA-256",
    v: () => `<span class="c-sig">${clip(S, 96)}</span>`,
  },
  {
    l: "The token",
    s: `${H.length + P.length + S.length + 2} characters on the wire`,
    v: () =>
      `<span class="c-head">${clip(H, 34)}</span><span class="dot">.</span><span class="c-pay">${clip(P, 34)}</span><span class="dot">.</span><span class="c-sig">${clip(S, 34)}</span>`,
  },
];
const BEATS = [
  {
    t: "Build the header",
    d: `Three fields: <code>alg</code> says how it will be signed, <code>typ</code> declares this is an access token rather than some other JWT, and <code>kid</code> names <b>which</b> key was used — the hook a verifier needs when there is more than one.`,
  },
  {
    t: "Build the payload",
    d: `The claims. Who issued it, who it is for, who is calling, when it expires, and a unique id for this particular token. Nothing here is secret, because nothing here will be hidden.`,
  },
  {
    t: "Concatenate — this exact string is what gets signed",
    d: `Each part is base64url-encoded and joined with a literal <code>.</code>. The result is the <b>JWS Signing Input</b>: not the objects, not a hash of them, but these characters.`,
  },
  {
    t: "Sign it with the private key",
    d: `<code>RS256</code> is RSASSA-PKCS1-v1_5 with SHA-256 (RFC 7518 §3.3). The signing input is hashed, the hash is signed with the 2048-bit private key, and the 256-byte result is base64url-encoded into 342 characters.`,
  },
  {
    t: "Join with one more dot, and return it",
    d: `That is the whole token. It goes back in a JSON response with <code>expires_in</code> and — for this grant — no refresh token. Nothing was written to a database; the token carries everything a verifier will need.`,
  },
];

$("#asm")!.innerHTML = ROWS.map(
  (r, i) =>
    `<div class="row" id="row${i}" data-viz-id="asm-${i}" data-label="${r.l}">
       <div class="rl">${r.l}<small>${r.s}</small></div>
       <div class="rv">${r.v()}</div>
     </div>`,
).join("");

stepper({
  n: BEATS.length,
  hashKey: "stage",
  onStep: (i) => {
    const b = BEATS[i]!;
    $("#beatNo")!.innerHTML = i + 1 + "<small>of " + BEATS.length + "</small>";
    $("#beatT")!.textContent = b.t;
    $("#beatD")!.innerHTML = b.d;
    // cumulative: earlier stages stay on, because the token is built up, not swapped
    ROWS.forEach((_, k) => {
      $("#row" + k)!.classList.toggle("on", k <= i);
    });
  },
});

// ---- 3. the full token, with the signed region marked ------------------
$("#tokFull")!.innerHTML =
  `<span class="si"><span class="c-head">${H}</span><span class="dot">.</span>` +
  `<span class="c-pay">${P}</span></span><span class="dot">.</span>` +
  `<span class="c-sig">${S}</span>` +
  `<div style="margin-top:11px;font-family:var(--sans);font-size:11.5px;color:var(--faint)">` +
  `<span class="sw c-head"></span>header &nbsp; <span class="sw c-pay"></span>payload &nbsp; ` +
  `<span class="sw c-sig"></span>signature &nbsp;·&nbsp; the boxed region is what the signature covers</div>`;

const btnDecode = $<HTMLButtonElement>("#btnDecode")!;
btnDecode.addEventListener("click", () => {
  $("#outHead")!.innerHTML = pretty(headerObj);
  $("#outPay")!.innerHTML = pretty(payloadObj);
  $("#decoded")!.hidden = false;
  $("#afterDecode")!.hidden = false;
  btnDecode.textContent = "Decoded — with atob(), and nothing else";
  btnDecode.disabled = true;
});

// ---- 4. claims ---------------------------------------------------------
// `hot` marks the two the dive exists to argue for.
type Why = [label: string, why: string, hot?: 1];
const WHY: Record<string, Why> = {
  iss: [
    "Who minted it",
    "The verifier compares this against the issuer it trusts. A valid signature from the <b>wrong issuer</b> is still a rejection.",
  ],
  sub: [
    "Who it is about",
    "With no user in the flow, this is the client application itself — not a person.",
  ],
  client_id: [
    "Who asked for it",
    "The same identifier issued at registration, now carried inside the token.",
  ],
  aud: [
    "Who it is for",
    "<b>This is what stops a token minted for one service being replayed at another.</b> Without it, any API that trusts this issuer accepts a token intended for a different one — and a compromised or merely careless downstream service becomes a way into every other one. Cheap now, painful to retrofit.",
    1,
  ],
  exp: [
    "When it stops working",
    "Expiry is the <b>only</b> thing that ends a token's life. It cannot be recalled.",
  ],
  iat: [
    "When it was minted",
    "Lets a verifier reject tokens that are implausibly old even if the expiry is generous.",
  ],
  jti: [
    "Which token this is",
    "<b>The handle that makes mint and use correlatable after the fact.</b> Issuing and using are two separate requests, on different connections, often minutes apart — no request-scoped trace id spans them. This does. It is also what a replay-detection cache would key on.",
    1,
  ],
  scope: ["What it permits", "What was granted, which may be less than what was asked for."],
};
$("#claimTable")!.innerHTML =
  `<div>Claim</div><div>Value in this token</div><div>What it is doing</div>` +
  Object.entries(payloadObj)
    .map(([k, v]) => {
      const [, why, hot] = WHY[k] ?? (["", "—"] satisfies Why);
      const c = hot ? " hot" : "";
      const shown =
        k === "exp" || k === "iat"
          ? `${v} <span style="color:var(--faint)">(${new Date(Number(v) * 1000).toISOString().replace("T", " ").slice(0, 19)}Z)</span>`
          : esc(String(v));
      return (
        `<div class="cn${c}">${k}</div><div class="cv${c}">${clip(shown, 120)}</div>` +
        `<div class="cw${c}">${why}</div>`
      );
    })
    .join("") +
  `<div class="cn"></div><div class="cv" style="color:var(--faint)">exp − iat</div>` +
  `<div class="cw">= <b>${payloadObj.exp - payloadObj.iat} seconds</b>. Short lifetimes are how this design copes with having no revocation.</div>`;

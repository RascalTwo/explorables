  import { $, esc, stepper, saveHash, loadHash } from "/_kit/viz.js";

  // ---- the real key and the real tokens ----------------------------------
  // RSA-2048 public half of the keypair used on the token-creation dive.
  // Generated 2026-08-06 with node:crypto, thrown away after; it protects
  // nothing. The two forgeries were built against it to demonstrate the two
  // attack shapes RFC 8725 §2.1 names.
  const JWK = {"kty":"RSA","n":"ifXnCvEGccxOeVJaPbUqohzCz6pyOzYFUVTBL_MjpvO4olI4VIM7m3XElbEwcfoxl8dSal6xFJZ3AZpOF_mGM86ILP2uZRu2NVPAh7X4zhy9K4b5K8TGERmxk_hXcfJEaIP9PTLXk0Jos9bMPpzZYxhiXNKXcRIRldZ5h_1CU1gn6W6p1c75KCbj6FEIxIohQsaijHA26Il1hheNdyD17eISLFuGaW4i5DGAF_dlJVCpGTvDMyK5zQZc8uRgYL-YN5cYkj0u45a9wfRCKgAhwCjMYL0VtaUMUHhUQxrlr3AdiLpm58y6XFBnqVV71nHHjH6RL7DCELxdVev9IJe5Iw","e":"AQAB","alg":"RS256","use":"sig","kid":"k8EVLdKF9gZPMw_u"};

  const H       = "eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCIsImtpZCI6Ims4RVZMZEtGOWdaUE13X3UifQ";
  const P       = "eyJpc3MiOiJodHRwczovL2FzLmV4YW1wbGUuY29tIiwic3ViIjoiOWY0YzJhZTEiLCJjbGllbnRfaWQiOiI5ZjRjMmFlMSIsImF1ZCI6Imh0dHBzOi8vYXBpLmV4YW1wbGUuY29tIiwiZXhwIjoxNzg2MDQ2NDYwLCJpYXQiOjE3ODYwNDY0MDAsImp0aSI6ImU4NGJjZTRkLTIyNWQtNGY4MC1iYzRlLWE1MTgxNmVkMWQ5OSIsInNjb3BlIjoicmVwb3J0czpyZWFkIn0";
  const S       = "ffTp6QlrXOKdMpCejFzsG-9LMG_lleDP1zBO6yH2RlUO4IqozZCZYdPC4SPOCriS7Y40aanpcywKr8nBnD6JgKlOLWGtYtG_cX9cG0mUppfevp_evRfCSTKEPf0Ve-WSMDbyU-WHDUm3yMDS82syKa4CgR8s_VTt5tUuFKDBxXFlFSFFW1GtobUzZBBz3tI9oF40tG2mXGDcDgay_btJNCZ_6n_t6ZlzCugEUN6JyGPKZoVJw1LjmQCMmDtvs8rhCRTmmymcxxwkjASFpPapLR0renldedv2a8BLa2IaCHL_Au3_rWFL2QZgVNgEG3hxiJgQmxh5vtq27n5VMtg0Sw";
  const P_EDIT  = "eyJpc3MiOiJodHRwczovL2FzLmV4YW1wbGUuY29tIiwic3ViIjoiOWY0YzJhZTEiLCJjbGllbnRfaWQiOiI5ZjRjMmFlMSIsImF1ZCI6Imh0dHBzOi8vYXBpLmV4YW1wbGUuY29tIiwiZXhwIjoxNzg2MTMyODYwLCJpYXQiOjE3ODYwNDY0MDAsImp0aSI6ImU4NGJjZTRkLTIyNWQtNGY4MC1iYzRlLWE1MTgxNmVkMWQ5OSIsInNjb3BlIjoicmVwb3J0czpyZWFkIn0";
  const H_NONE  = "eyJhbGciOiJub25lIiwidHlwIjoiYXQrand0Iiwia2lkIjoiazhFVkxkS0Y5Z1pQTXdfdSJ9";
  const H_HS    = "eyJhbGciOiJIUzI1NiIsInR5cCI6ImF0K2p3dCIsImtpZCI6Ims4RVZMZEtGOWdaUE13X3UifQ";
  const S_HS    = "EMoRMCDRZEzAh4_U6Uz2zuODEU70Nbc4HHj7eiyN21Q";

  // What this verifier accepts, decided here and not read from any token.
  const ACCEPTED_ALGS = ["RS256"];
  const EXPECTED_ISS  = "https://as.example.com";
  const EXPECTED_AUD  = "https://api.example.com";
  const SKEW_SECONDS  = 60;
  // The token was minted for a fixed instant, so "now" is pinned to inside its
  // window. Otherwise every run would fail gate 4 on age and bury the point.
  const NOW = 1786046430;

  type Token = { id: string; t: string; d: string; h: string; p: string; s: string; edit: "h" | "p" | null };
  type Gate = { state: "pass" | "fail" | "skip"; v: string; note: string };
  type Result = { gates: Gate[]; failedAt: number; reason: string };
  type Header = { alg: string; kid: string };
  type Claims = { iss: string; aud: string | string[]; exp: number; nbf?: number; client_id: string; scope: string };

  const b64u = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const j = <T,>(s: string): T | null => { try { return JSON.parse(b64u(s)); } catch { return null; } };
  const clip = (s: string, n: number) => s.length > n ? s.slice(0, n) + "…" : s;

  const TOKENS: Token[] = [
    { id:"good", t:"Genuine", d:"Signed by the authorization server, inside its lifetime.",
      h:H, p:P, s:S, edit:null },
    { id:"edited", t:"Payload edited", d:"Expiry pushed a day into the future. Signature untouched.",
      h:H, p:P_EDIT, s:S, edit:"p" },
    { id:"none", t:"alg: none", d:"Header rewritten to claim no signature. Signature removed.",
      h:H_NONE, p:P_EDIT, s:"", edit:"h" },
    { id:"hs", t:"RS256 → HS256", d:"HMAC'd with the public key as the shared secret.",
      h:H_HS, p:P_EDIT, s:S_HS, edit:"h" },
  ];

  let key: CryptoKey | null = null;
  try {
    key = await crypto.subtle.importKey("jwk", JWK,
      { name:"RSASSA-PKCS1-v1_5", hash:"SHA-256" }, false, ["verify"]);
  } catch (e) {
    console.warn("public key import failed; gate 3 will report unavailable", e);
  }

  // ---- the gates ---------------------------------------------------------
  // Each returns {state, note, verdict?}. `state` drives the colour; the rail
  // below reads only whether gate 3 has passed yet.
  async function runGates(tk: Token): Promise<Result> {
    const header = j<Header>(tk.h);
    const out: Gate[] = [];

    // 1 — read the header. Unprotected, and read for routing only.
    out.push(header
      ? { state:"pass", v:"read", note:`<code>alg</code>: ${esc(String(header.alg))} · <code>kid</code>: ${esc(String(header.kid))}` }
      : { state:"fail", v:"malformed", note:"not decodable as JSON" });
    if (!header) return { gates:out, failedAt:0, reason:"The token is not a JWT." };

    // 2 — pin the algorithm, THEN select the key. Pinning first is the whole
    //     defence; doing it here rather than at gate 3 is deliberate.
    if (!ACCEPTED_ALGS.includes(header.alg)) {
      out.push({ state:"fail", v:"rejected",
        note:`this verifier accepts <b>${ACCEPTED_ALGS.join(", ")}</b> only — <code>${esc(String(header.alg))}</code> is not on the list` });
      out.push({ state:"skip", v:"not reached", note:"never runs" });
      out.push({ state:"skip", v:"not reached", note:"never runs" });
      out.push({ state:"skip", v:"not reached", note:"never runs" });
      return { gates:out, failedAt:1,
        reason: header.alg === "none"
          ? "Rejected before any cryptography happened. The token asked to be trusted without a signature; the verifier does not offer that option."
          : "Rejected before any cryptography happened. The token asked to be checked with HMAC, using a key everybody has. The verifier was never willing to use HMAC at all — which is why this attack needs a verifier that takes its instructions from the token." };
    }
    out.push({ state:"pass", v:"selected",
      note:`key <code>${esc(String(header.kid))}</code> found in the key set` });

    // 3 — the load-bearing one. Real RSASSA-PKCS1-v1_5 / SHA-256 verification.
    const si = tk.h + "." + tk.p;
    let ok = false;
    if (key && tk.s) {
      const sigBytes = Uint8Array.from(b64u(tk.s), c => c.charCodeAt(0));
      ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key,
        sigBytes, new TextEncoder().encode(si));
    }
    out.push(ok
      ? { state:"pass", v:"valid", note:"the bytes received are the bytes that were signed" }
      : { state:"fail", v:"invalid", note:"crypto.subtle.verify returned <b>false</b>" });
    if (!ok) {
      out.push({ state:"skip", v:"not reached", note:"never runs" });
      out.push({ state:"skip", v:"not reached", note:"never runs" });
      return { gates:out, failedAt:2,
        reason:"The payload was changed, so it no longer matches the signature — and the attacker cannot produce a new one without the private key. Note that the verifier never had to know <i>what</i> was edited." };
    }

    // 4 — only now are the claims facts rather than suggestions.
    const c = j<Claims>(tk.p)!;
    const fails: string[] = [];
    if (c.iss !== EXPECTED_ISS) fails.push("<code>iss</code>");
    if (!([] as string[]).concat(c.aud).includes(EXPECTED_AUD)) fails.push("<code>aud</code>");
    if (NOW >= c.exp + SKEW_SECONDS) fails.push("<code>exp</code>");
    if (c.nbf && NOW < c.nbf - SKEW_SECONDS) fails.push("<code>nbf</code>");
    out.push(fails.length
      ? { state:"fail", v:"rejected", note:`failed: ${fails.join(", ")}` }
      : { state:"pass", v:"accepted",
          note:`<code>iss</code> ✓ &nbsp;<code>aud</code> ✓ &nbsp;<code>exp</code> ✓ (${c.exp - NOW}s left)` });
    if (fails.length) {
      out.push({ state:"skip", v:"not reached", note:"never runs" });
      return { gates:out, failedAt:3, reason:"Authentic, and still not acceptable — a valid signature says who wrote it, not that it was meant for this API or that it is still current." };
    }

    // 5 — serve.
    out.push({ state:"pass", v:"served",
      note:`caller <b>${esc(String(c.client_id))}</b>, scope <b>${esc(String(c.scope))}</b>` });
    return { gates:out, failedAt:-1,
      reason:"Five gates, no database, no network call. Everything needed was in the request and in a public key the server already held." };
  }

  // ---- rendering ---------------------------------------------------------
  const GATE_META: [string, string, string][] = [
    ["Gate 1", "Read the header", "Unprotected and readable by anyone. Used to find out which key and which algorithm are being claimed — never to decide anything."],
    ["Gate 2", "Pin the algorithm, pick the key", "The verifier's own list of acceptable algorithms is applied here, before any key is used. Then <code>kid</code> selects from the key set."],
    ["Gate 3", "Verify the signature", "RSASSA-PKCS1-v1_5 with SHA-256 over <code>header.payload</code>, using the public key. This is the only gate that creates trust."],
    ["Gate 4", "Validate the claims", "Now that they are known to be authentic: issuer, audience, expiry — with a small allowance for clock skew."],
    ["Gate 5", "Serve", "Authorize against the scope and answer the request."],
  ];

  $("#picker")!.innerHTML = TOKENS.map(t =>
    `<button class="pick" data-id="${t.id}" data-viz-id="pick-${t.id}" data-label="${t.t}">
       <div class="pt">${t.t}</div><div class="pd">${t.d}</div></button>`).join("");

  async function show(id: string) {
    const tk = TOKENS.find(t => t.id === id) || TOKENS[0]!;
    [...$("#picker")!.children].forEach(b => b.classList.toggle("on", (b as HTMLElement).dataset["id"] === tk.id));
    saveHash({ token: tk.id });

    const mark = (txt: string, on: boolean) => on ? `<span class="edited">${txt}</span>` : txt;
    $("#tokView")!.innerHTML =
      `<span class="c-head">${mark(clip(tk.h, 74), tk.edit === "h")}</span><span class="dot">.</span>` +
      `<span class="c-pay">${mark(clip(tk.p, 96), tk.edit === "p")}</span><span class="dot">.</span>` +
      `<span class="c-sig">${tk.s ? clip(tk.s, 74) : "<i style='color:var(--faint)'>(empty)</i>"}</span>` +
      `<div style="margin-top:10px;font-family:var(--sans);font-size:11.5px;color:var(--faint)">` +
      `<span class="sw c-head"></span>header &nbsp;<span class="sw c-pay"></span>payload &nbsp;` +
      `<span class="sw c-sig"></span>signature` +
      (tk.edit ? ` &nbsp;·&nbsp; <span style="color:var(--danger)">the boxed part was altered</span>` : "") +
      `</div>`;

    const { gates, failedAt, reason } = await runGates(tk);
    $("#pipe")!.innerHTML = gates.map((g, i) =>
      `<div class="gate ${g.state}" data-viz-id="gate-${i + 1}" data-label="${GATE_META[i]![1]}">
         <div class="gn">${GATE_META[i]![0]}</div>
         <div class="gt">${GATE_META[i]![1]}</div>
         <div class="gd">${g.note || GATE_META[i]![2]}</div>
         <div class="gv">${g.v}</div>
       </div>`).join("");

    // The rail is the argument: nothing before gate 3 is trustworthy, whatever
    // the gates above happened to report.
    const trusted = gates[2] && gates[2].state === "pass";
    $("#rail")!.innerHTML = [0, 1, 2, 3, 4].map(i => {
      const after = i >= 2 && trusted;
      return `<div class="rr ${after ? "trusted" : (gates[i] && gates[i].state === "skip" ? "" : "none")}">` +
        `<b>Trust</b>${after ? "authentic — the issuer really wrote this"
                             : (gates[i] && gates[i].state === "skip" ? "—" : "none — attacker-controlled bytes")}</div>`;
    }).join("");

    const ok = failedAt === -1;
    $("#verdict")!.className = "verdict " + (ok ? "ok" : "no");
    $("#verdict")!.innerHTML =
      `<b>${ok ? "200 — request served" : "401 — rejected at gate " + (failedAt + 1)}</b>${reason}` +
      `<div class="live">verified live in this browser · crypto.subtle.verify("RSASSA-PKCS1-v1_5", …) → ` +
      `${gates[2] ? (gates[2].state === "pass" ? "true" : gates[2].state === "skip" ? "not called" : "false") : "not called"}</div>`;
  }

  // ---- 0. the hero checkpoint -------------------------------------------
  // Driven by runGates() — the same function, and therefore the same real
  // signature check, that powers the section below. The animation never decides
  // an outcome; it only shows the one the crypto produced.
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const POSTS = [440, 600, 760, 920, 1080];
  const GATE_SHORT = ["Read the header", "Pin the algorithm", "Check the signature",
                      "Check the claims", "Serve"];
  const GATE_SUB = ["what does it claim?", "and pick the key", "the only one that matters",
                    "issuer, audience, expiry", "answer the request"];
  const START_X = 250;
  const stopBefore = (i: number) => POSTS[i]! - 152;      // park with the nose just short of it

  $("#cGates")!.innerHTML = POSTS.map((x, i) =>
    `<g class="barrier idle" id="cG${i}" data-viz-id="hero-gate-${i + 1}" data-label="${GATE_SHORT[i]}">
       <rect class="lintel" x="${x - 30}" y="226" width="60" height="20" rx="5"/>
       <g class="shutter"><rect class="shutterbar" x="${x - 8}" y="250" width="16" height="94" rx="5"/></g>
       <text class="gtxt" x="${x - 76}" y="364" text-anchor="middle">${i + 1}. ${GATE_SHORT[i]}</text>
       <text class="cap" x="${x - 76}" y="380" text-anchor="middle">${GATE_SUB[i]}</text>
     </g>`).join("");

  const setLamp = (green: boolean, word: string, sub: string) => {
    $("#cLamp")!.classList.toggle("green", green);
    $("#cLampGlyph")!.textContent = green ? "✓" : "✕";
    $("#cLampWord")!.textContent = word;
    $("#cLampSub")!.textContent = sub;
  };
  // The token shape is drawn at x=0, so the translate IS its left edge. (First
  // draft subtracted START_X and every stop landed 250 units short.)
  const movePkt = (x: number) => {
    $("#cPkt")!.style.transform = `translateX(${x}px)`;
    $("#cEarly")!.style.transform = `translateX(${x}px)`;
  };

  // Seven steps: arrival, the five gates, the verdict. `gatesFor` memoises per
  // token because runGates() is async — it does the real signature check — while
  // the step renderer has to be synchronous.
  const NARR = [
    `A request turns up carrying a token. Right now we know <b>nothing</b> about it — it is a string a stranger sent us.`,
    `Read the header. It tells us which algorithm and which key it would like us to use. We read it. We do not believe it.`,
    `Apply <b>our own</b> list of acceptable algorithms — decided long before this token existed — then pick the key by <code>kid</code>.`,
    `Check the signature. <b>This is the only step in the whole sequence that can create trust.</b>`,
    `Only now are the claims worth reading: the right issuer, <i>this</i> audience, not expired.`,
    `Serve the request.`,
    `Done.`,
  ];
  const gateCache = new Map<string, Result>();
  const gatesFor = async (tk: Token) => {
    if (!gateCache.has(tk.id)) gateCache.set(tk.id, await runGates(tk));
    return gateCache.get(tk.id)!;
  };
  let cResult: Result | null = null, earlyRead = false;

  function renderHeroC(i: number) {
    $("#hNo")!.innerHTML = (i + 1) + "<small>of " + NARR.length + "</small>";
    [...$("#hTrack")!.children].forEach((t, k) =>
      t.className = "tick" + (k < i ? " done" : k === i ? " now" : ""));
    if (!cResult) return;
    const { gates, failedAt } = cResult;
    const lastGate = failedAt >= 0 ? failedAt : POSTS.length - 1;
    const g = Math.min(i - 1, lastGate);      // gate the picture is at; -1 = arrival

    POSTS.forEach((_, k) => {
      const st = k > g ? "idle"
               : gates[k] && gates[k].state === "fail" ? "fail"
               : gates[k] && gates[k].state === "pass" ? "pass" : "idle";
      $<SVGElement>("#cG" + k)!.className.baseVal = "barrier " + st;
    });

    const stopped = failedAt >= 0 && g >= failedAt;
    const through = failedAt < 0 && i >= POSTS.length + 1;
    movePkt(i <= 0 ? START_X : through ? 1120 : stopBefore(g));
    $("#cPktInner")!.classList.toggle("dead", stopped);
    $("#cPktInner")!.classList.remove("slam");
    if (stopped && i - 1 === failedAt && !REDUCED) {
      void $("#cPkt")!.getBoundingClientRect().width;   // force reflow to re-fire
      $("#cPktInner")!.classList.add("slam");
    }

    // Gate 3 (index 2) is the only thing in the figure that can turn the lamp.
    const trusted = g >= 2 && gates[2] && gates[2].state === "pass";
    setLamp(trusted as boolean, trusted ? "YES" : "NO",
      trusted ? "the issuer really did write this"
        : stopped ? "and it never will"
        : earlyRead && i >= 1 ? "…and we used it anyway"
        : "just bytes a stranger sent");

    // Trap one exists only in the window before the signature clears.
    const trapShowing = earlyRead && i >= 1 && !trusted;
    $("#cEarly")!.classList.toggle("on", trapShowing);

    const t = $("#cOutcome")!;
    if (stopped) {
      t.setAttribute("fill", "var(--danger)");
      t.textContent = `Stopped at barrier ${failedAt + 1}. It never reached the others.`;
    } else if (through) {
      t.setAttribute("fill", "var(--good)");
      t.textContent = "Served. No database was opened at any point.";
    } else { t.textContent = " "; }

    let line = NARR[Math.min(i, NARR.length - 1)]!;
    if ((stopped && i - 1 >= failedAt) || through || i >= NARR.length - 1) line = cResult.reason;
    if (trapShowing) line += ` <b style="color:var(--danger)">And we already decoded the payload and acted on it — before any of this ran.</b>`;
    $("#hStatus")!.innerHTML = line;
  }

  $("#hTrack")!.innerHTML = NARR.map(() => `<div class="tick"></div>`).join("");
  let playing = false;
  const setPlayLabel = () => { $("#hPlay")!.textContent = playing ? "❚❚ Pause" : "▶ Play"; };

  const HERO = stepper({
    n: NARR.length, hashKey: "hero", autoplayMs: 2600,
    target: document.querySelector(".hero")!,
    onStep: i => {
      renderHeroC(i);
      if (i >= NARR.length - 1 && playing) { playing = false; setPlayLabel(); }
    },
  });
  HERO.pause();                                // stepper autostarts when given autoplayMs
  setPlayLabel();

  async function pickToken(id: string) {
    cResult = await gatesFor(TOKENS.find(t => t.id === id)!);
    [...document.querySelectorAll<HTMLElement>(".hpicks button[data-run]")]
      .forEach(x => x.classList.toggle("sel", x.dataset["run"] === id));
    playing = false; setPlayLabel();
    HERO.go(0); renderHeroC(0);
  }

  $("#hPlay")!.onclick = () => {
    if (playing) { HERO.pause(); playing = false; }
    else {
      if (HERO.current >= NARR.length - 1) HERO.go(0);
      HERO.play(); playing = true;
    }
    setPlayLabel();
  };
  $("#hNext")!.onclick = () => { playing = false; setPlayLabel(); HERO.next(); };
  $("#hPrev")!.onclick = () => { playing = false; setPlayLabel(); HERO.prev(); };
  $("#hRestart")!.onclick = () => { playing = false; setPlayLabel(); HERO.go(0); renderHeroC(0); };
  [...$("#hTrack")!.children].forEach((t, k) => {
    (t as HTMLElement).onclick = () => { playing = false; setPlayLabel(); HERO.go(k); };
  });
  document.querySelector(".hpicks")!.addEventListener("click", e => {
    const b = (e.target as Element).closest<HTMLElement>("button[data-run]");
    if (b) pickToken(b.dataset["run"]!);
  });
  $("#hEarly")!.onclick = () => {
    earlyRead = !earlyRead;
    $("#hEarly")!.classList.toggle("sel", earlyRead);
    renderHeroC(HERO.current);
  };
  await pickToken("good");

  $("#picker")!.addEventListener("click", e => {
    const b = (e.target as Element).closest<HTMLElement>(".pick");
    if (b) show(b.dataset["id"]!);
  });
  await show((loadHash<{ token: string }>() || {}).token || "good");

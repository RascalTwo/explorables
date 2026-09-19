// The client credentials flow, end to end. CONTENT ONLY — see /_kit/EXCHANGE.md.
//
// The spine of a four-page set. It stays deliberately shallow: it shows the
// ORDER of things and hands the cryptography to three dives that each get a
// full screen.
//
//   client-credentials-flow   — this page: the five moments, in order
//   dive-credential-created   — how a client secret is created and stored
//   dive-token-created        — how the token is signed
//   dive-token-verified       — how the token is checked
//   jwks-explainer            — how the signing keys are published (built separately)
//
// Lanes here are PROTOCOL PHASES, not network zones. There are no zones and no
// firewalls on purpose: this is not a network diagram, and drawing a perimeter
// would invite the reader to ask where it is — a question the grant does not
// have an answer to.
//
// Everything on screen is either quoted from a specification (`src`) or marked
// as our own inference (`ours`). Sections read first-party from rfc-editor.org
// on 2026-08-06:
//
//   RFC 6749  The OAuth 2.0 Authorization Framework                   §4.4
//   RFC 6750  ... Bearer Token Usage                                  §2.1
//   RFC 7519  JSON Web Token (JWT)                                    §4.1, §7.2
//   RFC 9068  JWT Profile for OAuth 2.0 Access Tokens                 §2.2, §4
//   RFC 9700  Best Current Practice for OAuth 2.0 Security (BCP 240)  §2.3
//
// The token, the secret and the client_id are REAL values, generated with
// node:crypto on 2026-08-06 — the JWT verifies against its keypair and a
// one-byte change to it does not. Nothing here is a hand-typed placeholder,
// so a reader who decodes what is on screen gets the answer it claims.

const src  = t => `<div class="src">${t}</div>`;
const ours = t => `<div class="ours"><b>ours, not the RFC's</b> — ${t}</div>`;
const dive = (href, title, blurb) =>
  `<a class="dive" href="${href}"><b>${title}</b>${blurb}</a>`;

// A quiet index tile for the closing panel. Deliberately not `dive`: the inline
// doorways are loud because they interrupt a walkthrough, and eight loud boxes
// in one panel would be a wall rather than a menu.
const fam = (href, title, blurb) =>
  `<a class="fam" href="${href}"><b>${title}</b><span>${blurb}</span></a>`;
const famcol = (label, items) =>
  `<div><span class="famlbl">${label}</span>${items.join('')}</div>`;

// `elsewhere` = somebody else explaining the same mechanism. Deliberately NOT
// styled or worded like `src`: an RFC is what makes a claim TRUE, this is a
// second teacher. The blurb says what the source is genuinely good for,
// including where it is thinner than its reputation — a link nobody checked is
// exactly the impression these are here to prevent. Every URL was fetched and
// read before being added; `viz-pages/check-links.ts` guards against rot.
const elsewhere = (href, title, who, why) =>
  `<div class="elsewhere"><span class="lbl">Elsewhere</span>`
+ `<a href="${href}">${title}</a><span class="who">· ${who}</span>`
+ `<span class="why">${why}</span></div>`;

// The one identifier threaded through every panel on the page. Following a
// single value from registration to the resource server's decision is what
// turns five diagrams into one story.
const CID = '<span class="mid">9f4c2ae1</span>';

const REFS =
  `<div class="ref"><b>RFC 6749</b> §4.4 · Client Credentials Grant</div>`
+ `<div class="ref"><b>RFC 6749</b> §4.4.1 · Authorization Request and Response</div>`
+ `<div class="ref"><b>RFC 6749</b> §4.4.3 · Access Token Response</div>`
+ `<div class="ref"><b>RFC 6749</b> §2.3.1 · Client Password</div>`
+ `<div class="ref"><b>RFC 6750</b> §2.1 · Authorization Request Header Field</div>`
+ `<div class="ref"><b>RFC 9068</b> §2.2 · Data Structure</div>`
+ `<div class="ref"><b>RFC 9068</b> §4 · Validating JWT Access Tokens</div>`
+ `<div class="ref"><b>RFC 9700</b> §2.3 · Access Token Privilege Restriction</div>`
+ `<div class="refn">RFC 9700 is BCP 240, <i>Best Current Practice for OAuth 2.0 Security</i>, 2025 — it updates RFC 6749 rather than replacing it.</div>`;

const story = {
  title: 'The client credentials flow',
  subtitle: 'One service getting a token from another — with no human anywhere in it',
  // h raised 1360 → 1420 on 2026-08-07 for the closing `p-next` panel, which
  // overflowed the old stage by 33px. Raised rather than moving the panel up:
  // p-verify above it is content-driven and would have been the collision.
  // Raised again 1420 → 1480 the same day when p-next gained the operational-set
  // line (compromise map · failure cap · kill switch) and overflowed by 29px.
  // MEASURED, not guessed: p-next sits at y=1185 and renders 264px tall.
  // Anything added to that panel must be re-measured — it is the last thing on
  // the canvas, so it is always the one that runs off the bottom.
  stage: { w: 1780, h: 1660 },
  // Autoscroll stays ON here, unlike the sibling walkthroughs: this stage is
  // taller than a laptop window, so without re-centring the third phase is
  // below the fold and a reader who never scrolls never sees the token used.

  // Phases, not places. Each lane answers "how often does this happen?", which
  // is the question that makes the shape of the grant make sense.
  lanes: [
    { id:1, y:150, h:300, tag:'Once',        name:'Registration' },
    { id:2, y:480, h:340, tag:'Per token',   name:'Getting one' },
    { id:3, y:850, h:440, tag:'Per request', name:'Using one' },
  ],

  nodes: {
    c1: { x:60, y:254, w:280, h:92, lane:1, cls:'actor', name:'Client',
          role:'A service, not a person', spec:'OAuth2 client' },
    reg: { x:620, y:254, w:300, h:92, lane:1, name:'Authorization server',
           role:'Client registration', spec:'OAuth2 client registration' },

    c2: { x:60, y:604, w:280, h:92, lane:2, cls:'actor', tag:'curl',
          name:'Client', spec:'OAuth2 client' },
    as: { x:620, y:604, w:300, h:92, lane:2, name:'Authorization server',
          role:'Token endpoint', spec:'OAuth2 authorization server' },

    c3: { x:60, y:974, w:280, h:92, lane:3, cls:'actor', tag:'curl',
          name:'Client', spec:'OAuth2 client' },
    rs: { x:620, y:974, w:300, h:92, lane:3, name:'Resource server',
          role:'The API being protected', spec:'OAuth2 resource server' },
  },

  // The two `hand` wires are the spine itself: they carry what one phase
  // produced into the phase that consumes it, so the page reads as one
  // continuous story rather than three unrelated diagrams.
  wires: [
    ['c1','reg'],
    ['c2','as'],
    ['c3','rs'],
    ['c1','c2',{hand:1}],
    ['c2','c3',{hand:1}],
  ],

  labels: [
    { id:'l-secret', text:'client_secret', x:200, y:470 },
    { id:'l-token',  text:'access_token',  x:200, y:838 },
  ],

  panels: [
    { id:'p-nouser', x:1400, y:190, w:350, title:'What is missing, and why' },
    { id:'p-cred',   x:1010, y:190, w:350, title:'What registration produces' },
    { id:'p-req',    x:1010, y:520, w:350, title:'The token request', bodyCls:'mono' },
    { id:'p-res',    x:1400, y:520, w:350, title:'The token response', cls:'result', bodyCls:'mono' },
    { id:'p-call',   x:1010, y:890, w:350, title:'The API call', bodyCls:'mono' },
    { id:'p-verify', x:1400, y:890, w:350, title:'What the API checks' },
    // Spans both panel columns on the final beat. Empty until then — the
    // cumulative-set loop at the bottom of this file means anything set earlier
    // would persist, so this is deliberately only ever set once, at the end.
    // Full width, below everything. p-verify's body reaches y=1272 and the refs
    // panel reaches y=1335 — both measured in the browser, not estimated. The
    // old x:1010 y:1185 overlapped p-verify by 87px.
    { id:'p-next',   x:60,   y:1370, w:1690, title:'The whole family — every page behind this one' },
    { id:'refs',     x:60,  y:1110, w:400, cls:'refs', title:'The specifications', body:REFS },
  ],

  steps: [
// ------------------------------------------------------- 1. framing: no human
{p:1,t:'Nobody logs in. There is no user in this flow at all — that is the entire distinction of the client credentials grant',
 lit:['c1'],
 set:{'refs':REFS,
  'p-nouser':
    `<div class="rowtable">`
  + `<dt>Who logs in</dt><dd class="null">nobody</dd>`
  + `<dt>Redirect</dt><dd class="null">none</dd>`
  + `<dt>Consent screen</dt><dd class="null">none</dd>`
  + `<dt>Refresh token</dt><dd class="null">none</dd>`
  + `</div>`
  + `<div class="note" style="margin-top:9px">The client is asking for access to <b>its own</b> resources. Its own authentication <b>is</b> the grant, so there is nothing left to authorize.</div>`
  + src(`<b>RFC 6749 §4.4.1</b> — "Since the client authentication is used as the authorization grant, no additional authorization request is needed."`)
  + elsewhere('https://www.oauth.com/oauth2-servers/access-tokens/client-credentials/',
      'Client Credentials', 'oauth.com — Aaron Parecki',
      'The same grant explained by the author of the OAuth 2.0 Simplified book, with a '
    + 'concrete <code>POST /token</code> example. Worth knowing before you click: it covers the '
    + 'request well and does not show a response, so come back here for the round trip.')}},

// -------------------------------------------------------- 2. registration
{p:1,t:'The client is registered and gets two values back — a public identifier and a secret',
 from:'c1',to:'reg',pkt:'register',
 set:{'p-cred':
    `<div class="rowtable">`
  + `<dt>client_id</dt><dd>${CID}</dd>`
  + `<dt>client_secret</dt><dd><span class="s">40zAU4KlBhlY…BJonA</span></dd>`
  + `</div>`
  + `<div class="note" style="margin-top:9px">The <code>client_id</code> is public — it travels in every request and identifies who is calling. The secret is the only thing that proves it.</div>`}},

{p:1,t:'The secret is displayed exactly once. After this moment nobody can read it back — not the operator, not the authorization server',
 lit:['reg'],
 set:{'p-cred':
    `<div class="rowtable">`
  + `<dt>client_id</dt><dd>${CID}</dd>`
  + `<dt>client_secret</dt><dd class="null">shown once, then gone</dd>`
  + `<dt>stored as</dt><dd><span class="c">$2b$10$CrGr3XZ…</span></dd>`
  + `</div>`
  + `<div class="note" style="margin-top:9px">What the authorization server keeps is a <b>hash</b>, and the salt is already inside that string. There is no second column holding it.</div>`
  + dive('../dive-credential-created/','How a credential is created securely',
      'Generate, hash, show once, store, present, verify — and where the salt actually lives.')}},

// ------------------------------------------------------ 3. asking for a token
{p:2,t:'The client keeps its secret. From here on, that secret is the only thing standing between anyone and this API',
 from:'c1',to:'c2',pkt:'secret',
 set:{'p-req':
    `<div class="c">// nothing has been sent yet — this is what the client holds</div>`
  + `<div><span class="k">client_id</span>     ${CID}</div>`
  + `<div><span class="k">client_secret</span> <span class="s">40zAU4Kl…</span></div>`}},

{p:2,t:'It presents both to the token endpoint and asks for a token — one POST, no redirect, no browser',
 from:'c2',to:'as',pkt:'POST /token',
 set:{'p-req':
    `<div><span class="k">POST</span> /oauth2/token</div>`
  + `<div><span class="k">Authorization:</span> Basic <span class="s">OWY0YzJhZTE6NDB6…</span></div>`
  + `<div><span class="k">Content-Type:</span> application/x-www-form-urlencoded</div>`
  + `<div style="margin-top:6px"><span class="k">grant_type</span>=<span class="s">client_credentials</span></div>`
  + `<div><span class="k">scope</span>=<span class="s">reports:read</span></div>`
  + src(`<b>RFC 6749 §4.4.2</b> — <code>grant_type</code> "Value MUST be set to 'client_credentials'." · <b>§2.3.1 Client Password</b> — the client "MAY use the HTTP Basic authentication scheme".`)
  + `<div class="note" style="margin-top:9px">An endpoint that <b>checks</b> a secret is also an endpoint someone can <b>guess</b> at. The counter that stops that has to hang off the credential, not the caller's address.</div>`
  // p-req is written for the last time on THIS beat, so this doorway survives to
  // the end. Attaching it to p-res instead put it on beat 6 and the next beat's
  // cumulative `set` overwrote the whole panel one step later.
  + dive('../failure-cap-lockout/','What stops someone simply guessing it',
      'A hundred attempts from a hundred addresses, and two counters that disagree completely.')}},

{p:2,t:'The server checks the secret against its stored hash, then mints and signs a token',
 from:'c2',to:'as',pkt:'',lit:['as'],
 set:{'p-res':
    `<div class="c">// 200 OK</div>`
  + `<div>{</div>`
  + `<div>  <span class="k">"access_token"</span>: <span class="s">"eyJhbGciOiJSUzI1NiIs…"</span>,</div>`
  + `<div>  <span class="k">"token_type"</span>: <span class="s">"Bearer"</span>,</div>`
  + `<div>  <span class="k">"expires_in"</span>: <span class="s">60</span>,</div>`
  + `<div>  <span class="k">"scope"</span>: <span class="s">"reports:read"</span></div>`
  + `<div>}</div>`
}},

{p:2,t:'The response comes back with a lifetime and — deliberately — no refresh token',
 from:'as',to:'c2',pkt:'access_token',ret:1,
 set:{'p-res':
    `<div class="c">// 200 OK</div>`
  + `<div>{</div>`
  + `<div>  <span class="k">"access_token"</span>: <span class="s">"eyJhbGciOiJSUzI1NiIs…"</span>,</div>`
  + `<div>  <span class="k">"token_type"</span>: <span class="s">"Bearer"</span>,</div>`
  + `<div>  <span class="k">"expires_in"</span>: <span class="s">60</span>,</div>`
  + `<div>  <span class="k">"scope"</span>: <span class="s">"reports:read"</span></div>`
  + `<div>}</div>`
  + `<div class="note" style="margin-top:9px">No <code>refresh_token</code>. There is nothing for one to do: the client still holds its own secret, so getting another token is the same cheap POST it just made.</div>`
  + src(`<b>RFC 6749 §4.4.3</b> — "A refresh token SHOULD NOT be included."`)
  + dive('../dive-token-created/','How an access token is created securely',
      'RS256, the signing input, the claims that carry weight — and why a JWT is signed but not encrypted.')}},

// -------------------------------------------------------- 4. using the token
{p:3,t:'One token, many requests — the secret was presented once per TOKEN, not once per request',
 from:'c2',to:'c3',pkt:'token',
 set:{'p-call':
    `<div class="c">// the same token, for the next 60 seconds</div>`
  + `<div><span class="k">access_token</span> <span class="s">eyJhbGciOiJSUzI1NiIs…</span></div>`
  + `<div class="dim" style="margin-top:7px">Every call in that window reuses it. Nothing is re-authenticated per request.</div>`}},

{p:3,t:'The client calls the API and puts the token in an Authorization header — the secret never goes near this request',
 from:'c3',to:'rs',pkt:'Bearer …',
 set:{'p-call':
    `<div><span class="k">GET</span> /reports/summary</div>`
  + `<div><span class="k">Host:</span> api.example.com</div>`
  + `<div><span class="k">Authorization:</span> Bearer <span class="s">eyJhbGciOiJSUzI1NiIs…</span></div>`
  + `<div class="note" style="margin-top:9px">A <b>bearer</b> token: holding it is sufficient. Nothing here proves the caller is the client the token was minted for.</div>`
  + src(`<b>RFC 6750 §1.2</b> — a bearer token is one where "any party in possession of the token (a 'bearer') can use the token in any way that any other party in possession of it can."`)}},

// ------------------------------------------------------------ 5. verification
{p:3,t:'The API checks the signature first, then the claims, then serves — and it touched no database to do it',
 lit:['rs'],
 set:{'p-verify':
    `<div class="rowtable">`
  + `<dt>1 · signature</dt><dd>valid for the key named in the header</dd>`
  + `<dt>2 · <code>iss</code></dt><dd>the issuer it expects</dd>`
  + `<dt>3 · <code>aud</code></dt><dd><em>this</em> API, not another one</dd>`
  + `<dt>4 · <code>exp</code></dt><dd>still in the future</dd>`
  + `<dt>5 · scope</dt><dd>covers what was asked for</dd>`
  + `</div>`
  + `<div class="note" style="margin-top:9px">The caller is ${CID} — the same identifier issued at registration, now carried in the token's own claims.</div>`
  + src(`<b>RFC 9068 §4</b> Validating JWT Access Tokens · <b>RFC 7519 §7.2</b> — the signature is validated at step 7; the claims set is not even extracted until step 10.`)
  + ours('the order is the content. A claim read before the signature verifies is attacker-controlled input, not a fact.')
  + dive('../dive-token-verified/','How an access token is verified',
      'Header, key selection, signature, claims — in that order — and the two traps that break JWT verifiers.')}},

// ----------------------------------------------------------------- 6. onward
// The mechanism ends at the step above. The READER does not: ten beats that
// finish on "and it served the data" is a dead end, and the three dives are
// easy to step straight past on the way here. This beat exists to make the
// ending a doorway instead of a stop, and it re-offers all three at once
// because by now the reader knows which one they actually wanted.
{p:3,t:'That is the whole flow — now pick the part you want drawn properly',
 set:{'p-next':
    `<div class="note" style="margin-bottom:10px">Eight pages sit behind this one. Each takes a single moment from the eleven above — or a single question the eleven above provoke — and spends a whole page on it.</div>`
  + `<div class="famgrid">`
  + famcol('The cryptography, drawn properly', [
      fam('../dive-credential-created/','A credential is created',
          'Generate, hash, show once, store, present, verify — with a real bcrypt string pulled apart.'),
      fam('../dive-token-created/','An access token is created',
          'What gets signed, what the signature actually is, and why a JWT is signed but never encrypted.'),
      fam('../dive-token-verified/','An access token is verified',
          'Key selection, signature, then claims — in that order — and the two traps that break verifiers.'),
    ])
  + famcol('Where the verifier got the key', [
      fam('../jwks-explainer/','JWKS distributes keys, not certificates',
          'A JWK is a bare public key with a name on it. No subject, no issuer, no expiry, no chain.'),
      fam('../jwks-diagrams/','JWKS, drawn five ways',
          'The same system at five levels — a signet ring, the three-actor flow, the bytes, versus X.509, and rotation on a time axis.'),
    ])
  + famcol('When it goes wrong', [
      fam('../token-compromise-map/','What an attacker has to steal',
          'Every secret here, placed by how hard it is to get against what it buys them. Two reach total, and only one is the one people expect.'),
      fam('../failure-cap-lockout/','The failure cap',
          'A hundred attempts from a hundred addresses. Two counters watch the same traffic and disagree completely.'),
      fam('../token-kill-switch/','Turning it off',
          'A signed token cannot be recalled. Five containment levers, their speeds, and what each one breaks on the way.'),
    ])
  + `</div>`}},
],
};

// Make every step's `set` CUMULATIVE. The engine applies only the current step's
// `set` and never replays earlier ones, so without this a reload or a shared
// link at step N renders an almost-empty page. It also makes stepping backwards
// exact rather than leaving stale panels behind.
const seen = {};
for (const step of story.steps) {
  Object.assign(seen, step.set);
  step.set = { ...seen };
}

export default story;

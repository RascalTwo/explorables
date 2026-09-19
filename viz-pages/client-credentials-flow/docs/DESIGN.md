# The client-credentials explainer family — design record

Built 2026-08-06. **This repo is the family's home** — nothing here is
client-specific, and it was moved here from an engagement-specific repo on
2026-08-06 for exactly that reason. That repo is deliberately not named: these
pages should not carry a pointer to where they came from, and the original brief
lives there under `ai-docs/handoffs/` (gitignored) if you need it.

## The family — one front door, eight rooms

```
        client-credentials-flow          ← the only LISTED page
          │
          ├── dive-credential-created     how a client_secret is made
          │        │
          │        └── failure-cap-lockout   what stops someone guessing it
          ├── dive-token-created ─────┐   how a token is signed
          └── dive-token-verified ────┤   how a token is checked
                                      │
                                      ▼
                             jwks-explainer         how signing keys are published
                                      │  ▲
                                      ▼  │
                             jwks-diagrams          the same, drawn five ways
                                      │
                        ┌─────────────┴─────────────┐
                        ▼                           ▼
              token-compromise-map           token-kill-switch
              what an attacker steals        how you contain it
```

| Slug | What it is | Engine | Posture |
|---|---|---|---|
| `client-credentials-flow` | The spine — five moments, in order | `story-engine` variant | public · **listed** |
| `dive-credential-created` | Dive A — how a `client_secret` is created and stored | `/_kit/` | public · unlisted |
| `dive-token-created` | Dive B — how the token is signed | `/_kit/` | public · unlisted |
| `dive-token-verified` | Dive C — how the token is checked | `/_kit/` | public · unlisted |
| `jwks-explainer` | How signing keys are distributed | `/_kit/` | public · unlisted |
| `jwks-diagrams` | The same system at five levels of abstraction | `/_kit/` | public · unlisted |
| `token-compromise-map` | What each leaked secret buys an attacker | `/_kit/` | public · unlisted |
| `token-kill-switch` | The five containment levers and their collateral | `/_kit/` | public · unlisted |
| `failure-cap-lockout` | Why the guessing counter hangs off the credential, not the caller | `/_kit/` | public · unlisted |

**One listed entry, on purpose.** Everything is reachable from the spine, and
`unlisted` is still directly shareable — which is the point, since these get sent
to people who asked one specific question. The lobby stays a short list of
subjects rather than eight cards for one subject.

**All links are relative (`../<slug>/`), so the family only works if it moves as
a unit.** Nothing outside it links in; its one external dependency is
`story-engine`, which is **copied, not shared** — the repo it came from keeps its
own copy for the variants that still use it. Never edit either to change one
variant. *(Open: whether a second copy is the right answer long-term.)*

## What is actually exposed, and to whom — measured 2026-08-06

Do not guess at this; it was checked by building the site and reading the output.

| Artifact | In the git repo | On the public Pages site | Over the local viz server |
|---|---|---|---|
| `index.html` **and every comment in it** | yes | **yes, verbatim** | yes |
| `story.js` | yes | **yes — inlined into `index.html`** | yes |
| `docs/*.md` | yes | **no** | yes (`127.0.0.1` only) |
| `verify.interactions.ts` | yes | no | yes (`127.0.0.1` only) |

`build.ts` emits exactly two files per viz — a self-contained `index.html` with
the kit, the page script and any sibling module inlined, plus an OG image.
Nothing else ships. Verified: a fresh build of this container produced **zero**
`.md` and `.ts` files.

**The rule this implies: treat every comment in `index.html` and `story.js` as
published prose.** They are shipped uncompressed and unstripped. A note to a
future maintainer written in a `<!-- -->` is on the open internet.

`docs/` is repo-private rather than public — but the repo is shared, so it is
held to the same standard here anyway: **no client identifiers, and no pointer
back to the engagement repo these came from.**

## Publication check, run 2026-08-06

- Zero client names, product names, network topology or organisation-specific
  detail in any of the eight pages — verified against the **built** site, not the
  source. The four sibling pages each carry their own visible "Generic
  throughout" caveat.
- Judgement calls are labelled as judgement on the page itself — the compromise
  map says its axes are "ordered bands, not scales, and nothing here is a score";
  the kill switch says its times are "orders of magnitude, not measurements …
  substitute your own numbers before quoting any of them".
- No file in the family names the repo it was moved from. The generic-page sweep
  in `jwks-explainer/docs/03-open-items.md` takes its term list from an external
  file for the same reason — a list of the names to avoid is itself a list of
  the names.

## The seam with the JWKS explainer

Dive C and the JWKS explainer overlap, and the boundary is deliberate. They were
built in parallel by different hands, which is exactly why the boundary was
written down first:

- **JWKS explainer** — how signing keys are *distributed*. What a JWK is, the key
  set, `kid`, rotation, caching, discovery. Ends before any specific token.
- **Dive C** — how *one token* is *checked*. Given a key set, select by `kid`,
  verify, then validate claims. Ends where key distribution begins.

Dive C links out at gate 2 rather than explaining key selection. Dive B links out
at the keypair section. **If a JWK's `n` and `e` ever get drawn inside these
pages, the seam has been broken** — link instead.

## Each dive opens with a wordless figure — added on feedback

The first build of the dives was accurate and well sectioned, and it still made
you *read* to get the point. So each dive now leads with a full-width animated
figure that carries its single idea with the words unread; the prose is
underneath as the detail layer for people who want it. **One page per topic, not
two** — the figure is the top of the existing page, so there is still one URL to
share per question and no second copy to drift.

| Dive | The figure | Steps | The one idea it has to land |
|---|---|---|---|
| A | A machine: secret + a fresh salt go in, a drum grinds 1,024 rounds, 60 characters come out. A red arrow pointing back is dead — then the last step reverses it into the *verify* reading. | 8 | One-way, a different string every run, and the salt is the recipe. |
| B | A keypair splits; the private half stamps a seal onto a **glass** envelope. Beside it, a **solid** slab. An eye reads straight through the glass and hits a wall on the slab. Then one word is edited and the seal cracks. | 8 | Signed means unchangeable, never unreadable. |
| C | A checkpoint: the token rides a belt through five portcullis gates while a big lamp reads **✕ NO**. Only gate 3 can flip it to **✓ YES**. | 7 | Trust is zero until the signature, whatever the token claims. |

**They step; they do not run away from you.** Each figure carries the same
control set as the protocol walkthroughs — `⟲ Restart · ‹ Step · ▶ Play · Step ›`
— plus a visible `N of M` counter, a clickable track, and a narration line that
stays put until you advance. Autoplay is opt-in, never the default: the first
build auto-ran with only a play and a skip button, which gave no sense of how
many beats there were and no way to stop and read one.

Rules these follow, worth keeping if more are added:

- **`render(i)` is absolute, never cumulative.** Each step draws its whole
  picture from scratch, so stepping backwards, clicking the track and cold-loading
  `#hero=4` all land on the identical frame. Anything that accumulates state
  across an async timeline cannot do that.
- **Two steppers per page, and they must not fight.** The hero is scoped to the
  `.hero` element (`stepper({ target })`, `tabindex="0"`) while the section below
  keeps document-level arrow keys. Both use distinct `hashKey`s. The verification
  script asserts that document arrows move the lower stepper and leave the hero
  alone.
- **Replay is the payload.** Dive A's Restart draws a new salt, so replaying
  *is* the non-determinism lesson; Dive C's buttons re-run the real gates.
  Nothing is a scripted "and then it fails" — Dive C's figure calls the same
  `runGates()` the section below it uses, so the animation can only ever show
  what the crypto returned.
- **Motion lives in CSS, the timeline in JS.** Steps toggle classes;
  `prefers-reduced-motion` kills the animation while every step still renders its
  end state.
- **Each hero covers the whole page under it, not one section.** Checked
  deliberately: A's step 8 exists because verification was otherwise text-only;
  B's steps 1–4 exist because the seal previously had no origin; C's
  `☠ …and read it before checking` toggle exists because trap one had no picture.
- **Two geometry mistakes worth not repeating.** Dive C's gates were first drawn
  as swinging boom arms pivoted at the top of a post — which put the bar *above*
  the belt, so a closed gate did not visually block the lane. They are now
  portcullises that drop through it. And the travelling token is drawn at `x=0`,
  so its CSS translate *is* its left edge; the first version subtracted the start
  offset and every stop landed 250 units short.

## Decisions, and why

**Spine on `story-engine`, dives on the kit.** The spine is ordered hops between
actors, which is exactly what the engine exists to animate, and there is
precedent (`mtls-protocol-walkthrough`, `dpop-protocol-walkthrough`). The dives
are anatomy — a diagram of a *value*, not a journey — and the engine has no idea
what that is.

**Lanes are protocol phases, not network zones**, and there are no zones or
firewalls. This is not a network diagram; drawing a perimeter invites a question
the grant has no answer to. The three lanes — *once* / *per token* / *per
request* — are what make "the secret is presented once per token, not once per
request" visible rather than asserted.

**Autoscroll is ON for the spine**, unlike its siblings. The stage is 1360px
tall, so without re-centring the third phase sits below the fold and a reader who
never scrolls never sees the token used.

**Link, don't embed.** Bare slug URLs work and the lobby unlock is remembered, so
relative links (`../dive-token-created/`) are the known-good path. **Iframing was
never tested and still hasn't been** — do not design around it without testing
first. Never hardcode a StatiCrypt hash into a link; it isn't needed and it rots.

## Everything on screen is a real artifact

No hand-typed placeholders. A reader who decodes what is displayed gets what the
page claims. Generated 2026-08-06 with `node:crypto` and a real bcrypt
implementation, against a throwaway RSA-2048 keypair that protects nothing:

| Artifact | How | Checked |
|---|---|---|
| `client_secret` | `crypto.randomBytes(32).toString('base64url')` | 43 chars, 256 bits |
| bcrypt hashes (×3) | cost 10 over that same secret | all three verify true; all three differ |
| The access token | RS256 over `base64url(header).base64url(payload)` | verifies against its public key |
| Tampered payload | `exp` pushed 24h, original signature kept | verification returns **false** |
| `alg: none` / `HS256` forgeries | header rewritten; HS256 variant HMAC'd with the public key as the secret | rejected at the algorithm pin |

Dive C ships the **public half** of that keypair and runs
`crypto.subtle.verify("RSASSA-PKCS1-v1_5", …)` in the reader's browser. The
forgeries fail because they are genuinely invalid, not because a script says so.
Both dives that show the token share one keypair, so `kid` matches across pages —
**regenerating one means regenerating both.**

The bcrypt anatomy is `slice()`d from the hash string at runtime rather than
transcribed, so the labels cannot drift out of alignment with the characters they
point at. (The first draft centred labels *under* each segment; `$2b$` is four
characters wide and "algorithm" is nine, so they collided. Labels now live in a
colour-keyed legend below.)

## Citations — all read first-party from rfc-editor.org, 2026-08-06

| Cite | Exact section title |
|---|---|
| RFC 6749 §2.3.1 | Client Password |
| RFC 6749 §4.4 / §4.4.1 / §4.4.2 / §4.4.3 | Client Credentials Grant / Authorization Request and Response / Access Token Request / Access Token Response |
| RFC 6750 §1.2, §2.1 | Terminology / Authorization Request Header Field |
| RFC 7518 §3.1, §3.3 | "alg" (Algorithm) Header Parameter Values for JWS / Digital Signature with RSASSA-PKCS1-v1_5 |
| RFC 7519 §4.1.1–§4.1.7, §7.2 | the registered claims / Validating a JWT |
| RFC 8725 §2.1, §3.1, §3.2 | Weak Signatures and Insufficient Signature Validation / Perform Algorithm Verification / Use Appropriate Algorithms — BCP 225 |
| RFC 9068 §2.1, §2.2, §4 | Header / Data Structure / Validating JWT Access Tokens |
| RFC 9700 §2.3, §4.10.2 | Access Token Privilege Restriction / Audience-Restricted Access Tokens — BCP 240 |
| RFC 4086 §3, §6 | Entropy Sources / Pseudo-random Number Generators — BCP 106 |
| OpenBSD `crypt_newhash(3)` | cost is "the base 2 logarithm of the number of rounds" |

**A finding worth keeping:** RFC 6749 does **not** require client secrets to be
hashed, and says nothing about how they are stored or compared. Hashing them is
our own decision borrowed from password practice. Every such line on these pages
is marked *"ours, not a spec"* in amber, so nobody goes hunting for a clause that
does not exist.

## Posture

Spine is `public` + `listed`; the three dives are `public` + `unlisted` — reachable
by direct URL and independently shareable, but four cards for one story would
clutter the lobby. Declaring `public` only makes them *eligible* to be built;
`build.ts` never deploys, so publishing remains a separate human step.

## Verification

- `node story-engine/check.mjs client-credentials-flow` — structure.
- `verify.ts` on all four — 0 errors, 0 layout findings.
- Each page carries a `verify.interactions.ts`: a plain run only ever sees state
  one, which on a stepper page is the frame that proves nothing. Dive C's is the
  real check — it asserts the genuine token reaches gate 5 and each forgery fails
  at the gate it should.
- Deep links tested by **fresh load**, not by clicking through (`#step=9`,
  `#token=hs`).
- Swept for internal names: zero hits.

## Still open

- **Four pages or three?** Dive C could fold into the JWKS explainer. Kept
  separate because the seam above is real, but worth revisiting now that both
  exist.
- **A "what could go wrong" pass** on the spine (stolen token, replayed token,
  leaked secret) is deliberately out of scope. `token-binding-comparison` already
  answers the stolen-token case in context.
- **Iframing is still untested.** See above.

---

## Updated 2026-08-07 — an eleventh beat, and louder doorways

**The problem:** a reader could step through all ten beats without registering
that three whole pages sit behind the dive links. They rendered as another tinted
note. And the walkthrough ended on *"and the API served it"* — a fine ending for
the mechanism and a dead end for the reader.

**Two changes.**

The `.dive` style is now unmistakably a door: a 1.5px accent border, a glow ring,
a two-pulse attention animation on appearance (disabled under
`prefers-reduced-motion`) and an explicit **OPEN THE DEEP DIVE →** button. Box
height went from note-sized to 75px.

A **beat 11** was added — *"That is the whole flow — now pick the part you want
drawn properly"* — filling a new `p-next` panel that spans both panel columns and
offers all three dives at once, plus the JWKS explainer. It re-offers all three
because by that point the reader knows which one they actually wanted.

`p-next` is set **only on the last step**. The cumulative-`set` loop at the
bottom of `content.js` means anything set earlier persists to the end, so a panel
that should appear once must be written once.

**Stage height 1360 → 1420.** The closing panel overflowed the old stage by 33px.
Raised the canvas rather than moving the panel up: `p-verify` above it is
content-driven, and would have been the collision.

## `.elsewhere` — added 2026-08-07

The page cites [oauth.com — Client Credentials](https://www.oauth.com/oauth2-servers/access-tokens/client-credentials/)
beside the framing beat. The blurb warns that it covers the request well and
shows no response, because **the convention for these blocks is to say what the
source is actually good for, including where it is thinner than its reputation.**
A link nobody checked is the exact impression they exist to prevent.

The `elsewhere()` helper lives in this page's `content.js` and is the copy to
reuse. Styling comes from `/_kit/viz-kit.css`, not from here.

Guarded by `../check-links.ts`, which scans `.js`/`.ts` as well as `.html` —
this page's link is generated by the helper and an earlier version of the checker
missed it entirely while reporting success.


---

## Updated 2026-08-07 — the access token lives one minute, and the family gained a ninth page

**The lifetime was wrong everywhere.** The token was drawn with `expires_in: 300` and described
as a 300-second / five-minute lifetime. It is **60 seconds**. Every statement of an access-token
lifetime in the family now says one minute.

That is not a find-and-replace, because **the token on screen is a real artifact** and the
lifetime is inside the signature. The 2026-08-06 private key was deliberately not kept, so a
60-second `exp` required a **new RSA-2048 keypair** — which changes `kid`, and therefore the JWK
that dive C imports and runs `crypto.subtle.verify` against. Regenerated together, as the rule
above requires:

| Artifact | New value | Checked |
|---|---|---|
| `kid` | `k8EVLdKF9gZPMw_u` | derived from the key itself, so it cannot drift from it |
| Genuine token | `exp − iat = 60` | verifies against its public key |
| Tampered payload | `exp` pushed 24h, original signature | verification returns **false** |
| `alg: none` / `HS256` forgeries | rebuilt against the new key | rejected at the algorithm pin |
| Signature | 342 characters | dive B's "342 characters" line stays true |

`NOW` in dive C moved from `1786046500` to **`1786046430`** — the old pin sat 100 s after `iat`,
which is outside a 60-second window and would have failed gate 4 on expiry and buried the point.
It now sits 30 s in, so the genuine token shows `30s left`.

**Do not change the lifetime again without re-minting.** Editing `expires_in` in the spine while
leaving the signed `exp` alone would make the two disagree, and the page's whole claim is that a
reader who decodes what is on screen gets what it says.

### The keypair is now kept — `docs/remint.mjs` + `docs/throwaway-keypair.pem`

Throwing the 2026-08-06 private key away is what made a one-line lifetime change cost a whole new
keypair across two pages. **The key is now committed**, and one command re-mints everything:

```
node client-credentials-flow/docs/remint.mjs
```

Edit `LIFETIME_SECONDS` at the top, run it, and the signature, all three forgeries, the JWK and
dive C's pinned `NOW` are recomputed and patched into both dives. It verifies before it writes —
genuine verifies, tampered fails, `kid` matches the JWK, the signature is still the 342 characters
dive B claims in prose — and **aborts without writing** if any check or any anchor fails.
Re-running with nothing changed is byte-identical.

**Committing a private key is a deliberate exception, not an oversight.** It signs a token for
`example.com` granting a scope that exists nowhere, and it protects nothing. It is a stage prop:
publishing it is the same decision as publishing the token it signed, which this family already
made. `docs/` is not emitted by `build.ts` either — but that is convenience, not the reason it is
safe. Never point anything real at it.

Two traps the script closes:

- **`kid` is derived from the key** (SHA-256 over the SPKI, first 16 base64url chars) rather than
  drawn at random, so it cannot name a key it does not belong to and a re-run is stable.
- **`NOW` is derived from the lifetime**, pinned halfway through the window. The hand-set value
  sat 100 s after `iat`, which is *outside* a 60-second window — it would have failed gate 4 on
  expiry and buried the point the page exists to make.

One thing it deliberately cannot do: **fix a sentence.** Lifetimes stated in prose have to be
grepped by hand, which is why the last line it prints says so.

**`token-kill-switch`'s TTL dial now defaults to 1 min** rather than 15, so the page opens on the
family's actual lifetime. The 1/5/15/60 range is kept — the range *is* the teaching device, and
the page's argument is that the dial moves every bar.

**`failure-cap-lockout` joined the family.** It was already `public` · `unlisted` and explicitly
generic, and it was **completely orphaned** — it linked to nothing and nothing linked to it. It
belongs: it is the control guarding the exact moment the spine draws at beat 6, the client
presenting its secret to the token endpoint. Now reachable from the spine (a `.dive` doorway on
the token-response beat, and in the closing `p-next` panel), and cross-linked with
`token-compromise-map` and `token-kill-switch`. It gained a `.backlink` header line and a footer,
copied from `token-compromise-map` so the set reads identically.

`../check-links.ts` — 10/10 external links reachable. Every `../<slug>/` in all nine pages
resolves to a real directory.


## Updated 2026-08-07 — the closing panel became the family index, and it was overlapping

**The bug:** `p-next` sat at `x:1010 y:1185 w:740`. `p-verify` starts at `y:890` and its body is
content-driven — it reaches **`y:1272`**. So the closing panel was drawn **87px on top of the
verification panel**, over the dive doorway at the bottom of it. Nothing caught this, for a reason
worth recording: `verify.interactions.ts` *printed* the panel's geometry and *asserted nothing*.

**Three changes.**

**1. It is now the whole family, not three dives.** The spine is the only `listed` page, so a viz
that is not linked from here is a viz nobody can find. All eight siblings are now in the closing
panel, in three groups — the cryptography (the three dives), where the verifier got the key
(explainer, diagrams), and when it goes wrong (compromise map, failure cap, kill switch). They are
*in addition to* the inline doorways, not instead of them.

**2. They are quiet tiles (`.fam`), not more `.dive` boxes.** The doorways are loud on purpose
because they interrupt a walkthrough. Eight loud boxes in one panel is a wall, not a menu. `.fam`
is a bordered tile with a title and one line, no CTA button, no pulse.

**3. Full width, below everything.** `x:60 y:1370 w:1690`, clear of both `p-verify` (1272) and the
refs panel (1335). Stage `h` 1480 → **1660**.

| Panel | y | measured bottom |
|---|---|---|
| `p-call` | 890 | 1114 |
| `p-verify` | 890 | **1272** — content-driven, the one that moves |
| `refs` | 1110 | 1335 |
| `p-next` | **1370** | 1614, in a 1660 stage (16px headroom) |

**`verify.interactions.ts` is now a gate rather than a log.** It throws on three things:

- **any family page unreachable from the spine** — checked over every `a[href]` on the page, so an
  inline doorway counts as well as a tile. This is the assertion that actually matters.
- **`#p-next` overlapping any other `.panelbox`** — the check that would have caught this bug.
- the panel running off the stage.

Confirmed non-vacuous: reverting the geometry to `x:1010 y:1185` makes it fail with
`#p-next overlaps: p-verify (by 60px)`, and restoring it passes. A layout assertion that has never
been seen to fail is not evidence of anything.

**Two numbers to re-measure if `p-verify` ever grows:** its bottom (1272) and the stage height.
They are measured in a browser, not estimated — every previous guess at this panel's geometry has
been wrong, three times running.

### Tooling note

`bun ~/.claude/skills/viz/verify.ts <full-url> --full` and
`bun ~/.claude/skills/viz/check-exchange.mjs .` are the gates for this page. **Pass the full URL,
not the viz id** — id resolution assumes `127.0.0.1:5180/<slug>/` and this container is nested
several directories deep, so an id-based run 404s and reports a blank render rather than a real
result.

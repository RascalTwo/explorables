# Decisions

Recorded so they are not re-argued. Each says what was decided, why, and — where
it matters — the condition under which it should be revisited.

---

## D1 · Build fresh on `/_kit/`, do **not** use `story-engine`

**Decided in the handoff, before the build; confirmed during it.**

`story-engine`'s abstraction is *nodes, wires, lanes, zones, and packets flying
between them over ordered steps* — a network-topology walkthrough engine. This
page has almost no topology. Its content is **anatomy** (what is inside a JWK),
**a document** (the JSON), and **a mechanism** (signature verification). Those
fight the engine.

**Revisit only if** a future edit finds itself rebuilding step-sequencing with
animated packets. That is the one condition under which `story-engine` becomes
the cheaper path.

## D2 · Zero JavaScript on the page

**Decided during the build. This is a deviation from the handoff, which
suggested `saveHash`/`loadHash` — it satisfies the same intent more strongly.**

The handoff named two traps inherited from `member-api-poc-network-story`:

1. deep links that open half-empty, because steps set state non-cumulatively;
2. a shareable artifact that renders only a subset of the content.

Both are symptoms of *page content living in JS state*. `saveHash`/`loadHash`
manages that state correctly; removing the state removes the failure mode
outright. With no JS:

- section anchors (`#anatomy`, `#caching`, …) are native browser behaviour, so a
  deep link cannot render half a page;
- every word is in the scroll, so there is no "subset" for a screenshot to miss;
- there is nothing to keep in sync, and nothing to regress.

**Verified, not assumed** — loading `…/#caching` in a fresh headless tab lands at
scrollY 4836 of 6652 with all 9 sections and 2,492 words present.

**Revisit if** a future section genuinely needs a toggle (e.g. an
RS256-vs-ES256 switch). At that point use `saveHash`/`loadHash` from the kit
rather than hand-rolling, and re-run the deep-link test.

## D3 · The specimen JWK is RFC 7517 Appendix A.1, verbatim

Rather than a plausible-looking invented key. It is first-party, independently
checkable by any reader, and its `kid` value — `"2011-04-29"` — is a date, which
sets up §6 rotation for free.

**Consequence accepted:** the RFC's example carries no `"use"` member. Rather
than doctoring the specimen, §1 shows five members and the `use` card states
plainly that it is absent from the example and not required. Honest beats tidy.

## D4 · The seam with the client-credentials explainer

`2026-08-06-explainer-02-client-credentials.md` plans a "Dive C — how a token is
verified", which overlaps this page. The boundary:

| | Scope |
|---|---|
| **This page** | How signing keys are **distributed** — what a JWK is, keys-not-certificates, the set, `kid`, rotation, caching, discovery. |
| **Dive C** | How **one token** is **checked** — given a key set, select by `kid`, verify, then validate the claims. |

**§5 sits on the seam and stops at the signature.** It covers `kid` selection and
signature verification, because without them "why does a JWK have a `kid`?" has
no answer. It does **not** cover claim validation — audience, expiry, scope,
issuer matching — and says so explicitly in a scope-boundary note.

When Dive C exists, it should **link here** at its "fetch the key set" moment
rather than re-explaining. If you find yourself drawing `n` and `e` inside Dive
C, you are rebuilding this page.

## D5 · Added: "then where does trust come from?"

**Not in the handoff. Added during the build.** §2 establishes that a JWK has no
issuer, no CA signature and no chain — which lands a PKI-fluent reader
immediately on "so what makes it trustworthy?" Leaving that unanswered would
have made the page feel like a dodge to exactly the audience it targets.

The answer given is the honest one: trust comes from **the transport and the
configuration**, not from a signature over the key. RFC 8414 requires
`jwks_uri` to *"use the 'https' scheme"*; the TLS certificate on that host is
doing the PKI work. Stated in one note, in scope (it is about key distribution),
and first-party cited.

## D6 · Two diagram corrections made during visual review

Both were caught by reading section screenshots, not by the automated layout
audit — which reported zero findings throughout. Recorded because both were
*correctness* bugs in a diagram on a page whose entire value is precision.

- **§3** originally drew a "tokens it mints" box between the private key and the
  boundary, with the "never crosses" ✗ beyond it. It read as *tokens* never
  leave the server, which is false. The box was deleted (the prose already says
  the private key signs) and the ✗ moved onto the boundary on the private key's
  own row, clearly labelled.
- **§7** originally chained the cache **hit** and **unknown-kid** outcomes in one
  linear rail, drawing an arrow from hit → miss — i.e. claiming you reach the
  refresh *by way of* a successful match, the opposite of the documented
  behaviour. They are now a vertical fork off one arrow.

**Lesson worth keeping:** `verify.ts` reports overflow, clipping and console
errors. It cannot tell you a diagram asserts something untrue. Section-level
screenshots read at viewport resolution are how those were found.

## D7 · A separate diagram page, at five levels — added 2026-08-06 (second pass)

**Reader feedback after the explainer shipped, and it was correct:** *"I kind of
need something extremely more visual… the complaint I got was that they had a
diagram that wasn't clear enough. You've given me an explainer, which is good,
but there needs to be a really great diagram. And maybe it's multiple diagrams,
at different levels, different assumptions of experience and knowledge."*

The explainer is prose with supporting figures. The thing InfoSec actually
lacked — and the thing that triggered this whole piece of work — is **a
diagram**. So `viz-pages/jwks-diagrams/` now carries the pictures, and the
explainer carries the words and the citations.

**Two pages, not one section.** Reasoning, so it is not re-argued:

- The artifact InfoSec needs is a picture they can put in a deck. A separately
  linked page makes each diagram independently shareable and screenshottable —
  the sibling handoff already verified that bare slug URLs return 200 on the
  deployed site and lobby unlock is remembered, so a plain relative link works.
- Bolting five large figures onto the top of the explainer would bury the prose
  behind a wall of pictures for the reader who came for the words.
- The level selector is genuinely interactive state. Keeping it off the
  explainer preserves that page's zero-JS property (D2) intact.

**Five levels, chosen by what the reader already knows** — not by detail for its
own sake. Each answers a different room's question:

| Level | Assumes | Exists because |
|---|---|---|
| 1 · a signet ring and a public noticeboard | nothing | An exec or auditor needs the *shape* of the idea before any acronym. Labelled an analogy on the page, with an explicit mapping strip so it is never mistaken for the mechanism. |
| 2 · three actors, three hops | you think in systems | **This is the diagram usually drawn wrong.** It exists to put the key fetch where it belongs: server-to-server, off the request path, cached. |
| 3 · where the bytes meet | you will implement or review it | Makes `kid` selection and signature verification concrete rather than asserted. |
| 4 · against X.509 | you know PKI well | **The payoff, and the best of the five.** The visual weight asymmetry — a four-object chain beside one small object plus six struck-out rows — *is* the argument. |
| 5 · rotation on a time axis | you have to operate it | "How do you rotate a key nobody signed?" has a shape, and the shape answers it. |

**The mark is drawn three times on purpose** (level 1). The reader recognising
the *same glyph* on the ring, in the wax and on the noticeboard is the whole
explanation. The first attempt used a tick — wrong, because ✓ already means
"valid" everywhere else on the page. Do not change it back.

**Deep links verified, not assumed.** `#{"level":3}` cold-loaded in a fresh tab
selects level 4, shows only that figure, and has **all five SVGs in the DOM** —
every level is rendered up front and merely shown/hidden, so a shared link, a
print, and the "show all five" view each carry the whole set. This is the trap-2
discipline from D2 applied to a page that *does* have state.

## D8 · Diagram defects found by eye, not by the audit — second pass

`verify.ts` reported **0 errors and 0 layout findings on every single run**,
including the runs where the diagrams were wrong. All of the following were
found by screenshotting each level at viewport resolution and looking:

- **L1** used a tick as the seal mark (collides with ✓ = valid) and had no
  visual "compare these two" moment at all. Now a distinct sigil drawn in three
  places, plus explicit `=` / `≠` comparison panels.
- **L2** arrowheads were the kit's default colour while the lines were not, so
  several arrows ended in a grey head on a blue line. Fixed structurally: the
  marker is now derived *from the edge's own class*, so a mismatch is impossible
  rather than merely unlikely.
- **L3** routed the "signed bytes" edge straight through the signature box.
- **L4** the trust-anchor insight label overprinted the `GET https://…` box.
- **L5** the rightmost token's label ran off the canvas, and the "slack" marker
  floated free of the token it was measuring. Both ends of that bracket are now
  derived from the same constants the bars and guide lines use.

**Conclusion worth keeping, and it now has five more data points:** the layout
audit catches overflow, clipping and blank renders. It cannot tell you an arrow
points at the wrong box, that a marker means two things at once, or that a
measurement is anchored to nothing. On a page whose only value is precision,
reading the picture is not optional.

## D9 · The InfoSec pair, and why it is two pages and not four — added 2026-08-06 (third pass)

**Prompted by a coverage question:** the pack explained the *mechanism* thoroughly
and answered almost none of the questions an InfoSec reviewer actually opens with.
Four gaps were identified — blast radius, containment, detection, and scope as a
control. **They are not four pages.** They are four columns of one grid whose rows
are *which secret leaked*, so they ship as:

| Page | Answers |
|---|---|
| `token-compromise-map/` — *What an attacker has to steal* | What they can do · what bounds it · how you would know |
| `token-kill-switch/` — *Turning it off* | How you turn it off, how fast, and at what cost |

**Detection deliberately gets no page of its own.** Generically you can only name
the *signal* ("a `kid` that was never published", "issuance from a new source").
Which log carries it is deployment work, and a generic page pretending otherwise
is the thing that would have dragged this set into network-diagram territory.

### The generic/specific line, which is what keeps these shareable

The four questions do **not** split the same way, and that is what makes the pair
safe to publish:

- **Blast radius and containment are pure protocol.** True at any organisation.
- **The containment *levers* are protocol; their *latency* is yours.** The page
  states orders of magnitude and says so in the footer.
- **Detection is mostly yours.** Named as a signal, not as a log source.

The one genuine overlap with `member-api-poc-network-story` is *where each secret
physically lives*. That is topology; it stays there. Both pages name holders
generically and the footer says so explicitly.

## D10 · Two universes instead of one answer

The blocking question — *is the signing key persisted or generated at start-up?* —
was answered by the reader with "show both". That is a better answer than either
branch, and it became the primary control on both pages:

| | Universe A · ephemeral | Universe B · secret manager |
|---|---|---|
| Key at rest | nothing to steal | a path, a backup, a last reader |
| Theft detectable? | **no — nothing records it** | **yes — the vault read is logged** |
| Rotation | a restart, seconds, no runbook | a write plus a rollout, minutes |
| Restarts / scale-out | hard cutover; instances hold *different* keys | one key everywhere; deploys are free |

**The trade is genuinely two-sided and non-obvious, which is why it is worth
drawing:** ephemeral is *better* against theft-at-rest and *worse* on both
detectability and availability; managed is the reverse. On the map, switching to B
**moves** the signing key left (easier to obtain) while turning it green
(detectable), and **grows a new node** — whatever credential reads the vault. One
click, and the shape of the attack surface visibly changes.

### Two findings that came out of drawing it

- **Two rows reach "total", not one.** Controlling the JWKS host lets an attacker
  publish their own public key and have every verifier accept tokens they signed —
  *without ever obtaining the private key*. Key custody is half the problem;
  integrity of the published key set is the other half and nobody draws it.
- **Planned rotation and emergency rotation are not the same operation.** The
  overlap window in the diagram set's Level 5 depends on continuing to publish the
  old key, which is exactly what a compromise forbids. So the overlap is
  unavailable precisely when it is wanted, and every legitimate token dies with the
  attacker's. This **corrects an over-tidy impression** left by Level 5, and
  `jwks-explainer` §6 now carries a note saying so and linking across.

### Verification note

`verify.ts` again reported clean while the charts were wrong. Found by eye across
four states (two universes × the TTL presets): clipped node labels, all three
y-axis band labels stacked on one point from anchoring rotated text at an edge
instead of its centre, a bar note running off the right edge, a collateral caption
floating with no bar under it, and a red "this one moves" halo left on a node that
had turned green. **Screenshot every state; the audit only ever sees the first.**

### D10a · Token-lifetime presets are 1 / 5 / 15 / 60 minutes

One minute was added on request and earns its place: it is the only preset where
**several levers take longer than the token's own life**. In Universe B at one
minute, both "block it at the edge" and "emergency key rotation" outlast expiry —
so below a certain lifetime most levers stop being containment at all, and the only
ones worth pulling are those that stop the attacker *renewing*. The page says so,
but only at that preset.

Two consequences in the drawing code:

- **The axis span now fits the levers, not just the lifetime.** It was
  `max(ttl * 1.6, 22)`, which crushed the expiry mark against the origin once a
  one-minute option existed. It is now
  `max(ttl * 1.6, longestFiniteLever * 1.4, 3)`, so the axis adapts to whichever
  universe is selected — Universe B's 8-minute rotation widens it, Universe A's
  restart does not.
- **The origin tick is dropped when the expiry mark is within 74px of it**,
  because at short lifetimes "0" and "token expiry · 1 min" ran together as one
  string.

---

## D11 · Rotation does not contain instantly — corrected 2026-08-07

The chart drew Universe A's restart at ~0 and captioned it *"seconds — the
fastest lever you have."* **Both were wrong**, and the second one was a
containment claim the page could not keep.

Discarding a key stops the **issuer** using it. A verifier goes on accepting
tokens signed with it until its cached copy turns over or the token hits its own
`exp`, whichever is sooner. So containment is `min(cache, ttl)`, and a `CACHE`
constant of five minutes — a common library default — is now stated on the page
rather than hidden in the arithmetic.

What that produces is uncomfortable and correct:

| Token lifetime | Restart contains in | Wait it out |
|---|---|---|
| 1 min | **1.3 min** | 1 min |
| 5 min | 5.3 min | 5 min |
| 15 min | 5.3 min | 15 min |
| 60 min | 5.3 min | 60 min |

**At a one-minute lifetime, restarting to contain a stolen token is marginally
worse than doing nothing** — the restart spends time expiry was going to spend
anyway. Rotation's advantage only appears once tokens outlive the cache. That is
more on-message than the old caption, because it is the page's own thesis about
lifetime being the dial that moves everything.

The collateral note claimed every outstanding token *"dies at the same instant."*
They die as each verifier notices — same staleness window, other side of the row.

**Do not shorten `CACHE` to improve this.** The cache is an availability buffer
as much as a performance one: every expiry forces a fetch, and a fetch that fails
against an empty cache fails the request. Rotation is picked up by the
unknown-`kid` path regardless of the number.

## D12 · Rotation does not answer a stolen client secret — corrected 2026-08-07

The lever table said *"yes ✓ kills it too."* It does not. Rotating the key
invalidates the token they hold; it does nothing about their ability to present
the secret and mint a fresh one, signed with the new key, moments later. That is
what deactivating the credential is for. Downgraded to partial, with the reason
on the cell.

## D13 · Lever 4 drawn in detail — added 2026-08-07

Every other lever is a single action. Deny-listing is a **design with two
implementations**, and which one is chosen decides whether the issuer lands on
the path of every request — so it gets a figure: four steps, with step 3 the only
fork.

- **Local deny-list** — the list is pushed to the resource server out of band and
  checked in memory. The authorization server stays off the request path and can
  be down without taking the API with it. Costs a propagation delay.
- **Introspection** (RFC 7662) — no delay, and the issuer becomes a hard
  dependency of every request, forever.

Framed as **control plane versus data plane**: revoking is rare and tolerates
seconds; validating happens constantly and tolerates nothing. Introspection
solves the rare problem by putting its mechanism in the common path.

Cited to RFC 7519 §4.1.7 (`jti` uniqueness, replay prevention, claim is
OPTIONAL), RFC 7662 (defines *"a method"* — not a requirement, and names
structured tokens as the alternative), and OWASP for the deny-list as the
standard answer. The page's `.elsewhere` block was corrected at the same time: an
earlier version claimed the deny-list was **not** on this page's lever list. It
is — lever 4 — and the block now frames the difference as pricing rather than
disagreement.

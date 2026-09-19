# JWKS explainer, diagrams & the InfoSec pair — design record

The durable record for **four pages that are one deliverable**:

> **Updated 2026-08-07.** All four now carry an `.elsewhere` block — a pointer to
> somebody else teaching the same mechanism, styled distinctly from the RFC
> citations so a reviewer never reads a blog as a standard. The component lives
> in `/_kit/viz-kit.css`, not in these pages, so it re-themes with the kit and is
> not nine copies of one rule. Convention: the blurb says what the source is
> **actually** good for, including where it is thinner than its reputation — an
> unread link presented as authoritative is the exact impression it exists to
> prevent. Auth0's JWKS page is deliberately **not** cited for that reason (it
> has no example JSON and never defines `kid`).
>
> `token-kill-switch` also gained a lever-4 detail figure and two corrections —
> see its own section in [`01-decisions.md`](01-decisions.md) and the note below.

| Page | Carries |
|---|---|
| [`viz-pages/jwks-explainer/`](../) | The words, the precision, and every RFC citation. Zero JavaScript. |
| [`viz-pages/jwks-diagrams/`](../../jwks-diagrams/) | The pictures — the same system drawn five ways, at five levels of assumed knowledge. This is the artifact that answers the original complaint. |
| [`viz-pages/token-compromise-map/`](../../token-compromise-map/) | **For InfoSec.** Every secret mapped by how hard it is to obtain against what it buys an attacker, with whether you would ever find out. |
| [`viz-pages/token-kill-switch/`](../../token-kill-switch/) | **For InfoSec.** Five containment levers against time and collateral damage, plus which lever actually works for which compromise. |

All four cross-link. The record for all of them lives here. The first two explain the
mechanism; the second two answer what a security reviewer actually asks — see **D9**
and **D10** in [`01-decisions.md`](01-decisions.md). Built 2026-08-06 from a
local handoff (`ai-docs/` is gitignored, so this directory is the record that
survives).

## The one thing this page exists to fix

**JWKS distributes KEYS, not CERTIFICATES.**

Evidence it was needed, from the 2026-08-06 solution review: the room said
*"certificate"* every time — *"there's a little secret file… it's called a
certificate"*, *"we store the certification on the dedicated server"* — while
discussing what is, first-party from the source, a bare RSA keypair generated in
memory with no CA, no chain, no subject, no expiry and no file. A room arguing
about where to store a certificate is arguing about a thing that does not exist.
InfoSec's own JWKS diagram was unclear, and this confusion is the likely root.

**If a reader leaves the page still saying "certificate", the page failed.**

## Audience and framing

**InfoSec and network reviewers. Not developers.** People who know PKI well and
are pattern-matching JWKS onto it — which is exactly why it misleads them.

**Generic, deliberately.** No product names, no organisation, no zones or
firewalls. Actors are *authorization server*, *client*, *resource server*. The
page is shareable outside the bank without editing, and a sweep for internal
names returns zero hits (see [`03-open-items.md`](03-open-items.md) for how to
re-run it).

## What it covers

| § | Section | Carries |
|---|---|---|
| 1 | A JWK is a JSON object, and this is the whole of one | RFC 7517 App. A.1 specimen, verbatim; six member cards; the JWK Set wrapper |
| 2 | What an X.509 certificate has that a JWK does not | **The payoff.** Seven-row contrast matrix; the `x5c`-is-OPTIONAL caveat; where trust actually comes from |
| 3 | Only the public half is ever published | Keypair/boundary figure; "nothing secret on the endpoint" |
| 4 | The endpoint needs no authentication | The circular-dependency figure; the health-check example |
| 5 | How a verifier actually uses it | Compact JWT anatomy; signing input; signed≠encrypted; signature-before-claims |
| 6 | Rotation, and why it is a *set* | Three-phase timeline; overlap window |
| 7 | Caching, and the behaviour worth knowing | Unknown-`kid` refresh-and-re-select; the two "do nots" |
| 8 | Discovery is optional | RFC 8414 `jwks_uri` OPTIONAL; manual configuration |
| — | Sources | Every section number **and verbatim title** |

## The diagram set — `jwks-diagrams/`

Five levels, each a standalone screenshottable diagram, arrow-key navigable and
individually deep-linkable:

| Level | Assumes | Diagram |
|---|---|---|
| 1 · The idea | nothing at all | A signet ring locked in a room; a picture of its mark on a public noticeboard; `=` / `≠` comparison panels. Labelled an analogy, with a mapping strip. |
| 2 · The flow | you think in systems | Three actors and five numbered hops, with the key fetch drawn where it belongs — server-to-server, off the request path. |
| 3 · The bytes | you will implement it | `kid` selecting one JWK from the set; signing input, signature and key material converging on one verify step. |
| 4 · Versus PKI | you know X.509 well | **The payoff.** A four-object certificate chain beside one JWK plus six struck-out fields — and the dashed line showing the TLS certificate chaining to the same trust store. |
| 5 · Over time | you have to operate it | Rotation on a time axis: two key-publication bands, an overlap window, four token lifetimes, and the slack between a token's expiry and its key's withdrawal. |

Why it is a separate page and why these five levels: **D7** in
[`01-decisions.md`](01-decisions.md).

## Companion docs

- [`01-decisions.md`](01-decisions.md) — the calls made, and the reasoning, so
  they are not re-litigated.
- [`02-standards-map.md`](02-standards-map.md) — every claim on screen mapped to
  the section that backs it, titles verbatim. **Read before editing any citation.**
- [`03-open-items.md`](03-open-items.md) — what is still undecided, and the
  verification commands.

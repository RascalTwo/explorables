# The failure cap — design record

Built 2026-08-07. Generic and shareable: no product names, no topology, no
internal decision IDs. Draws the control behind **NIST SP 800-63B-4 §3.2.2**.

Sits beside the client-credentials family and links out via `.elsewhere` to the
OWASP Authentication Cheat Sheet.

## What it exists to fix

A specific confusion, and it is a common one: **rate limiting and the failure cap
are different controls**, and people substitute one for the other because both
sound like "throttling".

The interaction is the whole argument. Same hundred attempts, same one
`client_id`, toggled between one source and a hundred:

- the counter keyed on the **source** drops to **1** and never fires
- the counter keyed on the **`client_id`** reaches the cap either way

*The traffic did not change; only the bookkeeping did.* An attacker rotating
addresses never trips a per-source counter, which is precisely why a rate limit
cannot stand in for the cap.

## What it says about the verb, and why the wording matters

**NIST names exactly one verb — disable.** Delete comes from RFC 7592, where it
means deprovisioning a client that is finished with, not locking out one under
attack. Answering the cap with delete is a **substitution** and the page says so
in those words, because *"the standard offered both and we chose"* is the version
a reviewer checks and disproves.

**Neither verb ships in a typical framework**, and §4 exists to stop that reading
as a complaint:

- RFC 7592 is `Category: Experimental`, not Standards Track, and states that
  *"not all authorization servers supporting dynamic client registration will
  support these management methods."* Implementing a subset is expected.
- Dynamic client registration is a feature most deployments never enable —
  typically shipped disabled by default.
- **Client lifecycle was never in protocol scope.** Whether a client may
  currently authenticate is policy, the same category as which scopes it may
  request. Off-the-shelf servers ship an enabled/disabled flag as a *product*
  feature; that surface belongs to the vendor. An organisation that builds its
  own authorization server inherits it.

**Low demand for an optional feature is a better explanation than an oversight**,
and it is the honest answer to give when someone asks why a verb was
hand-written.

## The bug worth remembering

The first cut coloured **"did the number go up"** instead of **"was the attack
caught"** — so the per-source counter rendered **green** at exactly the moment it
had failed to notice a hundred guesses.

Green on a missed attack is worse than no colour at all: it inverts the reading
of the page's central figure. `verify.interactions.ts` now asserts the direction
(`per-source MISSES when rotated`, `per-source CATCHES single source`) so it
cannot silently flip back.

## Scoping note carried on the page

*"Consecutive" is scoped to one `client_id`.* The counter is a value on that
credential's own row — up on a failed attempt against that identifier, back to
zero the moment one succeeds. Failures against a different `client_id` increment
a different counter and never mix, which is also why an attacker cannot burn down
a caller's counter without knowing which caller to aim at. That ties §1 to §5 so
the denial-of-service section is not a separate topic.

## Elsewhere

[OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
— reaches §1 and §5 independently and states both in almost the same words. Its
mitigation for lockout-as-DoS is a self-service recovery path, which a
machine-to-machine credential **does not have** — and that absence is exactly why
delete-versus-disable costs more here than for a human login. The blurb says so,
because a source that nearly-but-not-quite applies is the most useful kind to
flag.

Verified reachable by `../check-links.ts`, which gates on rot and exits non-zero.

## Open

- Posture is `public` / `unlisted`. Not on any index, no OG card.
- No human read-through yet.

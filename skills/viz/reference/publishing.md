# Publishing a viz to a static host

When the user wants a viz reachable **over the internet** (not just on localhost), publish it. Publishing produces one **self-contained HTML** (kit inlined) per viz that any dumb static host serves — GitHub Pages or GitLab Pages alike. A **static viz** (no `api.ts`) ships as a plain inlined page — no tape, no shim, **no frozen-snapshot banner**. An **api-backed viz** is machine-bound, so record a tape first (see `reference/backend.md`); it then ships as a **frozen tape** — the tape + a client-side `api/*` shim are inlined and a frozen-snapshot banner is added so a viewer never mistakes the snapshot for live data.

The tool is `build.ts` (central-only, never vendored — publishing is an author action). There is **no `--public`/`--private` flag** — each viz declares its own posture (see below), so the CLI is invoked the same way every time:

```bash
bun "$SKILL_DIR/build.ts" preview <container> [--port <n>] [--open]      # SEE what would publish, served locally
bun "$SKILL_DIR/build.ts" <container> [--out <dir>] [--base-url <url>]   # build a whole container
bun "$SKILL_DIR/build.ts" export <vizDir> [--out <dir>]                  # one viz (dev/test primitive; no index)
bun "$SKILL_DIR/build.ts" rotate <vizDir>                                # revoke + re-mint a private link
```

## Preview what would publish — locally, first

When the user asks to *see what would be published* ("show me the published site", "what would this look like deployed", "preview the static build") — use `preview`, **not** the live dev server (which serves editable source from `127.0.0.1:5180`). `preview` builds the **exact publishable tree** — self-contained artifacts, mirrored-in vizzes copied verbatim, the composed landing index, private vizzes sealed behind their StatiCrypt gate — into a throwaway temp dir and serves it over plain HTTP, so you're looking at the real deployable bytes, not the dev experience.

```bash
bun "$SKILL_DIR/build.ts" preview <container> [--port <n>] [--open]
```

- **Side-effect-free by design.** It is the build-and-STOP core *without* the outbound steps: it **never pushes mirrors** into other containers and **never deploys**. Previewing a source container does not touch its mirror sinks. Nothing is committed.
- **Port:** omit `--port` and the OS assigns a free one (printed in the output); pass `--port <n>` to pin it.
- **Opening it:** the command prints the URL. For an agent, run it **in the background** and open the printed URL with the browser tools (so you can screenshot/inspect); a human can pass `--open` to launch the OS default browser, or just click the URL. The server runs until `Ctrl-C` (or the process is killed).
- Honors the same gates as publish: an **undeclared `viz:posture` still refuses** (you preview exactly what would/wouldn't publish), `local` vizzes are skipped, `unlisted` are built-but-off-the-index.

## Posture is per-viz — declared in the viz, not on the command line

Each viz declares its **posture** — `public`, `private`, or `local` — **in its own `index.html`**:

```html
<meta name="viz:posture" content="public">   <!-- or "private", or "local" -->
```

This meta is the **sole source of truth**. Consequences:

- **One run can mix postures** — a container is no longer all-or-nothing. Each viz builds (or is skipped) per its own posture.
- **Redeploys need no re-input** — the posture rides in the committed source, so rerunning the same command reproduces the same split (and the same magic links — keystore is stable until `rotate`).
- **Untagged = hard error.** A viz with no `viz:posture` makes the whole run **refuse**, naming the offenders. Nothing is ever published *or withheld* on a guess — to deliberately keep a viz off the host, tag it `local` (don't just leave it untagged). Bootstrap scaffolds new vizzes with `local`, so this rarely bites.
- **`public`** — hosted as-is; anyone with the URL sees it. No encryption.
- **`private`** — sealed with StatiCrypt (AES-256) and shared via a **magic link** (the decryption key rides in the URL `#fragment`, never sent to the server). **The encryption *is* the access control** — host/site visibility is irrelevant. Possession of the link = access. Threat model: *people I share with, and their forwards, are fine; random internet is not.* Secrets live in a local, gitignored keystore (`CENTRAL/.keystore.json`); links are **stable across redeploys** until you `rotate`.
- **`local`** — **never published.** The run silently skips it (printing a one-line note); the viz and its source stay on your machine, never reaching the host. This is the default a new viz is scaffolded with — flip it to `public`/`private` only when you mean to share.

## Listing is a separate axis — hide a viz from the index

Posture controls *access*; **listing** controls whether a viz shows up on the landing index. They're independent. Add to a viz's `index.html`:

```html
<meta name="viz:listed" content="unlisted">   <!-- "listed" | "unlisted"; legacy "false" also unlists -->
```

A viz with no `viz:listed` meta (or `listed`/`true`) is **listed**; new vizzes are scaffolded `unlisted` as the safe default. An **unlisted** viz is still **built and hosted** — reachable by anyone who has its direct URL. It's just absent from the index (no card, public or private). This is **UX-level non-advertisement, not security**: a determined visitor can still reach it by guessing the slug, via a public dist repo's file tree, sitemaps, or referrers. So if a viz's *name or content* is sensitive, don't lean on `unlisted` — use `private` (sealed) **and a non-revealing slug**. Unlisted is the "don't advertise this, but I'm fine if it's found" knob, and it composes with any posture (a `private` + unlisted viz is sealed *and* off the index).

## Kind is a third axis — explanatory vs operational

Posture controls *access*; listing controls *advertisement*; **kind** describes *what sort of viz this is* — and unlike the other two it's a **view-time** concern, not a publish-time one. Add to a viz's `index.html`:

```html
<meta name="viz:kind" content="operational">   <!-- "explanatory" (default) | "operational" -->
```

- **`explanatory`** (default, and what every absent/unrecognized value falls back to) — a timeless diagram, chart, or illustration. Freezing it loses nothing; a recorded snapshot is just as good as the live page.
- **`operational`** — a live-monitoring tool whose truth has a **shelf life** (queue depths, run status, live metrics). A frozen copy looks identical to live data but is stale the moment the tape was cut.

The litmus test: *"if I froze this, would it still do its job?"* If no, it's `operational`. The flag is **human-set** — having an `api.ts` does **not** make a viz operational; plenty of api-backed vizzes are explanatory. Two effects, both no-ops for `explanatory`:

1. **Louder frozen banner** — when viewed frozen (server `--frozen`, or a published export replaying a tape), an operational viz shows a red "live monitoring tool, NOT current state" banner instead of the plain amber "Frozen snapshot".
2. **Operational badge** on the landing index card (⚡ Operational), so real tools are distinguishable from sketches at a glance.

Kind does **not** gate publishing — an operational viz publishes exactly like any other; it just warns harder when its data is frozen.

## Multi-viz: a deployment place with a landing index

A deployment place holds **many vizzes** — one self-contained page per slug dir (`<out>/<slug>/index.html`), reachable at `<host>/<slug>/`. The container run regenerates a **landing `index.html`** at the out root listing **every viz in the run**, so the result is a browsable multi-viz site at `<host>/`.

- **Cards read from source, never the built artifact** (a sealed private page's `<head>` is encrypted). A **public** card shows title + blurb + eyebrow; a **private** card is minimal — real title + a 🔒 "Link required", **no description** — so the index lists everything without leaking a sealed viz's content. Clicking a private card lands on the StatiCrypt gate; the index never carries the key.
- **Card text** comes from each viz's own `<head>`: title from `<meta name="viz:title">` (else `<title>`), blurb from `<meta name="viz:description">` (else `<meta name="description">`), and optional eyebrow tags from one or more `<meta name="viz:tag">` elements — repeat the element to attach several tags (each renders as its own chip). A viz with `viz:kind=operational` also gets a ⚡ Operational badge (see "Kind is a third axis").
- **Flags:** `--no-index` skips index regeneration; `--index-title <t>` sets the landing-page title (default "Visualizations").
- The container run owns the whole-site index and regenerates it each run; a single `export` builds one artifact and leaves the index alone.

## The secret-scan + human gate — DO THIS before every publish (public or private)

`build.ts` is purely mechanical: **it seals whatever tape is on disk.** Sanitizing the tape is *your* job, not the tool's. Before publishing, for each viz being published:

1. **Read its `recordings.json`** and scan for anything that should not leave the machine — API keys, tokens, internal hostnames/IPs, emails, paths that reveal more than intended, customer data.
2. **Advise the user, don't auto-redact.** Surface concrete findings (e.g. *"⚠️ `GET /meta` body line 40 looks like an AWS access key — leave it in?"*) or give the all-clear (*"nothing jumped out"*). There is deliberately **no scrubber** — the human decides and hand-edits the tape.
3. Only after the human signs off, run `build.ts`.

For a **private** viz the encryption is a backstop, but the scan still matters (defense-in-depth). For a **public** viz there is **no backstop at all** — the scan is the only thing between the tape and the open internet, so be thorough. In a mixed run, scan every viz, and pay closest attention to the public ones.

## After publishing

- `build.ts` prints each magic link (private) and writes artifacts to a local `dist` dir. **It does not deploy.** Present the links / dist path to the user.
- **Deploying is a separate, explicit, human-confirmed step** — force-push the sealed set to the Pages branch (`gh-pages`) only when the user says so. Never push on your own initiative.
- **Rotation revokes:** `build.ts rotate <vizDir>` bumps the version so the next publish of that (private) viz mints a fresh magic link and the old one dies.

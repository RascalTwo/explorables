#!/usr/bin/env bun
// build.ts — turn viz tapes into hostable static artifacts. AUTHOR-SIDE ONLY.
//
// This is deliberately NOT vendored into a repo's .runtime/ — publishing is an
// author action, never something a cloner does. It also never deploys: it builds
// artifacts into a local dist dir and STOPS. Pushing the result to a Pages branch
// is a separate, explicit, human-confirmed step.
//
// Posture is per-VIZ and self-declared — each viz's own index.html carries
// <meta name="viz:posture" content="public|private">. That meta is the SOLE source
// of truth: there is no --public/--private flag, the CLI is invoked the same way
// every time, and a single run can mix public and private vizzes. A viz that
// declares no posture is a hard error (the run refuses) — nothing is ever published
// on a guessed posture. The deployment is therefore NOT homogeneous, and public and
// private vizzes may live in the same container (this supersedes the earlier
// all-public-or-all-private design).
//
//   public   inline the viz into one self-contained HTML (kit + tape + api shim).
//            Anyone with the URL sees it. No encryption, no keystore.
//   private  do the same, then seal the HTML with StatiCrypt (AES-256) using the
//            viz's stable passphrase+salt from the keystore, and print a magic link
//            (key in the #fragment). Possession of the link = access.
//   local    NOT published at all — the run silently skips it. The viz (and its
//            source) stay on your machine. This is the safe default new vizzes scaffold
//            with, so nothing reaches a host until you consciously flip it.
//
// The tape on disk is sealed AS-IS. There is no scrubber here: sanitizing a tape
// (the AI secret-scan + human gate) is a PROCESS step in SKILL.md that happens
// before this runs. This CLI is purely mechanical: build, seal, assemble.
//
// A deployment place can hold MANY vizzes — one self-contained page per slug dir.
// The container run (re)generates a landing index.html at the out root listing every
// viz in the run; private ones are listed minimally (real title + lock, no blurb),
// so the index never leaks a sealed viz's content. The container run owns the whole
// -site index; a single `export` builds one artifact and leaves the index alone.
//
// Mirrors (ADR 0006): a <container>/mirrors.json declares where this container's
// NATIVE vizzes are mirrored into OTHER containers, each under its own frame
// (title/description/tags) and a consciously re-decided posture (per-mirror `access`,
// required). Each mirrored viz lands in the sink as a self-describing unit
// (index.html + a .mirror.json sidecar); the sink's index composes from local
// presence (natives card-from-head + sidecars card-from-sidecar), so it's the same
// whoever writes it. A container that is also a sink copies its mirrored-in artifacts
// verbatim (never rebuilds them) and cards them from their sidecars.
//
// usage:
//   bun build.ts <container> [--out <dir>] [--base-url <url>] [--no-index] [--index-title <t>]
//   bun build.ts export <vizDir> [--out <dir>] [--base-url <url>]
//   bun build.ts rotate <vizDir>
//
// --no-index       skip the landing-index regeneration
// --index-title    title for the generated landing page (default "Visualizations")

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, cpSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { buildSelfContained, type HeadOverrides } from "./inline.ts";
import { getOrCreate, rotate, type KeyEntry } from "./keystore.ts";
import { idFor } from "./discovery.ts";

const MIRROR_SIDECAR = ".mirror.json";

const PLACEHOLDER_HOST = "https://YOUR-PAGES-HOST/";

function die(msg: string, code = 1): never {
  console.error(msg);
  process.exit(code);
}

// ---- Argument parsing ----
const argv = process.argv.slice(2);
let out: string | undefined;
let baseUrl: string | undefined;
let noIndex = false;
let indexTitle: string | undefined;
let port: number | undefined; // preview: explicit port (default: an OS-assigned free one)
let open = false; // preview: also open the URL in the OS default browser
const positional: string[] = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--out") out = argv[++i];
  else if (a.startsWith("--out=")) out = a.slice(6);
  else if (a === "--base-url") baseUrl = argv[++i];
  else if (a.startsWith("--base-url=")) baseUrl = a.slice(11);
  else if (a === "--no-index") noIndex = true;
  else if (a === "--index-title") indexTitle = argv[++i];
  else if (a.startsWith("--index-title=")) indexTitle = a.slice(14);
  else if (a === "--port") port = Number(argv[++i]);
  else if (a.startsWith("--port=")) port = Number(a.slice(7));
  else if (a === "--open") open = true;
  else positional.push(a);
}

// ---- StatiCrypt drivers (run via bunx; the chosen sealing tool — don't roll our own crypto) ----
// Seal writes the encrypted file; share is a SEPARATE link-only invocation (with
// --share, StatiCrypt prints the link and writes nothing). Same passphrase+salt in
// both, so the #staticrypt_pwd hash in the link matches the sealed file — and that
// hash depends only on passphrase+salt, never the host, so links are host-stable.
async function staticrypt(args: string[], cwd: string): Promise<{ ok: boolean; stdout: string }> {
  const proc = Bun.spawn(["bunx", "staticrypt", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = (await new Response(proc.stdout).text()).trim();
  const ok = (await proc.exited) === 0;
  if (!ok) {
    const err = (await new Response(proc.stderr).text()).trim();
    console.error(`  staticrypt failed: ${err || stdout}`);
  }
  return { ok, stdout };
}

async function seal(stageDir: string, file: string, outDir: string, key: KeyEntry): Promise<boolean> {
  const { ok } = await staticrypt(
    [file, "-p", key.passphrase, "-s", key.salt, "-d", outDir, "--short", "-c", "false"],
    stageDir,
  );
  return ok;
}

async function magicLink(stageDir: string, file: string, key: KeyEntry, shareBase: string): Promise<string> {
  const { ok, stdout } = await staticrypt(
    [file, "-p", key.passphrase, "-s", key.salt, "--short", "-c", "false", "--share", shareBase],
    stageDir,
  );
  const link = stdout.split("\n").find((l) => l.includes("#staticrypt_pwd="));
  return ok && link ? link.trim() : "(failed to produce magic link)";
}

// ---- Per-viz publish: build, then (private) seal + link. Returns a report line. ----
// opts (ADR 0006 mirrors): `overrides` rewrites the artifact's head frame BEFORE
// sealing; `sidecar`, when set, is written as a .mirror.json beside the artifact so
// the destination becomes self-describing. Plain (home-container) publishes pass
// neither and behave exactly as before.
async function publishOne(
  vizDir: string,
  outRoot: string,
  isPrivate: boolean,
  shareHost: string,
  opts?: { overrides?: HeadOverrides; sidecar?: Sidecar },
): Promise<{ slug: string; ok: boolean; warnings: string[]; link?: string }> {
  const slug = path.basename(vizDir);
  const { html, warnings } = buildSelfContained(vizDir, opts?.overrides);
  const dest = path.join(outRoot, slug);
  let link: string | undefined;

  if (!isPrivate) {
    mkdirSync(dest, { recursive: true });
    await Bun.write(path.join(dest, "index.html"), html);
  } else {
    // Private: stage the plaintext in a throwaway dir, seal into the out tree.
    const id = idFor(vizDir);
    // ok:false on these early exits so the caller can tell the unit was NOT written
    // (e.g. a mirror push must not mark a failed slug "kept" and spare it from prune).
    if (!id) return { slug, ok: false, warnings: [...warnings, "viz is outside $HOME — cannot key a keystore entry; skipped"] };
    const key = await getOrCreate(id);

    const stageDir = path.join(os.tmpdir(), "viz-publish-stage", slug);
    mkdirSync(stageDir, { recursive: true });
    await Bun.write(path.join(stageDir, "index.html"), html);

    const sealed = await seal(stageDir, "index.html", dest, key);
    if (!sealed) return { slug, ok: false, warnings: [...warnings, "sealing failed (see staticrypt error above)"] };

    const shareBase = shareHost.replace(/\/$/, "") + "/" + slug + "/";
    link = await magicLink(stageDir, "index.html", key, shareBase);
  }

  // Self-describing sink: the sidecar is the local card-truth (load-bearing for a
  // private mirror, whose sealed head is encrypted). Written for BOTH postures.
  if (opts?.sidecar) {
    await Bun.write(path.join(dest, MIRROR_SIDECAR), JSON.stringify(opts.sidecar, null, 2) + "\n");
  }
  return { slug, ok: true, warnings, link };
}

// List a container's immediate child vizzes (dirs with an index.html, no dotdirs).
function vizzesIn(container: string): string[] {
  return readdirSync(container, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => path.join(container, d.name))
    .filter((d) => existsSync(path.join(d, "index.html")));
}

// ---- Multi-viz landing index ----
// A deployment place holds many vizzes, one per slug dir. After building, we
// regenerate a small landing page at the out root listing every viz in THIS run.
// The container run is the source of truth for the whole site (it regenerates the
// index each time) — so cards are read from the SOURCE viz dirs, never the built
// artifacts. That matters for private vizzes: a sealed artifact's <head> is
// encrypted (its title is just "Protected Page"), so its real card text can only
// come from the source. A private card is rendered minimally (real title + a lock
// marker, no description) so the index can list it without leaking its blurb.
//
// Card text comes from each viz's own <head>: a card title from <meta name=
// "viz:title"> (else <title>), a blurb from <meta name="viz:description"> (else
// <meta name="description">), and optional eyebrow tags from one or more
// <meta name="viz:tag"> elements (repeat the element to attach several tags).

function escHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

// Decode the handful of HTML entities a meta `content` attribute may carry, so card
// values are PLAIN text. Without this, a title written as `Roadmap &amp; Vision`
// (the entity for a literal &) would be stored raw and then re-escaped by escHtml on
// render → `&amp;amp;` (and re-escaped by escAttr into a mirror's head). Decode &amp;
// LAST so an already-literal "&lt;" inside the source isn't double-decoded.
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// The content value is delimited by whichever quote opened it (captured group 1) and
// read lazily up to that SAME quote — so an apostrophe inside a double-quoted value
// (e.g. content="Beta's blurb") doesn't truncate the match. Returns DECODED plain text.
export function grabMeta(html: string, name: string): string {
  const re = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=(["'])(.*?)\\1`, "i");
  return decodeEntities((html.match(re)?.[2] ?? "").trim());
}

// Like grabMeta but returns EVERY matching meta's content — repeated elements with
// the same name (valid HTML) become an ordered list. Used for multi-valued metas
// like viz:tag. Empties are dropped; order follows document order.
function grabMetaAll(html: string, name: string): string[] {
  const re = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=(["'])(.*?)\\1`, "ig");
  return [...html.matchAll(re)].map((m) => decodeEntities(m[2].trim())).filter(Boolean);
}

function vizCardMeta(html: string): { title: string; description: string; tags: string[]; kind: "explanatory" | "operational" } {
  return {
    title: grabMeta(html, "viz:title") || (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim() || "Untitled viz",
    description: grabMeta(html, "viz:description") || grabMeta(html, "description"),
    tags: grabMetaAll(html, "viz:tag"),
    kind: grabMeta(html, "viz:kind").toLowerCase() === "operational" ? "operational" : "explanatory",
  };
}

// Posture is declared by the viz itself: <meta name="viz:posture" content="public|private|local">.
// It is the SOLE source of truth — there is no --public/--private flag. Three values:
//   public  → built + hosted as-is
//   private → built + StatiCrypt-sealed + magic link
//   local   → NEVER published; the run silently skips it (the viz stays on your machine)
// A viz that declares NONE of these is an ERROR (publish refuses), so nothing is ever
// published on a guessed posture. Returns the value, or null (undeclared → refuse).
function readPosture(vizDir: string): "public" | "private" | "local" | null {
  const indexPath = path.join(vizDir, "index.html");
  if (!existsSync(indexPath)) return null;
  const v = grabMeta(readFileSync(indexPath, "utf8"), "viz:posture").toLowerCase();
  return v === "public" || v === "private" || v === "local" ? v : null;
}

// Listing is a SEPARATE axis from posture. <meta name="viz:listed" content="unlisted"> (or the
// legacy "false") hides a viz from the landing index — but it is still BUILT and reachable by
// its direct URL. This is UX-level non-advertisement (obscurity), NOT access control. Default
// (meta absent, or "listed"/"true") = listed; "unlisted" or "false" (case-insensitive) unlist.
function readListed(vizDir: string): boolean {
  const indexPath = path.join(vizDir, "index.html");
  if (!existsSync(indexPath)) return true;
  const v = grabMeta(readFileSync(indexPath, "utf8"), "viz:listed").toLowerCase();
  return v !== "false" && v !== "unlisted";
}

function renderLanding(
  vizzes: { slug: string; title: string; description: string; tags: string[]; kind: "explanatory" | "operational"; private: boolean }[],
  pageTitle: string,
): string {
  // A private card shows MINIMAL info — real title + a lock marker, no description —
  // so the index can list everything without leaking a sealed viz's blurb. The link
  // still points at ./slug/, which lands on the StatiCrypt gate (the index never
  // carries the key); access needs the separately-shared magic link.
  const cards = vizzes
    .map((v) =>
      v.private
        ? `      <a class="card card--private" href="./${escHtml(v.slug)}/">\n` +
          `        <div class="tag">&#128274; Private</div>\n` +
          `        <h2>${escHtml(v.title)}</h2>\n` +
          `        <div class="go go--locked">Link required</div>\n      </a>`
        : `      <a class="card" href="./${escHtml(v.slug)}/">\n` +
          (v.kind === "operational" || v.tags.length
            ? `        <div class="tags">\n` +
              (v.kind === "operational" ? `          <span class="tag tag--op">&#9889; Operational</span>\n` : "") +
              v.tags.map((t) => `          <span class="tag">${escHtml(t)}</span>\n`).join("") +
              `        </div>\n`
            : "") +
          `        <h2>${escHtml(v.title)}</h2>\n` +
          (v.description ? `        <p>${escHtml(v.description)}</p>\n` : "") +
          `        <div class="go">Open</div>\n      </a>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(pageTitle)}</title>
<!-- generated by /viz build.ts — regenerated on each publish; edit the vizzes, not this file -->
<style>
  :root{--bg:#0d1117;--panel:#161b22;--border:#30363d;--text:#e6edf3;--muted:#8b949e;
    --accent:#58a6ff;--c4:#bc8cff;--sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;}
  *{box-sizing:border-box}html,body{margin:0;height:100%}
  body{background:var(--bg);color:var(--text);font-family:var(--sans);line-height:1.5;
    display:flex;flex-direction:column;align-items:center;padding:48px 22px 64px}
  .wrap{width:100%;max-width:860px}
  .eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin:0 0 24px}
  .grid{display:grid;gap:16px}
  a.card{display:block;text-decoration:none;color:inherit;background:var(--panel);
    border:1px solid var(--border);border-radius:14px;padding:20px 22px;transition:.16s}
  a.card:hover{border-color:var(--accent);background:#11203a;transform:translateY(-1px)}
  .card .tags{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}
  .card .tag{font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--c4)}
  .card .tag--op{color:#f0883e;font-weight:600}
  .card h2{font-size:19px;margin:7px 0 8px;letter-spacing:-0.01em}
  .card p{margin:0 0 12px;color:#cdd6e0;font-size:14px}
  .card .go{font-size:13.5px;color:var(--accent);font-weight:600}
  .card .go::after{content:" →"}
  .card--private .tag{color:var(--muted)}
  .card--private:hover{border-color:var(--muted)}
  .card .go--locked{color:var(--muted);font-weight:500}
  .card .go--locked::after{content:""}
</style>
</head>
<body>
  <div class="wrap">
    <div class="eyebrow">visualizations</div>
    <div class="grid">
${cards}
    </div>
  </div>
</body>
</html>
`;
}

type Card = { slug: string; title: string; description: string; tags: string[]; kind: "explanatory" | "operational"; private: boolean };

// Build a card from a viz's SOURCE index.html (not the built/sealed artifact).
function cardFor(slug: string, sourceDir: string, isPrivate: boolean): Card {
  const html = readFileSync(path.join(sourceDir, "index.html"), "utf8");
  return { slug, ...vizCardMeta(html), private: isPrivate };
}

async function writeLandingIndex(outRoot: string, cards: Card[], pageTitle: string): Promise<void> {
  const sorted = [...cards].sort((a, b) => a.slug.localeCompare(b.slug));
  await Bun.write(path.join(outRoot, "index.html"), renderLanding(sorted, pageTitle));
}

// ============================================================================
// Mirrors (ADR 0006) — one source viz published into other containers
// ============================================================================
//
// A <container>/mirrors.json declares where that container's NATIVE vizzes are
// mirrored. `path` points at the SINK's SOURCE container; each mirrored viz lands
// there as a self-describing unit (index.html + a .mirror.json sidecar), so any
// container's index composes from local presence — native dirs card-from-head,
// sidecar'd dirs card-from-sidecar — with no "who pushes into me" discovery.
//
//   access   REQUIRED per (viz × mirror): "public" | "private". The ONE field that
//            never inherits — posture across a mirror is a trust boundary, re-decided
//            consciously (a missing/invalid access is a hard error, like an undeclared
//            viz:posture). Everything else inherits the source viz's viz:* meta.

export type MirrorOverrides = { title?: string; description?: string; tags?: string[] };
export type MirrorVizEntry = { slug: string; access: "public" | "private"; listed?: boolean; overrides?: MirrorOverrides };
export type MirrorTarget = { path: string; vizzes: MirrorVizEntry[] };

// The sidecar's card is a landing Card minus the slug (the dir name IS the slug).
type SidecarCard = { title: string; description: string; tags: string[]; kind: "explanatory" | "operational"; listed: boolean; private: boolean };
type Sidecar = { origin: string; card: SidecarCard };

// Read + validate a child dir's .mirror.json. A dir carrying one is a mirrored-in
// artifact (terminal — never re-mirrored, never rebuilt). Returns null if absent/bad.
function readSidecar(dir: string): Sidecar | null {
  const p = path.join(dir, MIRROR_SIDECAR);
  if (!existsSync(p)) return null;
  try {
    const j = JSON.parse(readFileSync(p, "utf8"));
    if (j && typeof j.origin === "string" && j.card && typeof j.card === "object") return j as Sidecar;
  } catch {
    /* fall through */
  }
  return null;
}

// Read + FAIL-CLOSED validate <container>/mirrors.json. Returns [] if no file.
// Collects ALL problems and refuses (non-zero, naming offenders) BEFORE anything is
// written — mirroring the undeclared-posture refusal. `nativeSlugs` is the set of
// the container's own native vizzes; a mirror entry may only name one of those (you
// mirror only what you own).
// A mirrors.json maps to sibling-repo filesystem PATHS — it's local-only by policy
// (committing it exposes where other repos live). Self-heal: ensure the enclosing
// git repo ignores it so it can never be committed. Idempotent; no-op outside a repo.
function ensureMirrorsIgnored(mirrorsFile: string): void {
  const abs = path.resolve(mirrorsFile);
  let dir = path.dirname(abs);
  let repoRoot = "";
  for (;;) {
    if (existsSync(path.join(dir, ".git"))) { repoRoot = dir; break; }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  if (!repoRoot) return; // not inside a git repo — nothing to ignore
  const rel = path.relative(repoRoot, abs).split(path.sep).join("/");
  const giPath = path.join(repoRoot, ".gitignore");
  const existing = existsSync(giPath) ? readFileSync(giPath, "utf8") : "";
  const lines = existing.split("\n").map((l) => l.trim());
  if (lines.includes(rel) || lines.includes("mirrors.json") || lines.includes("**/mirrors.json")) return;
  const sep = existing && !existing.endsWith("\n") ? "\n" : "";
  writeFileSync(giPath, existing + sep + "\n# viz mirror config: sibling-repo paths — local-only, never commit\n" + rel + "\n");
  console.error(`  ↳ gitignored ${rel} (local-only mirror config)`);
}

// Pure fail-closed validation of an already-parsed mirrors.json `raw`. Collects ALL
// problems; returns them alongside the cleaned targets so a caller can refuse BEFORE
// writing (manage.ts validates a candidate in memory; readMirrors dies on a bad file).
export function validateMirrors(raw: any, container: string, nativeSlugs: Set<string>): { targets: MirrorTarget[]; errors: string[] } {
  const errors: string[] = [];
  const targets: MirrorTarget[] = [];
  if (!raw || !Array.isArray(raw.mirrors)) {
    return { targets, errors: ['must be an object with a "mirrors" array'] };
  }
  raw.mirrors.forEach((m: any, mi: number) => {
    const where = `mirrors[${mi}]`;
    if (!m || typeof m.path !== "string" || !m.path.trim()) {
      errors.push(`${where}: missing/invalid "path" (must be a non-empty string)`);
      return;
    }
    if (!Array.isArray(m.vizzes)) {
      errors.push(`${where} (path="${m.path}"): missing "vizzes" array`);
      return;
    }
    const vizzes: MirrorVizEntry[] = [];
    m.vizzes.forEach((v: any, vi: number) => {
      const vw = `${where}.vizzes[${vi}]`;
      if (!v || typeof v.slug !== "string") {
        errors.push(`${vw}: missing "slug" (string)`);
        return;
      }
      if (!nativeSlugs.has(v.slug)) {
        errors.push(`${vw}: "${v.slug}" is not a native viz in ${container} — you mirror only what you own`);
        return;
      }
      if (v.access !== "public" && v.access !== "private") {
        errors.push(
          `${vw} ("${v.slug}"): "access" is REQUIRED and must be "public" or "private" — ` +
            `posture is re-decided per mirror (trust boundary), never inherited`,
        );
        return;
      }
      const entry: MirrorVizEntry = { slug: v.slug, access: v.access };
      if (v.listed !== undefined) {
        if (typeof v.listed !== "boolean") {
          errors.push(`${vw} ("${v.slug}"): "listed" must be a boolean`);
          return;
        }
        entry.listed = v.listed;
      }
      if (v.overrides !== undefined) {
        const o = v.overrides;
        if (!o || typeof o !== "object" || Array.isArray(o)) {
          errors.push(`${vw} ("${v.slug}"): "overrides" must be an object`);
          return;
        }
        const ov: MirrorOverrides = {};
        if (o.title !== undefined) {
          if (typeof o.title !== "string") { errors.push(`${vw}: overrides.title must be a string`); return; }
          ov.title = o.title;
        }
        if (o.description !== undefined) {
          if (typeof o.description !== "string") { errors.push(`${vw}: overrides.description must be a string`); return; }
          ov.description = o.description;
        }
        if (o.tags !== undefined) {
          if (!Array.isArray(o.tags) || o.tags.some((t: any) => typeof t !== "string")) {
            errors.push(`${vw}: overrides.tags must be an array of strings`);
            return;
          }
          ov.tags = o.tags;
        }
        entry.overrides = ov;
      }
      vizzes.push(entry);
    });
    targets.push({ path: m.path, vizzes });
  });

  return { targets, errors };
}

function readMirrors(container: string, nativeSlugs: Set<string>): MirrorTarget[] {
  const file = path.join(container, "mirrors.json");
  if (!existsSync(file)) return [];
  ensureMirrorsIgnored(file);
  let raw: any;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    die(`ERROR: ${file} is not valid JSON: ${(e as Error).message}`, 2);
  }
  const { targets, errors } = validateMirrors(raw, container, nativeSlugs);
  if (errors.length) {
    die(`ERROR: invalid ${file} — NOTHING was written:\n  - ${errors.join("\n  - ")}`, 2);
  }
  return targets;
}

// Resolve a (viz × mirror) card: access decides `private`; everything else inherits
// the source viz's viz:* meta unless an override is present.
function resolveMirrorCard(vizDir: string, entry: MirrorVizEntry): SidecarCard {
  const base = vizCardMeta(readFileSync(path.join(vizDir, "index.html"), "utf8"));
  const o = entry.overrides ?? {};
  return {
    title: o.title ?? base.title,
    description: o.description ?? base.description,
    tags: o.tags ?? base.tags,
    kind: base.kind,
    listed: entry.listed ?? readListed(vizDir),
    private: entry.access === "private",
  };
}

// The ONE writer-agnostic composition rule (ADR 0006), run over a SOURCE container:
// a native child dir is carded from its (plaintext) <head>; a child dir carrying a
// .mirror.json is carded from that sidecar (load-bearing — a sealed mirror's head is
// encrypted). Both filtered by `listed`. LENIENT about natives that are
// undeclared/local/unlisted (skips them) so a foreign push never fails on a sink's
// own posture hygiene — refuse-on-undeclared is enforced only by a container's own
// publish over its own natives.
function composeCards(sourceContainer: string): { cards: Card[]; unlisted: number } {
  const cards: Card[] = [];
  let unlisted = 0;
  for (const dir of vizzesIn(sourceContainer)) {
    const slug = path.basename(dir);
    const side = readSidecar(dir);
    if (side) {
      if (!side.card.listed) { unlisted++; continue; }
      const { title, description, tags, kind, private: isPriv } = side.card;
      cards.push({ slug, title, description, tags, kind, private: isPriv });
    } else {
      const posture = readPosture(dir);
      if (!posture || posture === "local") continue;
      if (!readListed(dir)) { unlisted++; continue; }
      cards.push(cardFor(slug, dir, posture === "private"));
    }
  }
  return { cards, unlisted };
}

// Push a container's native vizzes into each declared mirror target: write the
// self-describing units (artifact + sidecar), origin-scoped-prune our stale ones,
// then regenerate the sink's index from local presence. Build-and-STOP boundary is
// unchanged — this writes finished files into the mirror paths and does not deploy.
async function pushMirrors(container: string, mirrors: MirrorTarget[], shareHost: string): Promise<void> {
  const originPath = idFor(container) ?? container;
  // origin is an OWNERSHIP TAG for prune-matching only — mirrored-in artifacts are
  // terminal (copied verbatim, never rebuilt from here), so the sink never needs the
  // real source path. Hash it so the committed .mirror.json carries a stable id, not
  // a revealing filesystem path. Writer + pruner both use originId, so matching holds.
  const originId = "src-" + createHash("sha256").update(originPath).digest("hex").slice(0, 12);
  for (const mt of mirrors) {
    const mirrorPath = path.resolve(container, mt.path);
    mkdirSync(mirrorPath, { recursive: true });
    console.log(`\nMirror → ${mirrorPath}\n  origin: ${originPath}`);

    const kept = new Set<string>();
    for (const entry of mt.vizzes) {
      const vizDir = path.join(container, entry.slug);
      const card = resolveMirrorCard(vizDir, entry);
      const r = await publishOne(vizDir, mirrorPath, card.private, shareHost, {
        overrides: { title: card.title, description: card.description, tags: card.tags },
        sidecar: { origin: originId, card },
      });
      // Only a successfully-written unit is "kept" — a failed push must NOT spare a
      // stale/partial dir of the same slug from the origin-scoped prune below.
      if (r.ok) kept.add(entry.slug);
      const status = r.ok ? (card.private ? "private (sealed)" : "public") : "FAILED — not written";
      console.log(`  • ${r.slug} — ${status}${r.ok && !card.listed ? ", unlisted" : ""}`);
      for (const w of r.warnings) console.log(`      ⚠️  ${w}`);
      if (r.link) console.log(`      🔗 ${r.link}`);
    }

    // Origin-scoped prune: drop ONLY our stale mirrored dirs (origin == us, no longer
    // listed). Never touch the sink's natives or another origin's mirrored-in dirs.
    let pruned = 0;
    for (const dir of vizzesIn(mirrorPath)) {
      const side = readSidecar(dir);
      if (side && side.origin === originId && !kept.has(path.basename(dir))) {
        rmSync(dir, { recursive: true, force: true });
        pruned++;
        console.log(`  ✂️  pruned ${path.basename(dir)} (dropped from manifest)`);
      }
    }

    // Regenerate the sink's index from local presence (same rule any writer applies).
    const { cards } = composeCards(mirrorPath);
    await writeLandingIndex(mirrorPath, cards, "Visualizations");
    console.log(`  index → ${path.join(mirrorPath, "index.html")}  (${cards.length} listed${pruned ? `, ${pruned} pruned` : ""})`);
  }
}

// ---- Build one container's publishable tree (shared by `publish` and `preview`) ----
// Builds NATIVE vizzes (per their viz:posture), copies MIRRORED-IN artifacts verbatim,
// and regenerates the landing index — into `outRoot`. This is the build-and-STOP core:
// it writes ONLY inside outRoot. It does NOT push mirrors (an OUTBOUND write into other
// containers) and does NOT deploy — those are layered on top by `publish` alone, so
// `preview` can reuse this to produce an identical tree with zero outside side effects.
async function buildPublishableTree(
  container: string,
  outRoot: string,
  shareHost: string,
  opts: { noIndex?: boolean; indexTitle?: string } = {},
): Promise<{ built: number; anyPrivate: boolean; mirroredIn: number; empty: boolean }> {
  const children = vizzesIn(container);
  const mirroredInDirs = children.filter((d) => existsSync(path.join(d, MIRROR_SIDECAR)));
  const natives = children.filter((d) => !existsSync(path.join(d, MIRROR_SIDECAR)));

  // Resolve each native's posture — public/private build, local is skipped, undeclared
  // refuses the whole run (nothing is published, nor withheld, on a guess).
  const resolved: { vizDir: string; slug: string; private: boolean; listed: boolean }[] = [];
  const undeclared: string[] = [];
  const skippedLocal: string[] = [];
  for (const vizDir of natives) {
    const posture = readPosture(vizDir);
    if (posture === "local") skippedLocal.push(path.basename(vizDir));
    else if (!posture) undeclared.push(path.basename(vizDir));
    else resolved.push({ vizDir, slug: path.basename(vizDir), private: posture === "private", listed: readListed(vizDir) });
  }
  if (undeclared.length) {
    die(
      `ERROR: no posture declared for: ${undeclared.join(", ")}\n` +
        `Add <meta name="viz:posture" content="public"> (or "private", or "local" to keep it\n` +
        `off the host) to each viz's index.html. There is no default — nothing is published,\n` +
        `nor withheld, on a guess.`,
      2,
    );
  }
  if (skippedLocal.length) {
    console.log(`Skipping ${skippedLocal.length} local viz(es) — viz:posture=local, never published: ${skippedLocal.join(", ")}`);
  }
  if (resolved.length === 0 && mirroredInDirs.length === 0) {
    return { built: 0, anyPrivate: false, mirroredIn: 0, empty: true };
  }

  mkdirSync(outRoot, { recursive: true });
  if (resolved.length) {
    const split = resolved.map((t) => `${t.slug} → ${t.private ? "PRIVATE" : "PUBLIC"}${t.listed ? "" : " (unlisted)"}`).join("   ·   ");
    console.log(`Building ${resolved.length} viz(es) → ${outRoot}`);
    console.log(`Postures:  ${split}\n`);
  }

  let anyPrivate = false;
  for (const t of resolved) {
    const r = await publishOne(t.vizDir, outRoot, t.private, shareHost);
    console.log(`• ${r.slug} — ${t.private ? "private (sealed)" : "public"}${t.listed ? "" : ", unlisted (hidden from index)"}`);
    for (const w of r.warnings) console.log(`    ⚠️  ${w}`);
    if (r.link) console.log(`    🔗 ${r.link}`);
    if (t.private) anyPrivate = true;
  }

  // Mirrored-in artifacts: copy verbatim (never rebuild a possibly-sealed file); the
  // index composes their card from the sidecar (the only local card-truth when sealed).
  for (const dir of mirroredInDirs) {
    const slug = path.basename(dir);
    const dest = path.join(outRoot, slug);
    mkdirSync(dest, { recursive: true });
    cpSync(path.join(dir, "index.html"), path.join(dest, "index.html"));
    cpSync(path.join(dir, MIRROR_SIDECAR), path.join(dest, MIRROR_SIDECAR));
    const side = readSidecar(dir);
    if (side) {
      console.log(`• ${slug} — mirrored-in (copied verbatim, origin ${side.origin})`);
    } else {
      console.log(`• ${slug} — mirrored-in (copied verbatim)`);
      console.log(`    ⚠️  ${MIRROR_SIDECAR} is malformed — this viz will be MISSING from the landing index`);
    }
  }

  // Landing index — one writer-agnostic rule (ADR 0006): native dirs card-from-source-
  // head, mirrored-in dirs card-from-sidecar; both filtered by `listed`.
  if (!opts.noIndex) {
    const { cards, unlisted } = composeCards(container);
    await writeLandingIndex(outRoot, cards, opts.indexTitle ?? "Visualizations");
    const pub = cards.filter((c) => !c.private).length;
    const prv = cards.length - pub;
    const mi = cards.filter((c) => existsSync(path.join(container, c.slug, MIRROR_SIDECAR))).length;
    const hidden = unlisted ? `; ${unlisted} unlisted (built, hidden from index)` : "";
    console.log(
      `\nLanding index → ${path.join(outRoot, "index.html")}  ` +
        `(${cards.length} listed: ${pub} public, ${prv} private${mi ? `, ${mi} mirrored-in` : ""}${hidden})`,
    );
  }

  return { built: resolved.length, anyPrivate, mirroredIn: mirroredInDirs.length, empty: false };
}

// ---- Preview: a dumb local static server over a built tree (no deps, Bun.file sets
// content-types just like server.ts). Binds 127.0.0.1; port 0 ⇒ OS picks a free one. ----
function serveStatic(root: string, requestedPort: number | undefined) {
  return Bun.serve({
    hostname: "127.0.0.1",
    port: requestedPort ?? 0,
    async fetch(req) {
      const url = new URL(req.url);
      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith("/")) rel += "index.html";
      const filePath = path.normalize(path.join(root, rel));
      if (filePath !== root && !filePath.startsWith(root + path.sep)) {
        return new Response("forbidden", { status: 403 }); // refuse path escape
      }
      const file = Bun.file(filePath);
      return (await file.exists()) ? new Response(file) : new Response("not found", { status: 404 });
    },
  });
}

// Open a URL in the OS default browser (best-effort; never throws into the caller).
function openInBrowser(url: string): void {
  const cmd = process.platform === "darwin" ? ["open", url]
    : process.platform === "win32" ? ["cmd", "/c", "start", "", url]
    : ["xdg-open", url];
  try {
    Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" });
  } catch {
    /* opening is a nicety; the printed URL is the source of truth */
  }
}

// ---- Dispatch ----
// Guarded so other tools (manage.ts) can `import` the helpers above without
// triggering the CLI. Runs only when build.ts is the invoked entrypoint.
if (import.meta.main) {
const cmd = positional[0];

if (cmd === "rotate") {
  const vizDir = positional[1];
  if (!vizDir) die("usage: bun build.ts rotate <vizDir>", 2);
  const id = idFor(path.resolve(vizDir));
  if (!id) die("ERROR: viz must live under your home directory to be keyed.");
  const key = await rotate(id);
  console.log(`Rotated '${id}' to version ${key.version}.`);
  console.log(`The previous magic link is now DEAD. Re-publish to mint the new one.`);
  process.exit(0);
}

if (cmd === "preview") {
  // `preview <container>` — build the publishable tree to a THROWAWAY temp dir and serve
  // it locally, so you can see EXACTLY what would publish, right now, on your machine.
  // Side-effect-free: never pushes mirrors into other containers, never deploys.
  const container = path.resolve(positional[1] ?? "");
  if (!positional[1] || !existsSync(container)) {
    die("usage: bun build.ts preview <container> [--port <n>] [--open]", 2);
  }
  if (port !== undefined && (!Number.isInteger(port) || port < 0 || port > 65535)) {
    die(`ERROR: --port must be an integer 0–65535 (got "${port}"). Omit it to let the OS pick a free port.`, 2);
  }
  const previewRoot = path.join(os.tmpdir(), "viz-preview", (idFor(container) ?? "site").replace(/[\\/]/g, "_"));
  rmSync(previewRoot, { recursive: true, force: true });
  // The preview's own origin isn't known until the server is up, so private vizzes seal
  // with the placeholder host — their StatiCrypt gate still renders (preview shows the lock).
  const summary = await buildPublishableTree(container, previewRoot, baseUrl ?? PLACEHOLDER_HOST, { noIndex, indexTitle });
  if (summary.empty) {
    console.log("Nothing to preview — every viz in scope is local (or none were found).");
    process.exit(0);
  }
  const server = serveStatic(previewRoot, port);
  const url = `http://127.0.0.1:${server.port}/`;
  console.log(`\n👀 Preview — this is exactly what would publish, served locally:\n\n    ${url}\n`);
  console.log(`Built from: ${container}`);
  console.log(`Temp tree:  ${previewRoot}`);
  console.log(`(throwaway build — nothing committed, no mirrors pushed, NOT deployed)`);
  if (open) {
    openInBrowser(url);
    console.log(`\nOpened in your default browser. Ctrl-C to stop the server.`);
  } else {
    console.log(`\nOpen the URL above (or re-run with --open). Ctrl-C to stop the server.`);
  }
  // Bun.serve keeps the process alive — intentionally no exit, no fall-through.
} else if (cmd === "export") {
  // `export <vizDir>` — build ONE viz (a dev/test primitive); no landing index, no mirrors.
  const vizDir = path.resolve(positional[1] ?? "");
  if (!positional[1] || !existsSync(path.join(vizDir, "index.html"))) {
    die("usage: bun build.ts export <vizDir>   (vizDir must contain index.html)", 2);
  }
  const posture = readPosture(vizDir);
  if (!posture) {
    die(`ERROR: no viz:posture declared for ${path.basename(vizDir)} — add <meta name="viz:posture" content="public"> (or "private"/"local").`, 2);
  }
  if (posture === "local") {
    console.log(`Skipping ${path.basename(vizDir)} — viz:posture=local, never published.`);
    process.exit(0);
  }
  const outRoot = path.resolve(out ?? path.join(process.cwd(), ".viz-dist"));
  mkdirSync(outRoot, { recursive: true });
  const shareHost = baseUrl ?? PLACEHOLDER_HOST;
  const r = await publishOne(vizDir, outRoot, posture === "private", shareHost);
  console.log(`• ${r.slug} — ${posture === "private" ? "private (sealed)" : "public"}`);
  for (const w of r.warnings) console.log(`    ⚠️  ${w}`);
  if (r.link) console.log(`    🔗 ${r.link}`);
  console.log(`\nBuilt to: ${outRoot}`);
  console.log(`\nNOT DEPLOYED. This only built one local artifact.`);
} else {
  // `<container>` — orchestrate the whole container: build the publishable tree, then
  // push mirrors (the only OUTBOUND write) and print the deploy reminder.
  const container = path.resolve(cmd ?? "");
  if (!cmd || !existsSync(container)) {
    die(
      "usage: bun build.ts <container> [--out <dir>] [--base-url <url>] [--no-index] [--index-title <t>]\n" +
        "   or: bun build.ts preview <container> [--port <n>] [--open]\n" +
        "   or: bun build.ts export <vizDir>\n" +
        "   or: bun build.ts rotate <vizDir>",
      2,
    );
  }
  const outRoot = path.resolve(out ?? path.join(process.cwd(), ".viz-dist"));
  const shareHost = baseUrl ?? PLACEHOLDER_HOST;

  // Validate mirrors.json NOW — fail-closed (naming offenders) BEFORE any artifact is
  // written, exactly like the undeclared-posture refusal inside buildPublishableTree.
  const children = vizzesIn(container);
  if (children.length === 0) die(`ERROR: no vizzes (child dirs with index.html) in ${container}`);
  const nativeSlugs = new Set(children.filter((d) => !existsSync(path.join(d, MIRROR_SIDECAR))).map((d) => path.basename(d)));
  const mirrors = readMirrors(container, nativeSlugs);

  const summary = await buildPublishableTree(container, outRoot, shareHost, { noIndex, indexTitle });
  if (summary.empty && mirrors.length === 0) {
    console.log("Nothing to publish — every viz in scope is local (or none were found).");
    process.exit(0);
  }

  if (mirrors.length) await pushMirrors(container, mirrors, shareHost);

  console.log(`\nBuilt to: ${outRoot}`);
  if (summary.anyPrivate) {
    if (baseUrl) {
      console.log(`Magic links use base ${shareHost} — share them with the people you want to have access.`);
    } else {
      console.log(
        `NOTE: magic links use the placeholder host ${PLACEHOLDER_HOST}. The #staticrypt_pwd hash is\n` +
          `host-independent, so swap in your real Pages host (or re-run with --base-url <url>).`,
      );
    }
  }
  console.log(
    `\nNOT DEPLOYED. This only built local artifacts. Review them, then deploy as a separate,\n` +
      `explicit step (force-push the sealed set to the Pages branch) once you've confirmed.`,
  );
}
} // end import.meta.main

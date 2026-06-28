#!/usr/bin/env bun
// Mint a new viz slug, ensure the server is running, and print + open the URL.
//
// Two modes:
//   central (default)  -> CENTRAL/<slug>/, committed to the central viz git repo
//   local  (--local)   -> <repo-or-dir>/viz-pages/<slug>/, registered for discovery,
//                         committed by YOU in the host repo (we don't touch git)
//
// Cross-platform (macOS / Linux / Windows): pure Bun, no shell utilities beyond git.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { CENTRAL, HOME, addContainer, idFor } from "./discovery.ts";

const VIZ_ROOT = CENTRAL;
const PORT = 5180;
const SERVER_TS = path.join(import.meta.dir, "server.ts");
const PID_FILE = path.join(VIZ_ROOT, ".server.pid");
const LOG_FILE = path.join(VIZ_ROOT, ".server.log");
const HEALTH_URL = `http://127.0.0.1:${PORT}/_health`;

function die(msg: string, code = 1): never {
  console.error(msg);
  process.exit(code);
}

// ---- Argument parsing ----
// usage: bootstrap.ts <slug> [--local [dir]] [--global]
// `--local` consumes the next arg as a target dir only if it looks like a path
// (so `/viz --local my-chart` reads my-chart as the slug, not the dir).
function looksLikePath(s: string): boolean {
  return s === "." || s.startsWith("~") || s.startsWith("/") || s.startsWith(".") || s.includes("/");
}

let slug: string | undefined;
let local = false;
let localDir: string | undefined;
let global = false;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--global" || a === "--central") global = true;
  else if (a === "--local") {
    local = true;
    const next = args[i + 1];
    if (next && looksLikePath(next)) {
      localDir = next;
      i++;
    }
  } else if (a.startsWith("--local=")) {
    local = true;
    localDir = a.slice("--local=".length);
  } else if (!a.startsWith("-") && !slug) {
    slug = a;
  }
}

if (!slug) die("usage: bootstrap.ts <slug> [--local [dir]] [--global]", 2);
if (global) local = false;

// ---- Helpers ----
function expandHome(p: string): string {
  if (p === "~") return HOME;
  if (p.startsWith("~/")) return path.join(HOME, p.slice(2));
  return p;
}

async function gitOut(args: string[], cwd: string): Promise<string | null> {
  try {
    const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "ignore" });
    const out = (await new Response(proc.stdout).text()).trim();
    return (await proc.exited) === 0 ? out : null;
  } catch {
    return null;
  }
}

async function gitCentral(args: string[]): Promise<void> {
  try {
    const proc = Bun.spawn(["git", ...args], {
      cwd: VIZ_ROOT,
      stdout: "ignore",
      stderr: "ignore",
    });
    await proc.exited;
  } catch {
    die("ERROR: git not found on PATH. Install git and retry.");
  }
}

function detectSessionId(): string {
  const envId = process.env.CLAUDE_CODE_SESSION_ID;
  if (envId) return envId;
  const projSlug = process.cwd().replace(/[/\\:]/g, "-");
  const projDir = path.join(HOME, ".claude", "projects", projSlug);
  try {
    if (existsSync(projDir)) {
      const latest = readdirSync(projDir)
        .filter((f) => f.endsWith(".jsonl"))
        .map((f) => ({ f, m: statSync(path.join(projDir, f)).mtimeMs }))
        .sort((a, b) => b.m - a.m)[0];
      if (latest) return path.basename(latest.f, ".jsonl");
    }
  } catch {
    // best-effort — fall through to timestamp
  }
  return "ts-" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

async function probePort(): Promise<"ours" | "foreign" | "free"> {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(500) });
    return res.ok && (await res.text()) === "OK" ? "ours" : "foreign";
  } catch {
    return "free";
  }
}

// Tell the running server to rebuild its slug map so this new viz routes right
// away (a cheap map refresh, not a full deep scan of $HOME).
async function pingRefresh(): Promise<void> {
  try {
    await fetch(`http://127.0.0.1:${PORT}/_refresh`, { signal: AbortSignal.timeout(1500) });
  } catch {
    // best-effort — the next scan/restart will pick it up anyway
  }
}

// Vendor a verbatim copy of the serve runtime into <container>/.runtime/ so the
// host repo runs standalone with no skill installed. The server self
// -detects standalone mode from this location. cpSync overwrites, so every
// --local run re-stamps from the skill's canonical copy. The dot-prefix keeps the
// central server's discovery from ever mistaking .runtime/ for a viz.
function vendorRuntime(skillDir: string, runtimeDir: string): void {
  mkdirSync(runtimeDir, { recursive: true });
  for (const f of ["server.ts", "discovery.ts", "recordings.ts", "tape-key.js"]) {
    cpSync(path.join(skillDir, f), path.join(runtimeDir, f));
  }
  cpSync(path.join(skillDir, "kit"), path.join(runtimeDir, "kit"), { recursive: true });
}

// Keep `comments.json` (transient review scratch) out of git in every viz
// container — central and repo-local alike. Idempotent: appends the line only if
// absent. A .gitignore takes effect on disk whether or not it's itself committed.
function ensureCommentsIgnored(dir: string): void {
  const gi = path.join(dir, ".gitignore");
  const lines = existsSync(gi) ? readFileSync(gi, "utf8").split("\n").map((l) => l.trim()) : [];
  if (lines.includes("comments.json")) return;
  const prev = existsSync(gi) ? readFileSync(gi, "utf8") : "";
  writeFileSync(gi, (prev && !prev.endsWith("\n") ? prev + "\n" : prev) + "comments.json\n");
}

function openBrowser(url: string): void {
  try {
    let cmd: string[];
    if (process.platform === "darwin") cmd = ["open", url];
    else if (process.platform === "win32") cmd = ["cmd", "/c", "start", "", url];
    else cmd = ["xdg-open", url];
    Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore", windowsHide: true }).unref();
  } catch {
    // best-effort — never fatal if no browser opener exists
  }
}

// Minimal starter page dropped into a fresh slug dir. It renders immediately (so the
// URL isn't a 404 before you write anything) and — crucially — declares
// viz:posture=local, the safe default: a brand-new viz NEVER publishes until you
// consciously flip it to public/private. Build the viz by EDITING this file; keep the
// viz:posture line (change it only when you mean to share — see SKILL.md Step 4).
function starterHtml(slug: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${slug}</title>
<!-- Publish posture — the SOLE source of truth for build.ts. Default "local" = stays
     on this machine, never published. Change to "public" (open web) or "private"
     (magic-link sealed) ONLY when you intend to share this viz. -->
<meta name="viz:posture" content="local">
<meta name="viz:listed" content="unlisted">
<!-- Kind — what sort of viz this is. "explanatory" (default) = a timeless diagram/illustration;
     freezing it loses nothing. "operational" = a live-monitoring tool whose truth has a shelf
     life (queues, run status, live metrics); a frozen copy is an illustration, NOT current state.
     The only effect: an "operational" viz shows a louder banner when viewed frozen, and an
     "Operational" badge on the published index. Set it to "operational" by hand when it fits. -->
<meta name="viz:kind" content="explanatory">
<meta name="viz:title" content="${slug}">
<meta name="viz:description" content="">
<!-- Safe defaults on BOTH axes: local = never published; unlisted = off the index even once
     published (still reachable by direct URL). When you publish, set posture to public/private,
     and set listed to "listed" to advertise it on the public index. -->
<link rel="stylesheet" href="/_kit/viz-kit.css">
</head>
<body>
  <div class="viz-header">
    <h1>${slug}</h1>
    <div class="sub">Scaffolded by /viz — replace this with your visualization.</div>
  </div>
</body>
</html>
`;
}

// ---- Resolve where this viz lives ----
let container: string;
let hostRepoRoot: string | null = null; // for the local git-add hint

if (local) {
  let base: string;
  if (localDir) {
    base = path.resolve(expandHome(localDir));
    if (!existsSync(base)) die(`ERROR: --local dir does not exist: ${base}`);
    hostRepoRoot = await gitOut(["rev-parse", "--show-toplevel"], base);
  } else {
    const top = await gitOut(["rev-parse", "--show-toplevel"], process.cwd());
    if (!top) {
      die(
        "ERROR: --local with no dir must be run inside a git repo.\n" +
          "Pass a target dir (`--local <dir>`), or drop --local for a central viz.",
      );
    }
    base = top;
    hostRepoRoot = top;
  }
  container = path.join(base, "viz-pages");
} else {
  container = VIZ_ROOT;
}

const slugDir = path.join(container, slug);
const id = idFor(slugDir);
if (!id) {
  die(
    `ERROR: a viz must live under your home directory (${HOME}).\n` +
      `Target was: ${slugDir}`,
  );
}
const url = `http://127.0.0.1:${PORT}/${id}/`;

// ---- Initialize the central viz repo on first ever run (always — registry lives here) ----
mkdirSync(VIZ_ROOT, { recursive: true });
if (!existsSync(path.join(VIZ_ROOT, ".git"))) {
  await gitCentral(["init", "-q", "-b", "main"]);
  await gitCentral(["commit", "-q", "--allow-empty", "-m", "init viz repo"]);
}
ensureCommentsIgnored(VIZ_ROOT);

// ---- Ensure the server is running ----
const state = await probePort();
if (state === "foreign") {
  die(
    `ERROR: port ${PORT} is occupied by another process (it isn't the viz server).\n` +
      `Free that port and retry.`,
  );
}
if (state === "free") {
  const proc = Bun.spawn([process.execPath, SERVER_TS], {
    stdin: "ignore",
    stdout: Bun.file(LOG_FILE),
    stderr: Bun.file(LOG_FILE),
    windowsHide: true,
  });
  proc.unref();
  await Bun.write(PID_FILE, String(proc.pid));

  let up = false;
  for (let i = 0; i < 30; i++) {
    if ((await probePort()) === "ours") {
      up = true;
      break;
    }
    await Bun.sleep(100);
  }
  if (!up) die(`ERROR: server failed to start within 3s. See ${LOG_FILE}`);
}

// ---- Create the slug dir; fail loud if it already exists ----
if (existsSync(slugDir)) {
  die(
    `ERROR: viz '${id}' already exists at ${slugDir}\n` +
      `Pick a different name, or delete it to clobber.`,
  );
}
mkdirSync(slugDir, { recursive: true });
await Bun.write(path.join(slugDir, "index.html"), starterHtml(slug));

if (local) {
  // Vendor the runtime so the host repo runs standalone, then register the
  // container so it's discoverable without waiting for the next scan.
  const runtimeDir = path.join(container, ".runtime");
  vendorRuntime(import.meta.dir, runtimeDir);
  ensureCommentsIgnored(container);
  await addContainer(container);
  await pingRefresh();

  const runHint = hostRepoRoot
    ? `bun "${path.join(path.relative(hostRepoRoot, runtimeDir), "server.ts")}"  (run from ${hostRepoRoot})`
    : `bun "${path.join(runtimeDir, "server.ts")}"`;

  console.log(`URL:     ${url}`);
  console.log(`Dir:     ${slugDir}`);
  console.log(`Run:     ${runHint}  # standalone, no skill needed`);
  console.log(`Mode:    local (host repo owns the git history — we did NOT commit)`);
  if (hostRepoRoot) {
    const relViz = path.relative(hostRepoRoot, slugDir);
    const relRt = path.relative(hostRepoRoot, runtimeDir);
    console.log(`Commit:  cd "${hostRepoRoot}" && git add "${relViz}" "${relRt}"`);
  } else {
    console.log(`Commit:  this dir isn't inside a git repo — commit it (and .runtime/) wherever it belongs.`);
  }
} else {
  // Central viz: record the creation commit in the central repo, as before.
  const sessionId = detectSessionId();
  await gitCentral(["add", slug]);
  await gitCentral([
    "commit",
    "-q",
    "--allow-empty",
    "-m",
    `create viz: ${slug}\n\nSession: ${sessionId}`,
  ]);
  await pingRefresh();
  console.log(`URL:     ${url}`);
  console.log(`Dir:     ${slugDir}`);
  console.log(`Session: ${sessionId}`);
}

openBrowser(url);

#!/usr/bin/env bun
// On-demand render-to-disk check for a viz. Drives headless Chrome once, captures
// the console + uncaught errors + failed requests as TEXT, screenshots the page,
// and writes both to .verify/ — so an agent reads two files instead of running a
// live Chrome MCP session (console-as-text ≈ 0 vision tokens, one command not four
// round-trips). This is the verify gate, not a per-save hook: run it when you want
// to know "did it render, and did anything throw?".
//
//   bun verify.ts <url|id> [--wait=<sel|ms>] [--full] [--size=WxH] [--interactions=<file>]
//
//   <url|id>        full http URL, or a viz id/path → http://127.0.0.1:5180/<id>/
//   --wait          wait for a CSS selector, or a fixed ms, before the shot
//   --full          full-page screenshot (default: viewport only)
//   --size          viewport, e.g. 1440x900 (default 1280x800)
//   --interactions  override the interactions file path (see below)
//
// Per-viz interactions, by convention: if `<vizdir>/verify.interactions.ts` (or
// .js) exists, it's imported and its `export default async (page) => {...}` runs
// after load+wait, before the shot — to click/step/open things. It lives WITH the
// viz; this shared script is never edited. (<vizdir> is derived from the URL, since
// a viz's URL path IS its path under $HOME.) --interactions overrides the path for
// the odd case (e.g. a file:// target that has no viz dir).
//
// Outputs (overwritten each run, all under .verify/):
//   latest.png   screenshot          console.txt  console + uncaught errors + failed reqs
//   network.txt  full req+resp (hdrs+bodies)       dom.html  final DOM after interactions

import puppeteer from "puppeteer-core";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const PORT = 5180;

function chromePath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // macOS
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(
    "No Chrome found. Set PUPPETEER_EXECUTABLE_PATH to your Chrome/Chromium binary.",
  );
}

// ---- args ----
const args = process.argv.slice(2);
const flag = (name: string) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
const target = args.find((a) => !a.startsWith("--"));
if (!target) {
  console.error("usage: bun verify.ts <url|id> [--wait=<selector|ms>] [--full] [--size=WxH]");
  process.exit(2);
}
const url = target.includes("://")
  ? target
  : `http://127.0.0.1:${PORT}/${target.replace(/^\/+|\/+$/g, "")}/`;
const wait = flag("wait");
const interactions = flag("interactions");
const full = args.includes("--full");
const [vw, vh] = (flag("size") ?? "1280x800").split("x").map(Number);

const outDir = path.join(import.meta.dir, ".verify");
mkdirSync(outDir, { recursive: true });

// Resolve the interactions file: explicit --interactions wins; otherwise look for
// the conventional <vizdir>/verify.interactions.{ts,js}. The viz dir is homedir +
// the URL pathname, because a viz's URL path is exactly its path under $HOME. Only
// works for a localhost target; an external/file:// URL has no viz dir → none.
function resolveInteractions(): string | null {
  if (interactions) return path.resolve(interactions);
  const u = new URL(url);
  if (u.hostname !== "127.0.0.1" && u.hostname !== "localhost") return null;
  const vizDir = path.join(os.homedir(), decodeURIComponent(u.pathname));
  for (const f of ["verify.interactions.ts", "verify.interactions.js"]) {
    const p = path.join(vizDir, f);
    if (existsSync(p)) return p;
  }
  return null;
}
const interactionsFile = resolveInteractions();

// ---- capture buffers ----
const lines: string[] = [];
const errors: string[] = []; // uncaught exceptions + failed requests — the signal that matters
const network: string[] = []; // full request+response block per response
const bodyTasks: Promise<void>[] = []; // response.text() reads, awaited before close
let dom = "";
const stamp = () => new Date().toISOString().slice(11, 23);
const isNoise = (s: string) => s.includes("favicon.ico"); // every page 404s it; not a viz bug

const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: vw || 1280, height: vh || 800 });

  page.on("console", (msg) => {
    const loc = msg.location();
    const where = loc.url ? ` (${loc.url.split("/").pop()}:${loc.lineNumber ?? "?"})` : "";
    const entry = `[${stamp()}] ${msg.type()}: ${msg.text()}${where}`;
    lines.push(entry);
    if (msg.type() === "error" && !isNoise(entry)) errors.push(entry);
  });
  page.on("pageerror", (err) => {
    const entry = `[${stamp()}] UNCAUGHT: ${err.message}`;
    lines.push(entry);
    errors.push(entry);
  });
  page.on("requestfailed", (req) => {
    const entry = `[${stamp()}] REQUEST FAILED: ${req.url()} (${req.failure()?.errorText ?? "?"})`;
    lines.push(entry);
    if (!isNoise(req.url())) errors.push(entry);
  });
  page.on("response", (res) => {
    if (res.status() >= 400 && !isNoise(res.url())) {
      const entry = `[${stamp()}] HTTP ${res.status()}: ${res.url()}`;
      lines.push(entry);
      errors.push(entry);
    }
    // Full request+response block. Body only for text-ish content (dumping binary as
    // text is noise); awaited via bodyTasks so the page stays open until reads finish.
    bodyTasks.push(
      (async () => {
        const req = res.request();
        const ct = res.headers()["content-type"] ?? "";
        let respBody: string;
        if (/event-stream/i.test(ct)) {
          respBody = "[event-stream — not read (would never end)]"; // SSE: _reload, streaming api
        } else if (/json|text|javascript|xml|html|csv|svg|x-www-form-urlencoded/i.test(ct)) {
          try {
            // Hard timeout: a stalled/streaming body must never hang the whole run.
            const t = await Promise.race([
              res.text(),
              new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
            ]);
            respBody = t.length > 20000 ? t.slice(0, 20000) + `\n…[truncated, ${t.length} bytes total]` : t;
          } catch {
            respBody = "[body unavailable (redirect/cache/stream/timeout)]";
          }
        } else {
          respBody = `[non-text body: ${ct || "unknown type"}]`;
        }
        const hdrs = (h: Record<string, string>) =>
          Object.entries(h).map(([k, v]) => `    ${k}: ${v}`).join("\n") || "    (none)";
        network.push(
          `### ${res.status()} ${req.method()} ${res.url()}\n` +
            `  > request headers:\n${hdrs(req.headers())}\n` +
            `  > request body: ${req.postData() ?? "(none)"}\n` +
            `  < response headers:\n${hdrs(res.headers())}\n` +
            `  < response body:\n${respBody}`,
        );
      })().catch(() => {}),
    );
  });

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });
  } catch (e) {
    errors.push(`[${stamp()}] NAVIGATION FAILED: ${(e as Error).message}`);
  }

  if (wait) {
    if (/^\d+$/.test(wait)) await new Promise((r) => setTimeout(r, Number(wait)));
    else await page.waitForSelector(wait, { timeout: 10000 }).catch(() => errors.push(`[${stamp()}] WAIT SELECTOR NOT FOUND: ${wait}`));
  }
  await new Promise((r) => setTimeout(r, 400)); // settle: late console / animations

  if (interactionsFile) {
    try {
      const mod = await import(interactionsFile);
      const fn = mod.default ?? mod;
      if (typeof fn !== "function") throw new Error("must export a default function (page) => {...}");
      await fn(page);
    } catch (e) {
      errors.push(`[${stamp()}] INTERACTIONS FAILED (${interactionsFile}): ${(e as Error).message}`);
    }
  }

  dom = await page.content();
  await page.screenshot({ path: path.join(outDir, "latest.png"), fullPage: full });
  await Promise.allSettled(bodyTasks); // let response bodies finish reading before close
} finally {
  await browser.close();
}

const header = `verify ${url}  @ ${new Date().toISOString()}\n${errors.length} error(s), ${lines.length} console line(s)\n${"=".repeat(60)}\n`;
const body = errors.length
  ? `ERRORS:\n${errors.join("\n")}\n\n${"-".repeat(60)}\nFULL CONSOLE:\n${lines.join("\n") || "(none)"}\n`
  : `FULL CONSOLE:\n${lines.join("\n") || "(none)"}\n`;
await Bun.write(path.join(outDir, "console.txt"), header + body);
await Bun.write(
  path.join(outDir, "network.txt"),
  `network for ${url}\n${network.length} request(s)\n${"=".repeat(60)}\n\n${network.join("\n\n") || "(none)"}\n`,
);
await Bun.write(path.join(outDir, "dom.html"), dom || "<!-- no DOM captured (page failed to load) -->\n");

console.log(`${errors.length ? "✗" : "✓"} ${errors.length} error(s)${interactionsFile ? " (ran " + path.basename(interactionsFile) + ")" : ""} — ${outDir}/{console.txt, latest.png, network.txt, dom.html}`);
if (errors.length) for (const e of errors.slice(0, 10)) console.log("  " + e);
process.exit(0);

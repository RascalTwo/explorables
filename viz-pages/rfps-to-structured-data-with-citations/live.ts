import { $, esc } from "@viz/kit";
import { D, LIVE, REDUCED, node, px } from "./world.js";

/* ── the two live surfaces, in the world ──────────────────────────────────────────
 *
 * These used to be a screen-space overlay, on the theory that an iframe inside a CSS
 * transform is a rendering hazard and unclickable at any scale but 1. They belong in the
 * world — the whole point of the piece is that all of this is one canvas, and an overlay
 * is the one thing on the page that isn't — but the warning was half right, and the half
 * that is right decides the geometry here.
 *
 * An iframe scaled UP by a local transform paints white. Laying one out at 1,500px and
 * blowing it up 11x to fill a 17,000-unit box gave two blank rectangles: content loaded,
 * cross-origin, sized correctly, and rendering nothing. Sizing it in world units instead
 * paints — but then the embedded page's viewport IS 17,000px, so it lays itself out for
 * a monitor nobody owns.
 *
 * So this one block works in a different unit: 1 world unit = 1 CSS pixel. The frames are
 * 1500x950 both ways, there is no local transform at all, and the camera's own scale
 * (~0.45 here, a downscale) is the only scaling that ever happens. Everything else in
 * this file is sized for a canvas 200,000 units wide; the numbers in here are small on
 * purpose, and text in here is in points, not thousands. */

const liveWall = node("node", LIVE);
liveWall.id = "liveWall";
const paneW = 1500,
  paneH = 950;

/* An iframe inside a transformed ancestor loads, sizes and hit-tests correctly and then
 * paints nothing until something invalidates it. Both frames came up as white rectangles
 * — cross-origin, correctly sized, blank — and stayed that way until any style on them
 * changed. So: kick them once when the camera arrives, and again when it has settled,
 * because the first kick can land mid-flight and be undone by the next composite. */
let nudges = 0;
export function nudgeLive(): void {
  // The change has to STICK, and it has to be on an explicit pixel height. Setting a
  // style and putting it back — display, or opacity via a forced reflow — invalidates
  // and un-invalidates inside one frame, and the frames stay white; so does nudging a
  // percentage height, because the used value never actually moves. A quarter pixel off
  // an absolute height is a real layout change every time, and is invisible at any scale
  // this is ever seen at.
  // Never zero, or the second nudge lands back on the height the frame was already
  // painted at — which is not a change, and the white comes back.
  const d = nudges++ % 2 ? 0.25 : 0.5;
  document.querySelectorAll<HTMLIFrameElement>("#liveWall iframe").forEach((f) => {
    f.style.height = `${paneH - d}px`;
  });
}

/* Two hosts, two truths.
 *
 * On the demo rig the three surfaces are real services on localhost and the embeds are the
 * whole point — the claim of the scene is that this is running, not drawn. Published, those
 * ports do not exist for the reader, and the honest version of the same claim is a still of
 * the real thing plus a note saying so. A dead iframe making a promise it cannot keep is
 * worse than a screenshot admitting what it is.
 *
 * Hostname, not the connection probe below: the probe costs a 4s wait and races a slow SPA,
 * where the hostname is known before a single byte is fetched and cannot be wrong. The probe
 * still runs on the rig, because there a service really can be down. */
// Loopback only, and it fails CLOSED: anything unrecognised — a LAN address, a Pages
// host, a file:// copy with no hostname at all — gets the stills. The wrong guess in that
// direction costs a screenshot where an embed would have worked; the other direction ships
// three dead frames to a stranger.
/* Loopback means the demo rig is probably up, so the live panes mount as iframes. That
 * guess is right when presenting and wrong when checking what a stranger sees, and the
 * only way to check used to be to deploy and open the public URL.
 *
 * `?rig=off` forces the published behaviour — screenshots, captions, no iframes — from
 * localhost, and `?rig=on` forces the opposite from anywhere. Shift+R toggles it and
 * reloads, keeping the hash so you land on the scene you were reading. The panes are
 * built once at construction, so flipping this genuinely needs the reload. */
const RIG_PARAM = new URLSearchParams(location.search).get("rig");
const LIVE_RIG =
  RIG_PARAM === "on"
    ? true
    : RIG_PARAM === "off"
      ? false
      : ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

/* Both settings live in the URL, so a link carries them: someone handed
 * `…?rig=off&motion=off` sees exactly what the sender saw. The cog writes the same
 * params the keyboard shortcut does and reloads, keeping the hash so you come back to
 * the beat you were on. */
function setParam(name: string, on: boolean) {
  const u = new URL(location.href);
  u.searchParams.set(name, on ? "on" : "off");
  location.replace(u);
}

addEventListener("keydown", (e) => {
  if (e.key !== "R" || !e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target instanceof HTMLElement ? e.target : null;
  if (t && (/^(INPUT|TEXTAREA)$/u.test(t.tagName) || t.isContentEditable)) return;
  setParam("rig", !LIVE_RIG);
});

{
  const cog = $("#cog")!,
    settings = $("#settings")!;
  const motion = $<HTMLInputElement>("#setMotion")!,
    rig = $<HTMLInputElement>("#setRig")!;
  motion.checked = REDUCED;
  rig.checked = LIVE_RIG;
  const close = () => {
    settings.hidden = true;
    cog.setAttribute("aria-expanded", "false");
  };
  cog.addEventListener("click", (e) => {
    e.stopPropagation();
    settings.hidden = !settings.hidden;
    cog.setAttribute("aria-expanded", String(!settings.hidden));
  });
  // Click-away and Escape, because a settings over a canvas you scroll has no other way out.
  addEventListener("click", (e) => {
    if (!settings.hidden && !(e.target instanceof Node && settings.contains(e.target))) close();
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  // Inverted on purpose: the param answers "is motion on?", the checkbox asks "reduce
  // it?". Wiring them straight through made ticking "Reduce motion" turn animation back
  // on, which is the kind of bug a toggle hides well because it still visibly does
  // something.
  motion.addEventListener("change", () => setParam("motion", !motion.checked));
  rig.addEventListener("change", () => setParam("rig", rig.checked));
}

let liveMounted = false;
export function mountLive(): void {
  if (liveMounted) return;
  liveMounted = true;
  const panes = [
    {
      url: `http://localhost:8099/${D.hero.stem}.html`,
      t: "the citation viewer",
      what: "the citation viewer",
      cmd: "python -m http.server 8099 --directory ui",
      still: "assets/live/viewer.jpg",
    },
    {
      url: "http://localhost:3000/objects/rfps",
      t: "the CRM record",
      what: "Twenty CRM",
      cmd: "docker compose up -d",
      still: "assets/live/crm.jpg",
    },
    // The third surface is the one the other two do not show: what it cost to get here.
    // Phoenix is on 6786, not its default 6006 — that port is held by podman's gvproxy
    // (see compose.phoenix.yml), and the compose overlay only works with both -f files.
    // `timeRangeKey` because the projects page defaults to the last 7 days, and the
    // model calls worth showing are older than that — the cards read 0 traces without
    // it. It is the same key the range picker writes into the URL itself.
    {
      url: "http://localhost:6786/projects?timeRangeKey=30d",
      t: "the model calls",
      what: "Phoenix",
      cmd: "docker compose -f compose.yml -f compose.phoenix.yml up -d",
      still: "assets/live/phoenix.jpg",
    },
  ];
  panes.forEach((p, i) => {
    const label = node("wlabel", null, liveWall, {
      left: px(i * (paneW + 300)),
      top: px(0),
      width: px(paneW),
      fontSize: "42px",
      letterSpacing: ".14em",
      color: "var(--accent)",
    });
    /* The label is the way out of the embed: the surfaces are real running services, and
       an iframe at camera scale is for showing, not for using. Same underlined-link idiom
       as the gallery captions — but only on the rig, because an underline and an arrow on
       a published page promise a destination, and `localhost:3000` is not one. */
    label.innerHTML = LIVE_RIG
      ? `<a href="${esc(p.url)}" target="_blank" rel="noopener"
             style="color:inherit;text-decoration:underline;
             text-decoration-color:var(--faint);text-underline-offset:.3em;
             pointer-events:auto">${esc(p.t)} ↗</a>`
      : esc(p.t);
    const host = node("node", { x: i * (paneW + 300), y: 120, w: paneW, h: paneH }, liveWall, {
      overflow: "hidden",
      borderRadius: "14px",
      background: "#0a1526",
      border: "1px solid rgba(120,160,230,.3)",
    });
    // Published: a still of the same surface, captured from the running stack, and a note
    // saying which it is. No iframe at all — which also means the blank-iframe repaint bug
    // simply cannot happen on the copy that strangers see.
    if (!LIVE_RIG) {
      host.innerHTML = `<img src="${esc(p.still)}" alt="${esc(p.t)}, captured from the running stack"
           style="width:${paneW}px;height:${paneH}px;object-fit:cover;display:block">`;
      const cap = node("wlabel", null, liveWall, {
        left: px(i * (paneW + 300)),
        top: px(120 + paneH + 26),
        width: px(paneW),
        fontSize: "30px",
        letterSpacing: ".1em",
        color: "var(--faint)",
      });
      cap.textContent = "screenshot · runs locally";
      return;
    }

    host.innerHTML = `<iframe src="${p.url}" loading="lazy"
         style="width:${paneW}px;height:${paneH}px;border:0;background:#fff;
         opacity:.999"></iframe>
       <div class="dead"><div>Waiting for ${p.what}…</div></div>`;
    const fr = host.querySelector("iframe")!,
      dead = host.querySelector<HTMLElement>(".dead")!;

    // A refused connection paints a blank frame and fires no error event, so it has
    // to be probed. Reading location.href on a frame that LOADED throws (cross-origin)
    // and on one that failed returns "about:blank" — so a successful read is the
    // failure case. The first version had this backwards and reported a dead CRM as
    // healthy, which is the direction that embarrasses you in front of a room.
    const settle = () => {
      let live;
      try {
        live = fr.contentWindow!.location.href !== "about:blank";
      } catch {
        live = true;
      }
      if (live) {
        dead.style.display = "none";
        return;
      }
      fr.style.display = "none";
      dead.innerHTML = `<div>${p.what} isn't running.<br><code>${p.cmd}</code><br>${p.url}</div>`;
    };
    // Two looks: one early so a dead service is called out before anyone asks, and
    // one later so a slow single-page app is not.
    fr.addEventListener("load", () => {
      setTimeout(settle, 400);
    });
    setTimeout(settle, 4000);
  });
}

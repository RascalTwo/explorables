import { $, $$, vizAudit } from "@viz/kit";

/* Two modes, one attack. The ONLY variable is how many source addresses the
     hundred attempts are spread across; the credential and the attempt count are
     identical. That is the entire argument, so nothing else may differ. */
const N = 100;
const MODES = [
  {
    srcs: 1,
    nm: "one address",
    cap: "From a single address both counters agree, which is exactly why this case is misleading. Rate limiting appears to be doing the job — and it is, against an attacker who has made it easy.",
  },
  {
    srcs: N,
    nm: "a hundred addresses",
    cap: "Same hundred attempts, same one credential, same secret being guessed. The per-source counter never reaches 2, so a threshold of 5, or 50, or 500 would never fire. <b>The traffic did not change; only the bookkeeping did.</b> This is why a rate limit cannot stand in for the cap.",
  },
];

const svg = $("#fig")!,
  cap = $("#cap")!;

const draw = (m: number) => {
  const { srcs } = MODES[m]!;
  const perSource = Math.ceil(N / srcs);
  const rows = Math.min(srcs, 14); // at most 14 source rows are drawn
  const y0 = 62,
    gap = rows > 1 ? 206 / (rows - 1) : 0;

  const sources = Array.from({ length: rows }, (_, i) => {
    const y = rows === 1 ? 165 : y0 + i * gap;
    return (
      `<line class="attempt ${srcs === 1 ? "same" : "rot"}" x1="150" y1="${y}" x2="390" y2="165"/>` +
      `<circle cx="144" cy="${y}" r="3.5" fill="var(--${srcs === 1 ? "c3" : "c4"})"/>`
    );
  }).join("");

  svg.innerHTML =
    `<text class="src-lbl" x="144" y="40" text-anchor="middle">${srcs === 1 ? "1 source" : srcs + " sources"}</text>` +
    sources +
    `<text class="note-t" x="144" y="316" text-anchor="middle">${N} attempts either way, all against 9f4c2ae1</text>` +
    `<rect class="cred" x="382" y="132" width="168" height="68" rx="8"/>` +
    `<text class="note-t" x="466" y="152" text-anchor="middle">one client_id</text>` +
    `<text class="cred-t cid" x="466" y="172" text-anchor="middle">9f4c2ae1</text>` +
    `<text class="note-t" x="466" y="190" text-anchor="middle">wrong secret, every time</text>` +
    // The colour says WAS THE ATTACK CAUGHT, not whether the number went up.
    // First cut had it the other way round and the per-source counter went
    // green precisely when it had failed to notice a hundred guesses.
    counterAt(
      596,
      26,
      "Keyed on the source",
      "per address — what a rate limit counts",
      perSource,
      srcs === 1,
      srcs === 1 ? "✓ reaches the cap — caught" : "✕ no threshold fires — attack missed",
    ) +
    counterAt(
      596,
      212,
      "Keyed on the client_id",
      "per client_id, reset on success",
      N,
      true,
      "✓ reaches the cap — in both modes",
    );

  cap.innerHTML = MODES[m]!.cap;
};

// `caught` = did this counter notice the attack. Green means the control did
// its job; red means it sat there while a hundred guesses went past.
function counterAt(
  x: number,
  y: number,
  title: string,
  key: string,
  n: number,
  caught: boolean,
  verdict: string,
) {
  const c = caught ? "safe" : "trip";
  // 30px mono digit is ~18px wide; +12 keeps a real gap rather than
  // butting the label against the last digit.
  const numX = x + 18 + String(n).length * 18 + 12;
  return (
    `<rect class="ctr-box ${c}" x="${x}" y="${y}" width="300" height="158" rx="9"/>` +
    `<text class="ctr-t" x="${x + 18}" y="${y + 28}">${title}</text>` +
    `<text class="ctr-k" x="${x + 18}" y="${y + 46}">${key}</text>` +
    `<text class="ctr-n ${c}" x="${x + 18}" y="${y + 92}">${n}</text>` +
    `<text class="ctr-k" x="${numX}" y="${y + 92}">consecutive failures</text>` +
    `<text class="ctr-v ${c}" x="${x + 18}" y="${y + 130}">${verdict}</text>`
  );
}

$$("#modes button").forEach((b) => {
  b.addEventListener("click", () => {
    $$("#modes button").forEach((o) => {
      o.classList.toggle("on", o === b);
    });
    draw(+b.dataset["m"]!);
  });
});
draw(0);
vizAudit(svg);

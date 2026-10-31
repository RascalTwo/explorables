export type PayKind = keyof typeof PAY;
export type Band = (typeof BANDS)[number];
export interface Plan {
  id: string;
  vendor: string;
  ladder?: string;
  name: string;
  short: string;
  price: number;
  pay: PayKind;
  band: string;
  limit: string;
  note?: string;
  doc: string;
  verified?: boolean;
}
export interface Surface {
  id: string;
  vendor: string;
  name: string;
  col: string;
  band: string;
  how: string;
  what: string;
  reqs: string[];
  also?: string;
  note?: string;
  doc: string;
  verified?: boolean;
}

/* ═══ TAXONOMY ═══════════════════════════════════════════════════════════
   Three encodings carry this page:
     y (both charts) = trust band     — how far a security team would let you go
     x (chart 1)     = dollars a month
     x (chart 2)     = where the thing runs
     colour          = HOW you pay, which beginners find harder than WHAT you pay
   Bands are ordered best-to-worst so "At work" can simply cut everything past
   an index, rather than each band carrying its own work-safe flag to keep in sync. */

export const BANDS = [
  { id: "ent", name: "Enterprise-safe", sub: "clears a big-company security review today" },
  {
    id: "team",
    name: "Solid for a team",
    sub: "real company, real certifications — smaller or younger",
  },
  {
    id: "pers",
    name: "Fine for personal",
    sub: "legit and reliable; would not survive procurement",
  },
  {
    id: "cheap",
    name: "Cheap, with caveats",
    sub: "works and costs little — jurisdiction or longevity is a real question",
  },
  {
    id: "free",
    name: "Free / self-hosted",
    sub: "no vendor relationship at all: you run it, or you bring your own key",
  },
];
export const WORK_CUTOFF = 2; // "at work" keeps bands 0..1. One number, one meaning.

export const COLS = [
  { id: "cli", name: "Terminal", sub: "a command in your shell" },
  { id: "ide", name: "Its own editor", sub: "a whole app you code in" },
  { id: "ext", name: "Editor plug-in", sub: "bolts onto VS Code / JetBrains" },
  { id: "app", name: "Desktop & browser", sub: "an app, or a tab" },
  { id: "cloud", name: "Cloud agent", sub: "give it a task, get a pull request" },
  { id: "review", name: "Reviews your PRs", sub: "comments on code you wrote" },
  { id: "auto", name: "API, SDK & CI", sub: "wire it into your own code" },
];

/* How the money leaves your account. This is the distinction that actually trips
   beginners up — "$20/mo" and "$20 of credits" behave nothing alike once you hit
   the limit, and pay-per-token has no limit at all until the invoice arrives. */
export const PAY = {
  seat: {
    name: "Flat monthly seat",
    color: "var(--c7)",
    blurb:
      "Same price every month. You hit a rate limit, you wait — you don't get a surprise bill.",
  },
  credit: {
    name: "Monthly credits",
    color: "var(--c4)",
    blurb:
      "An allowance that resets. Run out and you either stop or top up, so cost is capped-ish but not fixed.",
  },
  token: {
    name: "Pay per token",
    color: "var(--c5)",
    blurb:
      "No subscription; you're billed for what you use. Cheapest to start, the only one that can hand you a $400 month.",
  },
  free: {
    name: "Free",
    color: "var(--c2)",
    blurb:
      "No card. Either a genuine free tier, open source, or something you run on your own hardware.",
  },
};

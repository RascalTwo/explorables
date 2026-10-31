// Loads the real challenge modules in-process (no browser) with the gallery scaffold swapped for a recorder, so a test
// can read every step-through's own trace function: the same trace the page runs when a user presses "Step".
// check.mjs does this trick for the official-test gate; it never runs a trace.
import { plugin } from "bun";

export interface Src {
  ln: number;
  html: string;
}
export interface Step {
  line: number;
  focus?: string | null;
  note: string;
  done?: boolean;
  result?: unknown;
}
export interface Cfg {
  source: Src[];
  trace: (input: number | string) => Step[];
  input?: { value?: number | string; min?: number; max?: number; presets?: (number | string)[] };
}
export interface Challenge {
  n: number;
  id: string;
  source?: string;
  variants: { name: string; mount(host: unknown): void }[];
}
export interface Debugger {
  challenge: Challenge;
  variant: string;
  cfg: Cfg;
}

const recorded: Cfg[] = [];
// An object that absorbs any property read, call or write, so a mount() that draws into it never throws.
const dom = (): object => {
  const p: object = new Proxy(
    function absorb(): object {
      return p;
    },
    { get: (_t, k) => (k === Symbol.toPrimitive ? () => "" : p), apply: () => p, set: () => true },
  );
  return p;
};

plugin({
  name: "recording-scaffold",
  setup(b) {
    // Rewrite the import in the source instead of relying on resolution: bun resolved a few challenge files' "./lib/shared.js"
    // to the real shared.ts without asking the plugin, and those files then never reached the recorder.
    b.onLoad({ filter: /coding-challenges\/challenges\/[^/]+\.ts$/u }, async (args) => ({
      contents: (await Bun.file(args.path).text()).replaceAll(
        '"./lib/shared.js"',
        JSON.stringify(import.meta.dir + "/recorder.ts"),
      ),
      loader: "ts",
    }));
  },
});
if (Reflect.get(globalThis, "document") === undefined) Reflect.set(globalThis, "document", dom());
if (Reflect.get(globalThis, "requestAnimationFrame") === undefined)
  Reflect.set(globalThis, "requestAnimationFrame", () => 0);

const { record } = await import("./recorder.ts");
record.sink = recorded;
const registry: Challenge[] = (await import("../registry.ts")).default;

export const challenges = registry;

/** Every step-through in the gallery, with its trace function and source listing. */
export const debuggers: Debugger[] = [];
for (const challenge of registry) {
  for (const v of challenge.variants) {
    recorded.length = 0;
    try {
      v.mount(dom());
    } catch (e) {
      if (process.env.CC_DEBUG) console.log("mount threw", challenge.n, v.name, String(e));
    }
    for (const cfg of recorded) debuggers.push({ challenge, variant: v.name, cfg });
  }
}

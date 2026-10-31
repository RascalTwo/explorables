import { loadHash, saveHash } from "@viz/kit";

export type Hash = { c: number; d: number; m: number };
const saved = loadHash<Hash>();
/** What the page remembers in the URL hash: the context, the selected dimension and the mechanism step. */
export const view = { ctx: saved.c ?? 0, sel: saved.d ?? 0, mech: saved.m ?? 0 };
export const persist = (): void => {
  saveHash({ c: view.ctx, d: view.sel, m: view.mech });
};

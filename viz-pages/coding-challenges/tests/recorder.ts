// Stand-in for challenges/lib/shared.ts while a test reads the traces: mountDebugger records its config instead of drawing.
export const record: { sink: unknown[] } = { sink: [] };
// An object that absorbs any property read, call or write, so a mount() that draws into it never throws.
const dom: object = new Proxy(
  function absorb(): object {
    return dom;
  },
  {
    get: (_t, k) => (k === Symbol.toPrimitive ? () => "" : dom),
    apply: () => dom,
    set: () => true,
  },
);
export const el = (): object => dom;
export const esc = String;
export const hl = (s: string): string => s;
export const codeBlock = (s: string): string => s;
export const mountDebugger = (_host: unknown, cfg: unknown): void => {
  record.sink.push(cfg);
};
export const mountGallery = (): undefined => undefined;
export const $ = (): null => null;
export const $$ = (): never[] => [];

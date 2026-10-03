// Stand-in for ../shared.ts while a test reads the traces: mountDebugger records its config instead of drawing.
export const record: { sink: unknown[] } = { sink: [] };
const dom: any = new Proxy(function () {}, { get: (_t, k) => (k === Symbol.toPrimitive ? () => "" : dom), apply: () => dom, set: () => true });
export const el = () => dom;
export const esc = (s: unknown) => String(s);
export const hl = (s: string) => s;
export const codeBlock = (s: string) => s;
export const mountDebugger = (_host: unknown, cfg: unknown) => { record.sink.push(cfg); };
export const mountGallery = () => {};
export const $ = () => null;
export const $$ = () => [];

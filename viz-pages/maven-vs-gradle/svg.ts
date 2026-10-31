export const NS = "http://www.w3.org/2000/svg";
export type Attrs = Record<string, string | number | null | undefined>;
export const el = (n: string, a: Attrs = {}, kids: Node | Node[] = []): SVGElement => {
  const e = document.createElementNS(NS, n);
  for (const [k, v] of Object.entries(a))
    if (v !== null && v !== undefined) e.setAttribute(k, String(v));
  for (const c of ([] as Node[]).concat(kids)) e.append(c);
  return e;
};
export const txt = (s: string | number): Text => document.createTextNode(String(s));
export const MVN = "var(--c4)",
  GRD = "var(--c5)";

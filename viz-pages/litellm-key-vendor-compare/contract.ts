// The shapes api.ts answers and the page reads — written once (see /viz reference/backend.md).
// The two EventSource routes (/run-ansible, /run-terraform) stream text/event-stream; they are
// listed so the backend is checked route-for-route, but the page opens them with EventSource.

// ---- Compare + Quickstart tabs (the emulated engines) ----
export interface Spec { present: boolean; missing?: boolean; key_version?: number; max_budget?: number; blocked?: boolean; models?: string; owner?: string; app?: string; environment?: string }
/** `error`: the page's guard for an unreachable LiteLLM; this emulation never sends it. */
export interface Live { error?: unknown; tokenHash: string; version: number; budget: number; blocked: boolean; models: string; owner: string; managed_by: string }
/** `error`: as on Live. */
export interface Vault { error?: unknown; key_alias: string; secretPrefix: string; secretLen: number; owner: string; key_version: number; updated_at: string }
export interface EngineState { spec: Spec; litellm: Live | null; vault: Vault | null }
export interface TfState { exists: boolean; hasSecret?: boolean; bytes?: number; secretPrefix?: string; line?: string }
export interface State { ansible: EngineState; terraform: EngineState; tfstate: TfState }
export interface Check { name: string; ok: boolean }
export interface QsK8s { offline: boolean; applyOut: string[]; reconciled: boolean; secretPrefix: string; tokenHash: string; secretRef: string; keyVersion: number }
export type QsConsume =
  | { ok: false; msg: string }
  | { ok: true; keyPrefix: string; keyLen: number; model: string; answer: string; registered: { alias: string; owner: string } };

// ---- Operator tab (the live kind cluster) ----
export type OpEngineName = "ansible" | "java";
export interface OpSpec { keyAlias: string; keyVersion: number; maxBudget: number; models?: string[] | undefined; deletePolicy?: string | undefined; blocked?: boolean | undefined; rotationIntervalSeconds?: number | undefined }
/** LiteLLM's own nulls: a key with no budget or limit says null (or nothing). */
export interface OpLive { keyVersion?: number | null | undefined; maxBudget?: number | null | undefined; blocked?: boolean | undefined; env?: string | null | undefined; tpm?: number | null | undefined; rpm?: number | null | undefined }
export interface OpSecret { name: string; valuePrefix?: string | null | undefined; ownerRefs: number }
export interface OpStatus { lastRotated?: string | undefined; observedKeyVersion?: unknown; tokenHash?: string | undefined; secretRef?: string | undefined }
export interface OpEngine {
  engine: string; ns: string; alias: string; tag: string; terminating: boolean;
  spec?: OpSpec | null; live?: OpLive | null; secret?: OpSecret | null; status?: OpStatus | null; drift?: boolean | null | undefined; crPresent?: boolean;
}
export interface OpState { preflight: { ok: boolean; checks: Check[] }; engines: Record<OpEngineName, OpEngine>; ts: number }
/** What every action answers; the page re-polls /state to see the effect. */
export interface OpAck { ok: boolean; msg: string }
export type OpConsume =
  | { ok: false; msg: string }
  | { ok: true; envPreview: string; length: number; model: string; answer: string; registered: { alias?: string | null | undefined; owner?: string | null | undefined; version: unknown } | null; bogus404: boolean };

/** op-backend.ts's own routes; api.ts serves them under an "/op-" prefix so /state + /preflight don't collide. */
export interface OpApi {
  "/state":      { body: null; reply: OpState };
  "/preflight":  { body: null; reply: OpState["preflight"] };
  "/apply":      { body: null; method: "POST"; query: { engine: string }; reply: OpAck };
  "/budget":     { body: null; method: "POST"; query: { engine: string; value?: number | string }; reply: OpAck };
  "/rotate":     { body: null; method: "POST"; query: { engine: string }; reply: OpAck };
  "/tamper":     { body: null; method: "POST"; query: { engine: string }; reply: OpAck };
  "/autorotate": { body: null; method: "POST"; query: { engine: string; on: 0 | 1 }; reply: OpAck };
  "/delete":     { body: null; method: "POST"; query: { engine: string; policy?: string }; reply: OpAck };
  "/consume":    { body: null; method: "POST"; query: { engine: string }; reply: OpConsume };
}
type Prefixed<T> = { [K in keyof T & string as K extends `/${infer R}` ? `/op-${R}` : never]: T[K] };

export interface Routes extends Prefixed<OpApi> {
  "/preflight":    { body: null; reply: { ok: true; checks: Check[] } };
  "/qs-preflight": { body: null; reply: { checks: Check[] } };
  "/state":        { body: null; reply: State };
  // These three mutate on a GET — the page has always called them that way.
  "/mutate":       { body: null; query: { engine: string; op: string }; reply: State };
  "/drift":        { body: null; query: { engine: string }; reply: State };
  "/reset":        { body: null; reply: State };   // ?engine= optional, unused by the page: none = both engines
  "/tf-plan":      { body: null; reply: { summary: string } };
  "/run-ansible":  { body: null; reply: never };   // SSE
  "/run-terraform": { body: null; reply: never };  // SSE
  "/qs-k8s":       { body: null; reply: QsK8s };
  "/qs-consume":   { body: null; query: { engine: string }; reply: QsConsume };
}

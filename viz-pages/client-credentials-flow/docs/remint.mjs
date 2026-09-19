#!/usr/bin/env node
//
// Re-mint every token artifact in the family, and patch the two dives that show
// them. Run from anywhere:  node client-credentials-flow/docs/remint.mjs
//
// WHY THIS EXISTS
// ---------------
// The tokens on dive B and dive C are REAL — dive C imports the public half and
// runs crypto.subtle.verify() in the reader's browser, so the forgeries fail
// because they are genuinely invalid rather than because a script says so. That
// is the property worth protecting, and it makes any change to a signed value
// (the lifetime, the issuer, the scope) a re-signing job rather than an edit.
//
// The first keypair, generated 2026-08-06, was thrown away. When the lifetime
// moved 300s -> 60s on 2026-08-07 that meant a whole new keypair, which meant a
// new `kid`, which meant dive B and dive C both had to change together. This
// script and the keypair beside it exist so that never costs anything again.
//
// THE KEYPAIR IS COMMITTED ON PURPOSE. It signs a token that names example.com,
// grants a scope that does not exist, and protects nothing anywhere. It is a
// prop. Publishing it is the same decision as publishing the token it signed.
// See throwaway-keypair.pem for the standing warning.
//
// `docs/` is not emitted by build.ts — a fresh build produces exactly index.html
// plus an OG image per viz — so neither this file nor the key ships to the open
// web. That is a convenience, not the reason it is safe; the reason is the
// paragraph above.
//
// TO CHANGE THE LIFETIME: edit LIFETIME_SECONDS, run, done. Everything that
// derives from it — the signature, the three forgeries, dive C's pinned `now` —
// is recomputed. Then grep the family for prose stating a lifetime in words,
// because this script cannot fix a sentence.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FAMILY = path.resolve(HERE, '../..');
const KEYFILE = path.join(HERE, 'throwaway-keypair.pem');

// ---- the knobs ------------------------------------------------------------
const LIFETIME_SECONDS = 60;
const IAT = 1786046400;            // fixed instant, so the page is deterministic
const CLIENT_ID = '9f4c2ae1';
const ISS = 'https://as.example.com';
const AUD = 'https://api.example.com';
const SCOPE = 'reports:read';
const JTI = 'e84bce4d-225d-4f80-bc4e-a51816ed1d99';

// Where dive C pins "now". Must sit INSIDE the window or gate 4 fails on expiry
// and buries the point the page is making. A third of the way in leaves a
// sensible "Ns left" on screen at any lifetime.
const NOW = IAT + Math.round(LIFETIME_SECONDS / 2);

// ---- the keypair: reuse if present, generate and save if not ---------------
let privateKey, publicKey;
if (fs.existsSync(KEYFILE)) {
  privateKey = crypto.createPrivateKey(fs.readFileSync(KEYFILE, 'utf8'));
  publicKey = crypto.createPublicKey(privateKey);
  console.log('keypair  reused from', path.relative(FAMILY, KEYFILE));
} else {
  ({ privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }));
  fs.writeFileSync(KEYFILE,
    `# THROWAWAY. Signs a demonstration token for example.com and protects nothing.\n` +
    `# Committed deliberately so the family's real artifacts can be re-minted.\n` +
    `# Never point anything real at this key.\n` +
    privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  console.log('keypair  GENERATED and saved to', path.relative(FAMILY, KEYFILE));
}

// ---- mint -----------------------------------------------------------------
const b64u = b => Buffer.from(b).toString('base64url');
const enc = o => b64u(JSON.stringify(o));

// `kid` is derived from the key itself, so it can never drift from the key it
// names — and re-running with the same key produces the same kid.
const kid = crypto.createHash('sha256')
  .update(publicKey.export({ type: 'spki', format: 'der' }))
  .digest('base64url').slice(0, 16);

const EXP = IAT + LIFETIME_SECONDS;
const header = { alg: 'RS256', typ: 'at+jwt', kid };
const payload = { iss: ISS, sub: CLIENT_ID, client_id: CLIENT_ID, aud: AUD,
                  exp: EXP, iat: IAT, jti: JTI, scope: SCOPE };

const H = enc(header), P = enc(payload);
const S = crypto.sign('sha256', Buffer.from(`${H}.${P}`), privateKey).toString('base64url');

// The three forgeries, each demonstrating one documented attack shape.
const P_EDIT = enc({ ...payload, exp: EXP + 86400 });        // signature untouched
const H_NONE = enc({ ...header, alg: 'none' });              // signature removed
const H_HS = enc({ ...header, alg: 'HS256' });               // public key as MAC secret
const S_HS = crypto.createHmac('sha256', publicKey.export({ type: 'spki', format: 'pem' }))
  .update(`${H_HS}.${P_EDIT}`).digest('base64url');

const j = publicKey.export({ format: 'jwk' });
const JWK = { kty: j.kty, n: j.n, e: j.e, alg: 'RS256', use: 'sig', kid };

// ---- prove it before writing anything -------------------------------------
const ver = (h, p, s) => s && crypto.verify('sha256', Buffer.from(`${h}.${p}`),
  publicKey, Buffer.from(s, 'base64url'));
const checks = {
  'genuine verifies': ver(H, P, S) === true,
  'edited payload fails': ver(H, P_EDIT, S) === false,
  'lifetime matches': EXP - IAT === LIFETIME_SECONDS,
  'now is inside the window': NOW > IAT && NOW < EXP,
  'kid matches the JWK': header.kid === JWK.kid,
  'signature is 342 chars': S.length === 342,   // dive B says so in prose
};
const failed = Object.entries(checks).filter(([, ok]) => !ok);
console.log(checks);
if (failed.length) { console.error('ABORT —', failed.map(([k]) => k).join(', ')); process.exit(1); }

// ---- patch the two dives --------------------------------------------------
const patch = (rel, edits) => {
  const f = path.join(FAMILY, rel);
  let t = fs.readFileSync(f, 'utf8'), n = 0;
  for (const [re, val] of edits) {
    // Test for the anchor, don't diff the result. A re-mint that changes nothing
    // is the NORMAL case for anything the key does not feed — the payload is the
    // same bytes whenever the claims and the lifetime are unchanged — and an
    // earlier version of this guard compared before/after and aborted on it.
    if (!re.test(t)) { console.error(`ABORT — no match in ${rel}: ${re}`); process.exit(1); }
    t = t.replace(re, val);
    n++;
  }
  fs.writeFileSync(f, t);
  console.log(`patched  ${rel} (${n} constants)`);
};
const cst = (name, val) => [new RegExp(`(const\\s+${name}\\s*=\\s*)"[^"]*"`), `$1"${val}"`];

patch('dive-token-created/index.html', [cst('H', H), cst('P', P), cst('S', S)]);
patch('dive-token-verified/index.html', [
  cst('H', H), cst('P', P), cst('S', S), cst('P_EDIT', P_EDIT),
  cst('H_NONE', H_NONE), cst('H_HS', H_HS), cst('S_HS', S_HS),
  [/const JWK = \{.*?\};/s, `const JWK = ${JSON.stringify(JWK)};`],
  [/const NOW = \d+;/, `const NOW = ${NOW};`],
]);

console.log(`\nkid ${kid} · lifetime ${LIFETIME_SECONDS}s · now pinned at iat+${NOW - IAT} (${EXP - NOW}s left on screen)`);
console.log('Now grep the family for lifetimes stated in PROSE — this script cannot fix a sentence.');

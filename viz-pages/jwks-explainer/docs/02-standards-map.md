# Standards map

Every claim the page makes on screen, the document that backs it, and the words
that document actually uses.

**House rule, earned the hard way on the sibling project: do not fill in a
section title from memory.** Three titles there turned out different from the
obvious guess. Every title below was read against the published RFC at
`https://www.rfc-editor.org/rfc/rfcNNNN.txt` on **2026-08-06** before it went on
screen. Quotes are verbatim.

The page is generic and cites nothing internal — only IETF standards and one
open-source library — so it can be shared as-is.

---

## Citation crib sheet

| Document | Section | Verbatim title |
|---|---|---|
| RFC 7517 | §4 | JSON Web Key (JWK) Format |
| RFC 7517 | §4.1 | "kty" (Key Type) Parameter |
| RFC 7517 | §4.2 | "use" (Public Key Use) Parameter |
| RFC 7517 | §4.5 | "kid" (Key ID) Parameter |
| RFC 7517 | §4.7 | "x5c" (X.509 Certificate Chain) Parameter |
| RFC 7517 | §4.8 | "x5t" (X.509 Certificate SHA-1 Thumbprint) Parameter |
| RFC 7517 | §5 | JWK Set Format |
| RFC 7517 | §5.1 | "keys" Parameter |
| RFC 7517 | App. A | Example JSON Web Key Sets |
| RFC 7517 | App. A.1 | Example Public Keys |
| RFC 7518 | §3.3 | Digital Signature with RSASSA-PKCS1-v1_5 |
| RFC 7518 | §6.3.1 | Parameters for RSA Public Keys |
| RFC 7518 | §6.3.1.1 | "n" (Modulus) Parameter |
| RFC 7518 | §6.3.1.2 | "e" (Exponent) Parameter |
| RFC 7515 | §2 | Terminology |
| RFC 7515 | §4.1.4 | "kid" (Key ID) Header Parameter |
| RFC 7519 | §12 | Privacy Considerations |
| RFC 8414 | §1 | Introduction |
| RFC 8414 | §2 | Authorization Server Metadata |
| RFC 5280 | §4.1.2 | TBSCertificate |
| RFC 5280 | §4.1.2.2–§4.1.2.7 | Serial Number · Signature · Issuer · Validity · Subject · Subject Public Key Info |

---

## Claim → evidence

### §1 — A JWK is a JSON object

| On screen | Source | Verbatim |
|---|---|---|
| The whole specimen | RFC 7517 App. A.1, "Example Public Keys" | Reproduced character-for-character, including `"kid":"2011-04-29"`. |
| `n` is the public key, base64url | RFC 7518 §6.3.1.1 | *"The 'n' (modulus) parameter contains the modulus value for the RSA public key. It is represented as a Base64urlUInt-encoded value."* |
| `e` = `AQAB` = 65537 | RFC 7518 §6.3.1.2 | Title verbatim; the 65537 decoding is arithmetic on the base64url value, not a quote. |
| RS256 needs ≥2048-bit keys | RFC 7518 §3.3 | *"A key of size 2048 bits or larger MUST be used with these algorithms."* |
| A JWK Set is `{"keys": [ … ]}` | RFC 7517 §5.1 | *"The value of the 'keys' parameter is an array of JWK values."* |
| `use` is not required | RFC 7517 §4.2; RFC 8414 §2 | 8414 makes `use` REQUIRED only *"when both signing and encryption keys are made available."* |

### §2 — The contrast with X.509

Every "no such member" row is an **absence** claim: the field is defined in RFC
5280 and has no counterpart among the JWK members defined in RFC 7517 §4.

| On screen | Source |
|---|---|
| Subject / Issuer / Validity / Signature / Serial Number / Subject Public Key Info | RFC 5280 §4.1.2.6 / §4.1.2.4 / §4.1.2.5 / §4.1.2.3 / §4.1.2.2 / §4.1.2.7 — titles verbatim in the crib sheet |
| *"The period of time from notBefore through notAfter, inclusive."* | RFC 5280 §4.1.2.5, verbatim |
| Certificate chain / path validation | RFC 5280 §6 |
| `x5c` and `x5t` exist but are optional | RFC 7517 §4.7, §4.8 — of each: *"Use of this member is OPTIONAL."* |
| Trust comes from the transport | RFC 8414 §2 — `jwks_uri` *"MUST use the 'https' scheme."* |

⚠ **The strike-through framing is deliberate but is an argument, not a quote.**
"A JWK is one field of a certificate" is our synthesis from the two documents. It
is defensible and it is the page's thesis — but do not attribute that sentence to
an RFC.

### §4 — No authentication on the endpoint

The circularity argument is **structural, not cited** — and deliberately so; it
is more convincing than any citation. No RFC is claimed for it on screen.

The `wget -qO- http://host/oauth2/jwks | grep -q keys` example is presented as
*conventional practice*, not as a normative requirement. Keep that framing.

### §5 — How a verifier uses it

| On screen | Source | Verbatim |
|---|---|---|
| The signing input formula | RFC 7515 §2, "Terminology" | *"Its value is ASCII(BASE64URL(UTF8(JWS Protected Header)) \|\| '.' \|\| BASE64URL(JWS Payload))."* |
| `kid` travels in the token header | RFC 7515 §4.1.4 | *"This parameter allows originators to explicitly signal a change of key to recipients."* |
| Signed ≠ encrypted | RFC 7519 §12, "Privacy Considerations" | *"A JWT may contain privacy-sensitive information. When this is the case, measures MUST be taken to prevent disclosure of this information to unintended parties. One way to achieve this is to use an encrypted JWT."* |

⚠ **Precision point, checked and worth not losing.** RFC 7515 does **not**
contain a sentence saying a JWS payload is "not encrypted". The page therefore
does not cite 7515 for that claim — it cites **RFC 7519 §12**, whose privacy
warning only makes sense if the claims are readable. If a future edit wants a
snappier citation here, verify it first; the obvious one does not exist.

The demo token in §5 is **synthetic** (`auth.example.com`, `svc-reporting`).
It is illustrative, not a decoded real token, and contains nothing internal.

### §6 — Rotation

No citation on screen, and none is needed: it follows from `kid` selection
(RFC 7517 §4.5) plus the set being an array (§5.1). Presented as mechanism, not
as a normative requirement, because no RFC mandates an overlap window.

### §7 — Caching

| On screen | Source |
|---|---|
| Unknown `kid` → immediate re-fetch → re-select, same call | **nimbus-jose-jwt 9.24.4**, `RemoteJWKSet.java:455–510` |

Read first-party from the sources jar in the local Gradle cache. Line 464:
*"Refresh the JWK set if the sought key ID is not in the cached JWK set"*. The
method ends at line 508–509 on *"Repeat select, return final result (success or
no matches)"* followed by `return jwkSelector.select(jwkSet);` — which is what
establishes that **the triggering request succeeds** rather than failing first.

⚠ This is **one library's behaviour**, not a standard. It is the dominant JVM
implementation and the page names it explicitly rather than generalising. Do not
rewrite this as "verifiers do X" without naming an implementation.

The five-minute TTL is described as *"a common default"*, not as a specification.

### §8 — Discovery

| On screen | Source | Verbatim |
|---|---|---|
| `jwks_uri` is OPTIONAL | RFC 8414 §2, "Authorization Server Metadata" | *"OPTIONAL. URL of the authorization server's JWK Set [JWK] document. The referenced document contains the signing key(s) the client uses to validate signatures from the authorization server. This URL MUST use the 'https' scheme."* |
| Discovery can be skipped | RFC 8414 §1, "Introduction" | *"In some cases, its issuer identifier may be manually configured into the client."* |

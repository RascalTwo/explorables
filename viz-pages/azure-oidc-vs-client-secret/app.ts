import { arrowMarkers, saveHash, loadHash } from "/_kit/viz.js";

/* ══ provenance vocabulary ══════════════════════════════════════════
   doc = stated in vendor documentation
   src = verified in shipped source code, but NOT documented → can change
         without a changelog entry. Trust for understanding, not for SLAs.
   inf = reasoned from the above; no direct statement
   ill = placeholder/illustrative value, invented for shape only
   ════════════════════════════════════════════════════════════════════ */

type Prov = "doc" | "src" | "inf" | "ill";
type Source = { p: Prov; n: string; u: string; d: string };
type LaneId = "fed" | "sec";
type Color = "good" | "danger" | "warn" | "accent" | "muted" | "c4";
type Blast = { art: string; ttl: string; scope: string; sev: string; sevT: string; what: string };
type Step = {
  y: number; from?: number; to?: number; self?: number; color: Color; label: string;
  eyebrow: string; title: string; when: string; prov: Prov; provNote: string;
  wire: string; note: string; blast: Blast | null;
};
type Lane = { h: string; s: string };
type Sel = { lane: LaneId; i: number };

/* Declared up here (not next to the sources panel) because renderDetail()
   links into it on first paint — a bottom-of-file const would be in TDZ. */
const SOURCES = {
  disco:   { p:"doc", n:"GitHub OIDC discovery document", u:"https://token.actions.githubusercontent.com/.well-known/openid-configuration",
             d:"Fetched live while building this page. Issuer, <code>jwks_uri</code>, RS256, claim names." },
  ghref:   { p:"doc", n:"GitHub — OIDC reference", u:"https://docs.github.com/en/actions/reference/security/oidc",
             d:"The <code>ACTIONS_ID_TOKEN_REQUEST_*</code> vars, the curl form, the <code>audience</code> param, every <code>sub</code> format, the immutable format." },
  toolkit: { p:"src", n:"actions/toolkit — oidc-utils.ts", u:"https://github.com/actions/toolkit/blob/main/packages/core/src/oidc-utils.ts",
             d:"<code>getIDToken()</code> internals: <code>encodeURIComponent(audience)</code>, bearer handler, <code>setSecret()</code> masking." },
  mscert:  { p:"doc", n:"Microsoft — certificate credentials / client assertions", u:"https://learn.microsoft.com/en-us/entra/identity-platform/certificate-credentials",
             d:"The <code>client_assertion_type</code> URN and the client-assertion parameter set." },
  mstok:   { p:"doc", n:"Microsoft — configurable token lifetimes", u:"https://learn.microsoft.com/en-us/entra/identity-platform/configurable-token-lifetimes",
             d:"The 60–90 min randomised access-token lifetime; <code>AccessTokenLifetime</code> min 10 min / max 24 h; CAE 24–28 h." },
  mskey:   { p:"doc", n:"Microsoft — prevent Shared Key authorization", u:"https://learn.microsoft.com/en-us/azure/storage/common/shared-key-authorization-prevent",
             d:"The <code>listKeys</code> quote; <code>allowSharedKeyAccess</code> unset-by-default; CA requires disabling shared key." },
  mslease: { p:"doc", n:"Microsoft — Lease Blob (REST)", u:"https://learn.microsoft.com/en-us/rest/api/storageservices/lease-blob",
             d:"<code>x-ms-lease-duration: -1</code> = never expires; only valid on acquire." },
  tfback:  { p:"doc", n:"HashiCorp — azurerm backend", u:"https://developer.hashicorp.com/terraform/language/backend/azurerm",
             d:"<code>use_oidc</code>/<code>use_azuread_auth</code>, the <code>ARM_*</code> vars, \"ID Token environment variables are automatically found\", client-secret \"retained for backwards compatibility only\"." },
  tfcli:   { p:"doc", n:"HashiCorp — terraform plan", u:"https://developer.hashicorp.com/terraform/cli/commands/plan",
             d:"<code>-lock</code> defaults true; plan files save sensitive data <em>\"in cleartext\"</em>." },
  tfsrc:   { p:"src", n:"hashicorp/terraform — azure remote-state backend", u:"https://github.com/hashicorp/terraform/tree/main/internal/backend/remote-state/azure",
             d:"Infinite lease (<code>LeaseDuration: -1</code>, no renewal path); <code>terraformlockid</code> metadata; init's List Blobs; init→<code>ListKeys</code> when <code>use_azuread_auth</code> is unset; <code>storage.azure.com/.default</code> scope; 20-min <code>tokenExpiryDelta</code>; memory-only token cache. <strong>None of this is documented</strong> — it can change without a changelog." },
  tfpf:    { p:"src", n:"hashicorp/terraform — planfile writer", u:"https://github.com/hashicorp/terraform/tree/main/internal/plans/planfile",
             d:"Plan archives contain <code>tfstate</code> and <code>tfstate-prev</code> entries — the sensitivity is documented, the mechanism is source-only." },
} satisfies Record<string, Source>;
type SourceKey = keyof typeof SOURCES;

/* Which sources back which step. Empty = nothing to cite; the step's chip
   says INFERRED and the note explains what the reasoning rests on. */
const REFS: Record<LaneId, SourceKey[][]> = {
  fed: [ ["disco"], ["ghref","toolkit"], ["ghref"], ["mscert","tfsrc"], [], ["mstok"], ["tfback"], ["mskey"] ],
  sec: [ [], ["mscert"], [], ["mstok"], ["tfback","tfsrc"], ["mskey"] ],
};

const W = 540;
const NUM_X = 15;
const LANE_X = [94, 221, 349, 476];
const BOX_W = 112, BOX_H = 46, HEAD_Y = 8;
const BAND1 = { y:100, h:200 }, BAND2 = { y:304 };
const Y = { p0:150, a:214, b:278, present:358, verify:422, token:486, blob:550, rbac:614 };
const SVG_H = 670;

const FED_LANES: Lane[] = [
  { h:"CI Runner",       s:"ephemeral VM" },
  { h:"CI OIDC issuer",  s:"token.actions.githubusercontent.com" },
  { h:"Entra ID",        s:"login.microsoftonline.com" },
  { h:"Blob",            s:"<acct>.blob.core.windows.net" },
];
const SEC_LANES: Lane[] = [
  { h:"CI Runner",       s:"ephemeral VM" },
  { h:"CI secret store", s:"encrypted at rest" },
  { h:"Entra ID",        s:"login.microsoftonline.com" },
  { h:"Blob",            s:"<acct>.blob.core.windows.net" },
];

const FED: Step[] = [
  { y:Y.p0, from:2, to:1, color:"muted", label:"GET /.well-known/jwks",
    eyebrow:"PHASE 0 · OUT OF BAND", title:"Entra caches the issuer's public keys", when:"before your run · on Entra's schedule",
    prov:"inf", provNote:`The endpoints and their contents are <b>documented and live-fetchable</b> — I pulled this discovery doc during this session. But <b>the caching cadence is my inference</b>: Entra's JWKS refresh interval is not published anywhere. Standard OIDC relying-party behaviour is to cache and refetch on unknown <code>kid</code>; I can't prove Entra's specific timing.`,
    wire:`<span class="k">GET</span> https://token.actions.githubusercontent.com/.well-known/openid-configuration
<span class="c">→ 200  (fetched live while building this page)</span>
{
  "issuer": <span class="s">"https://token.actions.githubusercontent.com"</span>,
  "jwks_uri": <span class="s">"https://token.actions.githubusercontent.com/.well-known/jwks"</span>,
  "id_token_signing_alg_values_supported": [<span class="s">"RS256"</span>]
}

<span class="k">GET</span> https://token.actions.githubusercontent.com/.well-known/jwks
<span class="c">→ 200</span>
{ "keys": [ { "kty":"RSA", "kid":"…", "n":"…", "e":"AQAB" } ] }

<span class="c"># no auth. no registration. an anonymous GET of a public file.</span>`,
    note:`<strong>This is the entire trust relationship.</strong> Not a handshake — a cached HTTP GET. The issuer's logs show an anonymous fetch of a public JSON file and nothing else; it has never heard of your tenant and is never consulted during your run. The trust bottoms out at <strong>web PKI</strong>: a CA vouched for that hostname's TLS certificate, so Entra believes the keys belong to who it thinks.`,
    blast:null },

  { y:Y.a, from:0, to:1, color:"good", label:"GET id-token · aud=AzureADTokenExchange",
    eyebrow:"STEP 1 · RUNNER → CI ISSUER", title:"The job asks CI to vouch for it", when:"never touches Azure",
    prov:"doc", provNote:`Env var names, the curl form and the <code>audience</code> query param are documented. The <code>encodeURIComponent</code> and <code>setSecret</code> behaviour is verified in <b>actions/toolkit source</b>. <b>The URL's shape is an undocumented internal</b> — treat it as opaque.`,
    wire:`<span class="k">GET</span> $ACTIONS_ID_TOKEN_REQUEST_URL<span class="w">&amp;audience=api://AzureADTokenExchange</span>
<span class="k">Authorization:</span> bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN

<span class="c"># Both are injected by the runner, and ONLY if the job declares:</span>
permissions:
  id-token: <span class="s">write</span>
<span class="c"># Without it neither var exists and getIDToken() throws.

# _URL   → GitHub's Actions token service, scoped to THIS run + job.
#          Shape is an undocumented internal. Treat as opaque.
# _TOKEN → a bearer credential FOR GITHUB, not for Azure. It proves to
#          GitHub "I am job 3 of run 991". This is GitHub authenticating
#          its OWN runner. Azure is nowhere near this step.

# Three distinct credentials, which people collapse into one:
#   1. the runner credential  ($ACTIONS_ID_TOKEN_REQUEST_TOKEN)
#   2. the signed assertion   (the JWT that comes back)
#   3. the Azure access token (what Entra hands over later)</span>`,
    note:`Drop the <code>audience</code> param and <code>aud</code> defaults to your org URL, so Entra rejects it. That's the most common "it worked in the tutorial" failure. The toolkit calls <code>setSecret()</code> on the returned JWT, so it's masked in logs. <strong>Nothing here contacts Azure.</strong>`,
    blast:null },

  { y:Y.b, from:1, to:0, color:"good", label:"200 { value: <JWT> }",
    eyebrow:"STEP 2 · CI ISSUER → RUNNER", title:"A signed statement of fact", when:"lifetime undocumented",
    prov:"inf", provNote:`Claim <b>names</b> and the <code>sub</code> formats are documented; the <b>values below are illustrative</b>. <b>The token's lifetime is not documented anywhere</b> — GitHub publishes <code>exp</code> inside the token but states no duration. Any number you've heard (including mine, earlier) is folklore.`,
    wire:`<span class="c">200 OK</span>
{"value":"eyJhbGciOiJSUzI1NiIsImtpZCI6…"}

<span class="c">── header ──</span>
{ "alg":<span class="s">"RS256"</span>, "kid":"…", "typ":"JWT" }
<span class="c">── payload (values illustrative; claim names documented) ──</span>
{
  "iss": <span class="s">"https://token.actions.githubusercontent.com"</span>,
  "aud": <span class="s">"api://AzureADTokenExchange"</span>,
  "sub": <span class="w">"repo:my-org/my-repo:environment:prod"</span>,
  "repository": "my-org/my-repo",
  "environment": "prod",
  "job_workflow_ref": "my-org/my-repo/.github/workflows/deploy.yml@refs/heads/main",
  "run_id": "…", "actor": "…", "jti": "…",
  "iat": …, "nbf": …, <span class="r">"exp": …   ← duration UNDOCUMENTED</span>
}

<span class="c"># documented sub formats:
#   repo:ORG/REPO:ref:refs/heads/BRANCH
#   repo:ORG/REPO:environment:ENV
#   repo:ORG/REPO:pull_request        ← loosest one there is
#   repo:ORG@ORG-ID/REPO@REPO-ID:…    ← immutable format, new repos</span>`,
    note:`The issuer is a <strong>notary</strong>. It stamps what is true about this run and walks away — it does not know or care that the token is bound for Azure. The same JWT could be handed to AWS, GCP, Vault, or dropped on the floor. <strong>Adding <code>environment:</code> to a job changes this <code>sub</code> string</strong>, which silently breaks a <code>ref:</code>-based federated credential.`,
    blast:{ art:"CI OIDC JWT", ttl:"short, but the duration is <strong>undocumented</strong>", scope:"replayable only to Entra, only as this one app, only for the requested audience", sev:"lo", sevT:"LOW",
            what:"An attacker must exfiltrate it <em>and</em> replay it before <code>exp</code>. It mints nothing else." } },

  { y:Y.present, from:0, to:2, color:"good", label:"POST /oauth2/v2.0/token  (assertion)",
    eyebrow:"STEP 3 · RUNNER → ENTRA", title:"Present the assertion", when:"RFC 7523 client assertion",
    prov:"doc", provNote:`The <code>client_assertion_type</code> URN and the parameter set are documented by Microsoft. The <b>scope value is source-only</b> — see the lifecycle section below.`,
    wire:`<span class="k">POST</span> https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
<span class="k">Content-Type:</span> application/x-www-form-urlencoded

grant_type=<span class="s">client_credentials</span>
&amp;client_id=<span class="s">{app-id}</span>
&amp;scope=<span class="s">https%3A%2F%2Fstorage.azure.com%2F.default</span>
&amp;client_assertion_type=<span class="s">urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer</span>
&amp;client_assertion=<span class="w">eyJhbGciOiJSUzI1NiIs…</span>   <span class="c"># ← the CI JWT</span>

<span class="c"># RFC 7523. This is the SAME client-assertion slot a certificate JWT
# would occupy — the request shape is identical. The only difference:
# this assertion was signed by someone else.</span>`,
    note:`<code>client_id</code>, <code>tenant_id</code> and <code>subscription_id</code> are <strong>not secrets</strong> — they're identifiers. People stash them in CI secrets out of habit; harmless, but it isn't buying anything.`,
    blast:null },

  { y:Y.verify, self:2, color:"c4", label:"verify — offline",
    eyebrow:"STEP 4 · INSIDE ENTRA", title:"Verification, calling nobody", when:"no packets to the issuer",
    prov:"inf", provNote:`<b>My reconstruction of the ordering, not a documented algorithm.</b> That the four fields must match is implied by how federated credentials are configured; the internal sequence is not published. Error codes are from recall — <b>verify before you trust them</b>.`,
    wire:`<span class="c"># Entra, offline. It does NOT call the issuer here.
# (Ordering below is reconstructed, not a documented algorithm.)</span>

1. header.kid <span class="c">→</span> cached JWKS key <span class="c">→</span> verify RS256 signature   <span class="s">✓</span>
2. client_id <span class="c">→</span> its registered federatedIdentityCredentials
3. iss <span class="c">must equal the configured issuer</span>                       <span class="s">✓</span>
   aud <span class="c">must equal the configured audience</span>                     <span class="s">✓</span>
   sub <span class="c">must equal the configured subject</span>
       <span class="r">↑ EXACT string equality. no wildcard. no prefix.</span>          <span class="s">✓</span>
4. nbf ≤ now &lt; exp                                             <span class="s">✓</span>

<span class="c"># A mismatch surfaces as an AADSTS7002xx-class error meaning
# "no matching federated credential" — in practice, a wrong sub.
# (Exact codes: recall, unverified.)</span>`,
    note:`Two questions people conflate. <strong>Authenticating the issuer</strong> ("is this really GitHub?") is answered by the signature — automatic, nothing to configure. <strong>Authorizing the workload</strong> ("should <em>this run</em> get a token?") is answered <em>entirely</em> by the <code>sub</code> string you typed. The issuer will happily sign a truthful token for <em>any</em> repo on its platform, including one created five minutes ago to look like yours. The <code>sub</code> check is the only thing in the way.`,
    blast:null },

  { y:Y.token, from:2, to:0, color:"good", label:"200 { access_token }",
    eyebrow:"STEP 5 · ENTRA → RUNNER", title:"A real Azure token", when:"60–90 min, randomised",
    prov:"doc", provNote:`Lifetime is documented and is <b>not a fixed hour</b>: <i>"an access token's default lifetime is assigned a random value ranging between 60-90 minutes (75 minutes on average)"</i>. Configurable via <code>AccessTokenLifetime</code> (min 10 min, max 24 h). CAE-aware sessions can extend to 24–28 h.`,
    wire:`<span class="c">200 OK</span>
{
  "token_type": <span class="s">"Bearer"</span>,
  "expires_in": <span class="w">…</span>,   <span class="c"># NOT a fixed 3600. Randomised 60–90 min.</span>
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiI…"
}

<span class="c"># Microsoft, verbatim:
#   "When issued, an access token's default lifetime is assigned a
#    random value ranging between 60-90 minutes (75 minutes on average)."
#
# Configurable via an AccessTokenLifetime policy:
#   minimum 00:10:00   maximum 23:59:59
# Continuous Access Evaluation can extend it to 24-28 hours.

# From this line down, the two lanes are byte-identical.</span>`,
    note:`The federation is <strong>over</strong>. Everything after this is indistinguishable from having used a client secret — same token shape, same authorization. The credential model only ever mattered at step 4. <strong>The randomised 60–90 window matters</strong>: anything that assumes a flat hour is wrong, and the SDK's refresh logic keys off it.`,
    blast:{ art:"Azure access token", ttl:"60–90 min, randomised (documented)", scope:"whatever RBAC the service principal holds", sev:"md", sevT:"MEDIUM",
            what:"Identical exposure in <em>both</em> lanes. This artifact is not where the two approaches differ." } },

  { y:Y.blob, from:0, to:3, color:"accent", label:"GET /{container}/{key}",
    eyebrow:"STEP 6 · RUNNER → BLOB", title:"Read the object", when:"identical in both lanes",
    prov:"doc", provNote:`<code>use_azuread_auth</code> and the <code>ARM_*</code> variables are documented by HashiCorp. <b>Earlier this page carried an <code>x-ms-version</code> header I invented</b> — it's gone; I have no basis for a specific value.`,
    wire:`<span class="k">GET</span> https://{account}.blob.core.windows.net/{container}/{key}
<span class="k">Authorization:</span> Bearer eyJ0eXAiOiJKV1Qi…

<span class="c"># Reached here with NO azure/login step — terraform's backend does
# the OIDC fetch and exchange itself:</span>
env:
  ARM_USE_OIDC:    <span class="s">true</span>
  ARM_USE_AZUREAD: <span class="s">true</span>   <span class="c"># ← talk to blob via Entra RBAC, not a key</span>

<span class="c"># ARM_USE_AZUREAD is load-bearing in BOTH lanes. Without it the
# backend falls back to shared-key auth, and every bit of RBAC you
# configured becomes decorative.</span>`,
    note:`The interesting failure isn't "used a client secret" — it's reaching for an <strong>account access key</strong> because it's the one that Just Works. A key is not a weaker service principal; it's <strong>not a service principal at all</strong>. It bypasses RBAC entirely and appears in logs as nobody.`,
    blast:null },

  { y:Y.rbac, self:3, color:"accent", label:"RBAC evaluation",
    eyebrow:"STEP 7 · INSIDE STORAGE", title:"The authorization check", when:"identical in both lanes",
    prov:"doc", provNote:`The <code>listKeys</code> quote is verbatim from Microsoft's shared-key page. Container-level RBAC scoping is documented Azure behaviour.`,
    wire:`<span class="c"># Storage evaluates the token's oid against role assignments.</span>

oid   <span class="w">{sp-object-id}</span>
scope <span class="c">…/blobServices/default/containers/</span><span class="s">{container}</span>
role  <span class="s">Storage Blob Data Contributor</span>                     <span class="s">✓ ALLOW</span>

<span class="c"># Azure RBAC granularity for blobs stops at the CONTAINER.
# A token scoped to one container 403s on another.</span>

<span class="c"># But an ACCOUNT KEY bypasses this check entirely, and Microsoft
# is blunt about who can mint one — verbatim:</span>

  <span class="r">"[Owner/Contributor/Storage Account Contributor] do not provide
   access to data in a storage account via Microsoft Entra ID.
   However, they include Microsoft.Storage/storageAccounts/
   listkeys/action, which grants access to the account access keys.
   With this permission, a user can use the account access keys to
   access ALL DATA in a storage account."</span>

<span class="c"># allowSharedKeyAccess is UNSET by default, which Azure treats as
# allowed. So container-scoped RBAC is opt-in until you disable it.</span>`,
    note:`The under-sold cost of the secret lane lands upstream, in the sign-in log. A federated sign-in is attributable to a specific <code>sub</code> — a repo, an environment, a run. A secret sign-in tells you only that <em>someone, somewhere</em> had the password. <strong>I have not verified the exact log field names</strong>, so I'm not quoting them; earlier drafts of this page invented those strings.`,
    blast:null },
];

const SEC: Step[] = [
  { y:Y.p0, from:1, to:0, color:"danger", label:"secret injected into job env",
    eyebrow:"STEP 1 · SECRET STORE → RUNNER", title:"A password that already existed", when:"and for the last N months",
    prov:"doc", provNote:`CI secret injection is documented, ordinary behaviour. The <b>"places it exists at rest" list is reasoning, not a citation</b> — but it follows from the artifact being a static string somebody had to create and paste.`,
    wire:`<span class="c"># CI decrypts the secret and injects it into the job environment</span>
env:
  ARM_CLIENT_SECRET: <span class="r">\${{ secrets.ARM_CLIENT_SECRET }}</span>

<span class="c"># Before this run ever started, this value existed at rest in at
# least these places:
#   · Entra (stored somehow — the mechanism is NOT documented)
#   · the CI secret store
#   · whoever generated it: clipboard, shell history, password
#     manager, a browser tab, possibly a chat message
#
# The federated lane has NO equivalent of this step, because there
# is no artifact to store.</span>`,
    note:`This is the whole divergence, and it happens <strong>before the run begins</strong>. The federated lane's credential does not exist until the moment it's needed and stops existing minutes later. This one has been sitting somewhere, unchanged, since the day it was created.`,
    blast:{ art:"client secret", ttl:"until a human rotates it", scope:"mints unlimited tokens as the app, <strong>from any machine on earth</strong>", sev:"hi", sevT:"CRITICAL",
            what:"No replay window to beat. No binding to repo, branch, environment, workflow, or network. Possession <em>is</em> identity." } },

  { y:Y.present, from:0, to:2, color:"danger", label:"POST /oauth2/v2.0/token  (secret)",
    eyebrow:"STEP 2 · RUNNER → ENTRA", title:"Present the password", when:"same endpoint, same grant",
    prov:"doc", provNote:`The client-credentials-with-secret request is documented by Microsoft.`,
    wire:`<span class="k">POST</span> https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
<span class="k">Content-Type:</span> application/x-www-form-urlencoded

grant_type=<span class="s">client_credentials</span>
&amp;client_id=<span class="s">{app-id}</span>
&amp;scope=<span class="s">https%3A%2F%2Fstorage.azure.com%2F.default</span>
&amp;client_secret=<span class="r">{the secret}</span>   <span class="c"># ← the entire ballgame, one field</span>

<span class="c"># Compare to the federated step 3: same endpoint, same grant type,
# same scope. Entra treats client_secret and client_assertion as
# interchangeable proofs in the same slot.</span>`,
    note:`Everything from here is identical to the federated lane. That's not a rhetorical flourish — it's why swapping credential models doesn't touch your authorization model at all.`,
    blast:null },

  { y:Y.verify, self:2, color:"danger", label:"verify the secret",
    eyebrow:"STEP 3 · INSIDE ENTRA", title:"What Entra checks — and can't", when:"",
    prov:"inf", provNote:`<b>Corrected.</b> An earlier draft asserted <code>hash(secret) == stored hash</code> — <b>I invented that</b>; Microsoft does not document how secrets are stored, and I shouldn't have implied I knew. What survives is the part that's actually defensible: the <b>list of things the request cannot convey</b>, which follows from the request's contents.`,
    wire:`<span class="c"># Entra validates the presented secret against the app's registered
# credentials and checks it hasn't expired.
#
# HOW it's stored/compared is NOT documented. Earlier versions of
# this page claimed a hash comparison. That was invented. Removed.</span>

<span class="c"># The defensible part — what is NOT checked, because there is
# nothing in the request to check it against:</span>

   <span class="r">·</span> which repo sent it            <span class="r">— unknowable</span>
   <span class="r">·</span> which branch / environment    <span class="r">— unknowable</span>
   <span class="r">·</span> which workflow file           <span class="r">— unknowable</span>
   <span class="r">·</span> which machine, which network  <span class="r">— unknowable</span>
   <span class="r">·</span> whether a CI run is even happening

<span class="c"># Contrast the federated lane, where every one of those arrives as
# a signed claim that Entra can and does match on.</span>`,
    note:`<strong>This is the actual difference</strong>, and it's a difference in <em>how much the request can even tell Entra</em>. The federated assertion carries provenance. A secret carries none. Entra isn't being lazy — there is genuinely nothing else in the request to verify.`,
    blast:null },

  { y:Y.token, from:2, to:0, color:"warn", label:"200 { access_token }",
    eyebrow:"STEP 4 · ENTRA → RUNNER", title:"The identical token", when:"60–90 min, randomised",
    prov:"doc", provNote:`Same documented lifetime as the federated lane — because it <i>is</i> the same thing.`,
    wire:`<span class="c">200 OK</span>
{
  "token_type": <span class="s">"Bearer"</span>,
  "expires_in": <span class="w">…</span>,   <span class="c"># randomised 60–90 min, same as federated</span>
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiI…"
}

<span class="c"># Byte-for-byte the same shape as the federated lane's token.
# Same oid, same audience, same lifetime, same RBAC.
#
# Downstream, Azure cannot tell how this token was obtained.
# The distinction survives ONLY in the sign-in log.</span>`,
    note:`Worth sitting with: <strong>the authorization is identical</strong>. Swapping to a client secret does not weaken container-scoped RBAC one bit — as long as <code>use_azuread_auth</code> stays on. It weakens <em>authentication</em>, and it costs you <em>attribution</em>. That's a rotation-and-forensics liability, not a privilege escalation — which is why "just use a secret" isn't automatically catastrophic, and also why it's rarely worth it.`,
    blast:{ art:"Azure access token", ttl:"60–90 min, randomised", scope:"whatever RBAC the SP holds", sev:"md", sevT:"MEDIUM",
            what:"Same as the federated lane. Not where the two differ." } },

  { y:Y.blob, from:0, to:3, color:"accent", label:"GET /{container}/{key}",
    eyebrow:"STEP 5 · RUNNER → BLOB", title:"Read the object", when:"identical in both lanes",
    prov:"doc", provNote:`Backend config and the "backwards compatibility only" characterisation are documented by HashiCorp. The <code>init</code>→<code>ListKeys</code> behaviour is <b>source-verified, undocumented</b>.`,
    wire:`<span class="k">GET</span> https://{account}.blob.core.windows.net/{container}/{key}
<span class="k">Authorization:</span> Bearer eyJ0eXAiOiJKV1Qi…

<span class="c"># The strictest client-secret backend still keeps Entra RBAC:</span>
terraform {
  backend "azurerm" {
    <span class="s">use_azuread_auth = true</span>      <span class="c"># ← DO NOT DROP THIS</span>
    client_id        = <span class="s">"{app-id}"</span>
    <span class="c"># secret via ARM_CLIENT_SECRET, never in HCL</span>
  }
}
<span class="c"># HashiCorp calls this path "retained for backwards compatibility only".

# The trap — NOT "the secret version", but much worse:</span>
<span class="r">export ARM_ACCESS_KEY=…</span>   <span class="c"># shared key: root over EVERY container,
                          # no RBAC evaluation, no identity in logs.

# Source-verified, undocumented: with use_azuread_auth UNSET and no
# key/SAS supplied, "terraform init" reaches for the ARM management
# plane and calls ListKeys itself — i.e. the default path fetches an
# account key on your behalf.</span>`,
    note:`Both lanes converge here completely. If you take one thing from this page, take this: the credential model is a smaller lever than <code>use_azuread_auth</code>.`,
    blast:{ art:"account access key (if used)", ttl:"forever — until manually rotated", scope:"<strong>every container in the account</strong>. RBAC not consulted.", sev:"hi", sevT:"CRITICAL",
            what:"Collapses any per-container design in one env var." } },

  { y:Y.rbac, self:3, color:"accent", label:"RBAC evaluation",
    eyebrow:"STEP 6 · INSIDE STORAGE", title:"The authorization check", when:"identical in both lanes",
    prov:"doc", provNote:`Same documented check as the federated lane. The sign-in-log <b>field names are deliberately not quoted</b> — earlier drafts invented them.`,
    wire:`<span class="c"># Identical to the federated lane — same oid, same check.</span>

oid   <span class="w">{sp-object-id}</span>
scope <span class="c">…/containers/</span><span class="s">{container}</span>
role  <span class="s">Storage Blob Data Contributor</span>                     <span class="s">✓ ALLOW</span>

<span class="c"># The one forensic difference lands upstream, in Entra's sign-in
# log: a federated sign-in is attributable to a specific subject
# claim (a repo, an environment, a run). A secret sign-in is not.
#
# I have NOT verified the exact log field names or strings, so this
# page no longer quotes them. An earlier draft did — those were
# fabricated.</span>`,
    note:`Not just "it could leak" — <strong>you lose attribution</strong>. In the federated lane every token ever minted traces to a run. In the secret lane every token for the credential's whole life looks identical, including an attacker's.`,
    blast:null },
];

/* ══ render ═════════════════════════════════════════════════════════ */
const COL: Record<Color, string> = { good:"var(--good)", danger:"var(--danger)", warn:"var(--warn)",
              accent:"var(--accent)", muted:"var(--muted)", c4:"var(--c4)" };
const MK: Record<Color, string>  = { good:"ah-good", danger:"ah-danger", warn:"ah-warn",
              accent:"ah-accent", muted:"ah", c4:"ah-accent" };

function laneHeads(lanes: Lane[]){
  return lanes.map((l,i)=>{
    const x = LANE_X[i]! - BOX_W/2;
    return `<g>
      <rect x="${x}" y="${HEAD_Y}" width="${BOX_W}" height="${BOX_H}" rx="6"
            fill="var(--panel-2)" stroke="var(--border)"/>
      <foreignObject x="${x+7}" y="${HEAD_Y+7}" width="${BOX_W-14}" height="${BOX_H-12}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="lane-head">
          <span class="h">${l.h}</span><span class="s">${l.s}</span>
        </div>
      </foreignObject>
      <line class="lifeline" x1="${LANE_X[i]}" y1="${HEAD_Y+BOX_H}" x2="${LANE_X[i]}" y2="${SVG_H-14}"/>
    </g>`;
  }).join("");
}

function stepMark(st: Step, n: number, laneId: LaneId){
  const c = COL[st.color], mk = MK[st.color];
  let body: string, lx: number, lw: number;
  if (st.self != null){
    const x = LANE_X[st.self]!, w = 104, h = 26;
    body = `<rect x="${x-w/2}" y="${st.y-h/2}" width="${w}" height="${h}" rx="5"
                  fill="var(--panel-2)" stroke="${c}" class="wire"/>
            <text x="${x}" y="${st.y+4}" text-anchor="middle"
                  font-family="var(--mono)" font-size="10" font-weight="700" fill="${c}">⟳ internal</text>`;
    lx = x - w/2 - 8; lw = w + 16;
  } else {
    const x1 = LANE_X[st.from!]!, x2 = LANE_X[st.to!]!;
    const dir = x2 > x1 ? 1 : -1;
    body = `<path class="wire" d="M ${x1} ${st.y} L ${x2 - dir*7} ${st.y}" stroke="${c}"
                  ${st.color==="muted" ? 'stroke-dasharray="5 4"' : ''} marker-end="url(#${mk})"/>`;
    lx = Math.min(x1,x2) + 4; lw = Math.abs(x2-x1) - 8;
  }
  return `<g class="step" data-lane="${laneId}" data-i="${n}"
             data-viz-id="${laneId}-${n}" data-label="${st.label}">
    <rect class="hit" x="0" y="${st.y-34}" width="${W}" height="54"/>
    <foreignObject x="${lx}" y="${st.y-34}" width="${Math.max(lw,96)}" height="30">
      <div xmlns="http://www.w3.org/1999/xhtml" class="lbl">${st.label}</div>
    </foreignObject>
    ${body}
    <g class="num"><circle cx="${NUM_X}" cy="${st.y}" r="8" fill="${c}" stroke="var(--bg)"/>
      <text x="${NUM_X}" y="${st.y+3}" text-anchor="middle">${n+1}</text></g>
  </g>`;
}

function drawLane(svgEl: Element, lanes: Lane[], steps: Step[], laneId: LaneId){
  svgEl.innerHTML = `
    ${arrowMarkers()}
    <rect class="band" x="30" y="${BAND1.y}" width="${W-30}" height="${BAND1.h}" rx="6"/>
    <rect class="band-same" x="30" y="${BAND2.y}" width="${W-30}" height="${SVG_H-BAND2.y-8}" rx="6"/>
    <text class="band-lbl" x="38" y="${BAND1.y+12}" fill="var(--danger)">THE ONLY DIFFERENCE</text>
    <text class="band-lbl" x="38" y="${BAND2.y+12}" fill="var(--accent)">IDENTICAL FROM HERE ↓</text>
    ${laneHeads(lanes)}
    ${steps.map((s,i)=>stepMark(s,i,laneId)).join("")}`;
}

drawLane(document.getElementById("svg-fed")!, FED_LANES, FED, "fed");
drawLane(document.getElementById("svg-sec")!, SEC_LANES, SEC, "sec");

/* ══ selection ══════════════════════════════════════════════════════ */
const STEPS: Record<LaneId, Step[]> = { fed:FED, sec:SEC };
const PROV_LABEL: Record<Prov, string> = { doc:"DOCUMENTED", src:"SOURCE-ONLY", inf:"INFERRED", ill:"ILLUSTRATIVE" };
let sel: Sel = Object.assign({ lane:"fed" as LaneId, i:2 }, loadHash<Sel>());
if (!STEPS[sel.lane]) sel.lane = "fed";
sel.i = Math.max(0, Math.min(STEPS[sel.lane].length-1, sel.i|0));

function renderDetail(){
  const st = STEPS[sel.lane][sel.i]!;
  const b  = st.blast;
  const refs = REFS[sel.lane][sel.i] || [];
  document.getElementById("detail")!.innerHTML = `
    <div class="dh">
      <div class="eyebrow">${st.eyebrow}</div>
      <h4>${st.title}</h4>
      ${st.when ? `<div class="when">${st.when}</div>` : ""}
    </div>
    <div class="provbar">
      <span class="prov ${st.prov}">${PROV_LABEL[st.prov]}</span>
      <div class="pnote">${st.provNote}</div>
      ${ refs.length ? `<div class="reflinks">
        ${refs.map(k=>{ const s = SOURCES[k]; return `<a href="${s.u}" target="_blank" rel="noopener"
             title="${s.n}"><span class="prov ${s.p}">${PROV_LABEL[s.p]}</span>${s.n} ↗</a>`; }).join("")}
      </div>` : `<div class="reflinks nocite">Nothing to cite — see the note above for what the reasoning rests on.</div>` }
    </div>
    <pre class="wirebox">${st.wire}</pre>
    <div class="note">${st.note}</div>
    ${ b ? `
      <div class="blast">
        <div class="bt">IF THIS ARTIFACT LEAKS HERE</div>
        <div class="brow"><span class="bk">artifact</span><span class="bv"><code>${b.art}</code> <span class="sev ${b.sev}">${b.sevT}</span></span></div>
        <div class="brow"><span class="bk">useful for</span><span class="bv">${b.ttl}</span></div>
        <div class="brow"><span class="bk">gets you</span><span class="bv">${b.scope}</span></div>
        <div class="brow"><span class="bk">so what</span><span class="bv">${b.what}</span></div>
      </div>` : `
      <div class="blast none">No credential material on the wire at this step.</div>` }`;

  document.querySelectorAll<SVGGElement>(".step").forEach(g=>{
    const on = g.dataset["lane"]===sel.lane && +g.dataset["i"]! === sel.i;
    g.classList.toggle("sel", on);
    g.classList.toggle("dim", !on);
  });
  saveHash(sel);
}

document.querySelectorAll<SVGGElement>(".step").forEach(g=>{
  g.addEventListener("click", ()=>{ sel.lane=g.dataset["lane"] as LaneId; sel.i=+g.dataset["i"]!; renderDetail(); });
});

addEventListener("keydown", e=>{
  const n = STEPS[sel.lane].length;
  if (e.key==="ArrowRight"){ sel.i=(sel.i+1)%n; }
  else if (e.key==="ArrowLeft"){ sel.i=(sel.i-1+n)%n; }
  else if (e.key==="ArrowUp"||e.key==="ArrowDown"){
    sel.lane = sel.lane==="fed" ? "sec" : "fed";
    sel.i = Math.min(sel.i, STEPS[sel.lane].length-1);
  } else return;
  e.preventDefault(); renderDetail();
});

document.getElementById("reset")!.addEventListener("click", ()=>{ sel.lane="fed"; sel.i=0; renderDetail(); });

let timer: ReturnType<typeof setInterval> | null=null;
document.getElementById("play")!.addEventListener("click", e=>{
  const target = e.target as HTMLElement;
  if (timer){ clearInterval(timer); timer=null; target.textContent="▶ Play both"; target.classList.remove("on"); return; }
  target.textContent="⏸ Pause"; target.classList.add("on");
  sel.lane="fed"; sel.i=0; renderDetail();
  timer = setInterval(()=>{
    if (sel.i < STEPS[sel.lane].length-1) sel.i++;
    else if (sel.lane==="fed"){ sel.lane="sec"; sel.i=0; }
    else { clearInterval(timer!); timer=null;
           document.getElementById("play")!.textContent="▶ Play both";
           document.getElementById("play")!.classList.remove("on"); }
    renderDetail();
  }, 2600);
});

renderDetail();

/* ══ lifecycle — who calls /token, when ════════════════════════════ */
const D = { gh:"var(--good)", entra:"var(--c4)", blob:"var(--accent)", other:"var(--muted)" };
const PROCS = [
  { cmd:"terraform init", meta:"New OS process. Empty token cache.",
    calls:[
      { c:D.gh,    t:"GET $ACTIONS_ID_TOKEN_REQUEST_URL", e:"fresh CI JWT #1" },
      { c:D.entra, t:"POST /{tenant}/oauth2/v2.0/token", e:"scope=https://storage.azure.com/.default → access token" },
      { c:D.blob,  t:"GET /{container}?restype=container&comp=list", e:"List Blobs — yes, init hits the data plane" },
      { c:D.blob,  t:"GET /{container}/{key}", e:"Get Blob — read state" },
    ],
    ann:`<strong>init locks only conditionally</strong> — a lease is taken solely when the state blob doesn't exist yet and must be created. Existing state → no lock on init.`,
    foot:`Process exits → the in-memory token is discarded. Nothing persists to disk.` },

  { cmd:"terraform plan -out=tfplan", meta:"New process. Nothing cached. Full re-auth.",
    calls:[
      { c:D.gh,    t:"GET $ACTIONS_ID_TOKEN_REQUEST_URL", e:"fresh CI JWT #2 — the first one is long gone" },
      { c:D.entra, t:"POST /{tenant}/oauth2/v2.0/token", e:"a second, independent exchange" },
      { c:D.blob,  t:"PUT /{container}/{key}?comp=lease", e:"x-ms-lease-action: acquire · x-ms-lease-duration: -1 (infinite)" },
      { c:D.blob,  t:"PUT /{container}/{key}?comp=metadata", e:"writes terraformlockid" },
      { c:D.blob,  t:"GET /{container}/{key}", e:"read state — plan does NOT write state" },
      { c:D.blob,  t:"PUT …?comp=lease (release)", e:"" },
      { c:D.other, t:"provider auth — separate", e:"aws / keycloak / gitlab / … authenticate with their own creds, to their own APIs" },
    ],
    ann:`<strong>plan locks by default</strong> (<code>-lock</code> defaults true). And the resulting <code>tfplan</code> <strong>embeds full state snapshots</strong> — the archive contains <code>tfstate</code> and <code>tfstate-prev</code> entries. HashiCorp: <em>"any sort of sensitive data … will be saved in cleartext in the plan file."</em> Treat the plan artifact as state-equivalent for exfiltration purposes.`,
    foot:`Process exits → token discarded again.` },

  { cmd:"terraform apply tfplan", meta:"New process. Nothing cached. Full re-auth.",
    calls:[
      { c:D.gh,    t:"GET $ACTIONS_ID_TOKEN_REQUEST_URL", e:"fresh CI JWT #3" },
      { c:D.entra, t:"POST /{tenant}/oauth2/v2.0/token", e:"a third, independent exchange" },
      { c:D.blob,  t:"PUT …?comp=lease", e:"acquire, duration -1" },
      { c:D.blob,  t:"GET /{container}/{key}", e:"read state" },
      { c:D.blob,  t:"PUT /{container}/{key}", e:"Put Block Blob — WRITE state" },
      { c:D.blob,  t:"PUT …?comp=lease (release)", e:"" },
    ],
    ann:`<strong>If the apply outlives the token</strong>, the SDK renews <em>20 minutes before</em> expiry — and to do so it fetches a <strong>brand-new CI JWT</strong> and re-exchanges it. So a long apply keeps calling the CI OIDC endpoint. Because the lease is infinite with no renewal path, the <em>lock</em> can never lapse mid-apply — a token failure breaks the write, leaving a stuck lease that needs <code>force-unlock</code>.`,
    foot:`Whether $ACTIONS_ID_TOKEN_REQUEST_TOKEN stays valid late in a very long job is <strong>undocumented</strong>. Not guessing.` },
];

document.getElementById("procs")!.innerHTML = PROCS.map((p,i)=>`
  <div class="proc" data-viz-id="proc-${i}" data-label="${p.cmd}">
    <div class="ph"><code>${p.cmd}</code><div class="pmeta">${p.meta}</div></div>
    <ul class="calls">
      ${p.calls.map(c=>`<li><span class="d" style="background:${c.c}"></span>
        <span>${c.t}${c.e?`<em>${c.e}</em>`:""}</span></li>`).join("")}
      <li class="ann">${p.ann}</li>
    </ul>
    <div class="pfoot">${p.foot}</div>
  </div>`).join("");

/* ══ ttl chart — log scale, honest ranges ══════════════════════════ */
const MIN=60, HOUR=3600, DAY=86400, MO=2592000, YR=31536000;
const LO=Math.log(MIN), HI=Math.log(8*YR);
const posOf = (s: number) => ((Math.log(s)-LO)/(HI-LO))*100;

const TTL = [
  { n:"CI OIDC JWT", e:"federated · per exchange", lo:300, hi:900,
    c:"var(--good)", t:"undocumented", unknown:true },
  { n:"Azure access token", e:"both lanes", lo:60*60, hi:90*60,
    c:"var(--warn)", t:"60–90 min" },
  { n:"Client secret", e:"as configured", lo:MO*6, hi:2*YR,
    c:"var(--danger)", t:"months → years" },
  { n:"Account access key", e:"the trap", lo:8*YR, hi:8*YR,
    c:"var(--danger)", t:"∞ until rotated", inf:true },
];
const TICKS = [ {s:MIN,l:"1 min"}, {s:HOUR,l:"1 hr"}, {s:DAY,l:"1 day"},
                {s:MO,l:"1 mo"}, {s:2*YR,l:"2 yr"}, {s:8*YR,l:"∞"} ];

document.getElementById("ttl")!.innerHTML = TTL.map(d=>{
  const a = posOf(d.lo), b = Math.max(posOf(d.hi), a+1.5);
  const grid = TICKS.slice(1,-1).map(t=>`<div class="ttl-tick" style="left:${posOf(t.s)}%"></div>`).join("");
  const hatch = d.inf
    ? `repeating-linear-gradient(45deg,var(--danger),var(--danger) 6px,#8b1f1a 6px,#8b1f1a 12px)`
    : `repeating-linear-gradient(45deg, ${d.c} 0 4px, transparent 4px 8px)`;
  return `<div class="ttl-row" data-viz-id="ttl-${d.n}" data-label="${d.n} lifetime">
    <div class="ttl-name">${d.n}<em>${d.e}</em></div>
    <div class="ttl-track">
      ${grid}
      <div class="ttl-fill" style="left:0;width:${a}%;background:${d.c};${d.unknown?'opacity:.35':''}"></div>
      <div class="ttl-band" style="left:${a}%;width:${b-a}%;background:${hatch};opacity:.9"></div>
      <div class="ttl-val ${b>65?"inside":""}"
           style="${b>65 ? `right:calc(${100-b}% + 8px)` : `left:calc(${b}% + 8px)`}">${d.t}${d.unknown?" ?":""}</div>
    </div>
  </div>`;
}).join("");

document.getElementById("ttlAxis")!.innerHTML =
  TICKS.map(t=>`<span style="left:${posOf(t.s)}%">${t.l}</span>`).join("");

/* ══ sources panel ═════════════════════════════════════════════════
   SOURCES itself is declared at the top of this module — renderDetail()
   links into it on first paint. This only renders the panel.            */
const UNKNOWN = [
  "The CI OIDC JWT's lifetime. GitHub publishes <code>exp</code> in the token but states no duration. Every number in circulation is folklore.",
  "How Entra stores/compares a client secret. An earlier draft of this page asserted a hash comparison — that was invented.",
  "Entra's JWKS cache interval — the \"Phase 0\" cadence is inferred from standard OIDC behaviour, not published.",
  "Entra sign-in log field names for federated vs secret sign-ins. Earlier drafts quoted strings that do not exist.",
  "Whether <code>$ACTIONS_ID_TOKEN_REQUEST_TOKEN</code> stays valid late in a very long job — matters for applies that outlive a token refresh.",
  "The exact AADSTS error codes for a subject mismatch. Recall only.",
];

document.getElementById("sources")!.innerHTML =
  Object.values(SOURCES).map(s=>`<div class="src">
    <div class="sh"><span class="prov ${s.p}">${PROV_LABEL[s.p]}</span>
      <a href="${s.u}" target="_blank" rel="noopener">${s.n} ↗</a></div>
    <p>${s.d}</p></div>`).join("")
  + `<div class="src unknown" style="margin-top:12px">
       <div class="sh"><span class="prov ill">NOT KNOWN</span>
       <span style="font:600 11.5px var(--sans);color:var(--text)">Things this page refuses to guess</span></div>
       <p style="margin-top:6px">${UNKNOWN.map(u=>`• ${u}`).join("<br>")}</p>
     </div>`;

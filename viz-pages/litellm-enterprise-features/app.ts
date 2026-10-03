interface Domain { id: string; name: string; tag: string; oss: string[]; ent: string[]; work: string[] }

const DOMAINS: Domain[] = [
  {
    id: "auth", name: "Auth & Identity (API requests)",
    tag: "Virtual keys, the custom_auth callback, and key scoping are OSS; no-code JWT/OAuth, SCIM v2, and key rotation are Enterprise.",
    oss: [
      "<b>Virtual keys</b> — full CRUD: <code>/key/generate · /update · /info · /list · /delete · /block · /unblock</code>; master key via <code>LITELLM_MASTER_KEY</code>.",
      "<b><code>custom_auth</code> callback</b> — point <code>general_settings.custom_auth</code> at your function; it gets <code>(request, api_key)</code> and returns a <code>UserAPIKeyAuth</code>. Validate JWTs, call an IdP, map headers — anything.",
      "Key scoping: <code>team_id · user_id · models</code> allowlist, <code>metadata</code>, <code>aliases</code>, expiry/<code>duration</code>, <code>allowed_routes</code> per key, custom key header name.",
      "<code>key_generation_settings</code> — restrict who may call <code>/key/generate</code> and with which params (role-based).",
    ],
    ent: [
      "<code>litellm_jwtauth</code> — <b>no-code JWT auth</b>: LiteLLM parses & verifies the JWT, maps claims → teams/orgs for you.",
      "<code>oauth2_config</code> — opaque-token validation against an introspection endpoint, no code.",
      "<b>SCIM v2</b> — auto-provision/deprovision users & groups from your IdP (entire <code>/scim/v2/*</code> router gated).",
      "Custom SSO handler class; the <code>mode: auto</code> variant of custom-auth that maps results onto virtual keys.",
      "Virtual-key <b>regeneration / scheduled rotation</b> with grace periods (<code>/key/regenerate</code>).",
    ],
    work: [
      "JWT / OAuth → <span class='verdict-clean'>write a <code>custom_auth</code> callback</span> that decodes & verifies the bearer token (PyJWT + JWKS). Explicitly documented seam; the standard self-host pattern.",
      "SCIM → <span class='verdict-no'>no clean workaround</span>; script <code>/user/new</code> + <code>/team/member_add</code> from your IdP's webhooks.",
      "Key rotation → cron a <code>/key/delete</code> + <code>/key/generate</code> and push the new value yourself.",
    ],
  },
  {
    id: "ui", name: "Admin UI & SSO",
    tag: "The full Admin UI is OSS and SSO is free up to 5 users; SSO beyond 5 users and custom UI/email branding are Enterprise.",
    oss: [
      "<b>The full Admin UI</b> (<code>/ui</code>) — models, keys, teams, users, spend/logs views, key-test playground, model-add. Login via master key or <code>UI_USERNAME</code>/<code>UI_PASSWORD</code>.",
      "<b>SSO for up to 5 users — free since v1.76.0</b>. Okta, Google, Microsoft/Entra, generic OIDC.",
      "Internal-user self-serve UI (users mint their own keys, see own spend); the 4 global roles.",
    ],
    ent: [
      "SSO <b>beyond 5 users</b>.",
      "Per-user UI RBAC / scoped UI views (a viewer sees only their team's keys, etc.).<span class='note'>No code gate found — the concrete scoping seams (<code>ui_access_mode</code>, <code>restricted_sso_group</code>) are OSS/ungated. Either mislabeled or refers to a feature not in the OSS tree.</span>",
      "Custom UI + email branding (logo, colors).",
    ],
    work: [
      "SSO past 5 seats / org-wide → <span class='verdict-clean'>front the UI with <code>oauth2-proxy</code></span> (or Cloudflare Access / F5 BIG-IP APM). Proxy does OIDC, only forwards authenticated requests.",
      "In-UI RBAC granularity → <span class='verdict-no'>no clean workaround</span> — everyone past the front-proxy is effectively an admin. Fine for a small platform team.",
      "Or skip the UI in prod entirely — everything is API/IaC-manageable; use the UI only in dev.",
    ],
  },
  {
    id: "rbac", name: "Access Control & RBAC",
    tag: "Global roles, teams, and per-key model allowlists are OSS; team admins, Projects, and admin_only_routes are Enterprise.",
    oss: [
      "The 4 built-in global roles: <code>proxy_admin · proxy_admin_viewer · internal_user · internal_user_viewer</code>.",
      "<b>Teams</b> — <code>/team/new · /update · /member_add · /member_delete · /info · /list</code>; per-team <code>models</code> allowlist, <code>max_budget</code>, <code>tpm_limit · rpm_limit · max_parallel_requests</code>, <code>blocked</code>.",
      "Per-key model allowlists; the user → team → key hierarchy; <code>default_internal_user_params</code>.",
      "<code>model_group_alias</code> and named model-access groups (define a group in config, grant a key/team the group name).",
    ],
    ent: [
      "<b>Organizations</b> hierarchy + <code>org_admin</code> role (a layer above teams).<span class='note'><b style='color:var(--ent)'>⚠ honor-system.</b> <code>organization_endpoints.py</code> carries <em>no</em> <code>premium_user</code> check (MIT) — but docs mark org/team roles \"✨ Premium\". Runs on OSS, marketed as paid. (Unlike team-admins/Projects, which are hard-gated.)</span>",
      "<b>Team admins</b> — assigning a team member <code>role: admin</code>; team-member-permission config.",
      "<code>admin_only_routes</code> + the <code>allowed_routes</code> route ACL.<span class='note'><b style='color:var(--ent)'>⚠ honor-system.</b> <code>admin_only_routes</code>/<code>allowed_routes</code> are gated, but <b>IP allowlists</b> (<code>allowed_ips</code>) have no code gate (<code>auth_utils.py</code>, MIT). Docs still say \"You need a LiteLLM License to unlock this feature\" — runs on OSS, marketed as paid.</span>",
      "<b>Projects</b> — a sub-team layer below teams.",
      "Binding a <b>named model-access group that resolves to a wildcard route</b> onto a key.<span class='note'>A bare pattern like <code>models: [\"openai/*\"]</code> directly on a key is OSS (<code>auth_checks.py</code>); only mapping a <em>named access-group</em> to a wildcard route is gated.</span>",
    ],
    work: [
      "Org hierarchy → flatten to teams with a naming convention. <span class='verdict-no'>You lose delegated org admins — <code>proxy_admin</code> is all-or-nothing, no workaround.</span>",
      "<code>admin_only_routes</code> / route ACLs → enforce in a reverse proxy or inside your <code>custom_auth</code> callback.",
      "IP allowlist → reverse proxy / firewall / <code>request.client.host</code> check in <code>custom_auth</code>.",
    ],
  },
  {
    id: "budgets", name: "Budgets & Spend",
    tag: "Per-key/team/user/end-user/provider budgets, spend tracking, and rate limits are OSS; tag-budget enforcement, model_max_budget, and the /global/spend/report rollup are Enterprise.",
    oss: [
      "<b>Per-key budgets</b>: <code>max_budget</code> + <code>budget_duration</code> (<code>\"30d\" · \"24h\" · \"30s\"</code>) → auto-resets on the rolling window; <code>soft_budget</code> = alert threshold without blocking.",
      "<b>Per-team budgets</b>: <code>max_budget</code> + <code>budget_duration</code> on <code>/team/new</code>, with reset tracking.",
      "<b>Per-internal-user budgets</b>: on <code>/user/new</code>; plus <code>max_internal_user_budget</code> / <code>default_internal_user_budget</code> globals.",
      "<b>Per-end-user (customer) budgets</b>: <code>/budget/new</code> (named budget w/ <code>max_budget · tpm_limit · rpm_limit · budget_duration</code>) → attach via <code>/customer/new · /customer/update</code>. Caps the <code>user</code> field in the request body without minting a key.",
      "<b>Per-provider budgets</b>: <code>provider_budget_config</code> on the Router + <code>/provider/budgets</code>.",
      "<b>Spend tracking</b>: auto cost-calc for 100+ models → <code>LiteLLM_SpendLogs</code> table; <code>x-litellm-response-cost</code> header. Tracked by key / team / user / end-user / model / <b>tag</b>.",
      "<b>Spend query endpoints (all OSS)</b>: <code>/spend/logs · /spend/calculate · /spend/keys · /spend/users · /spend/tags · /global/spend · /global/spend/{keys,teams,end_users,models,provider,logs,tags} · /global/activity · /user/daily/activity</code> …",
      "<b>Rate limits</b>: TPM / RPM / <code>max_parallel_requests</code> at key, team, and user level; per-model TPM/RPM dicts on a key/team; provider-level via Router. Redis-backed for multi-instance.",
    ],
    ent: [
      "<b>Tag-based budgets</b> — defining a budget keyed on a request tag and <em>enforcing</em> it (tag spend <em>visibility</em> is OSS).",
      "<b><code>model_max_budget</code> on a key</b> — per-model spend caps within a single virtual key.<span class='note'>Genuinely gated — <code>key_management_endpoints.py</code> <code>validate_model_max_budget()</code> raises without a license. The runtime limiter is ungated, but you can't <em>set</em> the value via the API on OSS.</span>",
      "<b><code>/global/spend/report</code></b> — the aggregated rollup generator (the only spend endpoint with a <code>premium_user</code> gate).",
      "<code>get_spend_routes</code> key permission (lets a non-admin key call <code>/spend/*</code>); custom spend-log metadata fields; wildcard model-access groups on a key.",
    ],
    work: [
      "Tag budgets → <span class='verdict-clean'>poll <code>/spend/tags</code></span> (or query <code>LiteLLM_SpendLogs</code>) on a cron; when a tag crosses your threshold, <code>/key/update</code> the budget to ~0 or <code>/key/block</code>.",
      "Per-model budget on a key → split into one key per model, each with its own <code>max_budget</code>.",
      "<code>/global/spend/report</code> → build the same rollup yourself from <code>/spend/logs</code> + <code>/global/spend/teams</code> — all the raw data is there.",
      "Non-admin <code>/spend</code> access → expose a thin endpoint that calls <code>/user/daily/activity</code> with the master key.",
    ],
  },
  {
    id: "guardrails", name: "Guardrails & Content Safety",
    tag: "The guardrails framework, Presidio PII masking, and ~50 vendor connectors are OSS; LlamaGuard, LLM Guard, hide_secrets, banned-keywords/blocked-users, and tag-mode guardrail RBAC are Enterprise.",
    oss: [
      "<b>The guardrails framework itself</b> — the <code>CustomGuardrail</code> base class (in <code>litellm/proxy/guardrails/guardrail_hooks/</code>, <em>not</em> <code>enterprise/</code>). Subclass it, implement <code>async_pre_call_hook · async_moderation_hook · async_post_call_success_hook</code>, register under <code>guardrails:</code> in config.",
      "<b>Presidio PII masking</b> — OSS. So are Lakera, Bedrock guardrails, Guardrails-AI, Pangea, Pillar, Javelin, Model Armor, PANW Prisma AIRS, Azure Content Safety, OpenAI moderation <em>as a guardrail</em>, <code>litellm_content_filter</code>, <code>block_code_execution</code>, <code>llm_as_a_judge</code>, Aporia — ~50 connectors, all in the main tree.<span class='note'>Some connectors still need the vendor's own paid account — but the LiteLLM-side wiring is open.</span>",
      "<code>default_on: true</code> always-on guardrails; request-level and config-level application.",
    ],
    ent: [
      "<b>LlamaGuard</b>, <b>LLM Guard</b>, <b><code>hide_secrets</code></b> / secret-detection — these three live under <code>enterprise/.../enterprise_callbacks/</code>.",
      "OpenAI / Google text-moderation in the <em>built-in <code>litellm_settings.callbacks</code> form</em> (the guardrail form is OSS).",
      "<b>Banned keywords</b>, <b>blocked-user lists</b>, <b><code>enforced_params</code></b>.",
      "<b>Guardrail RBAC — tag-mode only.</b> Tag-based guardrail selection + dynamic per-request params are Enterprise (<code>custom_guardrail.py</code>).<span class='note'><b style='color:var(--ent)'>⚠ honor-system.</b> Only the <em>tag</em> dimension has a code gate. <b>Per-key/team/model</b> selection has no gate (MIT) — but docs still label it \"✨ Enterprise only feature\". Runs on OSS, marketed as paid.</span>",
    ],
    work: [
      "Any moderation / secret-scrub / banned-words logic → <span class='verdict-clean'>write a <code>custom_guardrail</code> subclass</span> that calls OpenAI <code>/moderations</code>, a Llama-Guard endpoint you host, a regex scrubber, etc.",
      "Per-key guardrail routing → branch inside your <code>custom_guardrail</code> on <code>user_api_key_dict</code> (you get the key metadata in the hook).",
    ],
  },
  {
    id: "logging", name: "Logging & Observability",
    tag: "~30 logging integrations (incl. S3) and the CustomLogger seam are OSS; GCS/Azure-Blob logging, the HTTP callback API, and PagerDuty are Enterprise.",
    oss: [
      "<b>~30 integrations</b>: Langfuse, Langsmith, Arize/Phoenix, Langtrace, Athina, Lunary, MLflow, Deepeval, Galileo, Helicone, Greenscale, OpenMeter, <b>Datadog</b> (+ LLM Observability), Sentry, <b>OpenTelemetry</b> (→ Jaeger/Tempo/any OTLP), <b>Prometheus</b> (<code>/metrics</code>), <b>DynamoDB</b>, <b>AWS SQS</b>, <b>S3 bucket logging</b>.",
      "<b>The <code>CustomLogger</code> callback class</b> — <code>callbacks: [\"custom_callback.py\"]</code> → async-log/transform anything.",
      "Documented stable <code>StandardLoggingPayload</code> schema (prompt, response, cost, latency, key, team, user, model …).",
    ],
    ent: [
      "<b>GCS bucket logging</b>, <b>GCS Pub/Sub logging</b>, <b>Azure Blob Storage logging</b>.",
      "The <b>Custom Callback <em>API</em></b> (POST the payload to an HTTP endpoint — <code>enterprise/.../example_logging_api.py</code>).",
      "<b>Header-based callback control</b> — disabling callbacks per-request via request headers (<code>callback_controls.py</code>, enterprise tree).<span class='note'><b style='color:var(--ent)'>⚠ honor-system.</b> Per-team/per-key callback <em>routing</em> (team A → Langfuse project X) has no code gate (<code>team_callback_endpoints.py</code>, MIT) — but docs mark Team/Key Logging \"✨ Enterprise only\". Runs on OSS, marketed as paid. (The header-driven callback-<em>disable</em> control is genuinely enterprise-tree.)</span>",
      "<b>PagerDuty</b> alerting; custom email/alert branding.",
    ],
    work: [
      "GCS / Azure Blob logging → <span class='verdict-clean'>write a <code>CustomLogger</code></span> that batches <code>StandardLoggingPayload</code> to <code>google-cloud-storage</code> / <code>azure-storage-blob</code>.",
      "HTTP-endpoint logging → <code>CustomLogger</code> that POSTs the payload.",
      "Per-team routing → branch in your <code>CustomLogger</code> on <code>metadata[\"user_api_key_team_id\"]</code>.",
      "PagerDuty → <code>CustomLogger</code> that pages on error.",
    ],
  },
  {
    id: "secrets", name: "Secret Managers",
    tag: "Env-var and config-file secret resolution is OSS; first-party Vault / KMS / Key-Vault / Secret-Manager integrations are Enterprise.",
    oss: [
      "Plain env-var resolution and <code>os.environ/VARNAME</code> references in <code>config.yaml</code> — the proxy reads keys from the environment / config file.",
      "<span class='note'>That's the entire native OSS surface — the whole Secret Managers doc page is Enterprise-bannered.</span>",
    ],
    ent: [
      "<b>HashiCorp Vault</b>, <b>AWS Secrets Manager</b>, <b>AWS KMS</b>, <b>Azure Key Vault</b>, <b>Google Secret Manager</b>, <b>Google KMS</b>, <b>CyberArk Conjur</b> — most self-gate in their loader/constructor (requires a license).<span class='note'>The split is uneven. <b>Genuinely code-gated:</b> HashiCorp Vault, AWS KMS, Google Secret Manager, CyberArk Conjur (raise on <code>premium_user</code>/<code>LITELLM_LICENSE</code>). <b style='color:var(--ent)'>⚠ honor-system</b> (no code gate, never had one, MIT-licensed, but the docs page banners the whole topic \"✨ Enterprise Feature\"): AWS Secrets Manager (v2), Google KMS, Azure Key Vault — loaded by old free-standing functions in <code>proxy_server.py</code> that never got a gate. All work on OSS.</span>",
      "Writing minted virtual keys back into the secret store (<code>key_management_settings.store_virtual_keys</code>).",
    ],
    work: [
      "<span class='verdict-clean'>External Secrets Operator / Secrets Store CSI driver</span> (or <code>vault agent inject</code>, or AWS/GCP workload-identity sidecars) — pull from your vault, project into env vars <em>before</em> LiteLLM starts. LiteLLM then reads env vars (OSS).",
      "A deployment concern rather than a LiteLLM gap, and the standard pattern for injecting secrets into a container.",
    ],
  },
  {
    id: "routing", name: "Routing & Infra",
    tag: "100+ providers, the full Router, and caching (incl. semantic) are OSS; the multi-region control plane, priority rate-limit reservations, fine-tuning passthrough, and managed vector stores/files are Enterprise.",
    oss: [
      "<b>100+ provider integrations</b> (OpenAI, Anthropic, <b>Azure OpenAI</b>, Bedrock, Vertex, <b>self-hosted via <code>hosted_vllm/</code></b>, …).",
      "<b>The Router</b>: load-balancing (<code>simple-shuffle · least-busy · usage-based-routing-v2 · latency-based-routing</code>); <code>fallbacks · context_window_fallbacks · content_policy_fallbacks</code>; <code>num_retries · timeout · stream_timeout · allowed_fails · cooldown_time</code>; multiple deployments per model name; <code>model_group_alias</code>; tag-based routing; pre-call checks.",
      "<b>Caching</b>: Redis response cache (TTL/namespacing); <b>semantic caching</b> (Redis-Semantic / Qdrant / in-memory).",
      "Batch & files passthrough; arbitrary-provider pass-through endpoints; health checks (<code>/health · /health/liveliness · /health/readiness</code>); <code>--num_workers</code>; provider-budget-aware routing.",
    ],
    ent: [
      "<b>Control plane + regional data planes</b> (multi-region / multi-tenant architecture with a unified control plane).",
      "<b>Priority-based rate-limit reservations</b> (reserve TPM/RPM for a tier under contention).",
      "<b>Fine-tuning passthrough endpoints</b> (<code>/fine_tuning/jobs</code>).",
      "<b>Managed vector stores</b> + <b>managed files</b>; AI Hub.",
    ],
    work: [
      "Multi-region → run independent proxy clusters per region behind GeoDNS (own DB or shared). <span class='verdict-no'>You lose the unified control plane</span>, but the data path works.",
      "Priority reservations → <span class='verdict-no'>no clean OSS equivalent</span> — over-provision, or run separate proxies per tier.",
      "Vector stores / managed files → call the provider's API directly through the passthrough.",
    ],
  },
  {
    id: "audit", name: "Audit & Compliance",
    tag: "Per-request logging and the SpendLogs table are OSS; the admin-action audit log is Enterprise.",
    oss: [
      "Request/response logging via any §logging callback (Langfuse, S3, Datadog, <code>CustomLogger</code>, …) — full prompt / response / cost / latency / key / team / user / model per request.",
      "<code>LiteLLM_SpendLogs</code> — durable per-request spend records, queryable via <code>/spend/logs</code>.",
    ],
    ent: [
      "<b>Admin-action audit logs</b> — who changed which key / team / budget, with retention policies + S3 export (<code>litellm_settings.store_audit_logs: true</code>; <code>enterprise/.../audit_logging_endpoints.py</code>).",
    ],
    work: [
      "Write a <code>CustomLogger</code> that also fires on management routes — or wrap <code>/key/* · /team/* · /budget/*</code> behind a logging reverse proxy — and emit your own audit events to S3/SIEM.<span class='note'>There is no native management-action hook in OSS, so this captures request-path events but not management actions (who changed which key / team / budget).</span>",
    ],
  },
];

const domEl = document.getElementById("domains")!;
const navEl = document.getElementById("nav")!;

for (const d of DOMAINS) {
  // nav
  const a = document.createElement("a");
  a.href = "#" + d.id; a.textContent = d.name;
  navEl.appendChild(a);

  const sec = document.createElement("section");
  sec.className = "domain"; sec.id = d.id;
  sec.innerHTML = `
    <div class="head">
      <h2>${d.name}</h2>
      <span class="tag">${d.tag}</span>
      <span class="toggle">▾ collapse</span>
    </div>
    <div class="cols">
      <div class="col oss">
        <h3><span class="ic">✅</span> OSS / MIT — free</h3>
        <ul>${d.oss.map(x=>`<li>${x}</li>`).join("")}</ul>
      </div>
      <div class="col ent">
        <h3><span class="ic">🔒</span> Enterprise adds</h3>
        <ul>${d.ent.map(x=>`<li>${x}</li>`).join("")}</ul>
      </div>
      <div class="col work">
        <h3><span class="ic">🛠</span> Get it without Enterprise</h3>
        <ul>${d.work.map(x=>`<li>${x}</li>`).join("")}</ul>
      </div>
    </div>
  `;
  sec.querySelector(".head")!.addEventListener("click", () => {
    sec.classList.toggle("collapsed");
    sec.querySelector(".toggle")!.textContent = sec.classList.contains("collapsed") ? "▸ expand" : "▾ collapse";
  });
  domEl.appendChild(sec);
}

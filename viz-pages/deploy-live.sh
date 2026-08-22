#!/usr/bin/env bash
# Deploy this repo's viz-pages to gh-pages, INCLUDING the self-portrait.
#
# The self-portrait is MIRRORED IN, not native: its source is the viz skill's
# bundle, which lives in a SEPARATE repo (ai-setup), never here. Our copy at
# viz-pages/viz-self-portrait/ is generated + gitignored and carries a
# .mirror.json sidecar. Don't hand-edit it; edit the bundle.
#
# Mirroring is PUSH-based (ADR 0006): `build.ts <bundle>` projects the bundle's
# native vizzes into every sink its mirrors.json declares. So refreshing our copy
# means building the BUNDLE — and this container must be one of that bundle's
# declared sinks, or the build is a no-op for us.
#
# The bundle's location is machine-local (mirrors.json maps sibling-repo paths
# and is local-only by policy), so it is RESOLVED here, never assumed:
#   $VIZ_BUNDLE, else the default ai-setup checkout beside this repo.
#
# If the bundle isn't found we still deploy, using whatever is already mirrored
# in — a fresh public clone has no bundle and must remain able to publish. That
# is the one case where shipping a possibly-stale self-portrait beats refusing.
#
# ponytail: build.ts also rebuilds the bundle to .viz-dist as a side effect —
# wasted but harmless; there's no projection-only mode.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"                       # <repo>/viz-pages
BUILD="${VIZ_BUILD:-$HOME/.claude/skills/viz/build.ts}"
BUNDLE="${VIZ_BUNDLE:-$HERE/../../ai-setup/skills/viz/viz-pages}"
SP="$HERE/viz-self-portrait/index.html"

sp_hash() { if [ -f "$SP" ]; then shasum -a 256 "$SP" | cut -d' ' -f1; else echo absent; fi; }

if [ -d "$BUNDLE" ] && [ -f "$BUILD" ]; then
  before="$(sp_hash)"
  echo "  ↳ projecting self-portrait from $BUNDLE"
  bun "$BUILD" "$BUNDLE" >/dev/null
  after="$(sp_hash)"
  if [ "$before" = "$after" ]; then
    echo "  ↳ self-portrait unchanged — either already current, OR this container is"
    echo "    not a declared sink in $BUNDLE/mirrors.json. Mirrors are push-based, so"
    echo "    if it's the latter this deploy ships whatever was last copied here."
  else
    echo "  ↳ self-portrait refreshed"
  fi
else
  echo "  ⚠️  viz bundle not found — looked for: $BUNDLE" >&2
  echo "     Deploying with the self-portrait currently mirrored in, which may be" >&2
  echo "     stale. Set VIZ_BUNDLE=<path-to>/skills/viz/viz-pages to refresh it." >&2
fi

exec "$HERE/deploy.sh"

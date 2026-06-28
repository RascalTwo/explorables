#!/usr/bin/env bash
# Mirror r2-main onto main as a single squashed commit (local + remote).
#
# main is the PUBLIC face: always exactly ONE parentless commit. r2-main is the
# private working branch (real history) and is never pushed. Each run snapshots
# r2-main's tree into a fresh orphan commit and force-pushes it over main.
set -euo pipefail

SRC=r2-main
DST=main
REMOTE=origin

# ponytail: orphan snapshot each run — main is a 1-commit mirror, never real history
tree=$(git rev-parse "$SRC^{tree}")
msg="Snapshot of $SRC @ $(git rev-parse --short "$SRC") ($(git log -1 --format=%s "$SRC"))"
commit=$(git commit-tree "$tree" -m "$msg")

git branch -f "$DST" "$commit"
git push --force "$REMOTE" "$DST"

echo "main -> $commit"

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

# Install all workspace deps once at root
echo "--- installing workspace deps ---"
(cd "$ROOT" && npm install --silent)
echo ""

for dir in "$ROOT"/*/; do
  [ -f "$dir/package.json" ] || continue
  name="$(basename "$dir")"
  echo "--- validating: $name ---"
  (cd "$dir" && npx jxr build 2>&1) || echo "WARN: $name build returned non-zero"
  echo ""
done

echo "done."

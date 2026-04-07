#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

for dir in "$ROOT"/templates/*/; do
  [ -f "$dir/package.json" ] || continue
  name="$(basename "$dir")"
  echo "--- validating: $name ---"
  (cd "$dir" && npm install --silent && npx jxr build 2>&1) || echo "WARN: $name build returned non-zero"
  echo ""
done

echo "done."

#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
npm install --silent

for dir in */; do
  [ -f "$dir/package.json" ] || continue
  echo "--- $(basename "$dir") ---"
  (cd "$dir" && npx jxr build) || echo "WARN: build failed"
done

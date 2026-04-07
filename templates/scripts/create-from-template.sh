#!/usr/bin/env bash
set -euo pipefail

TEMPLATE="${1:?Usage: create-from-template.sh <template-name> <dest>}"
DEST="${2:?Usage: create-from-template.sh <template-name> <dest>}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
TEMPLATE_DIR="$ROOT/$TEMPLATE"

if [ ! -d "$TEMPLATE_DIR" ] || [ ! -f "$TEMPLATE_DIR/package.json" ]; then
  echo "Template '$TEMPLATE' not found. Available:"
  for d in "$ROOT"/*/; do
    [ -f "$d/package.json" ] && echo "  $(basename "$d")"
  done
  exit 1
fi

cp -r "$TEMPLATE_DIR" "$DEST"

# Inline shared deps into package.json for standalone use
node -e "
const pkg = require('./$DEST/package.json');
pkg.dependencies = pkg.dependencies || {};
pkg.dependencies['@jxrstudios/jxr'] = '^1.2.0';
delete pkg.private;
require('fs').writeFileSync('./$DEST/package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Inline tsconfig if template extends shared base
if [ -f "$DEST/tsconfig.json" ] && grep -q '"extends"' "$DEST/tsconfig.json"; then
  node -e "
const ts = require('$DEST/tsconfig.json');
const base = require('$ROOT/tsconfig.base.json');
const merged = { compilerOptions: { ...base.compilerOptions, ...ts.compilerOptions } };
if (ts.include) merged.include = ts.include;
require('fs').writeFileSync('$DEST/tsconfig.json', JSON.stringify(merged, null, 2) + '\n');
"
fi

echo "Created $DEST from template $TEMPLATE"
echo "Next: cd $DEST && npm install && jxr dev"

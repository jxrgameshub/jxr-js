#!/usr/bin/env bash
set -euo pipefail

TEMPLATE="${1:?Usage: create-from-template.sh <template-name> <dest>}"
DEST="${2:?Usage: create-from-template.sh <template-name> <dest>}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_DIR="$(dirname "$SCRIPT_DIR")/$TEMPLATE"

if [ ! -d "$TEMPLATE_DIR" ] || [ ! -f "$TEMPLATE_DIR/package.json" ]; then
  echo "Template '$TEMPLATE' not found. Available:"
  for d in "$(dirname "$SCRIPT_DIR")"/*/; do
    [ -f "$d/package.json" ] && echo "  $(basename "$d")"
  done
  exit 1
fi

cp -r "$TEMPLATE_DIR" "$DEST"
echo "Created $DEST from template $TEMPLATE"
echo "Next: cd $DEST && npm install && jxr dev"

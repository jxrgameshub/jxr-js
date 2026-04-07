#!/usr/bin/env bash
set -euo pipefail

TEMPLATE="${1:?Usage: create-from-template.sh <template-name> <dest>}"
DEST="${2:?Usage: create-from-template.sh <template-name> <dest>}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_DIR="$(dirname "$SCRIPT_DIR")/$TEMPLATE"

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Template '$TEMPLATE' not found. Available:"
  ls "$(dirname "$SCRIPT_DIR")/"
  exit 1
fi

cp -r "$TEMPLATE_DIR" "$DEST"
echo "Created $DEST from template $TEMPLATE"
echo "Next: cd $DEST && npm install && jxr dev"

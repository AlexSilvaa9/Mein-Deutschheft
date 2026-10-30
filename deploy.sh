#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$ROOT_DIR/dist/mein-deutschheft/browser"
DOCS_DIR="$ROOT_DIR/docs"
BASE_HREF="${BASE_HREF:-./}"

cd "$ROOT_DIR"
npm run build -- --base-href "$BASE_HREF"

if [[ ! -f "$DIST_DIR/index.html" ]]; then
  echo "No se encontró el build Angular en: $DIST_DIR" >&2
  exit 1
fi

rm -rf "$DOCS_DIR"
mkdir -p "$DOCS_DIR"
cp -a "$DIST_DIR"/. "$DOCS_DIR"/

# GitHub Pages needs this marker to serve underscore-prefixed assets unchanged.
touch "$DOCS_DIR/.nojekyll"

# Keep client-side Angular routes available when GitHub Pages returns a 404.
cp "$DOCS_DIR/index.html" "$DOCS_DIR/404.html"

echo "Deploy preparado en: $DOCS_DIR"

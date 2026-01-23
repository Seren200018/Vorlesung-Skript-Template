#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-pages}"
DEPLOY_DIR="${DEPLOY_DIR:-}"
DEPLOY_CLEAN="${DEPLOY_CLEAN:-0}"

usage() {
  cat <<'EOF'
Usage: tools/deploy-site.sh [pages|template|lib]

Builds the chosen target and optionally copies it to DEPLOY_DIR.
  DEPLOY_DIR=/var/www/site tools/deploy-site.sh pages
  DEPLOY_CLEAN=1 DEPLOY_DIR=/var/www/site tools/deploy-site.sh pages
EOF
}

if [[ "$TARGET" == "-h" || "$TARGET" == "--help" ]]; then
  usage
  exit 0
fi

case "$TARGET" in
  pages)
    BUILD_CMD=(npm run build:pages)
    BUILD_DIR="dist-pages"
    ;;
  template)
    BUILD_CMD=(npm run build:template)
    BUILD_DIR="dist-template"
    ;;
  lib)
    BUILD_CMD=(npm run build)
    BUILD_DIR="dist"
    ;;
  *)
    echo "Unknown target: $TARGET" >&2
    usage
    exit 1
    ;;
esac

cd "$ROOT_DIR"
"${BUILD_CMD[@]}"

if [[ -z "$DEPLOY_DIR" ]]; then
  echo "Build complete: $BUILD_DIR"
  echo "Set DEPLOY_DIR to copy the build to your web root."
  exit 0
fi

mkdir -p "$DEPLOY_DIR"

if command -v rsync >/dev/null 2>&1; then
  RSYNC_ARGS=(-a)
  if [[ "$DEPLOY_CLEAN" == "1" ]]; then
    RSYNC_ARGS+=(--delete)
  fi
  rsync "${RSYNC_ARGS[@]}" "$BUILD_DIR"/ "$DEPLOY_DIR"/
else
  if [[ "$DEPLOY_CLEAN" == "1" ]]; then
    echo "DEPLOY_CLEAN=1 ignored because rsync is not available." >&2
  fi
  cp -a "$BUILD_DIR"/. "$DEPLOY_DIR"/
fi

echo "Deployed $BUILD_DIR to $DEPLOY_DIR"

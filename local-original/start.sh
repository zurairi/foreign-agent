#!/bin/zsh
set -e
cd "${0:A:h}"
BUNDLED="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies"
if [[ -x "$BUNDLED/node/bin/node" ]]; then
  NODE_BIN="$BUNDLED/node/bin/node"
else
  NODE_BIN="$(command -v node || true)"
fi
if [[ -x "$BUNDLED/python/bin/python3" ]]; then
  PYTHON_BIN="$BUNDLED/python/bin/python3"
else
  PYTHON_BIN="$(command -v python3 || true)"
fi
if [[ -z "$NODE_BIN" || -z "$PYTHON_BIN" ]]; then
  echo 'Node.js and Python 3 are required. Ask your implementation partner for help.'
  exit 1
fi
if [[ ! -f node_modules/vite/bin/vite.js ]]; then
  echo 'Dependencies are missing. Ask your implementation partner to restore packages from pnpm-lock.yaml.'
  exit 1
fi
"$NODE_BIN" node_modules/vite/bin/vite.js build
exec "$PYTHON_BIN" server.py

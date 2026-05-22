#!/usr/bin/env bash
# Trigger an immediate image update check via the Watchtower HTTP API.
# Requires WATCHTOWER_TOKEN to be set (same value as in your .env or compose env).
# Usage: WATCHTOWER_TOKEN=<token> ./update.sh
#    or: export WATCHTOWER_TOKEN=<token> && ./update.sh

set -euo pipefail

: "${WATCHTOWER_TOKEN:?WATCHTOWER_TOKEN must be set}"

echo "Triggering Watchtower update..."
curl -sf \
  -H "Authorization: Bearer ${WATCHTOWER_TOKEN}" \
  http://localhost:8080/v1/update

echo "Update triggered — Watchtower will pull and redeploy if a new image is available."

#!/usr/bin/env bash
# Pull the latest meal-planner image and restart the container if it changed.
# Safe to run manually; also what the systemd timer calls (see README).

set -euo pipefail

cd "$(dirname "$0")"

echo "[$(date -Iseconds)] Checking for updates..."
docker compose pull app
docker compose up -d app
echo "[$(date -Iseconds)] Done."

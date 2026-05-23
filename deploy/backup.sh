#!/usr/bin/env bash
# Hot backup of the running SQLite database using a throwaway alpine container.
# Mounts the same named volumes as the app — no need to stop the container.
# Usage: ./backup.sh
# Run this before a manual update or on a schedule via cron.

set -euo pipefail

TIMESTAMP=$(date +%Y%m%dT%H%M%S)
DEST="/data/backups/pre-deploy-${TIMESTAMP}.db"

echo "Backing up database to ${DEST}..."

docker run --rm \
  -v meal-planner-data:/data \
  -v meal-planner-backups:/data/backups \
  alpine sh -c "
    apk add --no-cache --quiet sqlite && \
    sqlite3 /data/app.db \".backup ${DEST}\" && \
    echo 'Done.'
  "

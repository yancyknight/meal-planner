# Deployment Guide

Self-hosted deployment using Docker Compose. Runs on any Linux host with Docker installed — a Raspberry Pi, a home server, a VPS, etc.

> **Security note:** This app has no authentication. Run it on a private network (LAN or [Tailscale](https://tailscale.com/)) — never expose port 3000 directly to the public internet.

---

## Quick start

1. **Copy the compose file** to your host and create a `.env` file next to it:

   ```bash
   cp compose.yml /srv/meal-planner/
   cd /srv/meal-planner
   ```

   Create `.env`:
   ```env
   WATCHTOWER_TOKEN=choose-a-long-random-secret
   ```

2. **Pull and start:**

   ```bash
   docker compose up -d
   ```

   The app is available at `http://<host>:3000`.

3. **Verify:**

   ```bash
   docker compose ps
   docker compose logs app
   ```

---

## Volumes

Two named volumes are created automatically:

| Volume | Mount | Contents |
|--------|-------|----------|
| `meal-planner-data` | `/data` | SQLite database + uploaded images |
| `meal-planner-backups` | `/data/backups` | Automated hourly backup files |

Keeping backups in a separate volume means you can wipe and recreate the app without touching backup history, and can snapshot or rsync the two volumes independently.

---

## Updates

### Automatic (Watchtower HTTP API)

Watchtower runs alongside the app and watches for new images on GHCR. To trigger an immediate update after a new release is published:

```bash
WATCHTOWER_TOKEN=<your-token> ./update.sh
```

Watchtower will pull the new image, restart the container with zero manual intervention, and clean up the old image.

A daily poll also runs as a fallback — the app will update on its own within 24 hours of a new release even if you never call `update.sh`.

### Manual

```bash
docker compose pull app
docker compose up -d app
```

---

## Backups

The app runs an automated SQLite backup hourly (interval and retain count are configurable in the Settings page). Backups land in the `meal-planner-backups` volume.

For a point-in-time snapshot before a manual update or risky change, run:

```bash
./backup.sh
```

This spins up a throwaway Alpine container, mounts both volumes, and writes a timestamped file to `/data/backups/pre-deploy-<timestamp>.db`. The running app is never stopped.

### Wiring backup to pre-update

To automatically snapshot before every Watchtower-triggered restart, add `com.centurylinklabs.watchtower.lifecycle.pre-update` label to the app service and point it at a script — or simply call `./backup.sh` before `./update.sh` in your own wrapper:

```bash
#!/usr/bin/env bash
./backup.sh && ./update.sh
```

---

## Accessing the database

To open an interactive SQLite session against the live database:

```bash
docker run --rm -it \
  -v meal-planner-data:/data \
  alpine sh -c 'apk add --no-cache sqlite && sqlite3 /data/app.db'
```

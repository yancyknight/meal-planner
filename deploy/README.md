# Deployment Guide

Self-hosted deployment using Docker Compose. Runs on any Linux host with Docker installed — a Raspberry Pi, a home server, a VPS, etc.

> **Security note:** This app has no authentication. Run it on a private network (LAN or [Tailscale](https://tailscale.com/)) — never expose port 3000 directly to the public internet.

---

## Quick start

1. **Copy the compose file** to your host:

   ```bash
   cp compose.yml /srv/meal-planner/
   cd /srv/meal-planner
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
| `meal-planner-data` | `/data` | SQLite database, uploaded images, and dish file attachments |
| `meal-planner-backups` | `/data/backups` | Automated hourly backup files |

Keeping backups in a separate volume means you can wipe and recreate the app without touching backup history, and can snapshot or rsync the two volumes independently.

---

## Updates

A new image is published to GHCR when a `v*.*.*` tag is pushed — see `.github/workflows/docker-publish.yml`. Merging to `main` builds the image but does **not** publish it, so cutting a tag is what makes a release deployable.

### Manual

```bash
./update.sh
```

Pulls the latest image and recreates the container if it changed. A no-op when you are already current.

### Scheduled

To pick up releases without thinking about it, run `update.sh` on a systemd timer:

`/etc/systemd/system/meal-planner-update.service`
```ini
[Unit]
Description=Meal Planner image update
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
User=<your-user>
WorkingDirectory=/srv/meal-planner
ExecStart=/srv/meal-planner/update.sh
StandardOutput=append:/var/log/meal-planner-update.log
StandardError=append:/var/log/meal-planner-update.log
```

`/etc/systemd/system/meal-planner-update.timer`
```ini
[Unit]
Description=Meal Planner image update check (hourly)

[Timer]
OnCalendar=hourly
RandomizedDelaySec=300
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable --now meal-planner-update.timer
systemctl list-timers meal-planner-update.timer
```

A cron entry works just as well if you prefer it — `0 * * * * /srv/meal-planner/update.sh >> /var/log/meal-planner-update.log 2>&1`.

---

## Backups

The app runs an automated SQLite backup hourly (interval and retain count are configurable in the Settings page). Backups land in the `meal-planner-backups` volume.

For a point-in-time snapshot before a manual update or risky change, run:

```bash
./backup.sh
```

This spins up a throwaway Alpine container, mounts both volumes, and writes a timestamped file to `/data/backups/pre-deploy-<timestamp>.db`. The running app is never stopped.

### Wiring backup to pre-update

To snapshot before every update, call `backup.sh` first — either in a wrapper script that the timer runs, or by hand before a release you want a rollback point for:

```bash
#!/usr/bin/env bash
./backup.sh && ./update.sh
```

Worth doing for any release that carries a schema migration.

---

## Accessing the database

To open an interactive SQLite session against the live database:

```bash
docker run --rm -it \
  -v meal-planner-data:/data \
  alpine sh -c 'apk add --no-cache sqlite && sqlite3 /data/app.db'
```

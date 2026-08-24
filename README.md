# Meal Planner

A self-hosted meal planning web app built for household use. Plan your week, manage a dish library, generate shopping lists, and let a weighted suggestion engine nudge you toward variety and freshness.

> **Personal use only.** This app has no authentication or authorization. It is designed for a private home network (LAN or Tailscale VPN). **Do not expose it to the public internet.**

---

## Screenshots

<table>
<tr>
<td><img src="docs/screenshots/m6.6/08-calendar-desktop.png" alt="Calendar week view" width="400"/></td>
<td><img src="docs/screenshots/milestone-9c/01-step4-draft.png" alt="Planning mode — draft step" width="400"/></td>
</tr>
<tr>
<td align="center"><em>Calendar — week view with drag-and-drop</em></td>
<td align="center"><em>Planning wizard — draft &amp; finalize step</em></td>
</tr>
<tr>
<td><img src="docs/screenshots/m8/03-detail-combined.png" alt="Shopping list detail" width="400"/></td>
<td><img src="docs/screenshots/m3.6/01-dishes-list.png" alt="Dish library" width="400"/></td>
</tr>
<tr>
<td align="center"><em>Shopping list — combined view with Walmart links</em></td>
<td align="center"><em>Dish library with search and filters</em></td>
</tr>
</table>

---

## Features

- **Dish library** — store recipes with ingredients, tags, difficulty, cook time, season, and a source URL. Import from recipe sites automatically.
- **Calendar** — week, month, and day views. Drag and drop entries between slots. Mark leftovers.
- **Planning wizard** — 4-step guided session: pick the week, configure each slot, set anchor constraints (pinned tags, wishlist tags, dietary virtual tags), then review a weighted-random draft with per-slot reroll and swap controls.
- **Suggestion engine** — dishes are ranked by how overdue they are relative to their target interval. Cooldown prevents a dish from appearing too soon after it was last served fresh.
- **File attachments** — attach a PDF or other supporting file to a dish, for when a meal combines parts of two recipes.
- **Shopping lists** — generate from a date range; grouped by ingredient with Walmart links; check items off as you shop; auto-cleanup after done.
- **Backups** — automated hourly SQLite backups with configurable retention, plus a manual pre-deploy backup script.
- **Responsive** — usable on phones and tablets.

---

## Quick start

Requires Docker with Compose.

```bash
# 1. Copy the deploy template
cp deploy/compose.yml ./compose.yml

# 2. Start
docker compose up -d
```

Open `http://localhost:3000` (or replace `localhost` with your host's LAN/Tailscale address).

See [`deploy/README.md`](deploy/README.md) for full deployment details including updates, backups, and volume management.

---

## Configuration

All configuration is via environment variables. The defaults work out of the box for the Docker deployment.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `/data/app.db` | SQLite file path |
| `IMAGE_DIR` | `/data/images` | Uploaded dish image directory |
| `FILE_DIR` | `/data/files` | Dish file attachment directory |
| `MAX_UPLOAD_MB` | `100` | Per-file upload ceiling for attachments |
| `BACKUP_DIR` | `/data/backups` | Automated backup output directory |

Backup interval and retention count are configured in the app's Settings page (stored in the database, no restart needed).

---

## Documentation

Full specs live in [`docs/`](docs/):

- [`docs/spec.md`](docs/spec.md) — feature spec and business rules
- [`docs/data-model.md`](docs/data-model.md) — database schema and field semantics
- [`docs/planning-mode.md`](docs/planning-mode.md) — planning wizard algorithm in detail
- [`docs/design-system.md`](docs/design-system.md) — design tokens and component patterns
- [`docs/backlog.md`](docs/backlog.md) — milestone history

---

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # production build
pnpm typecheck
pnpm lint

# Tests run inside Docker — do not run pnpm test directly
docker compose run --rm test
```

---

## NFC URL Scheme

The freezer module supports NFC tags for low-friction entry. Each freezer gets two tag types, both using plain HTTPS URLs that open directly in your browser:

### Add-to-freezer tag

```
https://<your-host>/freezer/add?freezerId=<id>
```

Stick one near the freezer door. Tap it to open the add-item form with that freezer pre-selected. The form shows a frost-tinted "from NFC tag" hint and returns to the add form after saving, making it easy to log multiple items in one session.

### Audit tag

```
https://<your-host>/freezer/<id>/audit
```

Stick one near the same freezer door. Tap it to start the audit walk-through for that freezer — one item at a time with three large touch targets (Still here / Used / Wasted).

### Notes

- Use the `id` from the database row (visible in the URL when you navigate to the freezer in the app, or in **Settings → Freezer → Freezers**).
- URLs are stable across freezer renames — the ID never changes.
- If a freezer is deleted, the add tag shows a picker so you can still log the item to another freezer. The audit tag redirects to `/freezer` with a notice.
- A typical household uses two tags per freezer (one add, one audit). Three freezers = six tags.
- Use your LAN hostname or Tailscale name — whichever address the household normally browses on.

---

## Push Notifications (ntfy)

The freezer module can send push alerts to your phone via [ntfy](https://ntfy.sh). Three trigger types:

- **Expiry alert** (daily, 8 AM) — fires when items *newly* enter the approaching-toss-by window or *newly* cross their toss-by date. Items already flagged on a previous run are not re-notified.
- **Audit overdue** (daily, piggybacked on expiry check) — fires once per overdue freezer, then suppresses for 7 days to avoid spam.
- **Weekly digest** (configurable day + hour) — unconditional summary of active / approaching / expired counts and audit age.

### Setup — ntfy.sh (no server required)

1. Install the [ntfy app](https://ntfy.sh) on your phone (Android / iOS).
2. Subscribe to a topic — pick any unique string, e.g. `my-freezer-a8f3k`. Topics are public by default on ntfy.sh; use something unguessable.
3. In **Settings → Freezer → Notifications**:
   - Set **Server URL** to `https://ntfy.sh`
   - Set **Topic** to the string you chose
   - Set **App base URL** to the address you browse the app on (e.g. `http://192.168.1.10:3000` or your Tailscale address) — this makes the notification tappable and links back to the app
   - Toggle **Enable push notifications** on
4. Save.

### Setup — self-hosted ntfy

If you want notifications to stay on your local network, run ntfy alongside the app:

```yaml
# add to your compose.yml
ntfy:
  image: binwiederhier/ntfy
  command: serve
  volumes:
    - ntfy-data:/var/lib/ntfy
  ports:
    - "8080:80"
```

Then set **Server URL** to `http://<your-host>:8080` (or your Tailscale address for ntfy). For authenticated topics, generate a token in the ntfy admin and paste it into **Auth token**.

---

## Notes

This app is intentionally opinionated and built for a single household. There's no multi-user support, no per-user preferences, and no access control — all data is globally shared. If you want to adapt it for different household sizes, dietary constraints, or workflows, forks are welcome.

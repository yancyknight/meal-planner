# Close Sprint

Run these steps in order when finishing a milestone or feature branch.

## 1. Update Current Sprint

In `CLAUDE.md`, mark all completed checklist items `[x]` and note anything deferred with a reason.

## 2. Update Backlog

In `docs/backlog.md`, mark all completed items `[x]` and add `✅` to the milestone heading.

## 3. Screenshots / GIFs (UI changes only)

Skip this step if no UI was changed.

GitHub resolves relative image paths in PR descriptions against **main**, not the PR branch — they will be broken until merge. Always use absolute `raw.githubusercontent.com` URLs with a commit hash.

**Capture**
- Screenshots: save PNGs to `docs/screenshots/<milestone>/` with numeric prefix (`01-`, `02-`, …)
- GIFs: record with `peek` (GUI) or `byzanz-record` (CLI), same directory

**Commit and generate URLs**
```bash
git add docs/screenshots/
git commit -m "docs: add screenshots for <milestone>"
COMMIT=$(git rev-parse HEAD)
REPO="yancyknight/meal-planner"
for f in docs/screenshots/<milestone>/*.png docs/screenshots/<milestone>/*.gif; do
  [ -f "$f" ] || continue
  echo "![$(basename $f)](https://raw.githubusercontent.com/${REPO}/${COMMIT}/${f})"
done
```

Paste the generated `![alt](url)` lines into the PR body. Never use relative paths.

## 4. Create PR

```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
## What was built
<summary>

## Judgment calls
<every non-obvious decision made during implementation>

## Deferred
<anything not done, and why>

## Spec divergences
<any divergence from docs/ that needs a doc update>

## Screenshots
<embedded images from step 3, or "none — no UI changes">
EOF
)"
```

PR description must cover all five sections above.

## 5. Start Preview Container

After the PR is created, build and start a Docker preview container so the branch can be reviewed in a browser.

```bash
# Build image from current branch
docker build -t mealplan-preview .

# Detect Tailscale IP
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "")

# Stop any existing preview container
docker rm -f mealplan-preview-run 2>/dev/null || true

if [ -n "$TAILSCALE_IP" ]; then
  docker run -d \
    --name mealplan-preview-run \
    -p 127.0.0.1:3333:3000 \
    -p "${TAILSCALE_IP}:3333:3000" \
    -v mealplan-preview-data:/data \
    mealplan-preview

  echo "Preview running:"
  echo "  http://localhost:3333"
  echo "  http://${TAILSCALE_IP}:3333"
else
  docker run -d \
    --name mealplan-preview-run \
    -p 127.0.0.1:3333:3000 \
    -v mealplan-preview-data:/data \
    mealplan-preview

  echo "⚠️  Tailscale IP not detected — bound to localhost only"
  echo "Preview running: http://localhost:3333"
fi
```

The preview container is separate from the production stack and uses its own data volume (`mealplan-preview-data`).

## 6. Notify

Send a push notification via the PushNotification tool so the PR is flagged for review.

## 7. Stop

Do not wait for user confirmation. The PR and preview container are the handoff point.

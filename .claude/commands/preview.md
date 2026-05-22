# /preview

Build and start a Docker preview container so the current branch can be reviewed in a browser. Use after creating a PR with code changes — skip for docs-only PRs.

The preview container is separate from the production stack and uses its own data volume (`mealplan-preview-data`).

```bash
docker build -t mealplan-preview .

TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "")

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

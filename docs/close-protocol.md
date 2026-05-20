# Close Step — Screenshot / GIF Protocol

GitHub resolves relative image paths in PR descriptions against the **default branch (main)**, not the PR branch. Images only committed to the feature branch will be broken until merge. Always use absolute `raw.githubusercontent.com` URLs tied to a specific commit hash — they work immediately and remain stable even after the branch is deleted.

**Step 1 — Capture**
- Screenshots: save PNGs to `docs/screenshots/<milestone>/` (e.g. `docs/screenshots/m4/01-overview.png`)
- GIFs: record interaction flows with `peek` (GUI) or `byzanz-record` (CLI) and save to the same directory
- Name files with a numeric prefix so order is clear: `01-`, `02-`, etc.

**Step 2 — Commit**
```bash
git add docs/screenshots/
git commit -m "docs: add screenshots for <milestone>"
COMMIT=$(git rev-parse HEAD)
```

**Step 3 — Build working URLs**
```bash
# Template:
# https://raw.githubusercontent.com/yancyknight/meal-planner/${COMMIT}/docs/screenshots/<milestone>/<filename>

# Generate markdown for a whole milestone dir:
REPO="yancyknight/meal-planner"
for f in docs/screenshots/m4/*.png docs/screenshots/m4/*.gif; do
  [ -f "$f" ] || continue
  echo "![$(basename $f)](https://raw.githubusercontent.com/${REPO}/${COMMIT}/${f})"
done
```

**Step 4 — Embed in PR description**
Paste the `![alt](url)` lines into the PR body. Never use relative paths like `docs/screenshots/...` — always use the full `raw.githubusercontent.com` URL with the commit hash.

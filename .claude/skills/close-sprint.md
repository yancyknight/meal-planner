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

If this branch was opened to resolve a GitHub issue, add `Closes #<N>` as the first line of the PR body. GitHub will auto-close the issue on merge.

```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
Closes #<N>   ← include when working against a GitHub issue; omit otherwise

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

## 5. Start Preview Container (code changes only)

If the PR includes runtime code changes, run `/preview` to build and start a Docker preview container so reviewers can open the branch in a browser. Skip for docs-only PRs.

## 6. Notify

Send a push notification via the PushNotification tool so the PR is flagged for review.

## 7. Stop

Do not wait for user confirmation. The PR is the handoff point.

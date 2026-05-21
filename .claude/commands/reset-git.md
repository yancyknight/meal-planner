# /reset-git

Sync the local repo with remote and clean up stale local branches.

```bash
git fetch origin
git checkout main
git pull origin main
git remote prune origin
git branch -vv | grep ': gone]' | awk '{print $1}' | xargs -r git branch -d
```

After running, report:
- Current HEAD (branch + commit)
- Any local branches that were deleted because their remote counterpart is gone
- Any branches that could not be deleted (e.g. unmerged) — list them but do not force-delete

# /start-milestone

Begin a new milestone session from a clean state.

## Steps

1. **Run `/reset-git`** — sync from remote, prune stale branches, land on main

2. **Identify the next milestone** — read `docs/backlog.md` and find the first milestone heading without a `✅`. That is the target.

3. **Read the relevant spec docs** — open any docs listed for that milestone (typically one or more of `docs/spec.md`, `docs/data-model.md`, `docs/planning-mode.md`). Read them before writing the plan.

4. **Create a feature branch**
   ```bash
   git checkout -b milestone-<N>-<short-slug>
   ```

5. **Begin the Plan step** — follow Session Protocol Step 2 from `CLAUDE.md`: write a concrete implementation checklist in the Current Sprint section and stop for user sign-off before writing any code.

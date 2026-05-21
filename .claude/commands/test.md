# /test

Run the full test suite inside the Docker container. Never run `pnpm test` or `pnpm test:e2e` directly on the host.

## Unit and integration tests

```bash
docker compose run --rm app pnpm test
```

## End-to-end tests

```bash
docker compose run --rm app pnpm test:e2e
```

## Both (full suite)

```bash
docker compose run --rm app pnpm test && docker compose run --rm app pnpm test:e2e
```

Show the full output. Do not summarize results as passing without showing the actual output.

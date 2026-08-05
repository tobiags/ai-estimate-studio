# Local container infrastructure

`docker-compose.yml` runs development-only PostgreSQL, MinIO and Mailpit
instances. Credentials are intentionally public local defaults and must never be
used outside local development or CI.

Run `pnpm bootstrap` to validate Docker, start all stateful services, wait for
their health checks and create the MinIO bucket idempotently. `pnpm infra:down`
stops containers but preserves named volumes. Deleting volumes is deliberately
not wrapped in a project command because it destroys local data.

PostgreSQL uses host port `55432` to avoid collisions with a system PostgreSQL;
all published ports bind to `127.0.0.1` only.

Pinned image versions are upgraded through reviewed dependency changes. The
PostgreSQL 18 volume targets `/var/lib/postgresql`, matching the official image's
version-specific `PGDATA` layout.

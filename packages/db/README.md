# Database package

`@ai-estimate-studio/db` owns the Prisma schema, forward-only PostgreSQL migrations and the Prisma client boundary. Prisma models never cross this package; repository adapters map them to the immutable domain snapshots and ports in `@ai-estimate-studio/domain`.

Run `pnpm --filter @ai-estimate-studio/db db:format`, `db:validate` and `db:generate` after schema changes. `0001_init` is generated from the normative schema and `0002_constraints` contains checks and partial indexes that Prisma cannot express, including money-total consistency, positive versions, publication uniqueness, dimension bounds and case-insensitive customer email uniqueness.

Local migration rehearsal uses the PostgreSQL service from the root Docker Compose file and `DATABASE_URL` from `.env.example`. Production deploys run `prisma migrate deploy`; migrations are never edited after they have been applied to a shared environment.

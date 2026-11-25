import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit configuration for the `db:*` scripts (database.md §7).
 *
 * Migrations run against the Supabase **session pooler** (port 5432) because
 * direct connections are IPv6-only on the free plan. `drizzle-kit generate`
 * reads only the schema — no connection — so it works before any credentials
 * exist; `db:migrate:dev` and `db:migrate:prod` need `MIGRATION_DATABASE_URL`
 * (dev and prod values respectively, usually via `.env.local` /
 * `.env.prod.local`).
 *
 * This file is CLI tooling executed by drizzle-kit outside the Next.js runtime,
 * which is why it reads the variable directly: importing `src/lib/env.ts` would
 * pull in the app's `@/*` alias and demand every server secret just to generate
 * SQL. Application code still reads env only through `src/lib/env.ts`.
 */
const migrationDatabaseUrl = process.env.MIGRATION_DATABASE_URL;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: migrationDatabaseUrl ?? "" },
  strict: true,
  verbose: true,
});

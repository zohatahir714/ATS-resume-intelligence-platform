import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit configuration for the `db:*` scripts (database.md §7).
 *
 * `drizzle-kit` runs outside the Next.js runtime and only reads a plain `.env`
 * on its own, so a project that follows Next's env convention would hand the
 * driver an empty URL. Load the app's env files first with Next's own loader,
 * which gives the same precedence as `next dev` (`.env.development.local` →
 * `.env.local` → `.env.development` → `.env`), then read the variable.
 * `--env-file` / shell exports are therefore unnecessary for any developer.
 *
 * Migrations run against the Supabase **session pooler** (port 5432) because
 * direct connections are IPv6-only on the free plan. `drizzle-kit generate`
 * reads only the schema — no connection — so it works before any credentials
 * exist; `db:migrate:dev` and `db:migrate:prod` need `MIGRATION_DATABASE_URL`
 * from `.env.local` (dev) and `.env.production.local` (prod, run with
 * `NODE_ENV=production`).
 *
 * This file is CLI tooling executed by drizzle-kit outside the Next.js runtime,
 * which is why it reads the variable directly: importing `src/lib/env.ts` would
 * pull in the app's `@/*` alias and demand every server secret just to generate
 * SQL. Application code still reads env only through `src/lib/env.ts`.
 */
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const migrationDatabaseUrl = process.env.MIGRATION_DATABASE_URL;

// Commands that open a connection fail with drizzle-kit's opaque
// "Please provide required params for Postgres driver: [x] url: ''" when the
// variable is missing, so name the real cause instead. `generate` is excluded:
// it only diffs the schema and must keep working before credentials exist.
const command = process.argv.slice(2).find((arg) => !arg.startsWith("-")) ?? "";
const needsConnection = ["migrate", "push", "studio", "pull"].includes(command);

if (needsConnection && !migrationDatabaseUrl) {
  throw new Error(
    "MIGRATION_DATABASE_URL is not set. Add it to .env.local (see .env.example) — " +
      "it must be the Supabase session-pooler connection string — then rerun the script.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: migrationDatabaseUrl ?? "" },
  strict: true,
  verbose: true,
});

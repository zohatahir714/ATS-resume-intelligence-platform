import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { getServerEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";

/**
 * Drizzle client for Supabase Postgres (database.md §7).
 *
 * The app connects through the **transaction pooler** (port 6543), which runs
 * PgBouncer in transaction mode: prepared statements cannot be reused across
 * transactions, so `prepare: false` is required. `max: 1` keeps each serverless
 * instance to a single pooled connection. Migrations use the session pooler and
 * their own URL — see `drizzle.config.ts`.
 *
 * The client is created lazily so importing this module never opens a
 * connection and never fails a build without secrets (`SKIP_ENV_VALIDATION=1`).
 */

export type Database = PostgresJsDatabase<typeof schema>;

let database: Database | undefined;

export function getDb(): Database {
  if (database) {
    return database;
  }

  const { DATABASE_URL } = getServerEnv();

  if (!DATABASE_URL) {
    // Reachable only when validation was skipped (builds/tests without secrets).
    throw new AppError("INTERNAL", 500, "The database is not configured.", {
      developerMessage: "DATABASE_URL is missing",
    });
  }

  database = drizzle(postgres(DATABASE_URL, { prepare: false, max: 1 }), {
    schema,
  });

  return database;
}

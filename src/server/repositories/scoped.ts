import { and, eq, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { AppError } from "@/lib/errors";

/**
 * Per-user query helpers for the repository layer (T0.9).
 *
 * `security.md` §3 and `backend.md` §3: every repository query filters by the
 * signed-in user, and RLS is only the backstop. Drizzle runs on a privileged
 * connection, so a forgotten `where` would read every user's rows. The filter
 * therefore comes from one place — this helper — and `query-guard.ts` checks
 * every query in `src/server` that it uses one of the two calls below.
 *
 * Usage in a repository:
 * ```ts
 * const scope = scoped(userId);
 *
 * db.select().from(resumes).where(scope.rowFilter(resumes.userId));
 * db.insert(resumes).values(scope.rowValues({ name, parsed }));
 * db.update(resumes).set({ name }).where(scope.rowFilter(resumes.userId, eq(resumes.id, id)));
 * db.delete(resumes).where(scope.rowFilter(resumes.userId, eq(resumes.id, id)));
 * ```
 *
 * `profiles` has no `user_id` column — its own `id` is the user id, so it uses
 * `scope.rowFilter(profiles.id)`.
 */

export interface Scope {
  /** The signed-in user every query is restricted to. */
  readonly userId: string;
  /**
   * `user_id = $userId`, ANDed with any extra conditions.
   *
   * Extra conditions are always added to the user filter, never instead of it,
   * so an id taken from the request cannot widen the result set.
   */
  rowFilter(
    userIdColumn: PgColumn,
    ...conditions: readonly (SQL | undefined)[]
  ): SQL;
  /** Insert values with `userId` filled in; a supplied value cannot override it. */
  rowValues<TValues extends object>(
    values: TValues,
  ): TValues & { userId: string };
}

export function scoped(userId: string): Scope {
  const normalized = userId.trim();

  if (normalized.length === 0) {
    // An empty id would compile to `user_id = ''`, matching nobody, or — worse
    // if the condition were ever skipped — everything. Fail loudly instead.
    throw new AppError(
      "INTERNAL",
      500,
      "Something went wrong. Please try again.",
      {
        developerMessage:
          "scoped() was called without a user id; refusing to build an unscoped query",
      },
    );
  }

  return {
    userId: normalized,
    rowFilter(userIdColumn, ...conditions) {
      const scope = eq(userIdColumn, normalized);
      const extra = conditions.filter(
        (condition): condition is SQL => condition !== undefined,
      );

      if (extra.length === 0) {
        return scope;
      }

      return and(scope, ...extra) ?? scope;
    },
    rowValues(values) {
      // `userId` last: a caller that passes its own value cannot widen the row.
      return { ...values, userId: normalized };
    },
  };
}

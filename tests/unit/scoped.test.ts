import { eq, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  analyses,
  jobDescriptions,
  resumes,
  rewriteSuggestions,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import { scoped } from "@/server/repositories/scoped";

const USER_ID = "e1a4e3e8-7543-4b46-80fc-5b56ddb7a992";
const OTHER_ID = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";

const dialect = new PgDialect();

function compile(condition: SQL) {
  return dialect.sqlToQuery(condition);
}

describe("scope.rowFilter", () => {
  it("restricts the query to the signed-in user", () => {
    const scope = scoped(USER_ID);
    const query = compile(scope.rowFilter(resumes.userId));

    expect(query.sql).toBe('"resumes"."user_id" = $1');
    expect(query.params).toEqual([USER_ID]);
  });

  it("adds request ids to the user filter, never instead of it", () => {
    const scope = scoped(USER_ID);
    const query = compile(
      scope.rowFilter(resumes.userId, eq(resumes.id, OTHER_ID)),
    );

    expect(query.sql).toBe(
      '("resumes"."user_id" = $1 and "resumes"."id" = $2)',
    );
    expect(query.params).toEqual([USER_ID, OTHER_ID]);
  });

  it("keeps the user filter when an extra condition is undefined", () => {
    const scope = scoped(USER_ID);
    const query = compile(scope.rowFilter(resumes.userId, undefined));

    expect(query.sql).toBe('"resumes"."user_id" = $1');
    expect(query.params).toEqual([USER_ID]);
  });

  it("works on every table that owns rows through user_id", () => {
    const scope = scoped(USER_ID);

    const ownedTables = [
      { name: "resumes", column: resumes.userId },
      { name: "job_descriptions", column: jobDescriptions.userId },
      { name: "analyses", column: analyses.userId },
      { name: "rewrite_suggestions", column: rewriteSuggestions.userId },
    ];

    for (const { name, column } of ownedTables) {
      const query = compile(scope.rowFilter(column));

      expect(column.name).toBe("user_id");
      expect(query.sql).toBe(`"${name}"."user_id" = $1`);
      expect(query.params).toEqual([USER_ID]);
    }
  });
});

describe("scope.rowValues", () => {
  it("fills in the user id on insert", () => {
    const scope = scoped(USER_ID);
    const values = scope.rowValues({ name: "CV", sizeBytes: 1024 });

    expect(values).toEqual({
      name: "CV",
      sizeBytes: 1024,
      userId: USER_ID,
    });
  });

  it("cannot be overridden by a supplied user id", () => {
    const scope = scoped(USER_ID);
    const values = scope.rowValues({ name: "CV", userId: OTHER_ID });

    expect(values.userId).toBe(USER_ID);
  });

  it("leaves the caller's values untouched", () => {
    const scope = scoped(USER_ID);
    const input: Record<string, unknown> = { name: "CV" };

    scope.rowValues(input);

    expect(input).toEqual({ name: "CV" });
  });
});

describe("scoped", () => {
  it("trims the id it was given", () => {
    expect(scoped(`  ${USER_ID}  `).userId).toBe(USER_ID);
  });

  it("refuses to build a scope without a user", () => {
    for (const value of ["", "   "]) {
      try {
        scoped(value);
        expect.unreachable("scoped() should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe("INTERNAL");
      }
    }
  });
});

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import {
  findUnscopedQueries,
  type QueryViolation,
} from "@/server/repositories/query-guard";

/**
 * T0.9: a repository query without the user filter fails the suite.
 *
 * Two halves: the rule itself is exercised on fixtures (including code that
 * must pass), and then applied to every file under `src/server`, so the next
 * repository added by T1.9 and later is covered the moment it exists.
 */

const PROJECT_ROOT = process.cwd();
const SERVER_DIR = join(PROJECT_ROOT, "src", "server");

function toPosix(path: string): string {
  return path.split(sep).join("/");
}

function listTypeScriptFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      return listTypeScriptFiles(fullPath);
    }

    return entry.isFile() && entry.name.endsWith(".ts") ? [fullPath] : [];
  });
}

function describeViolations(violations: readonly QueryViolation[]): string[] {
  return violations.map(
    (violation) =>
      `line ${violation.line} (${violation.reason}) ${violation.snippet}`,
  );
}

describe("findUnscopedQueries", () => {
  it("accepts a select, update and delete that use the scope", () => {
    const source = [
      "const scope = scoped(userId);",
      "db.select().from(resumes).where(scope.rowFilter(resumes.userId));",
      "db.update(resumes).set(values).where(scope.rowFilter(resumes.userId, eq(resumes.id, id)));",
      "db.delete(resumes).where(scope.rowFilter(resumes.userId, eq(resumes.id, id)));",
    ].join("\n");

    expect(findUnscopedQueries(source)).toEqual([]);
  });

  it("accepts an insert that fills in the user id", () => {
    const source =
      "db.insert(resumes).values(scope.rowValues({ name: 'CV' })).returning();";

    expect(findUnscopedQueries(source)).toEqual([]);
  });

  it("flags a select with no where clause", () => {
    const violations = findUnscopedQueries("db.select().from(resumes);");

    expect(describeViolations(violations)).toEqual([
      "line 1 (unscoped) db.select().from(resumes);",
    ]);
  });

  it("flags a where clause that filters on something other than the user", () => {
    const source = "db.delete(resumes).where(eq(resumes.id, requestId));";

    expect(findUnscopedQueries(source)).toHaveLength(1);
  });

  it("flags an insert that does not fill in the user id", () => {
    const source = "db.insert(resumes).values({ name: 'CV' });";

    expect(describeViolations(findUnscopedQueries(source))).toEqual([
      "line 1 (unscoped) db.insert(resumes).values({ name: 'CV' });",
    ]);
  });

  it("flags the relational query builder, whose filters it cannot see", () => {
    const source =
      "db.query.resumes.findMany({ where: eq(resumes.userId, id) });";

    expect(describeViolations(findUnscopedQueries(source))).toEqual([
      "line 1 (relational-api) db.query.resumes.findMany({ where: eq(resumes.userId, id) });",
    ]);
  });

  it("flags every query in a file, with its line", () => {
    const source = [
      "const scope = scoped(userId);",
      "db.select().from(resumes).where(scope.rowFilter(resumes.userId));",
      "db.select().from(resumes);",
    ].join("\n");

    expect(describeViolations(findUnscopedQueries(source))).toEqual([
      "line 3 (unscoped) db.select().from(resumes);",
    ]);
  });

  it("accepts a chain split over several lines", () => {
    const source = [
      "const rows = db",
      "  .select()",
      "  .from(resumes)",
      "  .where(scope.rowFilter(resumes.userId))",
      "  .orderBy(desc(resumes.createdAt));",
    ].join("\n");

    expect(findUnscopedQueries(source)).toEqual([]);
  });

  it("ignores comments and string literals", () => {
    const source = [
      "// never write db.select().from(resumes) without a filter",
      "/* db.delete(resumes); */",
      'const note = "db.select().from(resumes);";',
    ].join("\n");

    expect(findUnscopedQueries(source)).toEqual([]);
  });

  it("does not confuse a template literal with a query", () => {
    const source = "const condition = sql`1 = 1`;\nconst note = `db.select()`;";

    expect(findUnscopedQueries(source)).toEqual([]);
  });
});

describe("src/server", () => {
  it("holds every query behind scoped(userId)", () => {
    const files = listTypeScriptFiles(SERVER_DIR);

    expect(
      files.map((file) => toPosix(relative(PROJECT_ROOT, file))),
    ).toContain("src/server/repositories/scoped.ts");

    const violations = files.flatMap((file) =>
      findUnscopedQueries(readFileSync(file, "utf8")).map(
        (violation) =>
          `${toPosix(relative(PROJECT_ROOT, file))}:${describeViolations([violation])[0]}`,
      ),
    );

    expect(violations).toEqual([]);
  });
});

/**
 * Static guard for the repository layer (T0.9).
 *
 * `security.md` §3 asks for proof that no repository query forgets its user
 * filter. `scoped(userId)` supplies that filter; this module reads the source
 * of `src/server` and reports every query that does not use it, so the rule
 * also covers code paths no test executes.
 *
 * A query passes when its statement (up to the terminating semicolon) calls the
 * scope helper:
 * - `select` / `update` / `delete` → `.where(… rowFilter(…)`
 * - `insert` → `.values(… rowValues(…)`
 *
 * `db.query.*` (Drizzle's relational builder) is reported outright: its filters
 * sit in an options object this check cannot verify, so allowing it would leave
 * a hole in the rule.
 *
 * Comments and string literals are blanked out before matching, so prose like
 * "never write db.select() without a filter" cannot satisfy or trip the check.
 */

export type QueryViolationReason = "unscoped" | "relational-api";

export interface QueryViolation {
  /** 1-based line of the offending call. */
  readonly line: number;
  /** First line of the statement, trimmed, for the failure message. */
  readonly snippet: string;
  readonly reason: QueryViolationReason;
}

/** Receivers a Drizzle query is built on. */
const RECEIVER = String.raw`(?:db|tx|trx)`;

const RELATIONAL_QUERY = new RegExp(String.raw`\b${RECEIVER}\.query\s*\.`, "g");

const BUILDER_QUERY = new RegExp(
  String.raw`\b${RECEIVER}\.(select|insert|update|delete)\s*\(`,
  "g",
);

const ROLE_VALUE_CALL = /\browValues\s*\(/;
const ROLE_ROW_CALL = /\browFilter\s*\(/;
const WHERE_CALL = /\.where\s*\(/;
const VALUES_CALL = /\.values\s*\(/;

const SNIPPET_LIMIT = 120;

/** Every query in `source` that bypasses `scoped(userId)`. */
export function findUnscopedQueries(source: string): QueryViolation[] {
  const code = blankNonCode(source);
  const violations: QueryViolation[] = [];

  for (const match of code.matchAll(RELATIONAL_QUERY)) {
    violations.push(violation(source, code, match.index, "relational-api"));
  }

  for (const match of code.matchAll(BUILDER_QUERY)) {
    const method = match[1];
    const statement = readStatement(code, match.index);
    const usesScope =
      method === "insert"
        ? VALUES_CALL.test(statement) && ROLE_VALUE_CALL.test(statement)
        : WHERE_CALL.test(statement) && ROLE_ROW_CALL.test(statement);

    if (!usesScope) {
      violations.push(violation(source, code, match.index, "unscoped"));
    }
  }

  return violations;
}

function violation(
  source: string,
  code: string,
  index: number,
  reason: QueryViolationReason,
): QueryViolation {
  return {
    line: lineAt(code, index),
    snippet: snippetAt(source, index),
    reason,
  };
}

function lineAt(code: string, index: number): number {
  let line = 1;

  for (let i = 0; i < index && i < code.length; i += 1) {
    if (code[i] === "\n") {
      line += 1;
    }
  }

  return line;
}

function snippetAt(source: string, index: number): string {
  const lineStart = source.lastIndexOf("\n", index) + 1;
  const lineEnd = source.indexOf("\n", index);
  const line = source.slice(
    lineStart,
    lineEnd === -1 ? source.length : lineEnd,
  );

  return line.trim().slice(0, SNIPPET_LIMIT);
}

/** The statement a call belongs to: text from the call to the next top-level `;`. */
function readStatement(code: string, start: number): string {
  let depth = 0;

  for (let i = start; i < code.length; i += 1) {
    const char = code[i];

    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
    } else if (char === ")" || char === "]" || char === "}") {
      if (depth === 0) {
        return code.slice(start, i);
      }

      depth -= 1;
    } else if (char === ";" && depth === 0) {
      return code.slice(start, i);
    }
  }

  return code.slice(start);
}

/**
 * Replace comments and string/template literals with spaces, keeping newlines
 * so reported line numbers stay correct.
 */
function blankNonCode(source: string): string {
  const blanked = source.split("");

  const blank = (from: number, to: number): void => {
    for (let i = from; i < to && i < blanked.length; i += 1) {
      if (blanked[i] !== "\n") {
        blanked[i] = " ";
      }
    }
  };

  let index = 0;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "/" && next === "/") {
      const end = source.indexOf("\n", index);
      const stop = end === -1 ? source.length : end;
      blank(index, stop);
      index = stop;
      continue;
    }

    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(index, stop);
      index = stop;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      let cursor = index + 1;

      while (cursor < source.length) {
        if (source[cursor] === "\\") {
          cursor += 2;
          continue;
        }

        if (source[cursor] === char) {
          cursor += 1;
          break;
        }

        cursor += 1;
      }

      blank(index, cursor);
      index = cursor;
      continue;
    }

    index += 1;
  }

  return blanked.join("");
}

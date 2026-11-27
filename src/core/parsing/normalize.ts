/**
 * Text normalisation for resumes (T1.1).
 *
 * This is the single place that turns extracted text (TXT, DOCX or PDF) into the
 * canonical form stored as `resumes.normalized_text` and consumed by the
 * sectionizer, bullet parser and the scoring core. It is pure: no I/O, no env,
 * no framework imports.
 *
 * What it does, in order:
 *  - unifies line endings (CRLF, CR, LS, PS, NEL) and turns page breaks into lines;
 *  - removes invisible characters (BOM, zero-width, soft hyphen) that make
 *    text searchable in one place but not another;
 *  - maps non-breaking and exotic Unicode spaces to a plain space;
 *  - applies NFKC, so ligatures (`ﬁ`) and full-width letters become ASCII while
 *    `+ # . /` and accented letters survive — `C++`, `C#`, `Node.js`, `CI/CD`
 *    and `Résumé` must stay intact (scoring-engine.md §4);
 *  - de-hyphenates words that a PDF or DOCX line break split (`responsi-\nbility`);
 *  - rewrites bullet glyphs (`•`, `▪`, `◦`…) at the start of a line as `- `, so
 *    one bullet parser serves every source;
 *  - collapses runs of spaces and tabs, trims line ends, and collapses 3+ blank
 *    lines into a single blank line so paragraph structure survives.
 */

/** Bullet glyphs produced by Word, Google Docs, PDF exports and Markdown pastes. */
const BULLET_GLYPH = /^[•●▪◦‣∙·○■□◆➤➢][ \t]*/u;

/** Hyphen characters a line break can follow: ASCII, Unicode hyphen, non-breaking hyphen. */
const LINE_BREAK_HYPHEN =
  /([A-Za-z\u00C0-\u024F])[-\u2010\u2011][ \t]*\n[ \t]*([a-z\u00DF-\u00FF])/g;

/**
 * Joins a word split by a hyphen at a line break, e.g. `responsi-\nbility`.
 *
 * Only a lowercase continuation is joined, because that is where a break is
 * almost always layout rather than meaning. `COVID-\n19` and `Node-\nJS` keep
 * their hyphen, and a compound written across lines as `well-\nknown` would be
 * joined — an accepted trade-off, since guessing at a dictionary is not
 * something a pure parser can do.
 */
function dehyphenate(text: string): string {
  return text.replace(LINE_BREAK_HYPHEN, "$1$2");
}

/**
 * Cleans one line: drops control characters (the line break itself is already
 * gone), collapses spaces and tabs, and canonicalises a leading bullet.
 *
 * Control characters are matched by Unicode category (`\p{Cc}`) rather than by
 * a hand-written `\x00-\x1f` range, which the linter rejects as a control
 * character in a regular expression.
 */
function normalizeLine(line: string): string {
  const collapsed = line
    .replace(/\p{Cc}/gu, "")
    .replace(/[ \t]+/g, " ")
    .trim();

  return collapsed.replace(BULLET_GLYPH, "- ").trimEnd();
}

export function normalizeText(input: string): string {
  if (input.length === 0) {
    return "";
  }

  const unified = input
    // Line endings, line/paragraph separators and NEL all become "\n".
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2028\u2029\u0085]/g, "\n")
    // A form feed is a page break, not a space.
    .replace(/\f/g, "\n")
    // Invisible characters carry no meaning once text is one continuous string.
    .replace(/[\u00AD\u200B-\u200F\u2060\uFEFF]/g, "")
    // Non-breaking, thin, narrow and ideographic spaces are all word separators.
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ");

  // NFKC keeps `+ # . /` and accented letters; it only folds compatibility forms.
  const lines = dehyphenate(unified.normalize("NFKC"))
    .split("\n")
    .map(normalizeLine);

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

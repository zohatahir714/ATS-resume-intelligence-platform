/**
 * JSONB payload contracts stored by `src/db/schema.ts` (database.md §2).
 *
 * T0.4 only needs concrete types for the jsonb columns so the schema and the
 * generated migration are type-safe. The full domain contracts (`ParsedResume`,
 * `JdExtraction`, `ScoreInput/Output`, evidence types) belong to T2.1 and will
 * move into `src/types` proper; these aliases are the subset the specs in
 * `database.md`, `scoring-engine.md` and `api-design.md` already name.
 */

/** Sections the sectionizer recognises (scoring-engine.md §6). */
export const RESUME_SECTION_IDS = [
  "summary",
  "experience",
  "projects",
  "skills",
  "education",
] as const;

export type ResumeSectionId = (typeof RESUME_SECTION_IDS)[number];

export interface ParsedSection {
  id: ResumeSectionId;
  /** Heading line as written in the resume; null when inferred. */
  heading: string | null;
  text: string;
}

export interface ParsedBullet {
  /** Stable id used as evidence, e.g. `b7` (scoring-engine.md §5.6). */
  id: string;
  text: string;
  section: ResumeSectionId;
}

export interface ParsedEducation {
  degree: string | null;
  institution: string | null;
  field: string | null;
  startYear: number | null;
  endYear: number | null;
}

export interface ContactFlags {
  email: boolean;
  phone: boolean;
  linkedin: boolean;
  location: boolean;
}

/** Stored in `resumes.parsed` — sections, bullets, years, education, contact flags. */
export interface ParsedResume {
  sections: ParsedSection[];
  bullets: ParsedBullet[];
  /** Merged date ranges, "Present" resolved against the injected `now`. */
  years: number;
  education: ParsedEducation[];
  contact: ContactFlags;
}

export const FORMATTING_MODES = ["docx", "pdf_heuristic", "text"] as const;

export type FormattingMode = (typeof FORMATTING_MODES)[number];

export const FORMATTING_RULE_IDS = [
  "FMT_TABLE",
  "FMT_COLUMNS",
  "FMT_IMAGES",
  "FMT_ICONS",
  "FMT_HEADER_FOOTER",
  "FMT_COMPLEX_LAYOUT",
  "FMT_NO_CONTACT",
  "FMT_HEADINGS",
  "FMT_LENGTH",
] as const;

export type FormattingRuleId = (typeof FORMATTING_RULE_IDS)[number];

export type FormattingConfidence = "high" | "medium" | "low";

export interface FormattingIssue {
  id: FormattingRuleId;
  severity: FormattingConfidence;
  message: string;
  fix: string;
  confidence: FormattingConfidence;
}

/** Stored in `resumes.formatting` and `analyses.formatting` (scoring-engine.md §7). */
export interface FormattingReport {
  score: number;
  mode: FormattingMode;
  issues: FormattingIssue[];
}

export type JdSeniority =
  "intern" | "junior" | "mid" | "senior" | "lead" | "manager" | "unknown";

export type JdEducationLevel =
  "none" | "diploma" | "associate" | "bachelor" | "master" | "phd";

export type JdKeywordKind =
  "hard_skill" | "tool" | "certification" | "soft_skill" | "domain_term";

export type JdKeywordImportance = "required" | "preferred";

export interface JdKeyword {
  id: string;
  term: string;
  kind: JdKeywordKind;
  importance: JdKeywordImportance;
  /** ≤ 5, lowercased and deduped by the sanity checks. */
  aliases: string[];
  /** ≤ 3, lowercased and deduped by the sanity checks. */
  related: string[];
}

export interface JdResponsibility {
  id: string;
  /** ≤ 200 chars. */
  text: string;
}

/** Stored in `job_descriptions.extraction` (scoring-engine.md §3). */
export interface JdExtraction {
  jobTitle: string;
  seniority: JdSeniority;
  yearsRequired: number | null;
  educationLevel: JdEducationLevel;
  educationFields: string[];
  expectedSections: ResumeSectionId[];
  /** ≤ 40. */
  keywords: JdKeyword[];
  /** ≤ 15. */
  responsibilities: JdResponsibility[];
}

export type EvidenceType = "matched" | "partial" | "missing";

export interface Evidence {
  type: EvidenceType;
  item: string;
  weight: number;
  hint: string;
}

export interface FactorResult {
  raw: number;
  weight: number;
  weighted: number;
  /** Top 5 items only (scoring-engine.md §10). */
  evidence: Evidence[];
}

export type Verdict = "strong" | "partial" | "none";

export interface ValidatedVerdict {
  requirementId: string;
  verdict: Verdict;
  /** Id of the cited bullet, e.g. `b7`; null when no evidence was cited. */
  evidenceBullet: string | null;
  confidence: number;
}

export interface SemanticResult extends FactorResult {
  mode: "ai" | "fallback";
  verdicts?: ValidatedVerdict[];
}

/** Stored in `analyses.score_breakdown` (scoring-engine.md §1–2). */
export interface ScoreBreakdown {
  keyword: FactorResult;
  skills: FactorResult;
  experience: FactorResult;
  education: FactorResult;
  formatting: FactorResult;
  semantic: SemanticResult;
}

export interface KeywordMatch {
  term: string;
  /** Alias or related term that produced a partial match. */
  matchedAs?: string;
  required: boolean;
}

/** Stored in `analyses.keywords` (api-design.md §2). */
export interface KeywordAnalysis {
  matched: KeywordMatch[];
  partial: KeywordMatch[];
  missing: KeywordMatch[];
}

export interface MissingSkill {
  term: string;
  placementHint: string;
}

/** Stored in `analyses.skills_gap` (scoring-engine.md §5.2). */
export interface SkillsGap {
  required: string[];
  detected: string[];
  missing: MissingSkill[];
}

export interface SectionResult {
  /** `not_applicable` = absent and not expected, so excluded from the score. */
  status: "scored" | "not_applicable";
  score: number;
  /** Weakness rule ids, e.g. `SECTION_MISSING_EXPECTED`. */
  weaknesses: string[];
  text: string;
}

/** Stored in `analyses.section_analysis` (scoring-engine.md §6). */
export type SectionAnalysis = Partial<Record<ResumeSectionId, SectionResult>>;

export interface Suggestion {
  title: string;
  rationale: string;
  action: string;
}

/** Stored in `analyses.suggestions`, grouped by priority (prd.md E1). */
export interface Suggestions {
  high: Suggestion[];
  medium: Suggestion[];
  low: Suggestion[];
}

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type {
  FormattingReport,
  JdExtraction,
  KeywordAnalysis,
  ParsedResume,
  ScoreBreakdown,
  SectionAnalysis,
  SemanticResult,
  SkillsGap,
  Suggestions,
} from "@/types/db-payloads";

/**
 * Database schema (database.md §2). Drizzle owns the tables and indexes; RLS,
 * the profile trigger and the ownership trigger arrive in T0.5 as a hand-written
 * custom migration.
 *
 * Every user-owned table carries `user_id` with `ON DELETE CASCADE` from
 * `profiles`, so deleting a profile removes all of its data. Application queries
 * still filter by user through `scoped(userId)` repositories — RLS is only the
 * backstop (security.md §3).
 */

export const analysisStatus = pgEnum("analysis_status", [
  "processing",
  "scored",
  "complete",
  "failed",
]);

export const aiMode = pgEnum("ai_mode", ["full", "lite", "rules_only"]);

export const extractionSource = pgEnum("extraction_source", [
  "gemini_flash",
  "gemini_flash_lite",
  "rules",
]);

export const profiles = pgTable("profiles", {
  /** = auth.users.id; the profile row is created by the auth trigger (T0.5). */
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  aiConsentAt: timestamp("ai_consent_at", { withTimezone: true }),
  aiConsentVersion: text("ai_consent_version"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const resumes = pgTable(
  "resumes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    /** Extracted text only; the uploaded file is never stored. */
    normalizedText: text("normalized_text").notNull(),
    /** sha256(normalizedText). */
    contentHash: text("content_hash").notNull(),
    /** Sections, bullets, years, education, contact flags. */
    parsed: jsonb("parsed").$type<ParsedResume>().notNull(),
    /** Formatting rule results incl. mode and per-rule confidence. */
    formatting: jsonb("formatting").$type<FormattingReport>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("resumes_user_created_idx").on(t.userId, t.createdAt.desc())],
);

export const jobDescriptions = pgTable(
  "job_descriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title"),
    company: text("company"),
    rawText: text("raw_text").notNull(),
    contentHash: text("content_hash").notNull(),
    /** Keywords+aliases, responsibilities, years, education, seniority, expectedSections. */
    extraction: jsonb("extraction").$type<JdExtraction>().notNull(),
    extractionSource: extractionSource("extraction_source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("jd_user_created_idx").on(t.userId, t.createdAt.desc()),
    uniqueIndex("jd_user_hash_uniq").on(t.userId, t.contentHash),
  ],
);

export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    jobDescriptionId: uuid("job_description_id")
      .notNull()
      .references(() => jobDescriptions.id, { onDelete: "cascade" }),
    status: analysisStatus("status").notNull().default("processing"),
    aiMode: aiMode("ai_mode").notNull().default("rules_only"),
    engineVersion: text("engine_version").notNull(),
    /** sha256(resumeHash|jdHash|engineVersion). */
    cacheKey: text("cache_key").notNull(),
    overallScore: integer("overall_score"),
    scoreBreakdown: jsonb("score_breakdown").$type<ScoreBreakdown>(),
    keywords: jsonb("keywords").$type<KeywordAnalysis>(),
    skillsGap: jsonb("skills_gap").$type<SkillsGap>(),
    sectionAnalysis: jsonb("section_analysis").$type<SectionAnalysis>(),
    formatting: jsonb("formatting").$type<FormattingReport>(),
    suggestions: jsonb("suggestions").$type<Suggestions>(),
    semantic: jsonb("semantic").$type<SemanticResult>(),
    aiError: text("ai_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("analyses_user_created_idx").on(t.userId, t.createdAt.desc()),
    index("analyses_resume_idx").on(t.resumeId),
    index("analyses_jd_idx").on(t.jobDescriptionId),
    uniqueIndex("analyses_user_cache_uniq").on(t.userId, t.cacheKey),
  ],
);

export const rewriteSuggestions = pgTable(
  "rewrite_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    /** sha256(normalised original bullet). */
    bulletHash: text("bullet_hash").notNull(),
    originalBullet: text("original_bullet").notNull(),
    rewrittenBullet: text("rewritten_bullet").notNull(),
    keywordsUsed: text("keywords_used")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    notes: text("notes"),
    aiModel: text("ai_model").notNull(),
    attempt: integer("attempt").notNull().default(1),
    accepted: boolean("accepted").notNull().default(false),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    // Rolling-24h quota count for rewrites.
    index("rewrites_user_created_idx").on(t.userId, t.createdAt.desc()),
    // Per-bullet generation cap (max 4).
    index("rewrites_analysis_bullet_idx").on(t.analysisId, t.bulletHash),
  ],
);

CREATE TYPE "public"."ai_mode" AS ENUM('full', 'lite', 'rules_only');--> statement-breakpoint
CREATE TYPE "public"."analysis_status" AS ENUM('processing', 'scored', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."extraction_source" AS ENUM('gemini_flash', 'gemini_flash_lite', 'rules');--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"resume_id" uuid NOT NULL,
	"job_description_id" uuid NOT NULL,
	"status" "analysis_status" DEFAULT 'processing' NOT NULL,
	"ai_mode" "ai_mode" DEFAULT 'rules_only' NOT NULL,
	"engine_version" text NOT NULL,
	"cache_key" text NOT NULL,
	"overall_score" integer,
	"score_breakdown" jsonb,
	"keywords" jsonb,
	"skills_gap" jsonb,
	"section_analysis" jsonb,
	"formatting" jsonb,
	"suggestions" jsonb,
	"semantic" jsonb,
	"ai_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "job_descriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text,
	"company" text,
	"raw_text" text NOT NULL,
	"content_hash" text NOT NULL,
	"extraction" jsonb NOT NULL,
	"extraction_source" "extraction_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"ai_consent_at" timestamp with time zone,
	"ai_consent_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"normalized_text" text NOT NULL,
	"content_hash" text NOT NULL,
	"parsed" jsonb NOT NULL,
	"formatting" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rewrite_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"analysis_id" uuid NOT NULL,
	"bullet_hash" text NOT NULL,
	"original_bullet" text NOT NULL,
	"rewritten_bullet" text NOT NULL,
	"keywords_used" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text,
	"ai_model" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_job_description_id_job_descriptions_id_fk" FOREIGN KEY ("job_description_id") REFERENCES "public"."job_descriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewrite_suggestions" ADD CONSTRAINT "rewrite_suggestions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewrite_suggestions" ADD CONSTRAINT "rewrite_suggestions_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analyses_user_created_idx" ON "analyses" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "analyses_resume_idx" ON "analyses" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "analyses_jd_idx" ON "analyses" USING btree ("job_description_id");--> statement-breakpoint
CREATE UNIQUE INDEX "analyses_user_cache_uniq" ON "analyses" USING btree ("user_id","cache_key");--> statement-breakpoint
CREATE INDEX "jd_user_created_idx" ON "job_descriptions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "jd_user_hash_uniq" ON "job_descriptions" USING btree ("user_id","content_hash");--> statement-breakpoint
CREATE INDEX "resumes_user_created_idx" ON "resumes" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "rewrites_user_created_idx" ON "rewrite_suggestions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "rewrites_analysis_bullet_idx" ON "rewrite_suggestions" USING btree ("analysis_id","bullet_hash");
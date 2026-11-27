# AGENTS.md — rules for AI coding tools (Freebuff and others)

Single source of truth for AI-assisted development. Full specs live in `meta/`. Read this file, then `meta/PROGRESS.md`, then the specs named in the task prompt.

**This file is the project instruction file, and it lives at the repository root because that is where Freebuff looks for one.** Freebuff reads `AGENTS.md` from the project root at the start of every session, falls back to `CLAUDE.md` only when there is no `AGENTS.md`, and no longer reads `knowledge.md` at all (verified 2026-11-27, see `meta/PROGRESS.md` → Verified facts). Keep the rules here and link to the specs instead of duplicating them.

## Project

ATS Resume Intelligence Platform: portfolio project, free-tier only, 14-day build. Job seekers upload a PDF/DOCX/TXT resume, paste a job description, and get an explainable ATS score plus suggestions and a bullet rewriter. English only.

## Where things are

| Need                            | File                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| What to build and in what order | `meta/tasks.md` (60 tasks), `meta/execution-plan.md` (days, gates)                              |
| Progress, decisions, bug log    | `meta/PROGRESS.md`                                                                              |
| Requirements                    | `meta/prd.md`, `meta/srs.md`                                                                    |
| Design                          | `meta/architecture.md`, `database.md`, `backend.md`, `frontend.md`, `ui-ux.md`, `api-design.md` |
| Scoring / AI rules              | `meta/scoring-engine.md`, `meta/ai-engine.md`                                                   |
| Security / testing / deploy     | `meta/security.md`, `testing.md`, `deployment.md`                                               |
| One-time setup                  | `meta/setup-guide.md`                                                                           |
| How a session runs              | `meta/session-playbook.md`                                                                      |
| Troubleshooting                 | `meta/debugging.md`                                                                             |

## Fixed stack (do not change)

Next.js 15 (App Router) · TypeScript strict · Tailwind · shadcn/ui · Server Actions + Route Handlers · Supabase (Postgres, Auth) · Drizzle ORM · Gemini 2.5 Flash (fallback 2.5 Flash-Lite) · pdf-parse · mammoth · Vercel Hobby · Vitest · Playwright · PGlite (service tests).
No new paid services. No Supabase Storage for resumes (files are parsed in memory and discarded). No Sentry. No Redis.

## Session protocol (every session)

1. Read this file, `meta/PROGRESS.md`, and the specs named in the prompt.
2. Do **exactly one task** from `meta/tasks.md`. Do not start the next task. Touch only files the task needs.
3. For anything in `src/core/*`: write the tests first, then the implementation.
4. If the spec is ambiguous or you think it is wrong, **ask**; do not guess and do not change the spec, stack, schema, weights or limits yourself.
5. Run `npm run lint && npm run typecheck && npm test` before finishing (add `npm run build` if you changed routes, config or env).
6. Update `meta/PROGRESS.md` (tick the task, note anything left undone, record any decision).
7. Reply with: files changed, commands to run, the manual check for "Done when", anything left undone.

## Debugging protocol

- Reproduce → read the real error → locate the layer → write a failing test → fix the root cause → run all checks → log it in `meta/PROGRESS.md` "Bug log". See `meta/debugging.md`.
- **Forbidden shortcuts:** skipping/deleting/weakening tests, `any`, `@ts-ignore`, `eslint-disable`, silencing errors with empty `catch`, loosening types or schemas to make something compile, hard-coding fixture outputs.
- After 2 failed attempts at the same bug, stop and report what you learned instead of trying a third patch.

## Architecture rules

- `src/core/*` is pure TypeScript: no network, DB, env, or framework imports. All scoring, parsing, formatting, JD validation, redaction and verdict validation live here.
- **Scores come from rules only.** Gemini may extract JD requirements, return categorical verdicts (validated by rules), write suggestions, and rewrite bullets. Gemini must never output or alter a score.
- Every DB query goes through `scoped(userId)` repositories. Never query by id alone. RLS is a backstop, not the primary check.
- Route handlers use `withApi` (auth via `getUser()`, same-origin check, Zod validation with `.strict()`, error envelope).
- Gemini calls only from `src/core/ai` via the model chain; never from client code; never when `profiles.ai_consent_at` is null.
- Analysis order: auth → consent → cache check → rolling-24 h limit check → **then** any Gemini call.
- Limits: 3 analyses and 15 rewrites per rolling 24 h per user; ≤ 4 generations per bullet per analysis; cache hits and failed calls are not charged.
- Time-dependent logic receives `now` as a parameter.
- Handlers: `runtime = 'nodejs'`, `maxDuration` ≤ 60.
- Env access only through `src/lib/env.ts`.

## Privacy & security (hard rules)

- Never log resume text, JD text, or AI output (log lengths, hashes, codes only). Never paste real resumes, API keys, or `.env` contents into any AI tool; fixtures are synthetic.
- Redact name/email/phone/URL/address before sending resume excerpts to Gemini.
- Never use `dangerouslySetInnerHTML`; render all text as text.
- `SUPABASE_SERVICE_ROLE_KEY` only in the account-deletion action (`server-only`).
- Validate file size (≤ 4 MB), MIME, and magic bytes; never trust file names.
- Never commit secrets or `.env*` (except `.env.example`).

## Style

Kebab-case files, PascalCase components, one component per file, `@/*` imports, no `any`, no default exports except Next.js pages/layouts, errors as `AppError`, UI per `meta/ui-ux.md` (restrained, no AI-sparkle styling, icon + text for status, never colour alone).

## Commands (must exist after T0.2 / T0.4)

`npm run dev` · `build` · `start` · `lint` · `typecheck` · `test` (unit + PGlite) · `test:watch` · `test:coverage` · `test:integration` (dev Supabase) · `test:e2e` (Playwright, `AI_MOCK=1`) · `db:generate` · `db:migrate:dev` · `db:migrate:prod` (never `drizzle-kit push` on prod) · `ai:eval` (manual, live Gemini).

## Don't

Change weights/formula without bumping `ENGINE_VERSION` and updating `meta/scoring-engine.md` · change prompts without bumping `PROMPT_VERSION` · add recruiter features, resume paste input, comparison views, PDF export, OCR, or non-English support (out of scope for MVP) · add features not in `tasks.md` (put ideas in `meta/PROGRESS.md` "Parking lot").

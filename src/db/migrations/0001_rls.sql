-- Row level security, the auth profile trigger and the analysis ownership trigger
-- (database.md §5–6). Hand-written custom migration so it lives in the Drizzle
-- journal (T0.5); `0000_init` only creates tables and indexes.
--
-- The app connects with a privileged role that bypasses RLS, so repositories
-- must still filter by `user_id` through `scoped(userId)` (security.md §3). RLS
-- and the ownership trigger are the backstop for anything that reaches Postgres
-- with a user JWT instead.

-- RLS -------------------------------------------------------------------------

alter table public.profiles enable row level security;--> statement-breakpoint
alter table public.resumes enable row level security;--> statement-breakpoint
alter table public.job_descriptions enable row level security;--> statement-breakpoint
alter table public.analyses enable row level security;--> statement-breakpoint
alter table public.rewrite_suggestions enable row level security;--> statement-breakpoint

create policy own_profile on public.profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());--> statement-breakpoint

create policy own_resumes on public.resumes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());--> statement-breakpoint

create policy own_jds on public.job_descriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());--> statement-breakpoint

create policy own_analyses on public.analyses
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());--> statement-breakpoint

create policy own_rewrites on public.rewrite_suggestions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());--> statement-breakpoint

-- Profile trigger: every auth user gets exactly one profile row --------------

create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');

  return new;
end;
$$;--> statement-breakpoint

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();--> statement-breakpoint

-- Ownership trigger: an analysis may only reference this user's resume and JD -

create function public.enforce_analysis_ownership() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.resumes r
    where r.id = new.resume_id
      and r.user_id = new.user_id
  ) then
    raise exception 'analysis.resume_id does not belong to analysis.user_id'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.job_descriptions j
    where j.id = new.job_description_id
      and j.user_id = new.user_id
  ) then
    raise exception 'analysis.job_description_id does not belong to analysis.user_id'
      using errcode = '42501';
  end if;

  return new;
end;
$$;--> statement-breakpoint

create trigger analyses_ownership_check
  before insert or update on public.analyses
  for each row execute function public.enforce_analysis_ownership();

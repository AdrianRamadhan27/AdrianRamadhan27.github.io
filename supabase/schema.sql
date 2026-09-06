-- Portfolio v2 schema. Run this once in the Supabase SQL editor
-- (Project -> SQL Editor -> New query -> paste -> Run).
--
-- Security model:
--   * anon (the public site, using the anon key) can SELECT content tables
--     only, and can only read a restricted view of chat settings.
--   * authenticated (you, logged into the CMS) can CRUD content tables and
--     read/update chat_settings, but NEVER reads or writes chat_secrets or
--     model_catalog directly — those go through edge functions running with
--     the service_role key, which bypasses RLS entirely.
--   * Public signup must be disabled in Authentication -> Providers -> Email
--     in the dashboard, or these "authenticated" policies apply to anyone
--     who registers.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------- profile
create table if not exists profile (
  id integer primary key default 1,
  full_name text not null default '',
  headline text not null default '',
  hero_lines text[] not null default '{}',
  about_text text not null default '',
  email text not null default '',
  photo_path text,
  cv_path text,
  updated_at timestamptz not null default now(),
  constraint profile_singleton check (id = 1)
);
insert into profile (id) values (1) on conflict (id) do nothing;

alter table profile enable row level security;
create policy "profile_public_read" on profile for select to anon using (true);
create policy "profile_auth_all" on profile for all to authenticated
  using (true) with check (true);

-- ------------------------------------------------------------- experiences
create table if not exists experiences (
  id uuid primary key default uuid_generate_v4(),
  title text not null default '',
  company_name text not null default '',
  icon_path text,
  icon_bg text not null default '#0d1f19',
  date_label text not null default '',
  points text[] not null default '{}',
  sort_order integer not null default 0
);

alter table experiences enable row level security;
create policy "experiences_public_read" on experiences for select to anon using (true);
create policy "experiences_auth_all" on experiences for all to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------- projects
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null default '',
  description text not null default '',
  tags jsonb not null default '[]',
  image_path text,
  source_code_link text not null default '',
  live_link text,
  sort_order integer not null default 0
);

alter table projects enable row level security;
create policy "projects_public_read" on projects for select to anon using (true);
create policy "projects_auth_all" on projects for all to authenticated
  using (true) with check (true);

-- ------------------------------------------------------------------ skills
create table if not exists skills (
  id uuid primary key default uuid_generate_v4(),
  name text not null default '',
  icon_path text,
  category text,
  sort_order integer not null default 0
);

alter table skills enable row level security;
create policy "skills_public_read" on skills for select to anon using (true);
create policy "skills_auth_all" on skills for all to authenticated
  using (true) with check (true);

-- ----------------------------------------------------------------- socials
create table if not exists socials (
  id uuid primary key default uuid_generate_v4(),
  label text not null default '',
  url text not null default '',
  icon_key text not null default 'website',
  sort_order integer not null default 0
);

alter table socials enable row level security;
create policy "socials_public_read" on socials for select to anon using (true);
create policy "socials_auth_all" on socials for all to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------- chat_settings
-- Non-secret chatbot configuration. Readable/writable by the CMS; the public
-- site never reads this table directly, only the chat_settings_public view.
create table if not exists chat_settings (
  id integer primary key default 1,
  base_url text not null default 'https://api.groq.com/openai/v1',
  model text not null default '',
  system_prompt text not null default 'You are a helpful assistant embedded in a portfolio website.',
  greeting text not null default 'Hi! Ask me anything about this portfolio.',
  temperature numeric not null default 0.7,
  max_tokens integer not null default 400,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint chat_settings_singleton check (id = 1)
);
insert into chat_settings (id) values (1) on conflict (id) do nothing;

alter table chat_settings enable row level security;
create policy "chat_settings_auth_all" on chat_settings for all to authenticated
  using (true) with check (true);
-- Deliberately no anon policy: the public site reads chat_settings_public instead.

create or replace view chat_settings_public as
  select enabled, greeting, model from chat_settings where id = 1;

grant select on chat_settings_public to anon, authenticated;

-- ------------------------------------------------------------- chat_secrets
-- The API key lives here ONLY. No RLS policy grants anon or authenticated
-- any access at all — only the service_role key (used exclusively inside
-- edge functions) can read or write this table.
create table if not exists chat_secrets (
  id integer primary key default 1,
  api_key text,
  constraint chat_secrets_singleton check (id = 1)
);
insert into chat_secrets (id) values (1) on conflict (id) do nothing;

alter table chat_secrets enable row level security;
-- No policies created: RLS enabled with zero policies = zero client access.

-- RPC so the CMS can show "API key is set" / "not set" without ever reading
-- the key itself. SECURITY DEFINER lets it peek at chat_secrets despite RLS.
create or replace function has_chat_api_key()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from chat_secrets
    where id = 1 and api_key is not null and api_key <> ''
  );
$$;

grant execute on function has_chat_api_key() to authenticated;

-- ------------------------------------------------------------- model_catalog
-- Cached list of models from the last "Refresh models" click. No anon or
-- authenticated policies either — the CMS reads it through the `models`
-- edge function's response, not a direct table select, so a stale/empty
-- table never leaks anything sensitive and needs no client-facing policy.
create table if not exists model_catalog (
  model_id text primary key,
  display_name text not null,
  fetched_at timestamptz not null default now()
);

alter table model_catalog enable row level security;
-- No policies: this table is only ever touched by edge functions
-- (service_role), which bypasses RLS entirely.

-- -------------------------------------------------------------- rate_limits
create table if not exists rate_limits (
  ip_hash text primary key,
  window_start timestamptz not null,
  count integer not null default 0
);

alter table rate_limits enable row level security;
-- No policies: service_role (inside the `chat` edge function) only.

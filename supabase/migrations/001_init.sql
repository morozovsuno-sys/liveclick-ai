-- LiveClick AI — Initial Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ========== PROFILES ==========
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'studio')),
  tracks_used_this_month integer not null default 0,
  subscription_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ========== JOBS ==========
create table public.jobs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'done', 'failed')),
  mode text not null default 'premium' check (mode in ('fast', 'premium')),
  filename text not null,
  file_size integer,
  bpm float,
  stems jsonb,
  progress integer default 0,
  error_message text,
  modal_call_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.jobs enable row level security;

create policy "Users can view own jobs"
  on public.jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own jobs"
  on public.jobs for insert
  with check (auth.uid() = user_id);

-- ========== PAYMENTS ==========
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  payment_id text unique not null,
  plan text not null,
  amount integer not null,
  currency text default 'RUB',
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'canceled')),
  created_at timestamptz default now()
);

alter table public.payments enable row level security;

create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- ========== PLAN LIMITS ==========
create table public.plan_limits (
  plan text primary key,
  tracks_per_month integer not null,
  max_stems integer not null,
  max_file_mb integer not null,
  api_access boolean default false
);

insert into public.plan_limits values
  ('free',   3,  2, 50,  false),
  ('pro',    50, 6, 100, false),
  ('studio', -1, 6, 200, true);

-- ========== AUTO-CREATE PROFILE ON SIGNUP ==========
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ========== AUTO-UPDATE updated_at ==========
create or replace function public.update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger update_jobs_updated_at before update on public.jobs
  for each row execute procedure public.update_updated_at();

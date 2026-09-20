-- SMART ACADEMY V2
-- Run this in Supabase SQL Editor.
-- Never place service-role keys or payment secrets in frontend code.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'student' check (role in ('student','teacher','parent','admin')),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  subject text not null,
  description text,
  price_cents integer not null default 4500 check (price_cents >= 0),
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('pending','active','cancelled')),
  created_at timestamptz not null default now(),
  unique(class_id, student_id)
);

create table if not exists public.class_replays (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  subject text,
  teacher_name text,
  recorded_at timestamptz not null default now(),
  duration_seconds integer,
  storage_path text not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents bigint not null,
  type text not null check (type in ('top_up','purchase','refund','teacher_earning','withdrawal')),
  status text not null default 'pending' check (status in ('pending','verified','failed','reversed')),
  provider text,
  provider_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.class_replays enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

create policy "profiles own read" on public.profiles
for select using (auth.uid() = id);

create policy "profiles own insert" on public.profiles
for insert with check (auth.uid() = id);

create policy "profiles own update" on public.profiles
for update using (auth.uid() = id);

create policy "published classes readable" on public.classes
for select using (status = 'published' or teacher_id = auth.uid());

create policy "teacher creates own classes" on public.classes
for insert with check (teacher_id = auth.uid());

create policy "teacher updates own classes" on public.classes
for update using (teacher_id = auth.uid());

create policy "student sees own enrollments" on public.enrollments
for select using (student_id = auth.uid());

create policy "student creates own enrollment" on public.enrollments
for insert with check (student_id = auth.uid());

create policy "replays visible to enrolled students or teacher"
on public.class_replays for select using (
  exists (
    select 1 from public.enrollments e
    where e.class_id = class_replays.class_id
      and e.student_id = auth.uid()
      and e.status = 'active'
  )
  or exists (
    select 1 from public.classes c
    where c.id = class_replays.class_id
      and c.teacher_id = auth.uid()
  )
);

create policy "wallet own read" on public.wallet_accounts
for select using (user_id = auth.uid());

create policy "transactions own read" on public.wallet_transactions
for select using (user_id = auth.uid());

create policy "notifications own read" on public.notifications
for select using (user_id = auth.uid());

create policy "reports own read" on public.reports
for select using (reporter_id = auth.uid());

-- Storage bucket for private replay recordings.
insert into storage.buckets (id, name, public)
values ('class-replays', 'class-replays', false)
on conflict (id) do nothing;

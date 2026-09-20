-- SMART ACADEMY / SUPABASE FOUNDATION
-- Run in Supabase SQL Editor.
-- IMPORTANT: never put service_role keys in frontend code.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('student','teacher','parent','admin')),
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id),
  subject_id uuid references public.subjects(id),
  title text not null,
  description text,
  price numeric(10,2) not null default 45 check (price >= 0),
  schedule_text text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  unique(class_id, student_id)
);

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  type text not null check (type in ('top_up','tuition_payment','refund','subscription','manual_adjustment')),
  amount numeric(12,2) not null,
  status text not null check (status in ('pending','success','failed','refunded')),
  provider text,
  provider_transaction_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  amount numeric(12,2) not null,
  method text,
  status text not null check (status in ('pending','success','failed','refunded')),
  provider text,
  provider_reference text,
  webhook_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  class_id uuid not null references public.classes(id),
  amount numeric(12,2) not null,
  status text not null default 'active',
  auto_renew boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id,class_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'); $$;

create policy "profile self read" on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy "profile self update" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid());

create policy "published classes readable" on public.classes for select using (is_published=true or teacher_id=auth.uid() or public.is_admin());
create policy "teachers create own classes" on public.classes for insert with check (teacher_id=auth.uid());
create policy "teachers update own classes" on public.classes for update using (teacher_id=auth.uid() or public.is_admin());

create policy "members read own" on public.class_members for select using (student_id=auth.uid() or public.is_admin());
create policy "wallet self read" on public.wallets for select using (user_id=auth.uid() or public.is_admin());
create policy "wallet tx self read" on public.wallet_transactions for select using (user_id=auth.uid() or public.is_admin());
create policy "payments self read" on public.payments for select using (user_id=auth.uid() or public.is_admin());
create policy "subscriptions self read" on public.subscriptions for select using (user_id=auth.uid() or public.is_admin());
create policy "notifications self read" on public.notifications for select using (user_id=auth.uid() or public.is_admin());

-- Payment, wallet deduction, subscription activation and webhook verification
-- MUST be implemented in trusted backend/Edge Functions.
-- Do NOT create a client policy allowing users to directly UPDATE wallets.balance.

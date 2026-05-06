-- Create required extensions
create extension if not exists pgcrypto;

-- Create user profiles and roles
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  user_role text default 'CUSTOMER' check (user_role in ('CUSTOMER', 'CONTRACTOR', 'SPECIALIST', 'EQUIPMENT_OPS', 'VENDOR_MGR', 'SUPPORT_AGENT', 'FINANCE_OFFICER', 'PLATFORM_ADMIN', 'COO')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- Create profiles RLS policy
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id or auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Create user role view (for JWT mapping)
create or replace function auth.email() returns text as $$
  select email from auth.users where id = auth.uid();
$$ language sql stable;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, user_role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'CUSTOMER');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles on delete cascade,
  title text not null,
  description text,
  parish text not null,
  budget_ceiling numeric,
  status text default 'DRAFT' check (status in ('DRAFT', 'TEAM_BUILDING', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create vendor profiles
create table if not exists vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  trade_type text not null,
  specialties text[] default '{}',
  rate_per_day numeric not null,
  status text default 'PENDING' check (status in ('PENDING', 'APPROVED', 'SUSPENDED', 'INACTIVE')),
  rating numeric default 5.0,
  total_jobs integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create project teams
create table if not exists project_teams (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  vendor_id uuid not null references vendor_profiles on delete cascade,
  role text not null,
  allocated_days integer not null,
  rate_per_day numeric not null,
  total_cost numeric generated always as (allocated_days * rate_per_day) stored,
  status text default 'ASSIGNED' check (status in ('ASSIGNED', 'STARTED', 'COMPLETED', 'REPLACED')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create milestones
create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  title text not null,
  description text,
  milestone_order integer not null,
  scheduled_start_date date,
  scheduled_end_date date,
  budget_allocation numeric,
  status text default 'PENDING' check (status in ('PENDING', 'SUBMITTED', 'APPROVED', 'DISPUTED', 'PAID')),
  submitted_at timestamptz,
  submitted_by uuid references profiles,
  approved_at timestamptz,
  scheduled_auto_approve_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table projects enable row level security;
alter table vendor_profiles enable row level security;
alter table project_teams enable row level security;
alter table milestones enable row level security;

-- Create RLS policies
create policy "Users can see their own projects"
  on projects for select
  using (auth.uid() = customer_id or auth.role() = 'service_role');

create policy "Users can create projects"
  on projects for insert
  with check (auth.uid() = customer_id);

create policy "Users can update their projects"
  on projects for update
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

create policy "Anyone can see approved vendors"
  on vendor_profiles for select
  using (status = 'APPROVED' or auth.uid() = user_id or auth.role() = 'service_role');

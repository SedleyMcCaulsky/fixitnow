-- Create immutable audit log table
create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles,
  event_type text not null check (event_type in ('USER_LOGIN', 'USER_SIGNUP', 'PROJECT_CREATED', 'PROJECT_UPDATED', 'TEAM_ASSIGNED', 'MILESTONE_SUBMITTED', 'MILESTONE_APPROVED', 'MILESTONE_DISPUTED', 'PAYMENT_RELEASED', 'VENDOR_APPROVED', 'ADMIN_ACTION')),
  resource_type text,
  resource_id uuid,
  action text not null,
  changes jsonb,
  prev_hash text,
  event_hash text not null,
  created_at timestamptz default now(),
  ip_address inet,
  user_agent text,
  unique (id)
);

-- Add immutability trigger
create or replace function public.prevent_audit_delete_update()
returns trigger as $$
begin
  raise exception 'Audit events are immutable';
end;
$$ language plpgsql security definer;

create or replace trigger audit_immutable
  before delete or update on audit_events
  for each row
  execute procedure public.prevent_audit_delete_update();

-- Enable RLS
alter table audit_events enable row level security;

create policy "Only admins can view all audit events"
  on audit_events for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.user_role = 'PLATFORM_ADMIN'
    )
  );

create policy "Users can view their own events"
  on audit_events for select
  using (auth.uid() = user_id);

-- Create indexes for performance
create index if not exists idx_audit_user_id on audit_events(user_id);
create index if not exists idx_audit_event_type on audit_events(event_type);
create index if not exists idx_audit_resource on audit_events(resource_type, resource_id);
create index if not exists idx_audit_created_at on audit_events(created_at);

-- Function to emit audit event
create or replace function public.emit_audit_event(
  p_user_id uuid,
  p_event_type text,
  p_resource_type text,
  p_resource_id uuid,
  p_action text,
  p_changes jsonb default null,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns jsonb as $$
declare
  v_prev_hash text;
  v_event_hash text;
  v_event_id uuid;
begin
  -- Get previous hash
  select event_hash into v_prev_hash from public.audit_events
  order by created_at desc limit 1;
  
  v_prev_hash := coalesce(v_prev_hash, '0');
  
  -- Create hash of current event
  v_event_hash := encode(
    digest(
      p_user_id::text || '|' || p_event_type || '|' || p_resource_type || '|' || p_resource_id::text || '|' || p_action || '|' || v_prev_hash,
      'sha256'
    ),
    'hex'
  );
  
  -- Insert event
  insert into public.audit_events (
    user_id, event_type, resource_type, resource_id, action, changes, prev_hash, event_hash, ip_address, user_agent
  ) values (
    p_user_id, p_event_type, p_resource_type, p_resource_id, p_action, p_changes, v_prev_hash, v_event_hash, p_ip_address, p_user_agent
  )
  returning id into v_event_id;
  
  return jsonb_build_object(
    'event_id', v_event_id,
    'event_hash', v_event_hash,
    'timestamp', now()
  );
end;
$$ language plpgsql security definer;

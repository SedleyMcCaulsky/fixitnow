-- Ensure pgcrypto is available for any cryptographic operations
create extension if not exists pgcrypto;

-- Custom JWT hook for Supabase to include user role and profile metadata
create or replace function public.custom_access_token_hook()
returns jsonb as $$
declare
  profile_row record;
  claims jsonb;
begin
  select id, full_name, user_role into profile_row
  from public.profiles
  where id = new.user_id;

  claims := jsonb_build_object(
    'role', coalesce(profile_row.user_role, 'CUSTOMER'),
    'user_id', new.user_id,
    'email', new.email,
    'full_name', coalesce(profile_row.full_name, new.raw_user_meta_data->>'full_name')
  );

  return claims;
end;
$$ language plpgsql security definer;

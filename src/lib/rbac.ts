import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
export type UserRole = 'CUSTOMER'|'CONTRACTOR'|'SPECIALIST'|'EQUIPMENT_OPS'|'VENDOR_MGR'|'SUPPORT_AGENT'|'FINANCE_OFFICER'|'PLATFORM_ADMIN'|'COO'
export async function requireRole(allowed: UserRole[]) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, role: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const role = (user.app_metadata?.user_role ?? 'CUSTOMER') as UserRole
  if (!allowed.includes(role)) {
    return { user: null, role: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, role, error: null }
}
export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

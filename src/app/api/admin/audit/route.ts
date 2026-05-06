import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/rbac'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const { user, error: authError } = await requireRole(['PLATFORM_ADMIN'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('audit_events')
    .select('id,user_id,event_type,resource_type,resource_id,action,changes,created_at,profiles(full_name,email)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events: data ?? [] })
}

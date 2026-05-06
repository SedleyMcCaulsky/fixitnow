import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'

export async function GET(req: Request, context: any) {
  const { params } = context
  const { id } = await params
  const { error: authError } = await requireRole([
    'CUSTOMER',
    'CONTRACTOR',
    'SPECIALIST',
    'EQUIPMENT_OPS',
    'VENDOR_MGR',
    'SUPPORT_AGENT',
    'FINANCE_OFFICER',
    'PLATFORM_ADMIN',
    'COO',
  ])
  if (authError) return authError

  const supabase = await createClient()
  const { data: milestones, error: milestoneError } = await supabase
    .from('milestones')
    .select('id')
    .eq('project_id', id)

  if (milestoneError) {
    return NextResponse.json({ error: milestoneError.message }, { status: 500 })
  }

  const milestoneIds = (milestones ?? []).map((item: any) => item.id)

  if (milestoneIds.length === 0) {
    return NextResponse.json({ notifications: [] })
  }

  const { data, error } = await supabase
    .from('audit_events')
    .select('id,event_type,action,resource_id,changes,created_at,user_id,profiles(full_name,email)')
    .in('resource_id', milestoneIds)
    .eq('resource_type', 'milestone')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notifications: data ?? [] })
}

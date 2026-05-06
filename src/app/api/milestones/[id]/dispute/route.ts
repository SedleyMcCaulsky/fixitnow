import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'

export async function POST(req: NextRequest, context: any) {
  const { params } = context
  const { id } = await params
  const { user, error: authError } = await requireRole([
    'CUSTOMER',
    'CONTRACTOR',
    'SPECIALIST',
    'EQUIPMENT_OPS',
    'VENDOR_MGR',
    'SUPPORT_AGENT',
    'FINANCE_OFFICER',
    'PLATFORM_ADMIN',
  ])
  if (authError) return authError

  const body = await req.json()
  const { reason } = body
  if (!reason) {
    return NextResponse.json({ error: 'Dispute reason is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: milestone, error: milestoneError } = await supabase
    .from('milestones')
    .select('id,status')
    .eq('id', id)
    .single()

  if (milestoneError || !milestone) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('milestones')
    .update({ status: 'DISPUTED' })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.rpc('emit_audit_event', {
    p_user_id: user.id,
    p_event_type: 'MILESTONE_DISPUTED',
    p_resource_type: 'milestone',
    p_resource_id: id,
    p_action: 'dispute',
    p_changes: { reason },
  })

  return NextResponse.json(data)
}

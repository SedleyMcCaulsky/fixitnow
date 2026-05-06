import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'

export async function POST(req: NextRequest, context: any) {
  const { params } = context
  const { id } = await params
  const { user, error: authError } = await requireRole(['CONTRACTOR', 'SPECIALIST', 'EQUIPMENT_OPS', 'VENDOR_MGR', 'PLATFORM_ADMIN'])
  if (authError) return authError

  const supabase = await createClient()
  const { data: milestone, error: milestoneError } = await supabase
    .from('milestones')
    .select('id,project_id,status')
    .eq('id', id)
    .single()

  if (milestoneError || !milestone) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }

  if (milestone.status !== 'PENDING') {
    return NextResponse.json({ error: 'Only pending milestones can be submitted' }, { status: 400 })
  }

  const now = new Date()
  const autoApprove = new Date(now.getTime() + 5 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('milestones')
    .update({
      status: 'SUBMITTED',
      submitted_at: now.toISOString(),
      submitted_by: user.id,
      scheduled_auto_approve_at: autoApprove,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.rpc('emit_audit_event', {
    p_user_id: user.id,
    p_event_type: 'MILESTONE_SUBMITTED',
    p_resource_type: 'milestone',
    p_resource_id: id,
    p_action: 'submit',
    p_changes: { scheduled_auto_approve_at: autoApprove },
  })

  return NextResponse.json(data)
}

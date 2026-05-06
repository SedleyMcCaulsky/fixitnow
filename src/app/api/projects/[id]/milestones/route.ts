import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'

export async function GET(req: NextRequest, context: any) {
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
    'COO',
  ])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('project_id', id)
    .order('milestone_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ milestones: data ?? [] })
}

export async function POST(req: NextRequest, context: any) {
  const { params } = context
  const { id } = await params
  const { user, error: authError } = await requireRole(['CUSTOMER'])
  if (authError) return authError

  const body = await req.json()
  const { title, description, milestone_order, budget_allocation, scheduled_start_date, scheduled_end_date } = body
  if (!title || !milestone_order) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('customer_id')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  if (project.customer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('milestones')
    .insert([
      {
        project_id: id,
        title,
        description,
        milestone_order,
        scheduled_start_date,
        scheduled_end_date,
        budget_allocation,
        status: 'PENDING',
      },
    ])
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.rpc('emit_audit_event', {
    p_user_id: user.id,
    p_event_type: 'PROJECT_UPDATED',
    p_resource_type: 'project',
    p_resource_id: id,
    p_action: 'milestone_create',
    p_changes: { milestone_id: data?.[0]?.id, title, milestone_order, budget_allocation },
  })

  return NextResponse.json(data?.[0] ?? null, { status: 201 })
}

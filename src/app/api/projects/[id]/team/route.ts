import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'

export async function GET(req: NextRequest, context: any) {
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
  const { data, error } = await supabase
    .from('project_teams')
    .select('id,project_id,vendor_id,role,allocated_days,rate_per_day,total_cost,status,created_at,updated_at,vendor_profiles(id,trade_type,rate_per_day,profiles(full_name,email))')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ team: data ?? [] })
}

export async function POST(req: NextRequest, context: any) {
  const { params } = context
  const { id } = await params
  const { user, error: authError } = await requireRole(['CUSTOMER'])
  if (authError) return authError

  const body = await req.json()
  const { vendor_id, role, allocated_days, rate_per_day } = body
  if (!vendor_id || !role || !allocated_days || !rate_per_day) {
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

  const { data: vendor, error: vendorError } = await supabase
    .from('vendor_profiles')
    .select('status')
    .eq('id', vendor_id)
    .single()

  if (vendorError || !vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  if (vendor.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Only approved vendors can be assigned' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('project_teams')
    .insert([
      {
        project_id: id,
        vendor_id,
        role,
        allocated_days,
        rate_per_day,
      },
    ])
    .select('id,project_id,vendor_id,role,allocated_days,rate_per_day,total_cost,status,created_at,updated_at,vendor_profiles(id,trade_type,rate_per_day,profiles(full_name,email))')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.rpc('emit_audit_event', {
    p_user_id: user.id,
    p_event_type: 'TEAM_ASSIGNED',
    p_resource_type: 'project',
    p_resource_id: id,
    p_action: 'assign',
    p_changes: { vendor_id, role, allocated_days, rate_per_day },
  })

  return NextResponse.json(data?.[0] ?? null, { status: 201 })
}

export async function DELETE(req: NextRequest, context: any) {
  const { params } = context
  const { id } = await params
  const { user, error: authError } = await requireRole(['CUSTOMER'])
  if (authError) return authError

  const { team_id } = await req.json()
  if (!team_id) {
    return NextResponse.json({ error: 'Missing team_id' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: teamMember, error: teamError } = await supabase
    .from('project_teams')
    .select('id,project_id')
    .eq('id', team_id)
    .single()

  if (teamError || !teamMember || teamMember.project_id !== id) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
  }

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

  const { error } = await supabase.from('project_teams').delete().eq('id', team_id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.rpc('emit_audit_event', {
    p_user_id: user.id,
    p_event_type: 'TEAM_ASSIGNED',
    p_resource_type: 'project',
    p_resource_id: id,
    p_action: 'remove',
    p_changes: { team_id },
  })

  return NextResponse.json({ success: true })
}

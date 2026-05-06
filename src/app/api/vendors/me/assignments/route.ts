import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: vendor, error: vendorError } = await supabase
    .from('vendor_profiles')
    .select('id,trade_type,specialties,rate_per_day,status,rating,total_jobs,profiles(full_name,email)')
    .eq('user_id', user.id)
    .single()

  if (vendorError) {
    return NextResponse.json({ error: vendorError.message || 'Vendor profile not found' }, { status: 404 })
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from('project_teams')
    .select('id,project_id,role,allocated_days,rate_per_day,total_cost,status,created_at,updated_at,projects(id,title,status,parish)')
    .eq('vendor_id', vendor.id)
    .order('created_at', { ascending: false })

  if (assignmentsError) {
    return NextResponse.json({ error: assignmentsError.message }, { status: 500 })
  }

  const projectIds = (assignments ?? []).map((assignment: any) => assignment.project_id)
  const { data: milestones, error: milestoneError } = projectIds.length
    ? await supabase
        .from('milestones')
        .select('id,project_id,title,status,budget_allocation,scheduled_start_date,scheduled_end_date,submitted_at,approved_at')
        .in('project_id', projectIds)
        .order('milestone_order', { ascending: true })
    : { data: [], error: null }

  if (milestoneError) {
    return NextResponse.json({ error: milestoneError.message }, { status: 500 })
  }

  return NextResponse.json({ vendor, assignments: assignments ?? [], milestones: milestones ?? [] })
}

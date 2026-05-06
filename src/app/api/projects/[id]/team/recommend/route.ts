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
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('parish')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const tradeType = req.nextUrl.searchParams.get('trade_type')
  let query = supabase
    .from('vendor_profiles')
    .select('id,user_id,trade_type,rate_per_day,specialties,rating,total_jobs,profiles(full_name,avatar_url)')
    .eq('status', 'APPROVED')
    .order('rating', { ascending: false })

  if (tradeType) {
    query = query.eq('trade_type', tradeType)
  }

  const { data: vendors, error: vendorError } = await query
  if (vendorError) {
    return NextResponse.json({ error: vendorError.message }, { status: 500 })
  }

  return NextResponse.json({ project, vendors })
}

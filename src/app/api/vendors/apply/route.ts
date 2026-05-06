import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'

export async function POST(req: NextRequest) {
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

  const body = await req.json()
  const { trade_type, specialties, rate_per_day } = body
  if (!trade_type || !rate_per_day) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vendor_profiles')
    .insert([
      {
        user_id: user.id,
        trade_type,
        specialties: specialties || [],
        rate_per_day,
        status: 'PENDING',
      },
    ])
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.rpc('emit_audit_event', {
    p_user_id: user.id,
    p_event_type: 'ADMIN_ACTION',
    p_resource_type: 'vendor_profile',
    p_resource_id: data?.[0]?.id,
    p_action: 'apply_vendor',
    p_changes: { trade_type, rate_per_day },
  })

  return NextResponse.json(data?.[0] ?? null, { status: 201 })
}

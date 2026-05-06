import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'

export async function POST(req: NextRequest, context: any) {
  const { params } = context
  const { id } = await params
  const { user, error: authError } = await requireRole(['PLATFORM_ADMIN', 'VENDOR_MGR'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vendor_profiles')
    .update({ status: 'APPROVED' })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.rpc('emit_audit_event', {
    p_user_id: user.id,
    p_event_type: 'VENDOR_APPROVED',
    p_resource_type: 'vendor_profile',
    p_resource_id: id,
    p_action: 'approve',
    p_changes: { status: 'APPROVED' },
  })

  return NextResponse.json(data)
}

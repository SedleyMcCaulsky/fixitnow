import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/rbac'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const { user, error: authError } = await requireRole(['PLATFORM_ADMIN', 'VENDOR_MGR'])
  if (authError) return authError

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vendor_profiles')
    .select('id,user_id,trade_type,specialties,rate_per_day,rating,total_jobs,status,profiles(full_name,email)')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ vendors: data ?? [] })
}

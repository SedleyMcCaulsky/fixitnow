import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'

function parseCount(count: string | number | null) {
  if (count === null || count === undefined) return 0
  return Number(count) || 0
}

function parseNumeric(value: any) {
  if (value === null || value === undefined) return 0
  return Number(value) || 0
}

export async function GET() {
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

  const [projectsRes, pendingMilestonesRes, disputeMilestonesRes, paidMilestonesRes, approvedVendorsRes, paymentReleasedRes, paymentPendingRes, auditRes, paymentFailuresRes] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }),
    supabase.from('milestones').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
    supabase.from('milestones').select('id', { count: 'exact', head: true }).eq('status', 'DISPUTED'),
    supabase.from('milestones').select('id', { count: 'exact', head: true }).eq('status', 'PAID'),
    supabase.from('vendor_profiles').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED'),
    supabase.from('milestones').select('sum(budget_allocation)').eq('status', 'PAID'),
    supabase.from('milestones').select('sum(budget_allocation)').eq('status', 'APPROVED'),
    supabase.from('audit_events').select('id', { count: 'exact', head: true }).gt('created_at', 'now() - interval 30 day'),
    supabase.from('milestones').select('id', { count: 'exact', head: true }).eq('payment_status', 'FAILED'),
  ])

  if ([projectsRes, pendingMilestonesRes, disputeMilestonesRes, paidMilestonesRes, approvedVendorsRes, paymentReleasedRes, paymentPendingRes, auditRes, paymentFailuresRes].some((result) => result.error)) {
    const error = [projectsRes, pendingMilestonesRes, disputeMilestonesRes, paidMilestonesRes, approvedVendorsRes, paymentReleasedRes, paymentPendingRes, auditRes, paymentFailuresRes].find((result) => result.error)?.error
    return NextResponse.json({ error: error?.message || 'Unable to load report summary' }, { status: 500 })
  }

  return NextResponse.json({
    totalProjects: parseCount(projectsRes.count),
    pendingMilestones: parseCount(pendingMilestonesRes.count),
    disputeMilestones: parseCount(disputeMilestonesRes.count),
    paidMilestones: parseCount(paidMilestonesRes.count),
    approvedVendors: parseCount(approvedVendorsRes.count),
    awardRevenue: parseNumeric(paymentReleasedRes.data?.[0]?.sum),
    escrowPending: parseNumeric(paymentPendingRes.data?.[0]?.sum),
    auditEventsLast30Days: parseCount(auditRes.count),
    paymentFailures: parseCount(paymentFailuresRes.count),
  })
}

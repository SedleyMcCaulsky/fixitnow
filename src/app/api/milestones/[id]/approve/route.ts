import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest, context: any) {
  const { params } = context
  const { id } = await params
  const { user, error: authError } = await requireRole(['CUSTOMER', 'PLATFORM_ADMIN'])
  if (authError) return authError

  const supabase = await createClient()
  const { data: milestone, error: milestoneError } = await supabase
    .from('milestones')
    .select('id,project_id,status,budget_allocation')
    .eq('id', id)
    .single()

  if (milestoneError || !milestone) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }

  if (milestone.status !== 'SUBMITTED') {
    return NextResponse.json({ error: 'Only submitted milestones can be approved' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  if (!milestone.budget_allocation || milestone.budget_allocation <= 0) {
    return NextResponse.json({ error: 'Milestone budget allocation is required to create payment intent' }, { status: 400 })
  }

  const currency = process.env.STRIPE_CURRENCY ?? 'usd'
  const amount = Math.round(Number(milestone.budget_allocation) * 100)

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      capture_method: 'manual',
      confirm: false,
      metadata: {
        milestone_id: id,
        project_id: milestone.project_id,
      },
    })

    const { data, error } = await supabase
      .from('milestones')
      .update({
        status: 'APPROVED',
        approved_at: now,
        payment_intent_id: paymentIntent.id,
        payment_status: 'INTENT_CREATED',
        payment_error: null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase.rpc('emit_audit_event', {
      p_user_id: user.id,
      p_event_type: 'MILESTONE_APPROVED',
      p_resource_type: 'milestone',
      p_resource_id: id,
      p_action: 'approve',
      p_changes: { approved_at: now, payment_intent_id: paymentIntent.id, payment_status: 'INTENT_CREATED' },
    })

    return NextResponse.json(data)
  } catch (stripeError: any) {
    const message = stripeError?.message || 'Failed to create payment intent'
    await supabase
      .from('milestones')
      .update({ payment_status: 'FAILED', payment_error: message })
      .eq('id', id)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

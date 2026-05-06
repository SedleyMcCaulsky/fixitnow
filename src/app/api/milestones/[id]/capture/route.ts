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
    .select('id,project_id,status,budget_allocation,payment_intent_id,payment_status')
    .eq('id', id)
    .single()

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  if (milestoneError || !milestone) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }

  if (milestone.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Only approved milestones can be released' }, { status: 400 })
  }

  if (!milestone.payment_intent_id) {
    return NextResponse.json({ error: 'Payment intent not found for milestone' }, { status: 400 })
  }

  try {
    const paymentIntent = await stripe.paymentIntents.capture(milestone.payment_intent_id)

    const { error: updateError } = await supabase
      .from('milestones')
      .update({
        status: 'PAID',
        payment_status: 'CAPTURED',
        payment_error: null,
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await supabase.rpc('emit_audit_event', {
      p_user_id: user.id,
      p_event_type: 'PAYMENT_RELEASED',
      p_resource_type: 'milestone',
      p_resource_id: id,
      p_action: 'capture',
      p_changes: { payment_intent_id: paymentIntent.id, amount: paymentIntent.amount },
    })

    return NextResponse.json({ success: true, paymentIntent })
  } catch (stripeError: any) {
    const message = stripeError?.message || 'Failed to capture payment intent'
    await supabase.from('milestones').update({ payment_status: 'FAILED', payment_error: message }).eq('id', id)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
